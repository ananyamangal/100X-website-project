# Homepage Phase 1 — Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `app/page.tsx` from 1716 lines to ~1100 by extracting the six homepage sections into `components/home/`. Visual output, behavior, copy, and styling must be byte-identical.

**Architecture:** Pure mechanical refactor. Each section's JSX is lifted into its own presentational component under `components/home/`. State remains in `app/page.tsx` and is passed down via props (safest path for zero-behavior change). Helper components (`OurCustomersScroll`, `YoutubeShortsCarousel`, `ProductDetailPage`) and inline `badgeLogoMap`/`getYouTubeId`/`formatDate` stay where they are — not in Phase 1 scope.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, embla-carousel, lucide-react. Existing project conventions.

---

## Spec reference

`docs/superpowers/specs/2026-05-23-homepage-redesign-design.md` — Phase 1 section.

## Files to create

```
components/home/
  AccreditationsStrip.tsx      # was inline AccreditationsScroll
  ManufacturerIntroBlock.tsx   # was inline <section> "Manufacturer Intro"
  BlogBlock.tsx                # was inline <section> "Blog Preview"
  TrustBlock.tsx               # was inline <section> "Reviews Carousel" + the inline ReviewsCarousel helper
  ProductsBlock.tsx            # was inline <section id="products">
  HeroBlock.tsx                # was inline <section id="home"> (hero with slider)
```

## Files to modify

- `app/page.tsx` — remove the lifted code, add imports, replace each section's JSX with `<ComponentName ... />` usage.

## Files NOT to touch in Phase 1

- `components/FAQSection.tsx`, `components/ContactSection.tsx`, `components/Navbar.tsx`, `components/SiteFooter.tsx`, `components/WhatsAppFloatingButton.tsx`, `components/cta/MobileCtaBar.tsx` — already components.
- Inline helpers `OurCustomersScroll`, `YoutubeShortsCarousel`, `ProductDetailPage`, `badgeLogoMap`, `getYouTubeId`, `formatDate`, `LOGO_PLACEHOLDER` — out of scope for Phase 1.
- The `currentPage` state-driven SPA routing pattern — out of scope (separate effort).
- Brochure form modal — stays inline.
- Header `<nav>`/footer JSX in `app/page.tsx` — stays inline.

## Conventions used in every task

Each component file follows this skeleton (the imports listed inside differ per task):

```tsx
"use client"

import React from "react"
// ... only the imports this component actually uses

interface Props {
  // ... only the props this component actually receives
}

export default function ComponentName(props: Props) {
  return (
    // ... the lifted JSX, byte-for-byte
  )
}
```

`"use client"` is required because every section uses event handlers, state hooks, or other client-only features. Match the existing project pattern.

After every task, the verification gate is:

```bash
pnpm build
```

Exit code must be 0. TypeScript errors must be 0 (or match the pre-extraction baseline captured in Task 0). Then a manual visual spot-check at `http://localhost:3000/` in `pnpm dev`. After each task, commit before moving on.

---

## Task 0: Preflight — baseline capture

**Files:** none (read-only)

- [ ] **Step 1: Confirm clean working tree**

```bash
git status
```

Expected: only untracked `.claude/` and `gem-fogging-landing.html`. Working tree clean for tracked files.

- [ ] **Step 2: Capture build baseline**

```bash
pnpm build 2>&1 | tee /tmp/baseline-build.log
```

Expected: exit code 0. Record the build status (success/warnings). If the build is failing on `main` for unrelated reasons, **stop and report** — do not start the refactor on a broken baseline.

- [ ] **Step 3: Capture lint baseline**

```bash
pnpm lint 2>&1 | tee /tmp/baseline-lint.log
```

Record the warning/error count. We don't need to fix pre-existing lint — but we must not add new lint findings.

- [ ] **Step 4: Confirm `components/home/` does not yet exist**

```bash
ls components/home 2>&1
```

Expected: `No such file or directory`.

- [ ] **Step 5: Confirm current `app/page.tsx` line count**

```bash
wc -l app/page.tsx
```

Expected: 1716. This is the before number. The end-of-phase target is ~1100.

