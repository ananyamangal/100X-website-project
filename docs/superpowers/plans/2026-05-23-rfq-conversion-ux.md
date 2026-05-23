# RFQ Conversion UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Add a reusable RFQ (Request for Quote) form for high-intent procurement/tender leads, surface it in three placements on the homepage, and enhance the existing header CTAs with text labels. Add procurement/dealer/GeM FAQs.

**Architecture:** New `RFQForm` component built independently of the existing `QuoteModal` (which is a lightweight 3-field sticky CTA). RFQ submissions hit the existing `/api/submissions` endpoint with `type: "rfq"`. File uploads go through a new `/api/rfq-upload` endpoint with format/size validation. Three placements (hero panel / mid-page block / floating left ribbon) all import the same `RFQForm` component.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui (Input, Textarea, Button, Card, Select), lucide-react, MongoDB via existing infrastructure.

**Scope NOT in this phase (handled by polish phase next):**
- Typography refinement across sections
- General FAQ visual polish (only entity expansion lives here)
- General Trust section visual polish
- Performance audit, CLS optimization, mobile UX pass

---

## Files to create

```
components/forms/
  RFQForm.tsx                      # The 11-field form (Task 2)
  RFQHeroPanel.tsx                 # Hero-area wrapper for RFQForm (Task 3)
  RFQMidPageBlock.tsx              # Full-width mid-page wrapper (Task 4)
  RFQFloatingRibbon.tsx            # Vertical sticky ribbon + slide-over modal (Task 5)

app/api/rfq-upload/
  route.ts                         # File upload endpoint with validation (Task 1)
```

## Files to modify

- `components/Navbar.tsx` — add "WhatsApp Us" / "Call Now" text labels next to existing icons (Task 6)
- `components/FAQSection.tsx` — append 4 procurement/dealer/GeM Q&As (Task 7)
- `app/page.tsx` — wire RFQHeroPanel into the hero area + insert RFQMidPageBlock between Technology and Products, mount RFQFloatingRibbon (Task 8)
- `components/home/HeroBlock.tsx` — accept and render an optional RFQ slot prop (Task 3 supporting change)

---

## Task 1: RFQ file upload API route

**Files:**
- Create: `app/api/rfq-upload/route.ts`

The existing `/api/upload` is permissive (no validation, no size limit, only accepts image/brochure types). RFQ uploads need: PDF, DOC, DOCX, XLS, XLSX; max 10MB; safe filename.

### Step 1: Create the route

