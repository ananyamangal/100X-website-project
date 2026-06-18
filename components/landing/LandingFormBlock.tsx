"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  FORM_SUBMISSION_TYPE,
  type LandingFormBlockData,
  type LandingFormVariant,
} from "@/lib/seo/landing-types"
import {
  getPersistedAttribution,
  pushDataLayer,
} from "@/lib/gtm"

// generate_lead params per variant — values in INR
const GENERATE_LEAD_CFG: Record<LandingFormVariant, { lead_type: string; page_type: string; value: number }> = {
  reseller:        { lead_type: "oem_authorization",  page_type: "gem_oem",    value: 1000 },
  "tender-quote":  { lead_type: "tender_inquiry",     page_type: "tender",     value: 2000 },
  "state-dealer":  { lead_type: "dealer_inquiry",     page_type: "dealer",     value: 5000 },
  "guide-download":{ lead_type: "guide_download",     page_type: "guide",      value:  500 },
  "use-case-quote":{ lead_type: "use_case_quote",     page_type: "use_case",   value: 1500 },
}

type FormFieldDef = {
  name: string
  label: string
  type: "text" | "tel" | "email" | "select"
  required?: boolean
  placeholder?: string
  autoComplete?: string
  inputMode?: "text" | "tel" | "email"
  options?: string[]   // for select
  colSpan?: 1 | 2      // grid columns within the right-hand panel
}

// ─── Per-variant field schemas ────────────────────────────────────────────
// Keeps the JSX generic; adding a new variant = one entry here.

