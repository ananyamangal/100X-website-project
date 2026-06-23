"use client"

import { useState } from "react"

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Chandigarh","Puducherry",
]

interface Props {
  product?: string
  source?: string
  heading?: string
  subheading?: string
  dark?: boolean
}

export default function RfqForm({
  product = "",
  source = "website",
  heading = "Request Official Quotation",
  subheading = "We respond within 2 business hours with pricing, documentation, and availability.",
  dark = false,
}: Props) {
  const [form, setForm] = useState({
    name: "", organization: "", department: "", mobile: "", email: "", state: "", quantity: "",
  })
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("sending")
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, product, source }),
      })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    }
  }

  const label = dark ? "block text-sm font-600 text-gray-300 mb-1" : "block text-sm font-600 text-gray-700 mb-1"
  const input = dark
    ? "w-full px-3 py-2.5 text-sm rounded-lg bg-white/[0.06] border border-white/[0.12] text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
    : "w-full px-3 py-2.5 text-sm rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"

  if (status === "done") {
    return (
      <div className={`rounded-2xl p-8 text-center ${dark ? "bg-white/[0.04] border border-white/[0.08]" : "bg-green-50 border border-green-200"}`}>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`text-lg font-800 mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Quotation Request Received</h3>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          Our sales team will contact you within 2 business hours with official pricing,<br />
          IS 14855 documentation, and availability.
        </p>
        <p className={`text-xs mt-4 ${dark ? "text-gray-600" : "text-gray-400"}`}>
          Urgent? WhatsApp us directly on{" "}
          <a href="https://wa.me/917827229116" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-600">+91-7827229116</a>
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl p-6 md:p-8 ${dark ? "bg-white/[0.04] border border-white/[0.08]" : "bg-white border border-gray-200 shadow-sm"}`}>
      <h3 className={`text-xl font-800 mb-1 ${dark ? "text-white" : "text-gray-900"}`}>{heading}</h3>
      <p className={`text-sm mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>{subheading}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Full Name *</label>
            <input className={input} placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>
          <div>
            <label className={label}>Mobile Number *</label>
            <input className={input} placeholder="+91 98765 43210" type="tel" value={form.mobile} onChange={e => set("mobile", e.target.value)} required />
          </div>
          <div>
            <label className={label}>Organization / Department</label>
            <input className={input} placeholder="e.g. Ahmedabad Municipal Corporation" value={form.organization} onChange={e => set("organization", e.target.value)} />
          </div>
          <div>
            <label className={label}>Dept / Role</label>
            <input className={input} placeholder="e.g. Health Officer, Procurement" value={form.department} onChange={e => set("department", e.target.value)} />
          </div>
          <div>
            <label className={label}>Email Address</label>
            <input className={input} placeholder="officer@example.gov.in" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className={label}>State</label>
            <select className={input} value={form.state} onChange={e => set("state", e.target.value)}>
              <option value="">Select state…</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Quantity Requirement</label>
            <input className={input} placeholder="e.g. 5 units, 20 units for tender, bulk order" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-red-500">Something went wrong. Please WhatsApp us directly on +91-7827229116.</p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-700 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {status === "sending" ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              Sending…
            </>
          ) : "Request Official Quotation →"}
        </button>

        <p className={`text-xs text-center ${dark ? "text-gray-600" : "text-gray-400"}`}>
          No spam. Government pricing only shared with verified procurement contacts.
        </p>
      </form>
    </div>
  )
}