```ts
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"])

function sanitiseName(name: string): string {
  // Strip path separators, restrict to filename-safe characters.
  const base = path.basename(name)
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported format. Use PDF, DOC, DOCX, XLS, or XLSX." },
        { status: 415 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeName = `${Date.now()}-${sanitiseName(file.name)}`
    const folder = path.join(process.cwd(), "public", "rfq-uploads")
    await mkdir(folder, { recursive: true })
    const filePath = path.join(folder, safeName)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/rfq-uploads/${safeName}`,
      name: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error("RFQ upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
```

### Step 2: Verify the upload dir is gitignored

Check `.gitignore` for `public/rfq-uploads/` or a `public/*-uploads/` pattern. If neither exists, append `public/rfq-uploads/` to `.gitignore` so uploaded user files aren't committed.

### Step 3: Build + commit

```bash
npm run build
git add app/api/rfq-upload/route.ts .gitignore
git commit -m "feat(rfq): /api/rfq-upload route — PDF/DOC/XLS validation, 10MB cap"
```

---

## Task 2: `RFQForm` reusable component

**Files:**
- Create: `components/forms/RFQForm.tsx`

The form has 11 fields, file upload, validation, success state with WhatsApp + Call CTAs.

### Step 1: Create the component

```tsx
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
  /** Optional default product preselect (e.g. when opened from a product page). */
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
  const dropRef = useRef<HTMLDivElement>(null)
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
    } catch (e: any) {
      setError(e?.message || "Upload failed")
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
          form_page_url: typeof window !== "undefined" ? location.toString() : "",
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
          <p className="text-sm text-gray-600 mt-1">Tender, GeM, dealer & bulk inquiries.</p>
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
          ref={dropRef}
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
            <span className="inline-flex items-center text-sm text-gray-600">
              <Upload className="mr-2" size={16} aria-hidden="true" />
              Drop a file here or click to upload
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

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 min-h-[48px] text-base font-semibold shadow-md"
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
```

Notes for implementer:
- The `Select`, `Checkbox`, `Input`, `Textarea`, `Button` are shadcn/ui components already in the project at `components/ui/*`. They follow the existing pattern.
- The local `Label` helper component handles consistent label styling with optional `*` required indicator.
- The honeypot pattern matches `QuoteModal` for bot resistance.
- GTM events match the existing convention (`rfq_form_submit_attempt`, `rfq_submit`, `generate_lead`).
- The `audience` mapping rule: `gemAuth → tender > dealerInquiry → distributor > default`.

### Step 2: Build + commit

```bash
npm run build
git add components/forms/RFQForm.tsx
git commit -m "feat(rfq): RFQForm — 11-field form with upload, validation, success state"
```

If shadcn/ui `Select` isn't already used elsewhere, check it exists at `components/ui/select.tsx`. It does (verified in the existing imports/list).

---

## Task 3: `RFQHeroPanel` — hero-area side panel placement

**Files:**
- Create: `components/forms/RFQHeroPanel.tsx`
- Modify: `components/home/HeroBlock.tsx` — accept and render an optional right-side panel slot via children (or a new prop)
- Modify: `app/page.tsx` — pass the panel into HeroBlock

### Step 1: Create `RFQHeroPanel.tsx`

```tsx
"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp, FileText } from "lucide-react"
import RFQForm from "./RFQForm"

export default function RFQHeroPanel() {
  // Mobile starts collapsed to keep hero scannable.
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <>
      {/* Desktop: persistent side panel */}
      <div className="hidden md:block w-full max-w-md mx-auto md:ml-auto md:mr-0">
        <RFQForm variant="panel" location="hero_panel_desktop" />
      </div>

      {/* Mobile: collapsible block */}
      <div className="md:hidden mt-6 mx-auto max-w-md">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="rfq-hero-mobile"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full inline-flex items-center justify-between rounded-xl bg-white shadow-md ring-1 ring-gray-200 px-4 py-3 text-sm font-semibold text-gray-900"
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="text-green-700" size={18} aria-hidden="true" />
            Request a Quote / Tender Inquiry
          </span>
          {mobileOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>
        {mobileOpen && (
          <div id="rfq-hero-mobile" className="mt-3">
            <RFQForm variant="panel" location="hero_panel_mobile" />
          </div>
        )}
      </div>
    </>
  )
}
```

### Step 2: Modify `HeroBlock.tsx` to render the RFQ panel slot

Currently the desktop hero has a 2-column layout: text-content on the left, an empty `<div className="hidden md:block">` on the right. Repurpose that empty right column to receive an optional `rfqSlot` prop.

In `components/home/HeroBlock.tsx`:

1. Add `rfqSlot?: React.ReactNode` to the `Props` interface.
2. In the destructure, add `rfqSlot,`.
3. Find the empty `<div className="hidden md:block"></div>` placeholder inside the desktop hero (in the `grid md:grid-cols-2 gap-8 items-center w-full` grid). Replace it with:
   ```tsx
   <div className="hidden md:block">
     {rfqSlot}
   </div>
   ```
4. In the mobile branch (`md:hidden`), after the existing content `<div className="text-center">...stats...</div>` but BEFORE the closing of the content section, insert the rfqSlot slot:
   ```tsx
   {rfqSlot}
   ```
   This places the collapsible mobile RFQ panel below the hero CTAs.

### Step 3: Modify `app/page.tsx` to pass the panel into HeroBlock

Add the import:
```tsx
import RFQHeroPanel from "@/components/forms/RFQHeroPanel"
```

Find the `<HeroBlock ... />` JSX. Add the `rfqSlot` prop:
```tsx
<HeroBlock
  heroSlides={heroSlides}
  currentSlide={currentSlide}
  setCurrentSlide={setCurrentSlide}
  currentSlideData={currentSlideData}
  bannersLoading={bannersLoading}
  bannerTouchStartX={bannerTouchStartX}
  stats={stats}
  changingPhrases={changingPhrases}
  phraseIndex={phraseIndex}
  rfqSlot={<RFQHeroPanel />}
