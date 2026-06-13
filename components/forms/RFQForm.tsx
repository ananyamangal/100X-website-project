"use client"

import React, { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, FileText, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BUSINESS } from "@/lib/seo/site-config"
import {
  getPersistedAttribution,
  pushDataLayer,
  setQuoteLeadContext,
} from "@/lib/gtm"
import { QUOTE_LEAD_VALUE_INR } from "@/components/cta/cta-config"

const PRODUCT_OPTIONS = [
  "Thermal Fogging Machine",
  "Mini Thermal Fogger",
  "Vehicle Mounted Fogger",
  "Agriculture Fogger",
  "Mosquito Control Fogger",
  "ULV Fogger",
  "Custom Requirement",
] as const

type ProductOption = (typeof PRODUCT_OPTIONS)[number]

interface UploadedFile {
  url: string;
  name: string;
  size: number;
}

interface Props {
  /** Visual variant. "card" = white surface with border; "panel" = compact for hero side panel. */
  variant?: "card" | "panel";
  /** Optional default product preselect (e.g. when opened from a product page). */
  defaultProduct?: ProductOption | string;
  /** Optional pre-fill organization/dept context. */
  defaultOrganization?: string;
  /** Optional pre-fill description (e.g. "Inquiring about: <product-name>"). */
  defaultDescription?: string;
  /** Telemetry location label so we know where the form lives. */
  location: string;
}

const PHONE_RE = /^[0-9+\-()\s]{10,18}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function buildWhatsAppMessage(fields: {
  product: string;
  quantity: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  cityState: string;
  description: string;
  gemAuth: boolean;
  dealerInquiry: boolean;
  uploadUrl: string | null;
}): string {
  const lines = [
    "*New RFQ — 100x Circle*",
    "",
    `Product: ${fields.product}`,
    fields.quantity ? `Quantity: ${fields.quantity}` : "",
    `Name: ${fields.name}`,
    `Phone: ${fields.phone}`,
    fields.email ? `Email: ${fields.email}` : "",
    fields.organization ? `Organization: ${fields.organization}` : "",
    fields.cityState ? `City/State: ${fields.cityState}` : "",
    fields.description ? `Notes: ${fields.description}` : "",
    `GeM auth: ${fields.gemAuth ? "Yes" : "No"}`,
    `Dealer inquiry: ${fields.dealerInquiry ? "Yes" : "No"}`,
    fields.uploadUrl ? `File: ${fields.uploadUrl}` : "",
  ].filter(Boolean)
  return lines.join("\n")
}

