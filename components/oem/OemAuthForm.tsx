"use client"

import { useState } from "react"
import { BUSINESS } from "@/lib/seo/site-config"
import { pushDataLayer } from "@/lib/gtm"

// High-value Funnel A signal -- matches the value already assigned to this
// lead type in lib/growth-os/conversion-tracking.ts's (currently unwired)
// OEM Authorization conversion action.
const OEM_AUTH_LEAD_VALUE_INR = 5000

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman & Nicobar Islands","Chandigarh","Delhi","Jammu & Kashmir",
  "Ladakh","Lakshadweep","Puducherry",
]

const PRODUCTS = [
  "Single Barrel Thermal Fogging Machine",
  "Double Barrel Thermal Fogging Machine",
  "Vehicle Mounted Fogging Machine",
  "Hand Carried Thermal Fogger",
  "ULV Cold Fogging Machine",
  "Multiple Products",
  "Other / Specify in message",
]

interface FormState {
  name: string; company: string; mobile: string; email: string; state: string
  gemSellerId: string; tenderName: string; tenderClosingDate: string
  product: string; message: string
}

const EMPTY: FormState = {
  name: "", company: "", mobile: "", email: "", state: "",
  gemSellerId: "", tenderName: "", tenderClosingDate: "",
  product: "", message: "",
}

const WA_SUCCESS = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I've submitted my OEM Authorization Request through your website. Please confirm receipt and next steps."
)}`

interface Props {
  source?: string
  compact?: boolean
}

export default function OemAuthForm({ source = "oem_authorization", compact = false }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const F = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.company || !form.mobile || !form.email || !form.state || !form.product) {
      setError("Please fill in all required fields.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/oem-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      })
      if (!res.ok) throw new Error("Submission failed")

      // Fire generate_lead only AFTER the server confirms the save --
      // matches the pattern used by PartnerApplyForm. This form previously
      // had zero tracking despite being a real, high-value lead type.
      pushDataLayer({
        event: "generate_lead",
        lead_type: "oem_authorization",
        page_type: "oem_authorization",
        value: OEM_AUTH_LEAD_VALUE_INR,
        currency: "INR",
        state: form.state,
      })

      setSuccess(true)
      setForm(EMPTY)
    } catch {
      setError("Submission failed. Please try WhatsApp or call us directly.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-10 px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-white text-xl font-black mb-2">Authorization Request Received</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          Our team will review your tender details and contact you within <strong className="text-white">4 business hours</strong> with the OEM Authorization Letter.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={WA_SUCCESS} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl text-sm transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Confirm on WhatsApp
          </a>
          <button onClick={() => setSuccess(false)}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-xl text-sm hover:bg-white/10 transition-colors">
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  const inputClass = "w-full bg-slate-800 border border-white/[0.08] hover:border-white/[0.18] focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
  const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <div>
          <label className={labelClass}>Full Name <span className="text-rose-400">*</span></label>
          <input className={inputClass} placeholder="Your name" value={form.name} onChange={(e) => F("name", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Company / Firm Name <span className="text-rose-400">*</span></label>
          <input className={inputClass} placeholder="Your trading company name" value={form.company} onChange={(e) => F("company", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Mobile Number <span className="text-rose-400">*</span></label>
          <input className={inputClass} type="tel" placeholder="10-digit mobile number" value={form.mobile} onChange={(e) => F("mobile", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Email Address <span className="text-rose-400">*</span></label>
          <input className={inputClass} type="email" placeholder="business@email.com" value={form.email} onChange={(e) => F("email", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>State <span className="text-rose-400">*</span></label>
          <select className={inputClass} value={form.state} onChange={(e) => F("state", e.target.value)} required>
            <option value="">Select your state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Product Required <span className="text-rose-400">*</span></label>
          <select className={inputClass} value={form.product} onChange={(e) => F("product", e.target.value)} required>
            <option value="">Select product</option>
            {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>GeM Seller ID <span className="text-slate-600">(optional)</span></label>
          <input className={inputClass} placeholder="Your GeM seller ID" value={form.gemSellerId} onChange={(e) => F("gemSellerId", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Tender Closing Date <span className="text-slate-600">(optional)</span></label>
          <input className={inputClass} type="date" value={form.tenderClosingDate} onChange={(e) => F("tenderClosingDate", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tender Name / Bid Reference <span className="text-slate-600">(optional)</span></label>
        <input className={inputClass} placeholder="e.g. Municipal Corporation Jaipur — Fogging Machine Tender 2025" value={form.tenderName} onChange={(e) => F("tenderName", e.target.value)} />
      </div>

      <div>
        <label className={labelClass}>Message / Requirements</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="Share any specific requirements, quantities, or tender details…"
          value={form.message}
          onChange={(e) => F("message", e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-black text-base rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Submitting…
          </>
        ) : (
          <>
            Request OEM Authorization
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6" /></svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Response within <strong className="text-slate-300">4 business hours</strong> · No charges · OEM authorization letter on company letterhead
      </p>
    </form>
  )
}