/>
```

### Step 4: Build + commit

```bash
npm run build
git add components/forms/RFQHeroPanel.tsx components/home/HeroBlock.tsx app/page.tsx
git commit -m "feat(rfq): RFQHeroPanel — desktop side panel + mobile collapsible in hero"
```

---

## Task 4: `RFQMidPageBlock` — between Technology and Products

**Files:**
- Create: `components/forms/RFQMidPageBlock.tsx`
- Modify: `app/page.tsx`

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import RFQForm from "./RFQForm"

export default function RFQMidPageBlock() {
  return (
    <section
      className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24"
      aria-labelledby="rfq-mid-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10 md:mb-12">
          <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            Procurement & Bulk Inquiry
          </Badge>
          <h2
            id="rfq-mid-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight"
          >
            Request a Quote for Government, Municipal & Bulk Orders
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            GeM-ready documentation, GST invoices, and compliance certificates included. Upload your tender or specifications and our procurement desk will respond within 48 hours.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <RFQForm variant="card" location="mid_page_block" />
        </div>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Add the import:
```tsx
import RFQMidPageBlock from "@/components/forms/RFQMidPageBlock"
```

Currently between `<TechnologyBlock />` and the existing `<InlineInquiryCTA text="Need this technology..." />`, we add the mid-page RFQ block. Place it directly after `<TechnologyBlock />` and BEFORE the InlineInquiryCTA. So the new flow becomes:

```
<TechnologyBlock />
<RFQMidPageBlock />                           ← NEW
<InlineInquiryCTA text="Need this technology..." />
<SectionConnector eyebrow="The Range" ... />
<ProductsBlock ... />
```

(This makes the RFQ block the immediate next-step after the technology explainer, which is the highest-intent moment.)

### Step 3: Build + commit

```bash
npm run build
git add components/forms/RFQMidPageBlock.tsx app/page.tsx
git commit -m "feat(rfq): mid-page RFQ block between Technology and Products"
```

---

## Task 5: `RFQFloatingRibbon` — vertical sticky CTA + slide-over modal

**Files:**
- Create: `components/forms/RFQFloatingRibbon.tsx`
- Modify: `app/page.tsx`

A small vertical ribbon stuck to the left edge on desktop (hidden on mobile to avoid clutter with the bottom CTA bar). Clicking it opens a slide-over modal containing the RFQForm.

### Step 1: Create the component

```tsx
"use client"

import React, { useEffect, useState } from "react"
import { FileText, X } from "lucide-react"
import RFQForm from "./RFQForm"

