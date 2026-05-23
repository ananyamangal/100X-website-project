# Homepage Phase 2 — UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Modernize the homepage with a hero video block, a pulse-jet technology explainer, trimmed manufacturer-intro copy, polished hero/products/trust sections, narrative connectors between sections, and an AI-SEO pass — all while keeping the industrial/government-grade trust feel.

**Architecture:** Each task touches one component or inserts one new component. Most existing components (`AccreditationsStrip`, `BlogBlock`, `YoutubeShortsCarousel`, `OurCustomersScroll`, `FAQSection`, `ContactSection`) stay structurally the same. Two new components are introduced (`HeroVideoBlock`, `TechnologyBlock`) and the existing `HeroBlock`, `ManufacturerIntroBlock`, `ProductsBlock`, `TrustBlock` get content/polish edits.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, lucide-react, existing project conventions.

---

## Spec reference

`docs/superpowers/specs/2026-05-23-homepage-redesign-design.md` — Phase 2 section.

## Section order (final, after Phase 2)

The user opted to keep the existing aux sections in place — only inserting the two new ones:

```
1.  HeroBlock              (existing, polished)
2.  HeroVideoBlock         (NEW)
3.  AccreditationsStrip    (existing)
4.  ManufacturerIntroBlock (existing, copy trimmed)
5.  TechnologyBlock        (NEW)
6.  ProductsBlock          (existing, polished)
7.  YoutubeShortsCarousel  (existing inline helper in app/page.tsx)
8.  OurCustomersScroll     (existing inline helper)
9.  TrustBlock             (existing, polished)
10. BlogBlock              (existing)
11. FAQSection             (existing)
12. ContactSection         (existing)
```

`SectionConnector` is woven between key sections in Task 7 — it doesn't appear in the order list above because it's a tiny one-line component rendered between others.

## Files to create

```
components/home/
  HeroVideoBlock.tsx        # NEW
  TechnologyBlock.tsx       # NEW
  SectionConnector.tsx      # NEW (Task 7)
```

## Files to modify

- `components/home/HeroBlock.tsx` (Task 4 — polish)
- `components/home/ManufacturerIntroBlock.tsx` (Task 3 — trim)
- `components/home/ProductsBlock.tsx` (Task 5 — polish)
- `components/home/TrustBlock.tsx` (Task 6 — polish + trust cues)
- `app/page.tsx` (Tasks 1, 2, 7 — insert new sections, wire connectors)
- One SEO/JSON-LD file in `components/seo/` (Task 8)

## Conventions

- Each task is one feature, one commit.
- Build (`npm run build`) must pass after every commit.
- Visual/behavior change is intentional in this phase (this is the redesign), but the change must be scoped to the task — no incidental edits to other components.
- Keep SEO keywords. Do not remove keywords; reorganize them.

---

## Task 1: Create `HeroVideoBlock` and insert into homepage

**Files:**
- Create: `components/home/HeroVideoBlock.tsx`
- Modify: `app/page.tsx` (import + insert after `<HeroBlock ... />`)

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

// Placeholder video ID — replace with the real demo video ID from @100Xcircle.
// The component is set up so swapping this single constant is enough.
const HERO_VIDEO_ID = "REPLACE_WITH_HERO_VIDEO_ID"

interface Props {
  youtubeId?: string;
}