- [ ] **Step 6: Start dev server in a background terminal for spot-checks**

```bash
pnpm dev
```

Leave running. Open `http://localhost:3000/` in browser. Take a mental snapshot of: hero slider, accreditations strip, manufacturer intro, products grid, customers strip, reviews carousel, blog cards, FAQ, contact. This is the baseline visual reference for the entire phase.

- [ ] **Step 7: Commit nothing — Task 0 is observation only.**

---

## Task 1: Extract `AccreditationsStrip`

**Files:**
- Create: `components/home/AccreditationsStrip.tsx`
- Modify: `app/page.tsx` (delete inline `AccreditationsScroll` function at lines 103–139; replace its single usage site at line 878)

Smallest, safest first move. The current `AccreditationsScroll` is already a self-contained function with a single prop — almost a no-op extraction.

- [ ] **Step 1: Create the new component file**

Create `components/home/AccreditationsStrip.tsx` with the following content (copied byte-for-byte from `app/page.tsx` lines 100–139, plus the `"use client"` directive):

```tsx
"use client"

import React from "react"

const LOGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23e5e7eb' width='80' height='80' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'%3ELogo%3C/text%3E%3C/svg%3E";

interface Props {
  accreditations: any[];
}

export default function AccreditationsStrip({ accreditations }: Props) {
  if (accreditations.length === 0) return null;

  const n = accreditations.length;
  const extendedAccreditations = [...accreditations, ...accreditations];
  const itemWidthPercent = 100 / n;

  return (
    <section className="py-6 md:py-12 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-2 md:px-4">
        <div className="relative overflow-hidden">
          <div className="flex animate-logo-marquee">
            {extendedAccreditations.map((accreditation, index) => (
              <div
                key={`acc-${index}-${(accreditation as any)._id ?? accreditation.logo ?? index}`}
                className="flex-shrink-0 px-1 md:px-4 max-md:!w-1/3"
                style={{ width: `${itemWidthPercent}%` }}
              >
                <div className="bg-white rounded-lg p-1.5 md:p-6 h-20 md:h-28 lg:h-32 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={accreditation.logo || LOGO_PLACEHOLDER}
                    alt={accreditation.name ? `${accreditation.name} certification` : "Industry certification"}
                    className="object-contain max-w-full max-h-full min-h-0 min-w-0 w-full h-full"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = LOGO_PLACEHOLDER }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

Notes:
- We **duplicate** `LOGO_PLACEHOLDER` inside this file. The original constant in `app/page.tsx` still has another consumer (`OurCustomersScroll`), which is out of Phase 1 scope. Two copies is acceptable for one phase; deduplication can happen later.

- [ ] **Step 2: Add the import to `app/page.tsx`**

In the imports block at the top of `app/page.tsx`, add (alphabetised with the other `@/components` imports):

```tsx
import AccreditationsStrip from "@/components/home/AccreditationsStrip"
```

- [ ] **Step 3: Delete the inline `AccreditationsScroll` function**

In `app/page.tsx`, delete lines 103–139 (the entire `function AccreditationsScroll({ accreditations }: { accreditations: any[] }) { ... }` block).

Do **not** delete the `LOGO_PLACEHOLDER` constant at lines 100–101 — `OurCustomersScroll` (lines 141–174) still uses it.

- [ ] **Step 4: Replace the usage site**

Locate the line in `renderHomePage()` that reads:

```tsx
<AccreditationsScroll accreditations={accreditations} />
```

(around what was line 878 before the deletion above — line numbers will have shifted). Replace with:

```tsx
<AccreditationsStrip accreditations={accreditations} />
```

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0. Compare TS errors to `/tmp/baseline-build.log` — no new errors.

- [ ] **Step 6: Visual spot-check**

In the dev server tab, reload `http://localhost:3000/`. Scroll to the accreditations strip (between hero and manufacturer intro). It should render identically: same logos, same marquee animation, same spacing.

- [ ] **Step 7: Commit**

