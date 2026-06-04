"use client"

import React, { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { X, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import { BUSINESS } from "@/lib/seo/site-config"

interface Question {
  id: string
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox"
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
}

interface PopupConfig {
  enabled: boolean
  delayMs: number
  sessionOnce: boolean
  neverAfterSubmission: boolean
  showOnMobile: boolean
  showOnDesktop: boolean
  exitIntent: boolean
  autoCloseMs: number
  triggerPages: string[]
  hiddenPages: string[]
  questions: Question[]
  allowFileUpload: boolean
  maxFileSizeMb: number
  allowedFileTypes: string[]
  notificationWhatsapp?: string
}

const SESSION_KEY = "rfq-popup-seen-v1"
const SUBMITTED_KEY = "rfq-popup-submitted-v1"

function getUtm(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem("attribution_v1") || "{}"
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

function buildWaMessage(answers: Record<string, string | string[]>, attachmentUrl?: string): string {
  const lines = ["*New RFQ — 100x Circle*", ""]
  for (const [q, a] of Object.entries(answers)) {
    const val = Array.isArray(a) ? a.join(", ") : String(a)
    if (val) lines.push(`${q}: ${val}`)
  }
  if (attachmentUrl) lines.push(`Attachment: ${attachmentUrl}`)
  return lines.join("\n")
}

// Upload via our own server route (MongoDB GridFS) — avoids Cloudinary ACL issues on raw files
async function uploadFileViaServer(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/api/rfq-upload", { method: "POST", body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }))
    throw new Error(err.error || "Upload failed")
  }
  const data = await res.json()
  if (!data.url) throw new Error("No URL returned from upload")
  return data.url as string
}

export default function RFQPopup() {
  const pathname = usePathname() || ""
  const [config, setConfig] = useState<PopupConfig | null>(null)
  const [visible, setVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks explicit user dismissal — popup never reopens once dismissed
  const userDismissedRef = useRef(false)

  // Fetch config
  useEffect(() => {
    fetch("/api/rfq-popup/config")
      .then((r) => r.json())
      .then((data) => {
        if (data?.enabled) setConfig(data as PopupConfig)
      })
      .catch(() => {})
  }, [])

  // Determine whether to show the popup
  useEffect(() => {
    if (!config) return
    // Never reopen once user explicitly dismissed
    if (userDismissedRef.current) return
    if (visible) return

    // Path checks
    const hidden = config.hiddenPages || []
    if (hidden.some((p: string) => pathname.startsWith(p))) return

    const trigger = config.triggerPages || []
    if (trigger.length > 0 && !trigger.some((p: string) => pathname.startsWith(p))) return

    // Mobile/desktop targeting
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile && !config.showOnMobile) return
    if (!isMobile && !config.showOnDesktop) return

    // Never show after successful submission (localStorage)
    if (config.neverAfterSubmission && typeof window !== "undefined" && localStorage.getItem(SUBMITTED_KEY)) return

    // Session once
    if (config.sessionOnce && sessionStorage.getItem(SESSION_KEY)) return

    function show() {
      if (userDismissedRef.current) return
      setVisible(true)
      if (config!.sessionOnce) sessionStorage.setItem(SESSION_KEY, "1")
      if (config!.autoCloseMs > 0) {
        autoCloseRef.current = setTimeout(() => setVisible(false), config!.autoCloseMs)
      }
    }

    // Delay timer
    timerRef.current = setTimeout(show, config.delayMs)

    // Exit intent (desktop only)
    let exitBound = false
    if (config.exitIntent && !isMobile) {
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0 && !exitBound) {
          exitBound = true
          clearTimeout(timerRef.current!)
          show()
          document.removeEventListener("mouseleave", onMouseLeave)
        }
      }
      document.addEventListener("mouseleave", onMouseLeave)
    }

    return () => {
      clearTimeout(timerRef.current!)
      clearTimeout(autoCloseRef.current!)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, pathname])

  // Scroll lock + ESC key when popup is open
  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [visible])

  function close() {
    userDismissedRef.current = true
    setVisible(false)
    clearTimeout(timerRef.current!)
    clearTimeout(autoCloseRef.current!)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate required fields
    const qs = config?.questions || []
    for (const q of qs) {
      if (!q.required) continue
      const val = answers[q.label]
      const empty = !val || (Array.isArray(val) ? val.length === 0 : String(val).trim() === "")
      if (empty) {
        setError(`${q.label} is required`)
        return
      }
    }

    // Open WhatsApp synchronously inside the user gesture (before any await)
    // so popup blockers don't interfere.
    const waNumber = (config?.notificationWhatsapp || "").replace(/[^0-9]/g, "") || BUSINESS.whatsappE164
    const waMessage = buildWaMessage(answers)
    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`,
      "_blank",
      "noopener,noreferrer",
    )

    setSubmitting(true)
    try {
      let attachmentUrl: string | undefined
      if (attachedFile) {
        setUploadingFile(true)
        try {
          attachmentUrl = await uploadFileViaServer(attachedFile)
        } catch {
          setError("File upload failed. Please try again or submit without attachment.")
          setSubmitting(false)
          setUploadingFile(false)
          return
        }
        setUploadingFile(false)
      }

      const utm = getUtm()
      const res = await fetch("/api/rfq-popup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          pagePath: window.location.pathname,
          pageUrl: window.location.href,
          utm,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          attachmentUrl,
        }),
      })
      if (!res.ok) {
        console.error("RFQ popup submit failed:", await res.text())
      }

      // Persist submission so popup never shows again (if configured)
      if (config?.neverAfterSubmission && typeof window !== "undefined") {
        localStorage.setItem(SUBMITTED_KEY, "1")
      }
      sessionStorage.setItem(SESSION_KEY, "1")

      setSubmitted(true)
    } catch {
      setError("Submission failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function setAnswer(label: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [label]: value }))
  }

  function toggleCheckbox(label: string, option: string) {
    const current = (answers[label] as string[]) || []
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    setAnswer(label, updated)
  }

  const allowedTypes = config?.allowedFileTypes?.length
    ? config.allowedFileTypes.join(",")
    : ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"

  const maxSizeBytes = (config?.maxFileSizeMb || 5) * 1024 * 1024

  if (!visible || !config) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request for Quotation"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Get a Free Quote</h2>
            <p className="text-green-100 text-sm mt-0.5">Fill the form — we respond within 24 hours</p>
          </div>
          <button
            onClick={close}
            className="text-white/80 hover:text-white transition-colors rounded-full p-1.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold text-lg mb-2">Thank you!</h3>
              <p className="text-gray-600 text-sm mb-4">We've received your request and will be in touch shortly.</p>
              <button
                onClick={close}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {config.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {q.label}
                    {q.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {q.type === "textarea" ? (
                    <textarea
                      value={(answers[q.label] as string) || ""}
                      onChange={(e) => setAnswer(q.label, e.target.value)}
                      placeholder={q.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    />
                  ) : q.type === "select" ? (
                    <select
                      value={(answers[q.label] as string) || ""}
                      onChange={(e) => setAnswer(q.label, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="">Select an option…</option>
                      {(q.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : q.type === "radio" ? (
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={(answers[q.label] as string) === opt}
                            onChange={() => setAnswer(q.label, opt)}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === "checkbox" ? (
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={((answers[q.label] as string[]) || []).includes(opt)}
                            onChange={() => toggleCheckbox(q.label, opt)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={q.type === "phone" ? "tel" : q.type}
                      value={(answers[q.label] as string) || ""}
                      onChange={(e) => setAnswer(q.label, e.target.value)}
                      placeholder={q.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              {/* File upload */}
              {config.allowFileUpload && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Attach Document <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-green-500 transition-colors text-sm text-gray-600">
                    <Paperclip size={16} className="shrink-0" />
                    <span>{attachedFile ? attachedFile.name : "Choose file (PDF, DOC, XLS, JPG, PNG)"}</span>
                    <input
                      type="file"
                      accept={allowedTypes}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > maxSizeBytes) {
                          setError(`File too large. Max size: ${config.maxFileSizeMb || 5} MB`)
                          return
                        }
                        setAttachedFile(file)
                        setError("")
                      }}
                    />
                  </label>
                  {attachedFile && (
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="mt-1 text-xs text-gray-400 hover:text-red-500"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className={cn(
                  "w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-colors",
                  submitting || uploadingFile
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {uploadingFile ? "Uploading file…" : submitting ? "Submitting…" : "Submit Request"}
              </button>

              <p className="text-center text-xs text-gray-400">
                We never share your information with third parties.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
