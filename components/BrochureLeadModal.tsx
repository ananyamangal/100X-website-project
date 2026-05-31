"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Jammu & Kashmir","Ladakh",
  "Puducherry","Other",
]

const PHONE_RE = /^[6-9]\d{9}$/ // Indian mobile: starts 6-9, 10 digits
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  open: boolean
  onClose: () => void
  /** Where the download was triggered from — tracked in DB */
  source: string
  /** Product-specific brochure URL (GridFS). Leave empty for main catalog brochure. */
  brochureUrl?: string
  /** Display name of product (shown in modal header) */
  productName?: string
}

export default function BrochureLeadModal({ open, onClose, source, brochureUrl, productName }: Props) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState("")
  const [state, setState] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError("")
    setDone(false)
    setTimeout(() => nameRef.current?.focus(), 80)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  const reset = () => { setName(""); setPhone(""); setEmail(""); setOrganization(""); setState("") }

  const triggerDownload = () => {
    const href = brochureUrl || "/api/brochure/download"
    // Use hidden anchor — avoids popup blockers, same-origin downloads work cleanly
    const a = document.createElement("a")
    a.href = href
    a.download = productName ? `${productName}-brochure.pdf` : "100xcircle-brochure.pdf"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    const hp = (e.currentTarget.elements.namedItem("company_website") as HTMLInputElement | null)?.value ?? ""

    const trimPhone = phone.replace(/\D/g, "")
    if (!name.trim()) { setError("Name is required."); return }
    if (!PHONE_RE.test(trimPhone)) { setError("Enter a valid 10-digit Indian mobile number (starting 6–9)."); return }
    if (!EMAIL_RE.test(email.trim())) { setError("Enter a valid email address."); return }

    setSubmitting(true)
    try {
      const res = await fetch("/api/brochure-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: trimPhone,
          email: email.trim(),
          organization: organization.trim(),
          state,
          source,
          brochureType: brochureUrl ? "product" : "main",
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          company_website: hp,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Submission failed. Please try again.")
        return
      }
      setDone(true)
      reset()
      triggerDownload()
      // Close after 2.5 s so the user can see the success message
      setTimeout(() => onClose(), 2500)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Download brochure"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Download size={18} className="text-white" aria-hidden />
              <h2 className="text-white font-bold text-lg leading-tight">
                {productName ? `${productName} Brochure` : "Company Brochure"}
              </h2>
            </div>
            <p className="text-green-100 text-sm">Fill in your details — download starts immediately</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-white/80 hover:text-white rounded-full p-1.5 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Download size={24} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Download started!</h3>
              <p className="text-gray-600 text-sm">Your brochure is downloading. If it doesn't start, <a href={brochureUrl || "/api/brochure/download"} className="text-green-600 underline">click here</a>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              {/* Honeypot */}
              <div className="absolute -left-[9999px] w-0 h-0 overflow-hidden" aria-hidden>
                <input name="company_website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  disabled={submitting}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  placeholder="10-digit Indian mobile"
                  required
                  disabled={submitting}
                  className="h-11"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={submitting}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Organization <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Company / Dept."
                    disabled={submitting}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={submitting}
                    className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 h-11 text-sm font-semibold"
              >
                {submitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Saving…</>
                ) : (
                  <><Download size={16} className="mr-2" />Download Brochure</>
                )}
              </Button>

              <p className="text-center text-[11px] text-gray-400">
                We never share your details. By downloading you agree to be contacted about your enquiry.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