```bash
git add components/home/AccreditationsStrip.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract AccreditationsStrip to components/home/

Phase 1 of homepage refactor. Pure lift-and-rename of the inline
AccreditationsScroll function; visual output unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract `ManufacturerIntroBlock`

**Files:**
- Create: `components/home/ManufacturerIntroBlock.tsx`
- Modify: `app/page.tsx` (delete the `<section>` block starting at the `aria-labelledby="manufacturer-intro-heading"` section; replace with `<ManufacturerIntroBlock />`)

This section is pure static JSX — easiest of the section extractions. No props, no state.

- [ ] **Step 1: Identify the source block**

In current `app/page.tsx`, find the section opening at:

```tsx
<section className="py-16 md:py-20 bg-white" aria-labelledby="manufacturer-intro-heading">
```

It contains:
1. A heading badge "Trusted Manufacturer"
2. `<h2>` "Trusted Thermal Fogging Machine Manufacturer in India"
3. Two intro paragraphs
4. A 2-column grid with "Public Health Fogging Solutions" and "Agricultural Fogging Machines for Farm-Level Use"
5. A "Why Choose 100X Circle" rounded card with a 6-item bullet list

The closing `</section>` tag appears just before `<section id="products"`.

- [ ] **Step 2: Create the new component file**

Create `components/home/ManufacturerIntroBlock.tsx`. The file must:
- Start with `"use client"` (consistent with project pattern, even though this block has no client-only features)
- Import `Badge` from `@/components/ui/badge` and `CheckCircle` from `lucide-react`
- Export a default function that returns the section JSX exactly as it appears in `app/page.tsx`

Skeleton:

```tsx
"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

export default function ManufacturerIntroBlock() {
  return (
    // PASTE the entire <section aria-labelledby="manufacturer-intro-heading">...</section> block here, byte-for-byte
  )
}
```

When pasting: copy from the opening `<section className="py-16 md:py-20 bg-white" aria-labelledby="manufacturer-intro-heading">` line through the matching `</section>` (around 70 lines of JSX). Do not change a single character of the JSX contents.

- [ ] **Step 3: Add the import to `app/page.tsx`**

Add (next to the previous task's import):

```tsx
import ManufacturerIntroBlock from "@/components/home/ManufacturerIntroBlock"
```

- [ ] **Step 4: Delete the source block and replace with the component**

In `app/page.tsx`, delete the entire `<section className="py-16 md:py-20 bg-white" aria-labelledby="manufacturer-intro-heading">...</section>` block (plus its 4-line preceding comment that begins `{/* Manufacturer Intro — visible SEO content with agency-supplied copy ... */}`). Replace with:

```tsx
<ManufacturerIntroBlock />
```

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0, no new TS errors.

- [ ] **Step 6: Visual spot-check**

Reload `http://localhost:3000/`. Scroll to the "Trusted Thermal Fogging Machine Manufacturer in India" section. Compare against baseline: same badge, same headline, same two paragraphs, same 2-column grid, same "Why Choose" card with the bullet list.

- [ ] **Step 7: Commit**

```bash
git add components/home/ManufacturerIntroBlock.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract ManufacturerIntroBlock to components/home/

Phase 1 continued. Pure JSX lift; no copy, prop, or behavior change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extract `BlogBlock`

**Files:**
- Create: `components/home/BlogBlock.tsx`
- Modify: `app/page.tsx` (delete the `{/* Blog Preview Section */}` block; replace with `<BlogBlock posts={displayBlogPosts} hasApiPosts={blogPosts.length > 0} />`)

This block uses derived data (`displayBlogPosts`) and the `formatDate` and `plainTextFromHtml` helpers, plus `blogPostSlug`. We pass the already-derived posts and a boolean flag in as props; the derivation stays in `app/page.tsx`.

- [ ] **Step 1: Identify the source block**

The block opens at:

```tsx
<section className="py-16 md:py-20 bg-gray-50">
  <div className="container mx-auto px-4">
    <div className="text-center mb-20">
      <Badge className="mb-6 bg-purple-100 text-purple-800 hover:bg-purple-200 text-lg px-6 py-2">
        Latest Blog Posts
      </Badge>
