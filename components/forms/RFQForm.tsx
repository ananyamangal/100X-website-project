"use client"

import React, { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Upload, X, FileText, MessageCircle, Phone, Download } from "lucide-react"
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
  /** Optional default product preselect. */
  defaultProduct?: ProductOption;
  /** Optional pre-fill organization/dept context. */
  defaultOrganization?: string;
  /** Telemetry location label so we know where the form lives. */
  location: string;
  /** Optional callback invoked after successful submit. */
  onSuccess?: () => void;
}

const PHONE_RE = /^[0-9+\-()\s]{10,18}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100x Circle, I just submitted an RFQ — please confirm receipt.",
)}`
const TEL_HREF = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`

export default function RFQForm({
  variant = "card",
  defaultProduct,
  defaultOrganization,
  location,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [product, setProduct] = useState<ProductOption | "">(defaultProduct ?? "")
  const [quantity, setQuantity] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState(defaultOrganization ?? "")
  const [cityState, setCityState] = useState("")
  const [description, setDescription] = useState("")
  const [gemAuth, setGemAuth] = useState(false)
  const [dealerInquiry, setDealerInquiry] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setProduct(defaultProduct ?? "")
    setQuantity("")
    setName("")
    setPhone("")
    setEmail("")
    setOrganization(defaultOrganization ?? "")
    setCityState("")
    setDescription("")
    setGemAuth(false)
    setDealerInquiry(false)
    setUploaded(null)
  }

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
    if (!name.trim() || !phone.trim() || !email.trim() || !organization.trim() || !cityState.trim()) {
      setError("Please fill all required fields.")
      return
    }
    const digits = phone.replace(/[^0-9]/g, "")
    if (!PHONE_RE.test(phone) || digits.length < 10 || digits.length > 15) {
      setError("Please enter a valid phone number (10–15 digits).")
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    const honeypot =
      (e.currentTarget.elements.namedItem("company_website") as HTMLInputElement | null)?.value ?? ""

    setSubmitting(true)
    pushDataLayer({ event: "rfq_form_submit_attempt", location, product })
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rfq",
          product,
          quantity,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          organization: organization.trim(),
          cityState: cityState.trim(),
          description: description.trim(),
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
      if (!res.ok) throw new Error(`Submission failed with status ${res.status}`)

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

      setSuccess(true)
      onSuccess?.()
      reset()
    } catch {
      setError("We couldn't save your request. Please try again or call us.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <SuccessScreen variant={variant} onReset={() => setSuccess(false)} />
    )
  }

  const isPanel = variant === "panel"

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isPanel
          ? "space-y-3 rounded-2xl bg-white/95 backdrop-blur p-5 md:p-6 shadow-xl ring-1 ring-black/5"
          : "space-y-4 rounded-2xl bg-white p-6 md:p-8 shadow-md ring-1 ring-gray-200"
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
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">Request a Quote</h3>
          <p className="text-sm text-gray-600 mt-1">Tender, GeM, dealer &amp; bulk inquiries.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label htmlFor="rfq-product" required>Interested Product</Label>
          <Select value={product} onValueChange={(v) => setProduct(v as ProductOption)}>
            <SelectTrigger id="rfq-product" className="min-h-[44px]">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rfq-qty" required>Quantity</Label>
          <Input id="rfq-qty" name="quantity" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 10" className="min-h-[44px]" />
        </div>
        <div>
          <Label htmlFor="rfq-name" required>Name</Label>
          <Input id="rfq-name" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="min-h-[44px]" />
        </div>
        <div>
          <Label htmlFor="rfq-phone" required>Phone</Label>
          <Input id="rfq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-[44px]" />
        </div>
        <div>
          <Label htmlFor="rfq-email" required>Email</Label>
          <Input id="rfq-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[44px]" />
        </div>
        <div>
          <Label htmlFor="rfq-org" required>Organization / Department</Label>
          <Input id="rfq-org" name="organization" autoComplete="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className="min-h-[44px]" />
        </div>
        <div>
          <Label htmlFor="rfq-loc" required>City / State</Label>
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
        <Label>Upload specifications / tender (PDF, DOC, DOCX, XLS, XLSX — max 10MB)</Label>
        <div
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            e.preventDefault()
            handleFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 py-5 text-center hover:border-green-600 hover:bg-green-50/40 transition-colors"
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
              <FileText size={16} className="text-green-700" aria-hidden="true" />
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
            <span className="flex flex-col items-center gap-1 text-sm text-gray-600">
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

      {error && (
        <p id="rfq-form-error" className="text-sm text-red-600 -mx-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 min-h-[48px] text-base font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting || uploading}
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

function SuccessScreen({ variant, onReset }: { variant: "card" | "panel"; onReset: () => void }) {
  const isPanel = variant === "panel"
  return (
    <div
      className={
        isPanel
          ? "rounded-2xl bg-white/95 backdrop-blur p-6 md:p-7 shadow-xl ring-1 ring-black/5 text-center"
          : "rounded-2xl bg-white p-8 md:p-10 shadow-md ring-1 ring-gray-200 text-center"
      }
    >
      <div className="mx-auto w-14 h-14 rounded-full bg-green-100 grid place-items-center mb-4">
        <FileText className="text-green-700" size={24} aria-hidden="true" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Thank you!</h3>
      <p className="text-sm md:text-base text-gray-600 mb-6">
        Our team will contact you shortly with a quote and next steps.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
        <Button asChild className="bg-green-600 hover:bg-green-700 min-h-[44px]">
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" data-gtm="cta_whatsapp" data-gtm-location="rfq_success">
            <MessageCircle className="mr-2" size={16} />
            WhatsApp Us
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <a href={TEL_HREF} data-gtm="cta_call" data-gtm-location="rfq_success">
            <Phone className="mr-2" size={16} />
            Call Now
          </a>
        </Button>
        <Button asChild variant="ghost" className="min-h-[44px]">
          <Link href="/contact-us#brochure">
            <Download className="mr-2" size={16} />
            Download Brochure
          </Link>
        </Button>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-xs text-gray-500 underline-offset-2 hover:underline"
      >
        Submit another RFQ
      </button>
    </div>
  )
}
