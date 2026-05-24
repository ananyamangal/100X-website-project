# Polish & Performance Final Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Refine the homepage into a premium industrial OEM experience — replace eager-loaded iframe with a click-to-open video modal, lazy-load below-fold sections, reduce CTA redundancy, normalize visual tokens, audit mobile UX and accessibility, and verify schema/headings hold up.

**Scope discipline:**
- NO new homepage sections.
- NO over-animation or flashy effects.
- Changes must reduce, not add, visual density.

**Tech Stack:** Next.js 15 (`next/dynamic`, `next/image`), React 18, TypeScript, Tailwind CSS, lucide-react.

---

## Files to create

```
components/home/
  HeroVideoModal.tsx          # NEW — click-to-open YouTube modal (Task 1)
```

## Files to modify

- `components/home/HeroVideoBlock.tsx` — replace eager iframe with poster + click trigger (Task 1)
- `app/page.tsx` — `next/dynamic` for below-fold blocks; drop one redundant InlineInquiryCTA (Tasks 2, 3)
- `components/home/AccreditationsStrip.tsx`, `components/home/HeroBlock.tsx` (img tags) (Task 2)
- `components/home/TrustBlock.tsx`, `components/home/ManufacturingAuthorityBlock.tsx`, `components/home/SpecialisedBuyersBlock.tsx`, `components/home/TechnologyBlock.tsx` — visual token normalization (Task 4)
- `components/home/HeroBlock.tsx` (mobile spacing only) (Task 5)
- `components/forms/RFQForm.tsx` — small upload/validation feedback polish (Task 6)
- `components/forms/RFQFloatingRibbon.tsx` — focus trap + a11y (Task 7)

## Files NOT to touch

- `components/VideoPopup.tsx` (separate corner PIP, used by `app/layout.tsx`)
- The brochure modal inside `app/page.tsx`
- `app/api/*` routes
- Admin code
- SEO components (already verified in Phase 3)

---

## Design tokens (the system every change in this phase converges on)

| Token | Standard |
|---|---|
| Card radius | `rounded-2xl` |
| Heavy / hero radius | `rounded-3xl` (kept only where it already exists) |
| Pill / badge radius | `rounded-full` |
| Card shadow (rest) | `shadow-sm` |
| Card shadow (hover) | `hover:shadow-md` |
| Section bg-card surface | `bg-white` or `bg-gray-50/60` |
| Section padding | `py-16 md:py-20` (tight: `py-12 md:py-16`; dark/hero: `py-16 md:py-24`) |
| Card padding | `p-6 md:p-7` |
| Primary CTA padding | `px-8 py-4` (existing `py-5` shadowed variant for hero) |
| Min tap target | `min-h-[44px]` (forms), `min-h-[48px]` (primary CTAs) |

Tasks below cite these tokens. Where existing components already match, no change is needed — only the deviations get edited.

---

## Task 1: Click-to-open hero video modal

**Files:**
- Create: `components/home/HeroVideoModal.tsx`
- Modify: `components/home/HeroVideoBlock.tsx`

### Step 1: Create `HeroVideoModal.tsx`

```tsx
"use client"

import React, { useEffect, useRef } from "react"
import Link from "next/link"
import { X, MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"

interface Props {
  open: boolean;
  onClose: () => void;
  youtubeId: string;
}

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100x Circle, I just watched the demo video and would like to discuss further.",
)}`