export default function RFQFloatingRibbon() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Vertical ribbon — desktop only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open RFQ / Tender inquiry form"
        data-gtm="rfq_ribbon_open"
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[60] origin-left rotate-180 [writing-mode:vertical-rl] items-center gap-2 px-3 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold tracking-wide shadow-lg rounded-tr-xl rounded-br-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-700"
      >
        <FileText size={16} aria-hidden="true" />
        <span>RFQ / Tender Inquiry</span>
      </button>

      {/* Slide-over modal */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/55 flex items-stretch justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfq-modal-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto p-5 md:p-8 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="rfq-modal-title" className="text-xl md:text-2xl font-bold text-gray-900">
                  RFQ / Tender Inquiry
                </h2>
                <p className="text-sm text-gray-600 mt-1">Government, municipal, dealer, and bulk orders.</p>
              </div>
              <button
                type="button"
                aria-label="Close RFQ form"
                className="-mr-2 -mt-2 rounded-md p-2 text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                onClick={() => setOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <RFQForm variant="card" location="floating_ribbon" onSuccess={() => { /* keep open so the user can act on success CTAs */ }} />
          </div>
        </div>
      )}
    </>
  )
}
```

Notes:
- `[writing-mode:vertical-rl]` + `rotate-180` rotates the ribbon text 90° to read bottom-to-top along the left edge (standard pattern for vertical sticky ribbons).
- Hidden on mobile (`md:flex`) because mobile already has the `MobileCtaBar` at the bottom.
- The slide-over modal animates in from the right; `body` overflow is locked while open.

### Step 2: Wire into `app/page.tsx`

Add the import:
```tsx
import RFQFloatingRibbon from "@/components/forms/RFQFloatingRibbon"
```

Add `<RFQFloatingRibbon />` near the existing floating elements — e.g., right after `<WhatsAppFloatingButton ... />` is mounted. If the WhatsApp button mount lives near the bottom of the JSX inside the homepage return, place `<RFQFloatingRibbon />` next to it.

### Step 3: Build + commit

```bash
npm run build
git add components/forms/RFQFloatingRibbon.tsx app/page.tsx
git commit -m "feat(rfq): floating left ribbon + slide-over modal — desktop only"
```

---

## Task 6: Navbar — add text labels to existing Call + WhatsApp icons

**Files:**
- Modify: `components/Navbar.tsx`

The navbar already has icon-only Call + WhatsApp buttons. The brief asks for text labels. We add labels on desktop only (mobile stays icon-only for space).

### Step 1: Update the `contactIcons` JSX

In `Navbar.tsx`, replace the existing `contactIcons` JSX with this enhanced version:

```tsx
const contactIcons = (
  <div
    data-gtm-location="navbar"
    className="flex items-center gap-1 md:gap-2"
    aria-label="Quick contact"
  >
    <a
      href={TEL_HREF}
      aria-label={`Call ${BUSINESS.phonePrimary}`}
      data-gtm="nav_call"
      className="inline-flex items-center gap-1.5 h-10 px-2.5 md:px-3 rounded-full text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
    >
      <Phone size={18} aria-hidden="true" />
      <span className="hidden md:inline text-sm font-semibold">Call Now</span>
    </a>
    <a
      href={WA_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      data-gtm="nav_whatsapp"
      className="inline-flex items-center gap-1.5 h-10 px-2.5 md:px-3 rounded-full text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
    >
      <MessageCircle size={18} aria-hidden="true" />
      <span className="hidden md:inline text-sm font-semibold">WhatsApp Us</span>
    </a>
  </div>
)
```

(`hidden md:inline` keeps the text labels off small screens.)

### Step 2: Build + commit

```bash
npm run build
git add components/Navbar.tsx
git commit -m "feat(nav): add 'Call Now' / 'WhatsApp Us' text labels (desktop) next to icons"
```

---

## Task 7: FAQ entity expansion — procurement / dealer / GeM additions

**Files:**
- Modify: `components/FAQSection.tsx`

We already have 12 FAQs (post Phase 3). Append 4 procurement-focused ones the RFQ user persona will search for.

### Step 1: Append entries

After the current 12 entries (before the closing `]` of the `FAQS` array), append:

```ts
{
  q: "What documents do you provide for tender submission and GeM purchase orders?",
  a:
    "We provide complete tender-ready documentation: GST invoice, OEM authorization letter, BIS certificate (where applicable), test reports, warranty letter, performance certificate from a comparable past supply, and ISO compliance documentation. Documents are issued within 48 hours of RFQ confirmation; complex tenders with custom configurations may take longer.",
},
{
  q: "Can you supply on rate contracts to municipal corporations and state government departments?",
  a:
    "Yes. We hold rate contracts with municipal corporations across India and supply on annual rate contracts to state public-health departments. Share your RC requirement (validity, indicative volume, delivery schedule) and we'll prepare a rate-contract proposal aligned to your procurement cycle.",
},
{
  q: "What is the minimum order quantity for dealer/distributor onboarding?",
  a:
    "Dealer onboarding typically starts with a 10-machine pilot order to qualify the territory; some categories (small portable foggers) start lower. Distributor agreements usually have annual volume commitments aligned to territory size. Margins and exclusivity terms scale with volume — share your business profile and territory for specific numbers.",
},
{
  q: "Do you provide training and demo support for dealers and large institutional buyers?",
  a:
    "Yes. We provide hands-on operator training at delivery, a demo machine for the first 30 days of dealer onboarding, video and PDF training material in English and Hindi, and remote troubleshooting support. For larger institutional buyers, we send a field engineer for first-deployment commissioning at no extra cost.",
},
```

The FAQS array goes from 12 to **16** entries. The FAQPage JSON-LD picks up the new entries automatically (no other changes needed).

### Step 2: Build + commit

```bash
npm run build
git add components/FAQSection.tsx
git commit -m "feat(seo): expand FAQs 12 -> 16 with procurement / dealer / GeM topics"
```

---

## Task 8: Final verification

**Files:** none.

### Step 1: Build + audit

```bash
npm run build
```

Exit 0.

### Step 2: Section order audit

Grep `app/page.tsx` for the major homepage components. Verify final order is:

```
HomepageJsonLd
HeroBlock (with rfqSlot={<RFQHeroPanel />})
HeroVideoBlock
SectionConnector (Built for India)
AccreditationsStrip
ManufacturerIntroBlock
SectionConnector (The Technology)
TechnologyBlock
RFQMidPageBlock                       ← NEW (Task 4)
InlineInquiryCTA (Need this technology...)
SectionConnector (The Range)
ProductsBlock
ManufacturingAuthorityBlock
InlineInquiryCTA (Compare models... dark)
YoutubeShortsCarousel
OurCustomersScroll
SectionConnector (In Their Words)
TrustBlock
SpecialisedBuyersBlock
InlineInquiryCTA (Join 10,000+ buyers...)
StatesServedBlock
BlogBlock
FAQSection (16 entries)
ContactSection
... + RFQFloatingRibbon mounted near WhatsAppFloatingButton
```

### Step 3: Heading hierarchy

Grep for `<h1` across home components and verify exactly one (in HeroBlock desktop). New components introduce `<h2>` headings — no skipped levels.

### Step 4: GTM event audit

Confirm new events fire from the right locations:
- `rfq_form_submit_attempt`, `rfq_submit`, `generate_lead` from RFQForm
- `rfq_ribbon_open` from the ribbon button
- `cta_call` / `cta_whatsapp` from the success-screen CTAs

### Step 5: Tag

```bash
git tag rfq-conversion-complete -m "RFQ conversion UX phase complete"
```

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| File upload writes to local FS; not durable on serverless | Document as known limitation. For now, uploads land in `public/rfq-uploads/`. Migrate to S3/Cloudinary in a later phase if needed. The submission still saves to MongoDB with the URL reference, so leads aren't lost. |
| Floating ribbon overlaps with other left-side UI elements | Hidden on mobile (`md:flex`). Z-index 60 — below the slide-over modal (90) and the brochure modal (100). Verify no left-side floating elements exist before this task lands. |
| Hero panel breaks the desktop hero's visual rhythm | The right column was previously empty (`<div className="hidden md:block"></div>`). Inserting the panel actually balances the hero. Mobile uses a collapsible to avoid pushing the stats off-screen. |
| RFQ form length (11 fields) hurts mobile completion | Mobile collapsible defers the form; mid-page block is the primary mobile entry. Honeypot + GA generate_lead events let us measure drop-off and trim later. |
| GST/compliance document copy mentions specific certificates we may not have | The FAQ answers reference common documents that genuine OEM manufacturers provide. If any are inaccurate for 100x, user can flag and we edit. Default copy is conservative. |
