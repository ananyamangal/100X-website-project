"use client"

import React, { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

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
  showOnMobile: boolean
  showOnDesktop: boolean
  exitIntent: boolean
  autoCloseMs: number
  triggerPages: string[]
  hiddenPages: string[]
  questions: Question[]
}

const SESSION_KEY = "rfq-popup-seen-v1"

function getUtm(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem("attribution_v1") || "{}"
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

export default function RFQPopup() {
  const pathname = usePathname() || ""
  const [config, setConfig] = useState<PopupConfig | null>(null)
  const [visible, setVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!config || visible) return

    // Path checks
    const hidden = config.hiddenPages || []
    if (hidden.some((p: string) => pathname.startsWith(p))) return

    const trigger = config.triggerPages || []
    if (trigger.length > 0 && !trigger.some((p: string) => pathname.startsWith(p))) return

    // Mobile/desktop targeting
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile && !config.showOnMobile) return
    if (!isMobile && !config.showOnDesktop) return

    // Session once
    if (config.sessionOnce && sessionStorage.getItem(SESSION_KEY)) return

    function show() {
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
  }, [config, pathname, visible])

  function close() {
    setVisible(false)
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

    setSubmitting(true)
    try {
      const utm = getUtm()
      await fetch("/api/rfq-popup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          pagePath: window.location.pathname,
          pageUrl: window.location.href,
          utm,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        }),
      })
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

  if (!visible || !config) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request for Quotation"
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
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold text-lg mb-2">Thank you!</h3>
              <p className="text-gray-600 text-sm mb-4">We've received your request and will be in touch shortly.</p>
              <button
                onClick={close}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                  ) : q.type === "select" ? (
                    <select
                      value={(answers[q.label] as string) || ""}
                      onChange={(e) => setAnswer(q.label, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            className="text-green-600 focus:ring-green-500"
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
                            className="rounded text-green-600 focus:ring-green-500"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-colors",
                  submitting
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                {submitting ? "Submitting…" : "Submit Request"}
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