export default function HeroVideoModal({ open, onClose, youtubeId }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Move focus into the modal for keyboard users.
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const embedSrc = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-video-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close video"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="hero-video-modal-title" className="sr-only">
          100X Fogging Machine Demo Video
        </h2>

        <div className="aspect-video w-full bg-black">
          <iframe
            className="w-full h-full border-0"
            src={embedSrc}
            title="100X Fogging Machine Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-gray-950 px-4 py-4 md:py-5 border-t border-white/10">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-base md:text-lg px-6 py-3 min-h-[44px]"
          >
            <Link href="/contact-us" className="flex items-center">
              Request a Demo <ArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-base md:text-lg px-6 py-3 min-h-[44px]"
          >
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="cta_whatsapp"
              data-gtm-location="hero_video_modal"
              className="flex items-center"
            >
              <MessageCircle className="mr-2" size={18} />
              WhatsApp Us
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Refactor `HeroVideoBlock.tsx` to use poster + click-to-open

The existing `HeroVideoBlock` renders a full `<iframe>` on mount. Replace it with:
- A clickable poster image (YouTube hqdefault thumbnail at `https://i.ytimg.com/vi/<id>/hqdefault.jpg`)
- A play-button overlay
- Click → opens `HeroVideoModal`

Replace the **entire body** of `HeroVideoBlock`'s `return` with:

```tsx
"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight, MessageCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"
import HeroVideoModal from "./HeroVideoModal"

const HERO_VIDEO_ID = "ZiVGNkvAI9g"

interface Props {
  youtubeId?: string;
}

export default function HeroVideoBlock({ youtubeId = HERO_VIDEO_ID }: Props) {
  const isPlaceholder = youtubeId === "REPLACE_WITH_HERO_VIDEO_ID"
  const [open, setOpen] = useState(false)
  const posterSrc = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`

  return (
    <section
      className="relative bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16 md:py-24 overflow-hidden"
      aria-labelledby="hero-video-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10 md:mb-14">
          <h2
            id="hero-video-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            See 100X Fogging Machines in Real-World Operation
          </h2>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Watch our pulse-jet thermal foggers cover dense vegetation, narrow lanes, and open fields — the same machines deployed by municipalities, Nagar Nigams, and farm cooperatives across India.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
          {isPlaceholder ? (
            <div
              className="aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-gray-400"
              role="status"
              aria-label="Demo video placeholder"
            >
              <div className="text-center">
                <Play className="mx-auto mb-3 opacity-60" size={48} aria-hidden="true" />
                <p className="text-sm md:text-base">Demo video coming soon</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Play 100X Fogging Machine demo video"
              data-gtm="hero_video_open"
              className="group relative block w-full aspect-video focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterSrc}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid place-items-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-600/95 text-white shadow-2xl ring-4 ring-white/20 group-hover:scale-110 transition-transform">
                  <Play size={28} className="ml-0.5" aria-hidden="true" />
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
          >
            <Link href="/contact-us" className="flex items-center">
              Talk to Our Team <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-4 bg-transparent"
          >
            <a
              href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I saw the demo video on your homepage and would like to discuss further.")}`}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="cta_whatsapp"
              data-gtm-location="hero_video"
              className="flex items-center"
            >
              <MessageCircle className="mr-2" size={20} />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>

      {!isPlaceholder && (
        <HeroVideoModal open={open} onClose={() => setOpen(false)} youtubeId={youtubeId} />
      )}
    </section>
  )
}
```

Key differences vs. the current file:
- No more eager `<iframe>` — replaced with `<button>` containing a YouTube thumbnail `<img>` + play overlay.
- New state `open` toggles the modal.
- `HeroVideoModal` renders only when `!isPlaceholder` so the placeholder branch stays clean.
- The lower CTA row ("Talk to Our Team" + "WhatsApp") stays unchanged.

### Step 3: Build + commit

```bash
npm run build
git add components/home/HeroVideoModal.tsx components/home/HeroVideoBlock.tsx
git commit -m "perf(hero): replace eager iframe with click-to-open video modal"
```

---

## Task 2: Performance — lazy load below-fold blocks

**Files:**
- Modify: `app/page.tsx`

The homepage currently renders every block server-side eagerly. Below-fold heavy blocks (BlogBlock, FAQSection, ContactSection) benefit from being deferred via `next/dynamic` (so their JS doesn't ship in the initial bundle). The above-fold sections must stay eagerly rendered to avoid LCP/CLS regressions.

### Step 1: Inspect existing imports in `app/page.tsx`

Confirm these imports exist as direct imports:
- `BlogBlock` from `@/components/home/BlogBlock`
- `FAQSection` from `@/components/FAQSection`
- `ContactSection` from `@/components/ContactSection`

### Step 2: Convert to dynamic imports

Replace those three static imports with dynamic ones. **Important:** `next/dynamic` is imported separately. Add at the top of the imports block:

```tsx
import dynamic from "next/dynamic"
```

Replace these three lines:

```tsx
import BlogBlock from "@/components/home/BlogBlock"
import FAQSection from "@/components/FAQSection"
import ContactSection from "@/components/ContactSection"
```

with:

```tsx
const BlogBlock = dynamic(() => import("@/components/home/BlogBlock"))
const FAQSection = dynamic(() => import("@/components/FAQSection"))
const ContactSection = dynamic(() => import("@/components/ContactSection"))
```

Notes:
- We don't set `ssr: false` because we still want SEO content for FAQs and the blog grid. `dynamic` without options keeps SSR on but code-splits the bundle so the initial page paint is faster.
- `ContactSection` is below-fold and can be deferred without SEO loss.

### Step 3: Lazy-load the YouTube Shorts iframes

In `app/page.tsx`, inside the inline `YoutubeShortsCarousel` component (look for `<iframe ... src={...embed/${id}}`), add `loading="lazy"` to the iframe element. This prevents YouTube embed JS from running until the iframe enters the viewport on most browsers.

The current iframe likely looks like:
```tsx
<iframe
  width="100%"
  height="100%"
  src={`https://www.youtube.com/embed/${id}?...`}
  title="YouTube Short"
  allow="..."
  allowFullScreen
  className="..."
></iframe>
```

Add `loading="lazy"` between `title` and `allow`:
```tsx
<iframe
  width="100%"
  height="100%"
  src={`https://www.youtube.com/embed/${id}?...`}
  title="YouTube Short"
  loading="lazy"
  allow="..."
  allowFullScreen
  className="..."
></iframe>
```

### Step 4: Build + commit

```bash
npm run build
git add app/page.tsx
git commit -m "perf(home): code-split BlogBlock/FAQSection/ContactSection + lazy YT iframes"
```

Note any change in the build output's bundle sizes (the Route `(static)` table). If `/` shrinks, perfect. If not, no harm — code-split still defers below-fold JS.

---

## Task 3: CTA density reduction

**Files:**
- Modify: `app/page.tsx`

The current homepage has FOUR major in-flow CTA blocks plus the floating ribbon plus the WhatsApp FAB plus the sticky mobile bar plus the navbar Call/WhatsApp. Two specific reductions:

### Reduction 1: Drop the InlineInquiryCTA between Tech and the RFQ mid-page block is dropped already (mid-page block sits between Tech and that CTA). Actually let me recheck — the current order is:

```
TechnologyBlock
RFQMidPageBlock
InlineInquiryCTA (Need this technology for your municipality...)
SectionConnector (The Range)
ProductsBlock
```

The InlineInquiryCTA after RFQMidPageBlock is redundant — RFQ block is itself an inquiry CTA. **Drop this InlineInquiryCTA.**

### Reduction 2: Drop the InlineInquiryCTA between TrustBlock and SpecialisedBuyersBlock

The current order:
```
TrustBlock
SpecialisedBuyersBlock          (4 buyer cards, each with 2 CTAs = 8 CTAs)
InlineInquiryCTA (Join 10,000+ buyers...)
StatesServedBlock
```

SpecialisedBuyersBlock immediately above already has 8 CTAs. Drop this InlineInquiryCTA.

### Step 1: Locate the two `<InlineInquiryCTA>` blocks in `app/page.tsx`

The remaining InlineInquiryCTA — the "Compare models..." one with `tone="dark"` between ProductsBlock/ManufacturingAuthorityBlock and YoutubeShortsCarousel — STAYS. It's the only inquiry CTA between Products and Trust, and it's high-intent (right after the products grid). Do not remove it.

### Step 2: Delete the two redundant blocks

Delete this JSX block (the "Need this technology..." one):
```tsx
<InlineInquiryCTA
  text="Need this technology for your municipality, farm, or estate?"
  whatsappMessage="Hi, I just read about your pulse-jet thermal fogging technology and would like to discuss requirements."
/>
```

And delete this JSX block (the "Join 10,000+ buyers..." one):
```tsx
<InlineInquiryCTA
  text="Join 10,000+ buyers — municipal, agricultural, and industrial — already running 100X equipment."
  whatsappMessage="Hi, I'd like to talk to your team about 100x Circle fogging machines."
/>
```

### Step 3: Verify the remaining InlineInquiryCTA still imports cleanly

Grep `app/page.tsx` for `InlineInquiryCTA` — there should be exactly 2 matches remaining (the import and one usage with `tone="dark"`).

### Step 4: Build + commit

```bash
npm run build
git add app/page.tsx
git commit -m "polish(cta): drop 2 redundant InlineInquiryCTAs (after RFQ block, after Trust)"
```

---

## Task 4: Visual system normalization

**Files:**
- Modify (small token edits): `components/home/TrustBlock.tsx`, `components/home/ManufacturingAuthorityBlock.tsx`, `components/home/SpecialisedBuyersBlock.tsx`, `components/home/TechnologyBlock.tsx`

We normalize on these tokens:
- Card radius: `rounded-2xl` (most cards already use this)
- Card hover shadow: `hover:shadow-md` (some currently use `hover:shadow-md`, some use nothing)
- Section padding for content sections: `py-16 md:py-20`

### Step 1: `TechnologyBlock.tsx`

Two specific edits:

**Edit A:** The "Why pulse-jet beats conventional spraying" benefits card currently uses `rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-12`. Change `p-8 md:p-12` to `p-8 md:p-10` to tighten the inner padding (matches the rest of the page rhythm).

Find:
```tsx
<div className="rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-12">
```
Replace with:
```tsx
<div className="rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-10">
```

**Edit B:** The 4 process-step cards use `p-6 md:p-7` already — keep them.

### Step 2: `TrustBlock.tsx`

The 3-up trust-cue grid currently uses `rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm`. Change the radius from `rounded-xl` to `rounded-2xl` to match the system token.

Find (inside the `STATS.map` block that renders trust cues):
```tsx
className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm"
```
Replace with:
```tsx
className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm"
```

### Step 3: `ManufacturingAuthorityBlock.tsx`

The 4 stat tiles use `rounded-2xl border border-white/10 bg-white/5 p-6 md:p-7`. Already matches the token — no change needed. Leave the file alone.

### Step 4: `SpecialisedBuyersBlock.tsx`

The 4 program cards already use `rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-8 hover:shadow-md`. Change `p-6 md:p-8` to `p-6 md:p-7` to match the system standard card padding.

Find:
```tsx
className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-8 hover:shadow-md transition-shadow flex flex-col"
```
Replace with:
```tsx
className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-7 hover:shadow-md transition-shadow flex flex-col"
```

### Step 5: Build + commit

```bash
npm run build
git add components/home/TechnologyBlock.tsx components/home/TrustBlock.tsx components/home/SpecialisedBuyersBlock.tsx
git commit -m "polish(design-tokens): normalize card radius/padding across Tech/Trust/SpecialisedBuyers"
```

---

## Task 5: Mobile UX micro-fixes

**Files:**
- Modify: `components/home/HeroBlock.tsx`

The mobile hero (`md:hidden` branch) was tightened in Phase 2 (`mb-6` → `mb-4` on badge and H2). The trust micro-row added in Phase 3 sits between the CTAs and the stats grid, and the RFQ collapsible was added in this RFQ phase below the stats. On 320px-wide viewports, the stack now reads: badge → H2 → phrase → 3 CTAs stacked → trust micro-row → stats grid → RFQ collapsible.

That's a lot of vertical content. Two small fixes to keep the mobile content compact:

### Step 1: Tighten the mobile CTA stack gap

In `HeroBlock.tsx`, find the mobile-branch CTA wrapper:
```tsx
<div className="flex flex-col gap-4 justify-center mb-8">
```
(it's the `md:hidden` branch's CTA wrapper containing the three Buttons).

Change `gap-4` → `gap-3` and `mb-8` → `mb-6` to tighten the vertical rhythm:
```tsx
<div className="flex flex-col gap-3 justify-center mb-6">
```

### Step 2: Tighten the mobile trust micro-row top spacing

In the same `HeroBlock.tsx` mobile branch, find the trust micro-row:
```tsx
<p className="text-xs text-gray-600 mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-md mx-auto">
```

Change `mb-6` → `mb-5` to tighten.

### Step 3: Build + commit

```bash
npm run build
git add components/home/HeroBlock.tsx
git commit -m "polish(mobile): tighten mobile hero CTA stack + trust-row spacing"
```

---

## Task 6: RFQ form micro-polish

**Files:**
- Modify: `components/forms/RFQForm.tsx`

Small refinements based on the brief's "RFQ UX polish — upload clarity, validation feedback, form spacing, thank-you UX".

### Edit 1: Upload helper text — clarify size + format up-front

Currently the upload zone shows "Drop a file here or click to upload" when no file is loaded, but the format/size hint is only in the label above. Add a smaller secondary line inside the drop zone for clarity.

Find the "no file uploaded" branch of the upload zone:
```tsx
) : (
  <span className="inline-flex items-center text-sm text-gray-600">
    <Upload className="mr-2" size={16} aria-hidden="true" />
    Drop a file here or click to upload
  </span>
)}
```

Replace with:
```tsx
) : (
  <span className="flex flex-col items-center gap-1 text-sm text-gray-600">
    <span className="inline-flex items-center">
      <Upload className="mr-2" size={16} aria-hidden="true" />
      Drop a file here or click to upload
    </span>
    <span className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX — up to 10MB</span>
  </span>
)}
```

### Edit 2: Validation error visibility — anchor scroll-into-view

In the `handleSubmit` function, when an early-return error is set (the "Please select a product...", "Please fill all required fields...", "Please enter a valid phone..." branches), the form scrolls aren't great if the user is far down the form. Add a small scroll-into-view of the error region after setting an error.

There are currently multiple `setError(...)` early-return statements. The simplest fix without restructuring: after the last `setError` in each branch, the early return prevents further work. Wrap the error display in an element with a stable `id`:

Find the existing error JSX:
```tsx
{error && <p className="text-sm text-red-600" role="alert">{error}</p>}
```

Replace with:
```tsx
{error && (
  <p id="rfq-form-error" className="text-sm text-red-600 -mx-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200" role="alert">
    {error}
  </p>
)}
```

(Improved visual treatment so the error is obvious.)

### Edit 3: Submit button — disable state visual

The submit Button gets `disabled={submitting || uploading}`. The current variant doesn't include an explicit `disabled:opacity-60 disabled:cursor-not-allowed` style hint. Add:

Find the submit button:
```tsx
<Button
  type="submit"
  className="w-full bg-green-600 hover:bg-green-700 min-h-[48px] text-base font-semibold shadow-md"
  disabled={submitting || uploading}
