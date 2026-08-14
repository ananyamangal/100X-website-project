"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
    { name: "gem_seller_id", label: "GeM Seller ID", type: "text", placeholder: "Your GeM portal seller ID (if you have one)", colSpan: 1 },
    { name: "gst", label: "GST Number", type: "text", placeholder: "15-digit GSTIN (if registered)" },
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
  /** Current locale — field labels/placeholders/options are translated via
   * the `LandingForm` message namespace; English literals in
   * FIELDS_BY_VARIANT above remain the source of truth and the fallback
   * whenever a translation key is missing for a given locale. */
  locale?: string
}

export default function LandingFormBlock({ block, landingSlug, locale = "en" }: Props) {
  const fields = FIELDS_BY_VARIANT[block.variant]
  const submissionType = FORM_SUBMISSION_TYPE[block.variant]
  const gaEvent = block.gaEvent || `${block.variant.replace("-", "_")}_submit`
  const router = useRouter()
  const t = useTranslations("LandingForm")

  // Translated string with graceful fallback to the English literal already
  // present in FIELDS_BY_VARIANT — never throws, never renders blank on a
  // missing key (e.g. a language whose LandingForm messages aren't seeded yet).
  const tf = (fieldName: string, key: "label" | "placeholder", fallback?: string) => {
    const msgKey = `fields.${block.variant}.${fieldName}.${key}`
    return t.has(msgKey) ? t(msgKey) : fallback
  }
  const tOptions = (fieldName: string, fallback: string[]) => {
    const msgKey = `fields.${block.variant}.${fieldName}.options`
    if (!t.has(msgKey)) return fallback
    const raw = t.raw(msgKey)
    return Array.isArray(raw) && raw.length === fallback.length ? (raw as string[]) : fallback
  }
  const tc = (key: string, fallback: string) => (t.has(`common.${key}`) ? t(`common.${key}`) : fallback)

  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Time-based bot gate (mirrors PartnerApplyForm's fix in commit fb362d1) —
  // NOT a value-check on the hidden field below. A visually-hidden-but-
  // DOM-present input named "company_website" sitting next to a real
  // "Company / Firm Name" field gets autofilled by real browsers often
  // enough that a value-based honeypot silently rejects genuine leads (this
  // exact bug already cost PartnerApplyForm real submissions once). The
  // hidden input stays in the DOM as a decoy but its value is intentionally
  // never sent to the server.
  const mountedAtRef = useRef<number>(Date.now())

  const update = (name: string, val: string) =>
    setValues((prev) => ({ ...prev, [name]: val }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const missing = fields.filter((f) => f.required && !(values[f.name] || "").trim())
    if (missing.length > 0) {
      const labels = missing.map((m) => tf(m.name, "label", m.label)).join(", ")
      setError(`${tc("requiredPrefix", "Please fill required:")} ${labels}`)
      return
    }

    // Time-gate: real users take more than 2s to notice the form and fill
    // it in; bots submit near-instantly. See mountedAtRef comment above —
    // this replaces relying on the hidden company_website field's value.
    if (Date.now() - mountedAtRef.current < 2000) {
      setError("Please try again.")
      return
    }

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
      data-locale={locale}
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
                  {tf(f.name, "label", f.label)}
                  {f.required ? <span aria-hidden="true" className="text-brand-700"> *</span> : null}
                </label>
                {f.type === "select" ? (
                  // Native <option> popups render with each browser's own opaque
                  // chrome — a translucent [[data-theme=dark-industrial]_&]:bg-white/5
                  // on the closed <select> (correct, shows the dark page through it)
                  // does NOT carry into that popup, so the inherited
                  // [[data-theme=dark-industrial]_&]:text-white left the open dropdown's
                  // options rendering white-on-white (same bug already fixed once in
                  // PartnerApplyForm, commit cd441f0). Fix mirrors that one: explicit
                  // opaque bg/text per theme on every <option>, plus color-scheme so
                  // the popup's own default chrome matches.
                  <select
                    id={id}
                    name={f.name}
                    required={f.required}
                    value={values[f.name] || ""}
                    onChange={(e) => update(f.name, e.target.value)}
                    disabled={submitting}
                    className="rounded-md border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60 [color-scheme:light] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:bg-white/5 [[data-theme=dark-industrial]_&]:text-white [[data-theme=dark-industrial]_&]:focus:border-green-500 [[data-theme=dark-industrial]_&]:focus:ring-brand-500/30 [[data-theme=dark-industrial]_&]:[color-scheme:dark]"
                  >
                    <option value="" className="bg-white text-gray-900 [[data-theme=dark-industrial]_&]:bg-slate-900 [[data-theme=dark-industrial]_&]:text-white">
                      {tc("selectPlaceholder", "Select…")}
                    </option>
                    {tOptions(f.name, f.options || []).map((o, i) => (
                      <option
                        key={f.options?.[i] || o}
                        value={f.options?.[i] || o}
                        className="bg-white text-gray-900 [[data-theme=dark-industrial]_&]:bg-slate-900 [[data-theme=dark-industrial]_&]:text-white"
                      >
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
                    placeholder={tf(f.name, "placeholder", f.placeholder)}
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
                {tc("submitting", "Sending…")}
              </>
            ) : (
              <>{tc("submit", "Submit")}</>
            )}
          </button>
          <p className="col-span-2 text-center text-[11px] text-gray-500 [[data-theme=dark-industrial]_&]:text-slate-400">
            🔒 {tc("privacyNote", "Your details stay private — we don't share with third parties.")}
          </p>
        </form>
      </div>
    </section>
  )
}