const FIELDS_BY_VARIANT: Record<LandingFormBlockData["variant"], FormFieldDef[]> = {
  reseller: [
    { name: "company", label: "Company / Firm Name", type: "text", required: true, placeholder: "Your registered company name", autoComplete: "organization" },
    { name: "name", label: "Your Name", type: "text", required: true, placeholder: "Contact person name", autoComplete: "name", colSpan: 1 },
    { name: "mobile", label: "Mobile Number", type: "tel", required: true, placeholder: "+91 XXXXX XXXXX", autoComplete: "tel", inputMode: "tel", colSpan: 1 },
    { name: "city", label: "City / State", type: "text", required: true, placeholder: "e.g. Lucknow, UP", autoComplete: "address-level1", colSpan: 1 },
    { name: "gem_seller_id", label: "GeM Seller ID", type: "text", required: true, placeholder: "Your GeM portal seller ID", colSpan: 1 },
    { name: "gst", label: "GST Number", type: "text", required: true, placeholder: "15-digit GSTIN" },
    {
      name: "capacity",
      label: "Monthly Order Capacity",
      type: "select",
      options: ["1–5 machines/month", "5–20 machines/month", "20–50 machines/month", "50+ machines/month"],
    },
  ],
  "tender-quote": [
    { name: "organization", label: "Organization / Department", type: "text", required: true, placeholder: "Municipal Corporation, Health Dept, etc.", autoComplete: "organization" },
    { name: "name", label: "Your Name", type: "text", required: true, autoComplete: "name", colSpan: 1 },
    { name: "designation", label: "Designation", type: "text", placeholder: "Procurement Officer", colSpan: 1 },
    { name: "mobile", label: "Mobile Number", type: "tel", required: true, autoComplete: "tel", inputMode: "tel", colSpan: 1 },
    { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", inputMode: "email", colSpan: 1 },
    { name: "state", label: "Delivery State", type: "text", required: true, autoComplete: "address-level1" },
    { name: "requirement", label: "Requirement", type: "text", required: true, placeholder: "Machine type, quantity, tender ID if any" },
  ],
  "state-dealer": [
    { name: "name", label: "Your Name", type: "text", required: true, autoComplete: "name", colSpan: 1 },
    { name: "mobile", label: "Mobile Number", type: "tel", required: true, autoComplete: "tel", inputMode: "tel", colSpan: 1 },
    { name: "company", label: "Company Name (if any)", type: "text", autoComplete: "organization" },
    { name: "city", label: "City", type: "text", required: true, colSpan: 1 },
    { name: "state", label: "State", type: "text", required: true, autoComplete: "address-level1", colSpan: 1 },
    { name: "current_business", label: "Current Business", type: "text", placeholder: "Pest control, agri supplies, etc." },
    {
      name: "monthly_volume",
      label: "Expected Monthly Volume",
      type: "select",
      options: ["1–5 machines", "5–20 machines", "20–50 machines", "50+ machines"],
    },
  ],
  "guide-download": [
    { name: "name", label: "Your Name", type: "text", required: true, autoComplete: "name", colSpan: 1 },
    { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", inputMode: "email", colSpan: 1 },
    { name: "mobile", label: "Mobile (optional)", type: "tel", autoComplete: "tel", inputMode: "tel" },
    { name: "role", label: "Role", type: "text", placeholder: "Procurement, dealer, farm owner..." },
  ],
  "use-case-quote": [
    { name: "name", label: "Your Name", type: "text", required: true, autoComplete: "name", colSpan: 1 },
    { name: "mobile", label: "Mobile Number", type: "tel", required: true, autoComplete: "tel", inputMode: "tel", colSpan: 1 },
    { name: "organization", label: "Organization (optional)", type: "text", autoComplete: "organization" },
    { name: "scale", label: "Scale of Operation", type: "text", placeholder: "Daily area covered, herd size, etc." },
    { name: "location", label: "Location", type: "text", required: true, placeholder: "City, State" },
  ],
}

type Props = {
  block: LandingFormBlockData
  /** Slug of the landing page — added to the submission for analytics. */
  landingSlug: string
}

export default function LandingFormBlock({ block, landingSlug }: Props) {
  const fields = FIELDS_BY_VARIANT[block.variant]
  const submissionType = FORM_SUBMISSION_TYPE[block.variant]
  const gaEvent = block.gaEvent || `${block.variant.replace("-", "_")}_submit`
  const router = useRouter()

  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (name: string, val: string) =>
    setValues((prev) => ({ ...prev, [name]: val }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const missing = fields.filter((f) => f.required && !(values[f.name] || "").trim())
    if (missing.length > 0) {
      setError(`Please fill required: ${missing.map((m) => m.label).join(", ")}`)
      return
    }

    const honeypot =
      (e.currentTarget.elements.namedItem("company_website") as HTMLInputElement | null)?.value ?? ""

    pushDataLayer({
      event: `${gaEvent}_attempt`,
      variant: block.variant,
      landing_slug: landingSlug,
    })

    setSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          type: submissionType,
          form_variant: block.variant,
          landing_slug: landingSlug,
          attribution: getPersistedAttribution(),
          form_page_url: typeof window !== "undefined" ? location.href : "",
          form_page_path: typeof window !== "undefined" ? location.pathname : "",
          company_website: honeypot,
        }),
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)

      pushDataLayer({
        event: gaEvent,
        variant: block.variant,
        landing_slug: landingSlug,
      })

      // Fire generate_lead AFTER confirmed server response — triggers Google Ads conversion
      const leadCfg = GENERATE_LEAD_CFG[block.variant]
      pushDataLayer({
        event: "generate_lead",
        lead_type:    leadCfg.lead_type,
        page_type:    leadCfg.page_type,
        value:        leadCfg.value,
        currency:     "INR",
        variant:      block.variant,
        landing_slug: landingSlug,
      })

      setValues({})
      toast.success("Received! Our team will contact you within 24 hours.")
      router.push(`/thank-you?type=${leadCfg.lead_type}`)
    } catch {
      setError("Something went wrong. Please try again or contact us directly.")
      toast.error("Couldn't submit — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="landing-form"
      className="py-16 md:py-20 border-y border-gray-200 bg-gradient-to-br from-green-50/60 via-white to-white [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:from-green-500/[0.06] [[data-theme=dark-industrial]_&]:via-[#0e2040]/80 [[data-theme=dark-industrial]_&]:to-[#0e2040]/80"
    >
      <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-2 gap-10 md:gap-14 items-start">
        <div>
          {block.eyebrow ? (
            <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.15em] text-brand-700 mb-3 [[data-theme=dark-industrial]_&]:text-brand-400">
              {block.eyebrow}
            </p>
          ) : null}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight [[data-theme=dark-industrial]_&]:text-white">
            {block.title}
          </h2>
          {block.sub ? (
            <p className="mt-3 text-base text-gray-600 leading-relaxed [[data-theme=dark-industrial]_&]:text-slate-300">
              {block.sub}
            </p>
          ) : null}
          {block.checklist?.length ? (
            <ul className="mt-6 space-y-2.5 list-none">
              {block.checklist.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-gray-700 [[data-theme=dark-industrial]_&]:text-slate-200"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white text-xs font-bold [[data-theme=dark-industrial]_&]:bg-brand-500 [[data-theme=dark-industrial]_&]:text-black"
                  >
                    ✓
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="relative grid grid-cols-2 gap-3">
          {/* Honeypot */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="landing-form-hp">Company website</label>
            <input id="landing-form-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {fields.map((f) => {
            const span = f.colSpan === 1 ? "col-span-1" : "col-span-2"
            const id = `lf-${f.name}`
            return (
              <div key={f.name} className={`${span} flex flex-col gap-1.5`}>
                <label
                  htmlFor={id}
                  className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 [[data-theme=dark-industrial]_&]:text-slate-400"
                >
                  {f.label}
                  {f.required ? <span aria-hidden="true" className="text-brand-700"> *</span> : null}
                </label>
                {f.type === "select" ? (
                  <select
                    id={id}
                    name={f.name}
                    required={f.required}
                    value={values[f.name] || ""}
                    onChange={(e) => update(f.name, e.target.value)}
                    disabled={submitting}
                    className="rounded-md border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60 [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:bg-white/5 [[data-theme=dark-industrial]_&]:text-white [[data-theme=dark-industrial]_&]:focus:border-green-500 [[data-theme=dark-industrial]_&]:focus:ring-brand-500/30"
                  >
                    <option value="">Select…</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    name={f.name}
                    type={f.type}
                    inputMode={f.inputMode}
                    autoComplete={f.autoComplete}
                    placeholder={f.placeholder}
                    required={f.required}
                    value={values[f.name] || ""}
                    onChange={(e) => update(f.name, e.target.value)}
                    disabled={submitting}
                    className="min-h-[48px] rounded-md border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60 [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:bg-white/5 [[data-theme=dark-industrial]_&]:text-white [[data-theme=dark-industrial]_&]:placeholder:text-slate-500 [[data-theme=dark-industrial]_&]:focus:border-green-500 [[data-theme=dark-industrial]_&]:focus:ring-brand-500/30"
                  />
                )}
              </div>
            )
          })}

          {error ? (
            <p className="col-span-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            data-gtm={`landing_form_submit_${block.variant}`}
            className="col-span-2 mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-brand-700 disabled:opacity-60 disabled:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 [[data-theme=dark-industrial]_&]:bg-brand-500 [[data-theme=dark-industrial]_&]:text-black [[data-theme=dark-industrial]_&]:hover:bg-green-400 [[data-theme=dark-industrial]_&]:focus-visible:ring-green-300"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>Submit</>
            )}
          </button>
          <p className="col-span-2 text-center text-[11px] text-gray-500 [[data-theme=dark-industrial]_&]:text-slate-400">
            🔒 Your details stay private — we don't share with third parties.
          </p>
        </form>
      </div>
    </section>
  )
}