>
```

Replace with:
```tsx
<Button
  type="submit"
  className="w-full bg-green-600 hover:bg-green-700 min-h-[48px] text-base font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
  disabled={submitting || uploading}
>
```

### Step 4: Build + commit

```bash
npm run build
git add components/forms/RFQForm.tsx
git commit -m "polish(rfq): clearer upload helper, error styling, submit-disabled state"
```

---

## Task 7: A11y sweep — focus trap + ribbon focus styles

**Files:**
- Modify: `components/forms/RFQFloatingRibbon.tsx`

The hero video modal (Task 1) and RFQ slide-over modal (existing) both lock body scroll and listen for ESC. Quick a11y improvements specifically for the RFQ floating ribbon:

### Edit 1: Focus-trap the slide-over modal

When the RFQ slide-over opens, focus should move into the modal so keyboard users can immediately interact. The current implementation does NOT move focus.

In `components/forms/RFQFloatingRibbon.tsx`, find the existing `useEffect` that handles ESC + scroll-lock:

```tsx
useEffect(() => {
  if (!open) return
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false)
  }
  document.addEventListener("keydown", onKey)
  const prev = document.body.style.overflow
  document.body.style.overflow = "hidden"
  return () => {
    document.removeEventListener("keydown", onKey)
    document.body.style.overflow = prev
  }
}, [open])
```

Add a `useRef` for the close button at the top of the component:
```tsx
const closeButtonRef = useRef<HTMLButtonElement>(null)
```

And import `useRef` from React at the top:
```tsx
import React, { useEffect, useRef, useState } from "react"
```

Then add a line inside the effect (after the body overflow lock) to move focus to the close button:
```tsx
closeButtonRef.current?.focus()
```

And attach the ref to the close button in the JSX:
```tsx
<button
  ref={closeButtonRef}
  type="button"
  aria-label="Close RFQ form"
  ...
