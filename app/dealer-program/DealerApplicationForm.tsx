"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getPersistedAttribution, pushDataLayer } from "@/lib/gtm"

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","Uttarakhand","West Bengal","Others / Northeast",
]

const BUSINESS_TYPES = [
  "Pest control company",
  "Agricultural equipment supplier",
  "Government / tender supplier",
  "General trader / distributor",
  "Other",
]

const LEAD_VALUE_INR = 5000

export default function DealerApplicationForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)
    const honeypot = String(data.get("company_website") ?? "").trim()
    if (honeypot) { setError("Something went wrong. Please try again."); return }

    const name    = String(data.get("name") ?? "").trim()
    const mobile  = String(data.get("mobile") ?? "").trim()
    const state   = String(data.get("state") ?? "").trim()
    const city    = String(data.get("city") ?? "").trim()
    const bizType = String(data.get("business_type") ?? "").trim()

    if (!name || !mobile || !state) {
      setError("Please fill in all required fields.")
      return
    }
    if (!/^\+?[\d\s\-]{10,15}$/.test(mobile)) {
      setError("Please enter a valid mobile number.")
      return
    }

    pushDataLayer({
      event: "dealer_application_attempt",
      lead_type: "dealer_inquiry",
      page: "/dealer-program",
    })

    setSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile,
          state,
          city:          city || undefined,
          business_type: bizType || undefined,
          company:       String(data.get("company") ?? "").trim() || undefined,
          gem_seller_id: String(data.get("gem_seller_id") ?? "").trim() || undefined,
          type:          "dealer_application",
          form_variant:  "dealer_program_page",
          attribution:   getPersistedAttribution(),
          form_page_url: window.location.href,
          form_page_path: window.location.pathname,
          company_website: honeypot,
        }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      // Fire generate_lead AFTER confirmed server response
      pushDataLayer({
        event: "generate_lead",
        lead_type: "dealer_inquiry",
        page_type: "dealer",
        value:    LEAD_VALUE_INR,
        currency: "INR",
        state,
      })

      router.push("/thank-you?type=dealer_inquiry")
    } catch {
      setError("Could not submit. Please try again or WhatsApp us directly.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
      <h3 className="font-bold text-gray-900 text-lg mb-1">Dealer Application</h3>
      <p className="text-xs text-gray-500 mb-6">Our team calls back within 24 hours.</p>

      <form onSubmit={handleSubmit} className="space-y-4 relative">
        {/* Honeypot */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="dealer-hp">Company website</label>
          <input id="dealer-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="d-name" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
            Your Name <span className="text-brand-700">*</span>
          </label>
          <input id="d-name" name="name" type="text" required autoComplete="name" placeholder="Contact person name"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200" />
        </div>

        <div>
          <label htmlFor="d-mobile" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
            Mobile Number <span className="text-brand-700">*</span>
          </label>
          <input id="d-mobile" name="mobile" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+91 XXXXX XXXXX"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="d-state" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
              State <span className="text-brand-700">*</span>
            </label>
            <select id="d-state" name="state" required
              className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 bg-white focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200">
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-city" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">City</label>
            <input id="d-city" name="city" type="text" placeholder="City"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200" />
          </div>
        </div>

        <div>
          <label htmlFor="d-company" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Company / Firm Name</label>
          <input id="d-company" name="company" type="text" autoComplete="organization" placeholder="Your registered company name"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200" />
        </div>

        <div>
          <label htmlFor="d-biz" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">Current Business Type</label>
          <select id="d-biz" name="business_type"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 bg-white focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200">
            <option value="">Select…</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="d-gem" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">GeM Seller ID (if any)</label>
          <input id="d-gem" name="gem_seller_id" type="text" placeholder="Your GeM portal seller ID (optional)"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200" />
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 text-base transition-colors">
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" />Submitting…</>
          ) : (
            "Apply for Dealership"
          )}
        </button>
        <p className="text-center text-[11px] text-gray-500">
          🔒 Your details are private. No spam. No obligation.
        </p>
      </form>
    </div>
  )
}
