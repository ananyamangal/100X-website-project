"use client"

import { useState, useRef } from "react"
import { BUSINESS } from "@/lib/seo/site-config"
import { getPersistedAttribution, pushDataLayer } from "@/lib/gtm"
import { QUOTE_LEAD_VALUE_INR } from "@/components/cta/cta-config"

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh","Andaman & Nicobar",
]

// Matches the value DealerApplicationForm (app/dealer-program) already uses for
// the same "dealer inquiry" lead type — kept in sync intentionally.
const DEALER_LEAD_VALUE_INR = 5000

const MOBILE_RE = /^\+?[\d\s\-]{10,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Intent = "quote" | "dealer" | "both"

interface Props {
  source?: string
  compact?: boolean
}

export default function PartnerApplyForm({ source = "partner_application", compact = false }: Props) {
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [wantsQuote, setWantsQuote] = useState(true)
  const [wantsDealer, setWantsDealer] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const waText = `Hi 100X Circle, I'm interested in a quote / becoming an authorized dealer. Please share details.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!wantsQuote && !wantsDealer) {
      setError("Please select at least one: Requesting a Quote or Applying to Become a Dealer.")
      return
    }

    const fd = new FormData(e.currentTarget)
    const honeypot = String(fd.get("company_website") ?? "").trim()
    if (honeypot) {
      setError("Please try again.")
      return
    }

    const name = String(fd.get("name") ?? "").trim()
    const company = String(fd.get("company") ?? "").trim()
    const mobile = String(fd.get("mobile") ?? "").trim()
    const email = String(fd.get("email") ?? "").trim()
    const state = String(fd.get("state") ?? "").trim()
    const message = String(fd.get("message") ?? "").trim()

    if (!name || !company || !mobile || !state) {
      setError("Please fill in all required fields.")
      return
    }
    if (!MOBILE_RE.test(mobile)) {
      setError("Please enter a valid mobile number (10–15 digits).")
      return
    }
    if (email && !EMAIL_RE.test(email)) {
      setError("Please enter a valid email address (or leave it blank).")
      return
    }

    const intent: Intent = wantsQuote && wantsDealer ? "both" : wantsDealer ? "dealer" : "quote"

    setSending(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "partner_application",
          source,
          name,
          company,
          mobile,
          email: email || undefined,
          state,
          message: message || undefined,
          intent,
          wantsQuote,
          wantsDealer,
          attribution: getPersistedAttribution(),
          form_page_url: typeof window !== "undefined" ? window.location.href : "",
          form_page_path: typeof window !== "undefined" ? window.location.pathname : "",
          company_website: honeypot,
        }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      // Fire generate_lead only AFTER the server confirms the save — never on
      // click alone. "Request quote" in Google Ads listens on this event.
      pushDataLayer({
        event: "generate_lead",
        lead_type: "gem_oem_partnership",
        page_type: "gem_oem_partnership",
        intent,
        value: intent === "quote" ? QUOTE_LEAD_VALUE_INR : DEALER_LEAD_VALUE_INR,
        currency: "INR",
        state,
      })

      setSuccess(true)
      formRef.current?.reset()
      setWantsQuote(true)
      setWantsDealer(false)
    } catch {
      setError("We couldn't save your request due to a connection issue. Please try again, or WhatsApp us directly and we'll respond right away.")
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
        <p className="text-white font-700 mb-1">Request Received</p>
        <p className="text-gray-400 text-sm mb-4">Our team will contact you within 1 business day.</p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="text-gray-500 hover:text-gray-300 text-xs underline underline-offset-2 mb-4 block mx-auto"
        >
          Submit another request
        </button>
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
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="partner-apply-hp">Company website</label>
        <input id="partner-apply-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className={labelCls}>I&apos;m interested in *</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-4 py-3 transition-colors">
            <input
              type="checkbox"
              checked={wantsQuote}
              onChange={(e) => setWantsQuote(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded shrink-0"
            />
            <span className="text-sm text-white font-500">Requesting a Quote</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] rounded-xl px-4 py-3 transition-colors">
            <input
              type="checkbox"
              checked={wantsDealer}
              onChange={(e) => setWantsDealer(e.target.checked)}
              className="w-4 h-4 accent-brand-600 rounded shrink-0"
            />
            <span className="text-sm text-white font-500">Applying to Become a Dealer</span>
          </label>
        </div>
      </div>

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
          <select name="state" required defaultValue="" className={inputCls + " appearance-none cursor-pointer"}>
            <option value="" disabled>Select your state</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={compact ? "sm:col-span-2" : ""}>
          <label className={labelCls}>Tell us about your requirement / business</label>
          <textarea
            name="message"
            rows={3}
            placeholder="Product interest, quantity, existing business, area of operation..."
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
          {sending ? "Sending…" : "Submit Request"}
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
        No fees. No commitment. Response within 1 business day.
      </p>
    </form>
  )
}