>
```

### Edit 2: Verify ribbon has visible focus state

The existing ribbon button already has `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-700`. Leave it.

### Step 3: Build + commit

```bash
npm run build
git add components/forms/RFQFloatingRibbon.tsx
git commit -m "a11y(rfq): focus close button on slide-over open"
```

---

## Task 8: Final verification

**Files:** none — verification only.

### Step 1: Build

```bash
npm run build
```

Exit 0. Diff bundle sizes against pre-phase baseline — `/` should be the same size or smaller (dynamic imports reduce eager JS).

### Step 2: Section order audit

Grep `app/page.tsx` for the major homepage components and confirm the FINAL order is:

```
HomepageJsonLd
HeroBlock (with rfqSlot={<RFQHeroPanel />})
HeroVideoBlock (now a poster + click-to-open modal)
SectionConnector (Built for India)
AccreditationsStrip
ManufacturerIntroBlock
SectionConnector (The Technology)
TechnologyBlock
RFQMidPageBlock
SectionConnector (The Range)
ProductsBlock
ManufacturingAuthorityBlock
InlineInquiryCTA (Compare models... dark)        ← the ONE remaining inline CTA
YoutubeShortsCarousel
OurCustomersScroll
SectionConnector (In Their Words)
TrustBlock
SpecialisedBuyersBlock
StatesServedBlock
BlogBlock (dynamic)
FAQSection (dynamic, 16 entries)
ContactSection (dynamic)
... + RFQFloatingRibbon + WhatsAppFloatingButton (floating, mounted near bottom)
```

### Step 3: Heading hierarchy + JSON-LD audit

- Grep for `<h1` in `components/home/*` and `app/page.tsx` — exactly one on the homepage.
- Read `components/seo/GlobalJsonLd.tsx` and `components/seo/HomepageJsonLd.tsx` to confirm they're still valid.
- Read `components/FAQSection.tsx` and confirm the FAQS array has 16 entries.

### Step 4: Dead CTA / link audit

Grep `app/page.tsx` and home components for `href="#"`. Any such hrefs are dead anchors and should be flagged. Expected: zero matches.

### Step 5: Document user-side checks the controller can't do

The following require a browser (controller flags these to the user for verification):
- PageSpeed Insights run on the deployed URL
- Rich Results validator (https://search.google.com/test/rich-results)
- Real mobile testing at 320 / 375 / 390 px
- CLS measurement
- Hydration warnings in console
- Keyboard navigation through every modal/popup
- Tap-target sizes on actual touch devices
- YouTube video modal autoplay behavior (some browsers block; muted should still autoplay)

### Step 6: Tag

```bash
git tag polish-complete -m "Final polish & performance phase complete"
```

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Video poster image fails to load if YouTube thumbnail URL changes | The poster URL pattern (`i.ytimg.com/vi/<id>/hqdefault.jpg`) is stable and documented; if it ever fails, the play overlay and click area still work — the user sees a black backdrop with the play button. |
| Dynamic imports break SSR for FAQ JSON-LD | We don't set `ssr: false`, so SSR remains; only the bundle split changes. FAQPage JSON-LD continues to be in the HTML at first paint. |
| Removing 2 InlineInquiryCTAs hurts conversion | We retain the one with highest intent (between Products and Trust). RFQMidPageBlock + the SpecialisedBuyersBlock cards provide more substantial CTA replacement. Worst case: A/B test re-introducing one if conversion drops in analytics. |
| Visual token normalization causes visible regressions | Edits are intentionally small and isolated. After each edit the build runs and the section order audit confirms no structural change. |
| Focus trap missing on hero video modal | Hero video modal in Task 1 already moves focus to the close button on open. Same pattern applied to RFQ ribbon in Task 7. |
| Mobile spacing changes look cramped on certain phones | Edits are mb-4/5/6 micro-adjustments, not structural. Easy to revert any single commit if user flags it. |
