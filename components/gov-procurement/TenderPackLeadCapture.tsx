"use client"

import { useState } from "react"
import { pushDataLayer } from "@/lib/gtm"
import { BUSINESS } from "@/lib/seo/site-config"

const TENDER_DOCS = [
  "IS 14855 (Part 1) compliance declaration",
  "ISO 9001:2015 quality management certificate",
  "MSME / UDYAM registration certificate",
  "BIS / ISI mark certificate (applicable models)",
  "CE Marking certificate (export-grade models)",
  "GST registration certificate",
  "GeM seller verification screenshot",
  "Technical specification sheets (model-wise)",
  "L1 quotation on company letterhead with GST",
  "OEM Authorization Letter (for dealer-submitted bids)",
]

interface FormState {
  name: string
  dept: string
  phone: string
  email: string
  company_website: string
}

const EMPTY: FormState = { name: "", dept: "", phone: "", email: "", company_website: "" }

export default function TenderPackLeadCapture() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const set = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const waPackUrl = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    `Hi, I requested the 100X Circle Tender Documentation Pack. My name is ${form.name || "[name]"} from ${form.dept || "[department]"}. Please share the complete tender pack.`
  )}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "submitting" || status === "success") return
    setStatus("submitting")
    setErrorMsg("")

    try {
      const res = await fetch("/api/rfq-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "Tender Documentation Pack Request",
          name: form.name,
          phone: form.phone,
          email: form.email,
          organization: form.dept,
          description: "Requested complete tender documentation pack for government procurement.",
          gemAuthRequired: false,
          dealerInquiry: false,
          company_website: form.company_website,
          form_page_url: typeof window !== "undefined" ? window.location.href : "",
          location_label: "tender_pack_request",
        }),
      })
      const data = await res.json()
      if (data.ok) {
        pushDataLayer({
          event: "generate_lead",
          value: 75000,
          currency: "INR",
          lead_type: "tender_pack",
          conversion_step: "form_submit",
          department: form.dept,
        })
        setStatus("success")
      } else {
        setStatus("error")
        setErrorMsg("Submission failed. Please WhatsApp us to receive the pack immediately.")
      }
    } catch {
      setStatus("error")
      setErrorMsg("Network error. Please WhatsApp us directly.")
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"

  return (
    <div id="tender-pack" className="border border-gray-200 rounded-xl overflow-hidden mb-10">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-0.5">
          Request Complete Tender Documentation Pack
        </h2>
        <p className="text-sm text-gray-500">
          All 10 documents provided at no cost. Delivered to your WhatsApp &amp; email within 2 hours.
        </p>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-6">
        {/* Doc list */}
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Documents Included
          </p>
          <ul className="space-y-1.5">
            {TENDER_DOCS.map(doc => (
              <li key={doc} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                {doc}
              </li>
            ))}
          </ul>
        </div>

        {/* Lead capture */}
        <div className="sm:w-64 flex-shrink-0">
          {status === "success" ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Pack Request Received</p>
              <p className="text-xs text-green-700 mb-4">
                We&apos;ll send the complete documentation pack to your WhatsApp and email within 2 hours.
              </p>
              <a
                href={waPackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                Receive Pack on WhatsApp Now
              </a>
              <p className="text-[10px] text-green-600 text-center mt-2">
                Click above for instant delivery
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Enter details to receive the pack:
              </p>

              {/* Honeypot */}
              <input
                type="text" name="company_website" value={form.company_website} onChange={set}
                className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true"
              />

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  required name="name" value={form.name} onChange={set}
                  placeholder="Full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Department / Organization <span className="text-red-500">*</span>
                </label>
                <input
                  required name="dept" value={form.dept} onChange={set}
                  placeholder="e.g. Nagar Nigam Delhi"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  required type="tel" name="phone" value={form.phone} onChange={set}
                  placeholder="+91 XXXXX XXXXX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Official Email
                </label>
                <input
                  type="email" name="email" value={form.email} onChange={set}
                  placeholder="your.name@dept.gov.in"
                  className={inputCls}
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Sending…" : "Get Tender Pack — Free"}
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                Delivered via WhatsApp &amp; email · No cost · 2 hours
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
