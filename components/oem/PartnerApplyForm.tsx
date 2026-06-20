"use client"

import { useState, useRef } from "react"
import { BUSINESS } from "@/lib/seo/site-config"

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh","Andaman & Nicobar",
]

interface Props {
  source?: string
  compact?: boolean
}

export default function PartnerApplyForm({ source = "partner_application", compact = false }: Props) {
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const waText = `Hi 100X Circle, I'm interested in becoming an authorized dealer/supply partner. Please share partnership details.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    setError("")
    const fd = new FormData(e.currentTarget)
    const body = {
      source,
      name: fd.get("name"),
      company: fd.get("company"),
      mobile: fd.get("mobile"),
      email: fd.get("email"),
      state: fd.get("state"),
      message: fd.get("message"),
    }
    try {
      const res = await fetch("/api/oem-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Server error")
      setSuccess(true)
      formRef.current?.reset()
    } catch {
      setError("Something went wrong. Please WhatsApp us directly.")
    } finally {
      setSending(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-white font-700 mb-1">Application Received</p>
        <p className="text-gray-400 text-sm mb-4">Our team will contact you within 1 business day.</p>
        <a
          href={waHref}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-600 text-sm rounded-full transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Also WhatsApp us
        </a>
      </div>
    )
  }

  const inputCls = "w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500/60 transition-colors"
  const labelCls = "block text-xs font-600 text-gray-400 mb-1.5"

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
        <div>
          <label className={labelCls}>Your Name *</label>
          <input name="name" required placeholder="Full name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Company / Business Name *</label>
          <input name="company" required placeholder="Your company or trading name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Mobile *</label>
          <input name="mobile" required type="tel" placeholder="+91 XXXXX XXXXX" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" placeholder="your@email.com" className={inputCls} />
        </div>
        <div className={compact ? "sm:col-span-2" : ""}>
          <label className={labelCls}>State *</label>
          <select name="state" required className={inputCls + " appearance-none cursor-pointer"}>
            <option value="" disabled selected>Select your state</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={compact ? "sm:col-span-2" : ""}>
          <label className={labelCls}>Tell us about your business</label>
          <textarea
            name="message"
            rows={3}
            placeholder="Brief overview of your business, existing customers, area of operation..."
            className={inputCls + " resize-none"}
          />
        </div>
      </div>

      {error && <p className="text-brand-400 text-xs">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={sending}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-700 text-sm px-6 py-3 rounded-full transition-colors"
        >
          {sending ? "Sending…" : "Apply for Partnership"}
        </button>
        <a
          href={waHref}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-600 text-sm px-6 py-3 rounded-full transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp Instead
        </a>
      </div>

      <p className="text-gray-600 text-[11px] text-center">
        No fees. No commitment. Evaluation call within 1 business day.
      </p>
    </form>
  )
}