export default function RFQForm({
  variant = "card",
  defaultProduct,
  defaultOrganization,
  defaultDescription,
  location,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [product, setProduct] = useState<string>(defaultProduct ?? "")
  const [quantity, setQuantity] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState(defaultOrganization ?? "")
  const [cityState, setCityState] = useState("")
  const [description, setDescription] = useState(defaultDescription ?? "")
  const [gemAuth, setGemAuth] = useState(false)
  const [dealerInquiry, setDealerInquiry] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const startFiredRef  = useRef(false)

  const handleFormFocus = useCallback(() => {
    if (startFiredRef.current) return
    startFiredRef.current = true
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'rfq_start', page: typeof window !== 'undefined' ? window.location.pathname : '', source: location }),
    }).catch(() => {})
  }, [location])

  // Stage 2 (contact + extras) appears once a product is selected.
  const stage2Visible = Boolean(product)
  // When the form launches with a description prefilled (product pages), expand
  // the optional section so the user can see/edit it instead of hiding it.
  const [optionalForcedOpen] = useState(Boolean(defaultDescription))

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/rfq-upload", { method: "POST", body: fd })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(errBody.error || "Upload failed")
      }
      const body = (await res.json()) as UploadedFile
      setUploaded(body)
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!product) {
      setError("Please select a product of interest.")
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError("Please share your name and phone number so we can contact you.")
      return
    }
    const digits = phone.replace(/[^0-9]/g, "")
    if (!PHONE_RE.test(phone) || digits.length < 10 || digits.length > 15) {
      setError("Please enter a valid phone number (10–15 digits).")
      return
    }
    if (email.trim() && !EMAIL_RE.test(email)) {
      setError("Please enter a valid email address (or leave it blank).")
      return
    }

    const honeypot =
      (e.currentTarget.elements.namedItem("company_website") as HTMLInputElement | null)?.value ?? ""

    setSubmitting(true)
    pushDataLayer({ event: "rfq_form_submit_attempt", location, product })

    // Build the WhatsApp message and open the wa.me link immediately so the
    // popup is initiated inside the user gesture (avoids popup blockers).
    const waMessage = buildWhatsAppMessage({
      product,
      quantity,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      organization: organization.trim(),
      cityState: cityState.trim(),
      description: description.trim(),
      gemAuth,
      dealerInquiry,
      uploadUrl: uploaded?.url ?? null,
    })
    const waUrl = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waMessage)}`
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer")
    }

    // Fire the server submission. Email + DB save both happen here; either
    // succeeding is enough to claim delivery (we already opened WhatsApp).
    try {
      await fetch("/api/rfq-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          quantity,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          organization: organization.trim() || undefined,
          cityState: cityState.trim() || undefined,
          description: description.trim() || undefined,
          gemAuthRequired: gemAuth,
          dealerInquiry,
          uploadUrl: uploaded?.url ?? null,
          uploadName: uploaded?.name ?? null,
          uploadSizeBytes: uploaded?.size ?? null,
          attribution: getPersistedAttribution(),
          form_page_url: typeof window !== "undefined" ? window.location.href : "",
          form_page_path: typeof window !== "undefined" ? window.location.pathname : "",
          location_label: location,
          company_website: honeypot,
        }),
      })
      // We don't gate the user's flow on the response body — WhatsApp is
      // already open and they'll land on /thank-you either way.
    } catch (err) {
      // Network/server error: don't block. WhatsApp tab is already open.
      console.error("RFQ submit network error:", err)
    }

    setQuoteLeadContext({
      audience: gemAuth ? "tender" : dealerInquiry ? "distributor" : "default",
      product,
      name: name.trim(),
      phone: phone.trim(),
    })
    pushDataLayer({
      event: "rfq_submit",
      lead_type: "rfq",
      location,
      product,
      audience: gemAuth ? "tender" : dealerInquiry ? "distributor" : "default",
      value: QUOTE_LEAD_VALUE_INR,
      currency: "INR",
    })
    pushDataLayer({
      event: "generate_lead",
      lead_type: "rfq",
      location,
      product,
      value: QUOTE_LEAD_VALUE_INR,
      currency: "INR",
    })

    router.push("/thank-you?type=rfq")
  }

  const isPanel = variant === "panel"

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={handleFormFocus}
      className={
        isPanel
          ? "space-y-3 rounded-2xl bg-white/95 backdrop-blur p-5 md:p-6 shadow-xl ring-1 ring-black/5"
          : "space-y-4 rounded-2xl bg-white p-5 md:p-6 shadow-md ring-1 ring-gray-200"
      }
      noValidate
    >
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="rfq-hp">Company website</label>
        <input id="rfq-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {!isPanel && (
        <div className="mb-1">
          <h3 className="text-lg md:text-xl font-bold text-gray-900">Request a Quote</h3>
          <p className="text-xs md:text-sm text-gray-600 mt-0.5">Tender, GeM, dealer &amp; bulk inquiries.</p>
        </div>
      )}

      {/* STAGE 1 — always visible */}
      <div>
        <Label htmlFor="rfq-product" required>Interested Product</Label>
        <Select value={product} onValueChange={(v) => setProduct(v)}>
          <SelectTrigger id="rfq-product" className="min-h-[44px]">
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent className="z-[120]">
            {PRODUCT_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="rfq-qty">Quantity</Label>
        <Input
          id="rfq-qty"
          name="quantity"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g. 10"
          className="min-h-[44px]"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={gemAuth} onCheckedChange={(v) => setGemAuth(Boolean(v))} className="mt-0.5" />
          <span className="text-sm text-gray-800">GeM authorization required</span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={dealerInquiry} onCheckedChange={(v) => setDealerInquiry(Boolean(v))} className="mt-0.5" />
          <span className="text-sm text-gray-800">Dealer / Distributor inquiry</span>
        </label>
      </div>

      {/* STAGE 2 — appears after product selected */}
      {stage2Visible && (
        <>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Your contact</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rfq-name" required>Name</Label>
                <Input id="rfq-name" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="min-h-[44px]" />
              </div>
              <div>
                <Label htmlFor="rfq-phone" required>Phone</Label>
                <Input id="rfq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-[44px]" />
              </div>
            </div>
          </div>

          {/* Collapsible optional details */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              aria-expanded={showOptional}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`transition-transform ${showOptional ? "rotate-180" : ""}`}
              />
              {showOptional ? "Hide optional details" : "Add more details (optional)"}
            </button>
          </div>

          {(showOptional || optionalForcedOpen) && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rfq-email">Email</Label>
                  <Input id="rfq-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[44px]" />
                </div>
                <div>
                  <Label htmlFor="rfq-org">Organization / Department</Label>
                  <Input id="rfq-org" name="organization" autoComplete="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className="min-h-[44px]" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="rfq-loc">City / State</Label>
                  <Input id="rfq-loc" name="cityState" autoComplete="address-level2" value={cityState} onChange={(e) => setCityState(e.target.value)} className="min-h-[44px]" />
                </div>
              </div>

              <div>
                <Label htmlFor="rfq-desc">Requirement description</Label>
                <Textarea
                  id="rfq-desc"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={isPanel ? 2 : 3}
                  placeholder="Use case, specifications, timeline, delivery location..."
                />
              </div>

              <div>
                <Label>Upload specifications / tender (optional)</Label>
                <div
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFile(e.dataTransfer.files?.[0])
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 py-4 text-center hover:border-brand-600 hover:bg-brand-50/40 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  aria-label="Upload specifications or tender document"
                >
                  {uploading ? (
                    <span className="inline-flex items-center text-sm text-gray-600">
                      <Loader2 className="mr-2 animate-spin" size={16} aria-hidden="true" />
                      Uploading…
                    </span>
                  ) : uploaded ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-800">
                      <FileText size={16} className="text-brand-700" aria-hidden="true" />
                      <span className="font-medium truncate max-w-[14rem]">{uploaded.name}</span>
                      <button
                        type="button"
                        aria-label="Remove uploaded file"
                        onClick={(e) => { e.stopPropagation(); setUploaded(null) }}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </span>
                  ) : (
                    <span className="flex flex-col items-center gap-0.5 text-sm text-gray-600">
                      <span className="inline-flex items-center">
                        <Upload className="mr-2" size={16} aria-hidden="true" />
                        Drop a file here or click to upload
                      </span>
                      <span className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX — up to 10MB</span>
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p id="rfq-form-error" className="text-sm text-red-600 -mx-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-brand-600 hover:bg-brand-700 min-h-[48px] text-base font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting || uploading || !product}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={16} aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>Send RFQ</>
        )}
      </Button>

      <p className="text-[11px] leading-relaxed text-gray-500 text-center">
        By submitting you agree to be contacted about your inquiry. No spam.
      </p>
    </form>
  )
}

function Label({ htmlFor, required, children }: { htmlFor?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-700 mb-1">
      {children}
      {required && <span aria-hidden="true" className="text-red-600 ml-0.5">*</span>}
    </label>
  )
}