```

It closes before `<FAQSection />`. The block uses `displayBlogPosts`, `blogPosts`, `plainTextFromHtml`, `formatDate`, and `blogPostSlug`.

- [ ] **Step 2: Create the new component file**

Create `components/home/BlogBlock.tsx`:

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { plainTextFromHtml } from "@/lib/rich-text"
import { blogPostSlug } from "@/lib/blogSlug"

// Stable date formatting (avoids locale-based hydration mismatches).
// Mirrors the helper in app/page.tsx — duplicated for Phase 1 to keep the
// move purely local. Dedupe later if needed.
const formatDate = (value: string | Date | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface Props {
  posts: any[];
  hasApiPosts: boolean;
}

export default function BlogBlock({ posts, hasApiPosts }: Props) {
  return (
    // PASTE the entire <section className="py-16 md:py-20 bg-gray-50">...</section> block here.
    // Two substitutions while pasting:
    //   1. `displayBlogPosts.slice(0, 3)` --> `posts.slice(0, 3)`
    //   2. `blogPosts.length > 0` (inside the post card conditional) --> `hasApiPosts`
    // Everything else stays byte-for-byte.
  )
}
```

When pasting, make exactly two name substitutions (called out in the skeleton's comments). All other text, classNames, and JSX must match the original.

- [ ] **Step 3: Add the import to `app/page.tsx`**

```tsx
import BlogBlock from "@/components/home/BlogBlock"
```

- [ ] **Step 4: Delete the source block and replace**

Delete the entire `<section className="py-16 md:py-20 bg-gray-50">...</section>` block that contains the Blog Preview, plus its `{/* Blog Preview Section */}` comment. Replace with:

```tsx
<BlogBlock posts={displayBlogPosts} hasApiPosts={blogPosts.length > 0} />
```

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0.

- [ ] **Step 6: Visual spot-check**

Reload `/`. Scroll to "Mosquito Fogging Machine Manufacturer – Industry Insights & Tips" section. Verify: same badge, same headline, same two intro paragraphs, three post cards, same "View All Blog Posts" CTA, same dates formatted as DD/MM/YYYY.

Click into one blog card — it must navigate to the same blog URL it did before.

- [ ] **Step 7: Commit**

```bash
git add components/home/BlogBlock.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract BlogBlock to components/home/

Phase 1 continued. Posts and the "has API posts" boolean pass in as props;
derivation logic stays in app/page.tsx.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Extract `TrustBlock` (with inline `ReviewsCarousel`)

**Files:**
- Create: `components/home/TrustBlock.tsx`
- Modify: `app/page.tsx` (delete the `{/* Reviews Carousel Section */}` block; delete the `ReviewsCarousel` function at lines ~1584–1716; replace section usage with `<TrustBlock />`)

`ReviewsCarousel` is currently an inline function with its own state/embla setup. It's only used by the reviews section, so it migrates with `TrustBlock` as a private helper in the same file.

- [ ] **Step 1: Identify the source blocks**

Two blocks to migrate:
1. The `<section className="py-16 md:py-20 bg-white">` "Reviews Carousel" section (~lines 1033–1049).
2. The `function ReviewsCarousel() { ... }` definition (~lines 1584–1716).

- [ ] **Step 2: Create the new component file**

Create `components/home/TrustBlock.tsx`. It will contain BOTH the section JSX and the helper `ReviewsCarousel` function (declared first, then the default export uses it).

```tsx
"use client"

import React, { useState, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

function ReviewsCarousel() {
  // PASTE the entire body of the original ReviewsCarousel function here, byte-for-byte.
  // No changes to the reviews array, the embla state, or the JSX.
}

export default function TrustBlock() {
  return (
    // PASTE the entire <section className="py-16 md:py-20 bg-white">...</section> block here, byte-for-byte.
    // No substitutions; <ReviewsCarousel /> already references the local function above.
  )
}
```

The original `ReviewsCarousel` imports `Card` (without `CardContent`) — match that. It uses `React.useCallback` — the `React` default import covers it.

- [ ] **Step 3: Add the import to `app/page.tsx`**

```tsx
import TrustBlock from "@/components/home/TrustBlock"
```

- [ ] **Step 4: Delete the source blocks**

In `app/page.tsx`:
1. Delete the `<section className="py-16 md:py-20 bg-white">...</section>` Reviews Carousel block (plus its `{/* Reviews Carousel Section */}` comment). Replace with `<TrustBlock />`.
2. Delete the entire `function ReviewsCarousel() { ... }` definition at the bottom of the file.

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0. The unused `useEmblaCarousel` import in `app/page.tsx` will now be unused at this point if no other code uses it — check by grepping `app/page.tsx` for `useEmblaCarousel`. If it's truly unused after the deletion, remove the import to keep lint clean.

- [ ] **Step 6: Visual spot-check**

Reload `/`. Scroll to "Trusted Fogging Machine Supplier – What Our Customers Say" section. Verify: same heading, same two intro paragraphs, embla reviews carousel works (next/prev arrows, dot indicators), reviews are in the same order with the same authors and quotes.

- [ ] **Step 7: Commit**

```bash
git add components/home/TrustBlock.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract TrustBlock (with ReviewsCarousel) to components/home/

Phase 1 continued. ReviewsCarousel migrates inline into TrustBlock since
it's only used by this section. embla-carousel import drops out of
app/page.tsx along with it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Extract `ProductsBlock`

**Files:**
- Create: `components/home/ProductsBlock.tsx`
- Modify: `app/page.tsx` (delete the `<section id="products">` block; replace with `<ProductsBlock products={products} onBrochureDownload={handleBrochureDownload} />`)

This block uses the `products` array, the `ProductCard` component, and the `handleBrochureDownload` callback. State stays in `app/page.tsx`; the component is presentational.

- [ ] **Step 1: Identify the source block**

In `app/page.tsx`, find the section opening at:

```tsx
<section id="products" className="py-16 md:py-20">
```

It contains: heading badge, `<h2>`, three intro paragraphs, then a conditional render for the products grid:
- If `products.length === 0`: a fallback card with a "View All Products" CTA.
- If `products.length <= 6`: a grid of all products.
- Otherwise: first 6 products grid + a "View All Products" CTA.

The block closes before `<YoutubeShortsCarousel />`.

- [ ] **Step 2: Create the new component file**

Create `components/home/ProductsBlock.tsx`:

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ProductCard from "@/components/ProductCard"

// Local Product interface — matches the one declared in app/page.tsx.
// Duplicated for Phase 1 to keep the move purely local. Move to a shared
// types file in a later pass.
interface Product {
  _id?: string;
  id?: string;
  name: string;
  imageUrls: string[];
  priceRange: string;
  rating: number;
  reviewsCount: number;
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  badges: string[];
  youtubeLink?: string;
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  brochureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  products: Product[];
  onBrochureDownload: (productName: string, brochureUrl?: string) => void;
}

export default function ProductsBlock({ products, onBrochureDownload }: Props) {
  return (
    // PASTE the entire <section id="products">...</section> block here, byte-for-byte.
    // Three substitutions while pasting:
    //   1. `onBrochureDownload={() => handleBrochureDownload(product.name, product.brochureUrl)}`
    //      --> `onBrochureDownload={() => onBrochureDownload(product.name, product.brochureUrl)}`
    //      (in BOTH the <=6 branch and the >6 branch)
    // Everything else stays byte-for-byte.
  )
}
```

- [ ] **Step 3: Add the import to `app/page.tsx`**

```tsx
import ProductsBlock from "@/components/home/ProductsBlock"
```

- [ ] **Step 4: Delete the source block and replace**

Delete the entire `<section id="products" className="py-16 md:py-20">...</section>` block (plus its `{/* Products Section */}` comment). Replace with:

```tsx
<ProductsBlock products={products} onBrochureDownload={handleBrochureDownload} />
```

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0. The `ProductCard` import in `app/page.tsx` is still needed by `ProductDetailPage` (which is out-of-scope for this phase) — leave the import in place if grep confirms it's still used; remove it if not.

- [ ] **Step 6: Visual spot-check**

Reload `/`. Scroll to the products section. Verify:
- Same "Our Products" badge, same H2, same three intro paragraphs
- Same product grid layout (1/2/3 columns at sm/md/lg)
- Same "View All Products" CTA below the grid (if >6 products)
- Click a product card's "Download Brochure" button — the brochure modal must still open with the correct product name.

- [ ] **Step 7: Commit**

```bash
git add components/home/ProductsBlock.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract ProductsBlock to components/home/

Phase 1 continued. Products and the brochure download callback pass in as
props; brochure modal state stays in app/page.tsx.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Extract `HeroBlock`

**Files:**
- Create: `components/home/HeroBlock.tsx`
- Modify: `app/page.tsx` (delete the `<section id="home">` block; replace with `<HeroBlock ... />`)

Largest and most complex of the section extractions. The hero has:
- Slider state (`currentSlide`, `setCurrentSlide`)
- A ref (`bannerTouchStartX`) for touch swipe detection
- Loading flag (`bannersLoading`)
- Slide data (`heroSlides`, `currentSlideData`)
- Stats array
- Changing phrases array + `phraseIndex`

To minimise risk, we keep ALL of this state in `app/page.tsx` (where the data-fetch effects live) and pass it down as props. The component becomes presentational.

- [ ] **Step 1: Identify the source block**

The hero opens at:

```tsx
<section id="home" className="pt-32 relative overflow-hidden">
```

It closes around 230 lines later, just before `<AccreditationsStrip ... />` (formerly `<AccreditationsScroll ... />`). It includes desktop and mobile views, slide indicators, prev/next nav buttons (separate sets for desktop and mobile).

- [ ] **Step 2: Create the new component file**

Create `components/home/HeroBlock.tsx`:

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface HeroSlide {
  image?: string;
  // The hero originally accepts any banner shape; keep open-typed for Phase 1.
  [key: string]: any;
}

interface Stat {
  number: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface Props {
  heroSlides: HeroSlide[];
  currentSlide: number;
  setCurrentSlide: (next: number | ((prev: number) => number)) => void;
  currentSlideData: HeroSlide | null;
  bannersLoading: boolean;
  bannerTouchStartX: React.MutableRefObject<number | null>;
  stats: Stat[];
  changingPhrases: string[];
  phraseIndex: number;
}

export default function HeroBlock({
  heroSlides,
  currentSlide,
  setCurrentSlide,
  currentSlideData,
  bannersLoading,
  bannerTouchStartX,
  stats,
  changingPhrases,
  phraseIndex,
}: Props) {
  return (
    // PASTE the entire <section id="home" className="pt-32 relative overflow-hidden">...</section>
    // block here, byte-for-byte. No substitutions needed — every identifier referenced inside the
    // block (currentSlide, setCurrentSlide, heroSlides, currentSlideData, bannersLoading,
    // bannerTouchStartX, stats, changingPhrases, phraseIndex) is now a prop with the same name.
  )
}
```

Notes:
- `Stat.icon` is typed as a component but not actually rendered in the current hero JSX (the hero only reads `stat.number` and `stat.label`). Keep the type accurate to the underlying data even though it isn't used in the block — passing through the original shape avoids surprises if later phases use the icon.
- `setCurrentSlide` is typed to accept either a value or an updater function, matching React's `Dispatch<SetStateAction<number>>` shape that the original JSX assumes (it uses `setCurrentSlide((prev) => ...)` in multiple places).

- [ ] **Step 3: Add the import to `app/page.tsx`**

```tsx
import HeroBlock from "@/components/home/HeroBlock"
```

- [ ] **Step 4: Delete the source block and replace**

Delete the entire `<section id="home" ...>...</section>` block (plus the `{/* Hero Section with Image Slider */}` comment). Replace with:

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
/>
```

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: exit code 0.

After this task, several imports in `app/page.tsx` may now be unused: `ChevronLeft`, `ChevronRight`, `Play`, possibly `ArrowRight`. Grep each one inside `app/page.tsx`. If the only remaining references are inside `ProductDetailPage` (still inline), keep the imports. If grep shows zero references, remove the import to keep lint clean.

- [ ] **Step 6: Visual spot-check (most important of any task)**

Reload `/`. Test:
- Desktop hero loads with the banner image, headline "100X – Thermal Fogging Machine Manufacturer", animated changing phrase
- Stats grid shows 4 stats
- Click the desktop next arrow → next slide
- Click the desktop prev arrow → previous slide
- Click a dot indicator → jumps to that slide
- Resize to mobile width → mobile layout renders (banner first, then content)
- On mobile width, swipe the banner left/right → slide changes
- "Explore Products" button scrolls to products section
- "Watch Demo" button opens the YouTube channel in a new tab

If any of these fail, do not commit. Fix and re-verify.

- [ ] **Step 7: Commit**

```bash
git add components/home/HeroBlock.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(home): extract HeroBlock to components/home/

Phase 1 final section extraction. Slider state, touch ref, and slide data
remain in app/page.tsx and pass down as props — zero behavior change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm new line count**

```bash
wc -l app/page.tsx components/home/*.tsx
```

Expected: `app/page.tsx` line count is meaningfully lower than the original 1716 — somewhere around 1100 ± 100. Each new component file is in the 30–250 line range.

- [ ] **Step 2: Final build**

```bash
pnpm build
```

Expected: exit code 0. Diff against `/tmp/baseline-build.log`: same or fewer warnings, no new errors.

- [ ] **Step 3: Final lint**

```bash
pnpm lint
```

Expected: warning/error count same as or lower than `/tmp/baseline-lint.log`.

- [ ] **Step 4: Full-page manual walkthrough**

Reload `/` one more time. Walk through every section top-to-bottom:
1. Hero — slider auto-advances; arrows + dots work
2. Accreditations strip — marquee animates
3. Manufacturer intro — H2, paragraphs, 2-col grid, "Why Choose" card all present
4. Products — grid renders; brochure modal opens; "View All" link works
5. YoutubeShortsCarousel — still renders (not changed in Phase 1, but verify nothing collateral broke)
6. OurCustomersScroll — still renders (same)
7. Trust / Reviews — embla carousel works
8. Blog — 3 post cards render, links work
9. FAQ — unchanged
10. Contact — unchanged

Check the browser devtools console: no new errors, no hydration warnings.

- [ ] **Step 5: Verify SPA-style sub-pages still work**

The `currentPage` state pattern routes "product" view inside the same page. Click into a product card → product detail view should render. Click back to home → homepage renders. (We did not touch the routing logic, but verify.)

- [ ] **Step 6: Mobile responsiveness sanity check**

Toggle devtools to iPhone SE, Pixel 6, iPad Air viewport widths. Each section renders without horizontal scroll or broken layout.

- [ ] **Step 7: Tag the end of Phase 1**

If everything green:

```bash
git tag phase-1-complete -m "Homepage Phase 1 — pure component extraction complete"
```

(Tag is local; do not push unless asked.)

Phase 1 is complete. Phase 2 (UX redesign — hero video, technology block, content trim, narrative connectors, mobile spacing, CTA hierarchy) begins from this state.

---

## Rollback strategy

If at any task a visual or behavioral regression is detected and a quick fix is not obvious:

```bash
git reset --hard HEAD~1
```

Drops the most recent extraction commit and returns `app/page.tsx` to the pre-task state. Restart that task with a corrected approach.

If multiple tasks need rolling back, reset to the tag from before Phase 1 began (capture it manually in Task 0 if you want a single rollback point: `git tag pre-phase-1` before Task 1).

## Risks specific to Phase 1

| Risk | Mitigation |
|---|---|
| `"use client"` placement | Every new file in `components/home/` starts with `"use client"` — verified on every component creation step |
| Subtle JSX whitespace differences | Copy whole `<section>...</section>` blocks, never re-type by hand. Diff the original file against the moved JSX with `git diff` before committing |
| `LOGO_PLACEHOLDER` duplication causing drift | Two copies exist after Task 1 — only `OurCustomersScroll` uses the `app/page.tsx` copy. Future dedupe is a separate effort |
| `Product` type duplication | Same — duplicated in `ProductsBlock.tsx`. Move both copies into `lib/types.ts` in a later refactor |
| Unused imports in `app/page.tsx` after each task | Each task includes a step to grep for orphaned imports |
| Hydration warnings | After every visual spot-check, watch the devtools console |