export default function HeroVideoBlock({ youtubeId = HERO_VIDEO_ID }: Props) {
  const isPlaceholder = youtubeId === "REPLACE_WITH_HERO_VIDEO_ID"
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
            <iframe
              className="aspect-video w-full border-0"
              src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
              title="100X Fogging Machine Demo"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
          >
            <Link href="/contact-us" className="flex items-center">
              Talk to Our Team <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Add the import alongside other `@/components/home/*` imports:

```tsx
import HeroVideoBlock from "@/components/home/HeroVideoBlock"
```

Find the line `<HeroBlock ... />` (currently followed by `<AccreditationsStrip ... />`). Insert immediately after `<HeroBlock />`:

```tsx
<HeroVideoBlock />
```

### Step 3: Build + commit

```
npm run build  # must exit 0
git add components/home/HeroVideoBlock.tsx app/page.tsx
git commit -m "feat(home): add HeroVideoBlock component below hero"
```

---

## Task 2: Create `TechnologyBlock` and insert into homepage

**Files:**
- Create: `components/home/TechnologyBlock.tsx`
- Modify: `app/page.tsx` (import + insert after `<ManufacturerIntroBlock />`)

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import Link from "next/link"
import {
  Flame,
  Droplets,
  Wind,
  Target,
  Leaf,
  ShieldCheck,
  Building2,
  Sprout,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PROCESS_STEPS = [
  {
    icon: Flame,
    title: "Pulse-Jet Combustion",
    body: "A pulse-jet engine ignites a controlled fuel-air mix at high frequency — no moving compressor parts, low maintenance, consistent output.",
  },
  {
    icon: Droplets,
    title: "Chemical Vaporization",
    body: "Heat from the combustion chamber vaporizes the chemical or water-based solution as it passes through the resonator tube.",
  },
  {
    icon: Wind,
    title: "Ultra-Fine Fog Ejection",
    body: "The vapor cools instantly at the nozzle, forming sub-50-micron droplets — small enough to drift, large enough to deposit on target surfaces.",
  },
  {
    icon: Target,
    title: "Deep Penetration",
    body: "The dense fog penetrates foliage, open drains, voids, and construction sites that conventional sprayers cannot reach.",
  },
]

const BENEFITS = [
  {
    icon: Leaf,
    title: "Lower Chemical Consumption",
    body: "Up to 10× less pesticide per acre compared to manual spraying — ultra-fine droplets cover more surface area per litre.",
  },
  {
    icon: ShieldCheck,
    title: "Effective Vector Control",
    body: "Field-proven against dengue, malaria, and chikungunya vectors. Deployed by municipal bodies during outbreaks.",
  },
  {
    icon: Building2,
    title: "Municipal-Grade",
    body: "GeM-listed OEM equipment trusted by Nagar Nigams, Nagar Palikas, and Panchayats for public-health fogging drives.",
  },
  {
    icon: Sprout,
    title: "Agricultural Applications",
    body: "Pesticides, fungicides, and plant-growth regulators for orchards, paddy fields, and vegetable farms — single-operator friendly.",
  },
]

export default function TechnologyBlock() {
  return (
    <section
      className="bg-white py-16 md:py-24"
      aria-labelledby="technology-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <Badge className="mb-5 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            How It Works
          </Badge>
          <h2
            id="technology-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-5 leading-tight"
          >
            Pulse-Jet Thermal Fogging Technology
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Four engineered stages that turn a fuel-air spark into a dense, deep-penetrating fog — built for both municipal vector control and agricultural crop protection.
          </p>
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-20 list-none">
          {PROCESS_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="relative rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-7 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-green-600 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <Icon className="text-green-700" size={28} aria-hidden="true" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  {step.body}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-10">
            Why pulse-jet beats conventional spraying
          </h3>
          <ul className="grid sm:grid-cols-2 gap-6 md:gap-8 list-none">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <li
                  key={b.title}
                  className="flex gap-4 items-start"
                >
                  <span className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-green-600/15 ring-1 ring-green-500/30">
                    <Icon className="text-green-400" size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-white mb-1">
                      {b.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                      {b.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-10 md:mt-12 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
            >
              <Link href="#products" className="flex items-center">
                Explore Machines <ArrowRight className="ml-2" size={20} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Add the import:
```tsx
import TechnologyBlock from "@/components/home/TechnologyBlock"
```

Find `<ManufacturerIntroBlock />`. Insert **immediately after** it:
```tsx
<TechnologyBlock />
```

### Step 3: Build + commit

```
npm run build
git add components/home/TechnologyBlock.tsx app/page.tsx
git commit -m "feat(home): add TechnologyBlock — pulse-jet process + benefits"
```

---

## Task 3: Trim `ManufacturerIntroBlock` copy ~50%

**Files:**
- Modify: `components/home/ManufacturerIntroBlock.tsx`

The current block has: a badge, an H2, two intro paragraphs, a 2-column grid with two sub-headed paragraphs each, and a "Why Choose 100X Circle" card with a 6-item bullet list — totaling ~80 lines of dense copy.

### Trim targets

| Element | Current | New |
|---|---|---|
| Badge | "Trusted Manufacturer" | unchanged |
| H2 | "Trusted Thermal Fogging Machine Manufacturer in India" | unchanged (primary keyword) |
| Intro paragraphs | Two long paragraphs | **One** short paragraph (~50 words) summarising both |
| 2-col grid | Two columns, each with sub-heading + 2 paragraphs | Two columns, each with sub-heading + **one** short paragraph |
| Why Choose card | 6-item bullet list | unchanged (already scannable) |

### Step 1: Rewrite the component body

Replace the JSX between the `<div className="text-center mb-12 md:mb-14">` opening and the `</div>` before the `<div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">` with:

```tsx
<div className="text-center mb-12 md:mb-14">
  <Badge className="mb-6 bg-green-600 hover:bg-green-700 text-lg px-6 py-2">
    Trusted Manufacturer
  </Badge>
  <h2
    id="manufacturer-intro-heading"
    className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-6 leading-tight"
  >
    Trusted Thermal Fogging Machine Manufacturer in India
  </h2>
  <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
    100X Circle designs and manufactures field-ready thermal foggers from our Gurugram facility — trusted by 10,000+ customers including municipalities, Nagar Nigams, agricultural cooperatives, and private pest-control operators. GeM-approved OEM, Made in India, with active distributors in 50+ locations.
  </p>
</div>
```

(Single paragraph replacing two longer ones. Keeps the keywords: "thermal fogging machine manufacturer", "GeM-approved OEM", "Made in India", "10,000+ customers", "municipalities", "Nagar Nigams". Drops the repetition.)

Then replace the existing 2-column grid (where each column has 2 paragraphs) with this trimmed version (1 paragraph each):

```tsx
<div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">
  <div>
    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
      Public Health Fogging Solutions
    </h3>
    <p className="text-gray-700 leading-relaxed">
      Industrial thermal fogging equipment built for large-scale mosquito control drives. Pulse-jet technology penetrates thick vegetation, open drains, and construction sites where conventional spraying cannot reach. GeM-procurable for municipal bodies, Nagar Panchayats, and public health departments across Bihar, UP, Delhi, Maharashtra, Gujarat, and beyond.
    </p>
  </div>
  <div>
    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
      Agricultural Fogging Machines for Farm-Level Use
    </h3>
    <p className="text-gray-700 leading-relaxed">
      Lightweight, single-operator foggers used by farmers across India to apply fungicides, pesticides, and plant growth regulators across orchards, paddy fields, and vegetable farms. Handles both diesel-based and water-based formulations.
    </p>
  </div>
</div>
```

(Each column drops from 2 paragraphs to 1. Keywords preserved: "industrial thermal fogging equipment", "pulse-jet technology", "GeM-procurable", "municipal bodies", "Nagar Panchayats", "agricultural fogging machines", "fungicides, pesticides, and plant growth regulators".)

The "Why Choose 100X Circle" card below stays untouched.

### Step 2: Build + commit

```
npm run build
git add components/home/ManufacturerIntroBlock.tsx
git commit -m "refactor(home): trim ManufacturerIntroBlock copy ~50% — keep keywords"
```

---

## Task 4: Polish `HeroBlock` — typography, spacing, CTA prominence

**Files:**
- Modify: `components/home/HeroBlock.tsx`

The hero already works. This task is **polish**, not a rewrite. Focus on:

1. **Typography hierarchy:** the H1 sits well; the changing-phrase line below is currently `text-xl md:text-2xl lg:text-3xl font-bold` — bring it down slightly so the H1 dominates more. Change to `text-lg md:text-xl lg:text-2xl font-semibold`.

2. **CTA prominence:** the primary "Explore Products" CTA should feel heavier. Increase visual weight:
   - Current: `className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"`
   - Change to: `className="bg-green-600 hover:bg-green-700 text-lg px-8 py-5 shadow-lg shadow-green-900/20"`
   - Apply this change to **both** desktop and mobile primary CTAs.

3. **Stats spacing:** the stats grid currently has `gap-4 md:gap-8`. Bump to `gap-6 md:gap-10` for breathing room.

4. **Hidden SEO paragraphs (lines with `className="hidden"` containing 100x marketing copy):** remove them entirely. These contributed nothing to crawlers or users (they were `display: none` paragraphs). JSON-LD in Task 8 will carry that authority signal more effectively.

5. **Mobile-first spacing:** the mobile content block has `py-12` — leave that, but tighten the gap between badge, headline, and changing phrase by adjusting `mb-6` → `mb-4` on the badge and `mb-6` → `mb-4` on the H2.

### Step 1: Read `components/home/HeroBlock.tsx` to find the exact lines

The component has both `hidden md:block` (desktop) and `md:hidden` (mobile) branches — make the typography and CTA changes consistently in both. Apply the four polish items above.

### Step 2: Build + commit

```
npm run build
git add components/home/HeroBlock.tsx
git commit -m "polish(hero): tighten typography hierarchy, drop hidden SEO paragraphs, weight CTA"
```

---

## Task 5: Polish `ProductsBlock`

**Files:**
- Modify: `components/home/ProductsBlock.tsx`

### Changes

1. **Trim the 3 intro paragraphs to 1 short lead.** Replace the three `<p className="text-xl text-gray-600 max-w-5xl ...">` paragraphs with a single tighter intro:

```tsx
<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
  GeM-approved fogging machines built for municipal vector control, agricultural spraying, and industrial pest management. Manufactured in India with full after-sales support — <a className="text-green-700 underline-offset-2 hover:underline" href="https://www.100xcircle.com/">buy industrial fogging machines online</a>.
</p>
```

Keeps the keywords ("GeM-approved", "fogging machines", "industrial pest management", "Manufactured in India", "buy industrial fogging machines online" anchor) but compresses three paragraphs into one.

2. **Tighten section spacing:** the section currently has `py-16 md:py-20`. Leave as-is.

3. **Grid spacing:** change the products grid from `gap-8` to `gap-6 md:gap-8` (tighter on mobile).

4. **"View All Products" CTA visual weight:** wrap in a more prominent button styling. Change:
   ```tsx
   <Button className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
     View All Products
   </Button>
   ```
   to:
   ```tsx
   <Button className="bg-green-600 hover:bg-green-700 text-lg px-8 py-5 shadow-lg shadow-green-900/15">
     View All Products <ArrowRight className="ml-2" size={20} />
   </Button>
   ```
   The arrow icon improves scannability. `ArrowRight` is already imported.

5. **Empty-state card:** keep the existing fallback as-is.

### Step 2: Build + commit

```
npm run build
git add components/home/ProductsBlock.tsx
git commit -m "polish(products): trim intro to one lead, tighten grid + CTA weight"
```

---

## Task 6: Polish `TrustBlock` — certification visibility, government cues, factory positioning

**Files:**
- Modify: `components/home/TrustBlock.tsx`

The current TrustBlock has: yellow badge, H2, two intro paragraphs, then `<ReviewsCarousel />`.

### Changes

1. **Trim intro:** replace the two paragraphs with one tight intro:

```tsx
<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
  Trusted by 10,000+ customers — including municipal bodies, Nagar Nigams, and farm cooperatives across Bihar, UP, Gujarat, and beyond. Field reviews from the people running our machines every day.
</p>
```

2. **Add a 3-item trust cue row** above the reviews carousel. This is the certification + government + factory visibility the user asked for:

```tsx
<div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mb-12 md:mb-16">
  {[
    { label: "GeM-approved OEM", sub: "Direct government procurement" },
    { label: "Made in India", sub: "Gurugram manufacturing facility" },
    { label: "10,000+ customers", sub: "Municipalities, Nagar Nigams, farmers" },
  ].map((cue) => (
    <div
      key={cue.label}
      className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm"
    >
      <div className="text-base md:text-lg font-bold text-gray-900 mb-1">
        {cue.label}
      </div>
      <div className="text-xs md:text-sm text-gray-600">{cue.sub}</div>
    </div>
  ))}
</div>
```

Insert this BEFORE the `<ReviewsCarousel />` call.

3. **Keep the existing `ReviewsCarousel` helper untouched.** No changes to the 5 reviews or the embla setup.

### Step 2: Build + commit

```
npm run build
git add components/home/TrustBlock.tsx
git commit -m "polish(trust): trim intro, add 3-up trust-cue row above reviews"
```

---

## Task 7: Add `SectionConnector` component + weave narrative transitions

**Files:**
- Create: `components/home/SectionConnector.tsx`
- Modify: `app/page.tsx` (insert between key sections)

### Step 1: Create the component

```tsx
"use client"

import React from "react"

interface Props {
  /** Short transition phrase displayed between sections. Keep to 1 line. */
  text: string;
  /** Optional eyebrow shown above the text. */
  eyebrow?: string;
}

export default function SectionConnector({ text, eyebrow }: Props) {
  return (
    <div className="bg-white py-6 md:py-8" aria-hidden="true">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        {eyebrow && (
          <p className="text-xs md:text-sm uppercase tracking-widest text-green-700 font-semibold mb-2">
            {eyebrow}
          </p>
        )}
        <p className="text-base md:text-lg text-gray-500 italic">{text}</p>
      </div>
    </div>
  )
}
```

`aria-hidden="true"` because these are decorative transitions — screen readers should skip them; the surrounding sections carry the semantics.

### Step 2: Wire connectors into `app/page.tsx`

Add the import:
```tsx
import SectionConnector from "@/components/home/SectionConnector"
```

Insert connectors at four narrative beats (between key sections):

| Before | After | Connector |
|---|---|---|
| `<HeroVideoBlock />` | `<AccreditationsStrip ... />` | `<SectionConnector eyebrow="Built for India" text="A decade of manufacturing for the field." />` |
| `<ManufacturerIntroBlock />` | `<TechnologyBlock />` | `<SectionConnector eyebrow="The Technology" text="Inside every 100X fogger." />` |
| `<TechnologyBlock />` | `<ProductsBlock ... />` | `<SectionConnector eyebrow="The Range" text="From handheld to vehicle-mounted." />` |
| `<OurCustomersScroll ... />` | `<TrustBlock />` | `<SectionConnector eyebrow="In Their Words" text="Reviews from the field." />` |

Place each connector on its own line between the two sections it links.

### Step 3: Build + commit

```
npm run build
git add components/home/SectionConnector.tsx app/page.tsx
git commit -m "feat(home): add SectionConnector for narrative flow between sections"
```

---

## Task 8: AI SEO pass — structured data, heading audit, keyword sweep

**Files:**
- Create: `components/seo/HomepageJsonLd.tsx`
- Modify: `app/page.tsx` (mount HomepageJsonLd)
- Modify (light sweep): `components/home/HeroBlock.tsx`, `components/home/ProductsBlock.tsx`, `components/home/BlogBlock.tsx` — only if keyword stuffing remains after the trims above.

### Step 1: Inventory existing JSON-LD

Read `components/seo/GlobalJsonLd.tsx`, `components/seo/ItemListJsonLd.tsx`, `components/seo/ProductJsonLd.tsx`, `components/seo/BreadcrumbJsonLd.tsx`. Note what's already emitted so we don't duplicate.

### Step 2: Create `components/seo/HomepageJsonLd.tsx`

This adds three things missing from current emissions:

1. **`VideoObject`** for the new hero video
2. **`HowTo`** for the pulse-jet 4-step process
3. **`Organization`** with E-E-A-T cues (founding date, place, NumberOfEmployees, sameAs, contactPoint) if not already in `GlobalJsonLd`

```tsx
import React from "react"
import { BUSINESS } from "@/lib/seo/site-config"

interface Props {
  heroVideoId?: string;
}

export default function HomepageJsonLd({ heroVideoId }: Props) {
  const items: Record<string, any>[] = []

  if (heroVideoId && heroVideoId !== "REPLACE_WITH_HERO_VIDEO_ID") {
    items.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "100X Fogging Machines in Real-World Operation",
      description:
        "Pulse-jet thermal fogging machine demos from 100X Circle — municipal vector control and agricultural use.",
      thumbnailUrl: `https://i.ytimg.com/vi/${heroVideoId}/hqdefault.jpg`,
      uploadDate: "2024-01-01",
      contentUrl: `https://www.youtube.com/watch?v=${heroVideoId}`,
      embedUrl: `https://www.youtube.com/embed/${heroVideoId}`,
    })
  }

  items.push({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Pulse-Jet Thermal Fogging Works",
    description:
      "Four engineered stages turn a fuel-air spark into a dense, deep-penetrating fog for vector control and agricultural use.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Pulse-Jet Combustion",
        text: "A pulse-jet engine ignites a controlled fuel-air mix at high frequency.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Chemical Vaporization",
        text: "Heat from the combustion chamber vaporizes the chemical or water-based solution.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Ultra-Fine Fog Ejection",
        text: "Vapor cools at the nozzle to form sub-50-micron droplets.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Deep Penetration",
        text: "Dense fog penetrates foliage, drains, and voids that conventional sprayers cannot reach.",
      },
    ],
  })

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}
```

### Step 3: Mount it in `app/page.tsx`

Add the import and place near the other JSON-LD mounts (or near the top of the rendered fragment):

```tsx
import HomepageJsonLd from "@/components/seo/HomepageJsonLd"
```

Insert (just before `<HeroBlock />`):
```tsx
<HomepageJsonLd />
```

(The `heroVideoId` prop is omitted for now since the video placeholder is in effect; the JSON-LD won't emit the VideoObject until a real ID is plugged in. This keeps Google's Rich Results validator happy.)

### Step 4: Heading hierarchy audit

Grep `app/page.tsx` and the home components for `<h1`, `<h2`, `<h3`. Expected:
- **One `<h1>` total** on the homepage — in `HeroBlock`.
- `<h2>` per section.
- `<h3>` inside sections (sub-headings).
- No skipped levels.

If any section accidentally has multiple `<h1>` (e.g., from a copy/paste), demote them to `<h2>` or `<h3>` as appropriate.

### Step 5: Keyword sweep

Search the homepage components for stuffed phrases. Specifically, look for occurrences of:
- "thermal fogging machine manufacturer in India"
- "fogging machine supplier"
- "mosquito fogging machine manufacturer"

Each phrase should appear at most **twice in visible body copy** across the homepage. If you find a section with 3+ occurrences, leave the H2 instance alone and remove or rephrase the body copies.

### Step 6: Build + commit

```
npm run build
git add components/seo/HomepageJsonLd.tsx app/page.tsx components/home/*.tsx
git commit -m "feat(seo): add HomepageJsonLd (HowTo + VideoObject) and tighten keyword density"
```

---

## Task 9: Final verification

**Files:** none (verification only)

### Step 1: Build

```bash
npm run build
```

Must exit 0. No new TypeScript errors versus the start-of-phase baseline.

### Step 2: Lint

```bash
npm run lint
```

No new lint findings versus baseline.

### Step 3: Line-count sanity check

```bash
wc -l app/page.tsx components/home/*.tsx components/seo/HomepageJsonLd.tsx
```

Expected: `app/page.tsx` around 1100 ± 50 lines (only insertions of new sections + a few imports). New component files in the sizes given in their tasks.

### Step 4: Manual dev walkthrough (user-driven)

This step is intentionally **for the user** — the controller (Claude) cannot do visual checks. Surface this list to the user at the end of Phase 2:

1. Hero loads with slider, headline, polished typography
2. Hero Video Block renders directly below — dark industrial styling, placeholder card visible (or video iframe if `HERO_VIDEO_ID` was swapped to a real ID)
3. Accreditations marquee animates
4. Manufacturer Intro is noticeably shorter — keywords still present
5. Technology Block renders — 4 step cards, then dark benefits panel
6. Products grid loads
7. YouTube Shorts carousel works
8. Customer logos marquee animates
9. Trust block shows 3 trust cues above the reviews carousel
10. Reviews carousel still functional (embla)
11. Blog cards render
12. FAQ accordion works
13. Contact form works

Console: no hydration warnings, no new errors.

Mobile width: iPhone SE, Pixel 6, iPad Air — no horizontal scroll, CTAs visible, spacing comfortable.

### Step 5: Tag Phase 2 complete

```bash
git tag phase-2-complete -m "Homepage Phase 2 — UX redesign complete"
```

Phase 2 is complete when all 9 tasks have passed their commits and the user has done the visual walkthrough.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `REPLACE_WITH_HERO_VIDEO_ID` placeholder shipped to prod | The component renders a clear "Demo video coming soon" placeholder card, not a broken iframe. User can swap when ready. |
| Trimming kills SEO rankings | Keywords audited in Task 8 step 5. JSON-LD authority signals (HowTo, VideoObject) compensate. Keyword phrase appearance counts tracked in trim tasks. |
| Polish edits break responsiveness | Each task builds; user does mobile audit at Task 9. |
| Heading hierarchy regression | Task 8 step 4 explicitly audits this. |
| Too much visual change at once | Each task is one commit. Easy revert per change. |
