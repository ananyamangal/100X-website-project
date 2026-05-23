# Homepage Phase 3 — AI SEO + Conversion + Positioning

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Build AI search authority (FAQ depth, schema richness, geo signals), tighten conversion paths (CTA repetition, WhatsApp), and add positioning sections for the four buyer segments (government, distributor, export, industrial).

**Strategy:** SEO/schema first (compound benefit kicks in earliest), conversion second, positioning third — per user direction.

**Architecture:** Most work augments existing components rather than replacing them. FAQSection already has FAQPage JSON-LD and a working Radix accordion; we extend the data. GlobalJsonLd already emits Organization + LocalBusiness + WebSite; we enrich those nodes. CTA infrastructure (WhatsAppFloatingButton, MobileCtaBar with audience-aware copy, QuoteModal) already exists — we add inline CTA bars and WhatsApp secondary CTAs in homepage sections.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI, lucide-react.

---

## Files to create

```
components/home/
  StatesServedBlock.tsx           # NEW — GEO SEO regions block (Task 3)
  SpecialisedBuyersBlock.tsx      # NEW — 4-card buyer programs (Task 6)
  ManufacturingAuthorityBlock.tsx # NEW — factory/founding/capacity (Task 7)
  InlineInquiryCTA.tsx            # NEW — small inline CTA bar between sections (Task 4)
```

## Files to modify

- `components/FAQSection.tsx` — expand FAQs (Task 1)
- `components/seo/GlobalJsonLd.tsx` — enrich Organization (Task 2)
- `components/seo/HomepageJsonLd.tsx` — add Service catalog (Task 2)
- `components/home/HeroBlock.tsx` — secondary WhatsApp CTA (Task 5)
- `components/home/HeroVideoBlock.tsx` — secondary WhatsApp CTA (Task 5)
- `components/home/TrustBlock.tsx` — trust badges near CTAs (Task 5)
- `app/page.tsx` — wire new blocks + inline CTAs (Tasks 3, 4, 6, 7)

## Final homepage order after Phase 3

```
Hero
HeroVideo
Connector (Built for India)
AccreditationsStrip
ManufacturerIntroBlock
Connector (The Technology)
TechnologyBlock
InlineInquiryCTA                  ← Task 4 new
Connector (The Range)
ProductsBlock
ManufacturingAuthorityBlock       ← Task 7 new
YoutubeShortsCarousel
OurCustomersScroll
Connector (In Their Words)
TrustBlock
SpecialisedBuyersBlock            ← Task 6 new
StatesServedBlock                 ← Task 3 new
BlogBlock
FAQSection                        ← Task 1 expanded
ContactSection
```

---

## Task 1: FAQ entity expansion

**File:** `components/FAQSection.tsx`

The current `FAQS` array has 6 entries. Expand to **12** by adding 6 new entity-rich Q&As covering the segments AI engines retrieve for: pulse-jet technology specifics, droplet size, agricultural application, dealer margins, GeM listing process, and export.

### New entries to add to the `FAQS` array (after the existing 6)

Add these in this order:

```ts
{
  q: "How does a pulse-jet thermal fogger differ from a knapsack or boom sprayer?",
  a:
    "A pulse-jet thermal fogger uses a high-frequency combustion chamber to vapourise the chemical solution into sub-50-micron droplets that drift on air currents into voids, foliage, and drains. Knapsack and boom sprayers produce larger droplets that fall to ground level — better for direct foliar application but limited in reach and coverage. Thermal foggers are the standard for outdoor vector control and area-wide disinfection.",
},
{
  q: "What droplet size do 100x Circle thermal foggers produce, and why does it matter?",
  a:
    "Our pulse-jet foggers produce droplets in the sub-50-micron range (typically 0.5–40 μm depending on chemical and engine setting). Droplets below 50 μm stay airborne long enough to penetrate vegetation, drains, and voids that conventional spraying cannot reach. Larger droplets fall too quickly; smaller droplets evaporate before deposition. This range is the sweet spot for vector control efficacy.",
},
{
  q: "Can 100x Circle fogging machines be used in agriculture for fungicide and pesticide application?",
  a:
    "Yes. Our agricultural thermal foggers apply fungicides, pesticides, and plant growth regulators across orchards, paddy fields, polyhouses, and vegetable farms. The machines handle both oil-based and water-based formulations. Single-operator portable models are commonly used by individual farmers and cooperatives; larger vehicle-mounted units serve estate-scale operations.",
},
{
  q: "How does the GeM listing process work for municipal procurement of 100x Circle equipment?",
  a:
    "100x Circle is a registered OEM on the Government e-Marketplace (GeM). Government departments, Nagar Nigams, Nagar Palikas, Panchayats, and PSUs can search our catalogue on gem.gov.in and place direct purchase orders without separate tendering for catalogue items. For volume contracts and rate contracts, share your indent on WhatsApp or contact form — we respond with GeM-ready documentation, GST invoices, and compliance certificates.",
},
{
  q: "What margins and territory exclusivity do you offer to dealers and distributors?",
  a:
    "Dealer and distributor margins depend on category, volume commitment, and territory. We work with both exclusive and non-exclusive arrangements across Indian states. Active distributors get marketing collateral, training, demo-machine support, and lead routing for their territory. Send your location, current channel experience, and target volume to start the onboarding conversation.",
},
{
  q: "Do you export 100x Circle fogging machines outside India, and what are the international shipping options?",
  a:
    "Yes. We ship to buyers in South Asia, Africa, and the Middle East — including municipal corporations, NGO health programs, and private pest-control operators. Standard incoterms are FOB Mumbai/Nhava Sheva and EXW Gurugram; CIF and DDP can be arranged for larger orders. Compliance documents (commercial invoice, packing list, certificate of origin, BIS where applicable) are issued by our export desk.",
},
```

### Step 1: Modify `components/FAQSection.tsx`

Find the `const FAQS: Faq[] = [` opening bracket. Append the 6 new entries above before the closing `]`. Order: existing 6, then the 6 above. The FAQPage JSON-LD will pick up the new entries automatically.

### Step 2: Audit answer length

Each answer should be 1–4 sentences, self-contained (cite-worthy). Existing 6 already meet this — the 6 new ones are written to the same length. No further trimming needed.

### Step 3: Build + commit

```bash
npm run build
git add components/FAQSection.tsx
git commit -m "feat(seo): expand FAQSection from 6 to 12 entity-rich Q&As"
```

---

## Task 2: Schema enrichment

**Files:**
- Modify: `components/seo/GlobalJsonLd.tsx`
- Modify: `components/seo/HomepageJsonLd.tsx`

### Step 1: Enrich the `organization` node in `GlobalJsonLd.tsx`

Find the `organization` object. Add these fields **inside** it (before the closing `}`):

```ts
foundingDate: "2014",
foundingLocation: {
  "@type": "Place",
  name: "Gurugram, Haryana, India",
},
description:
  "100X Circle is an Indian OEM manufacturer of pulse-jet thermal fogging machines for municipal vector control and agricultural use. GeM-listed, ISO-grade build, distributed across 50+ Indian locations and exported across South Asia, Africa, and the Middle East.",
keywords: [
  "thermal fogging machine manufacturer",
  "pulse jet fogging machine",
  "GeM approved OEM",
  "vector control equipment",
  "agricultural fogging machine",
].join(", "),
knowsAbout: [
  "Pulse-jet thermal fogging",
  "Vector-borne disease control",
  "Municipal mosquito control",
  "Agricultural crop protection",
  "Government e-Marketplace procurement",
],
makesOffer: {
  "@type": "OfferCatalog",
  name: "100X Circle Fogging Equipment",
  itemListElement: [
    {
      "@type": "OfferCatalog",
      name: "Municipal Vector-Control Foggers",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Vehicle-Mounted Thermal Fogging Machines",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Double-Barrel Thermal Foggers",
          },
        },
      ],
    },
    {
      "@type": "OfferCatalog",
      name: "Agricultural Foggers",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Portable Pulse-Jet Foggers",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Power Tillers and Sprayers",
          },
        },
      ],
    },
  ],
},
areaServed: [
  {
    "@type": "Country",
    name: "India",
  },
  {
    "@type": "AdministrativeArea",
    name: "South Asia",
  },
  {
    "@type": "AdministrativeArea",
    name: "Middle East",
  },
  {
    "@type": "AdministrativeArea",
    name: "Africa",
  },
],
```

Note: `sameAs` is already `[BUSINESS.youtube]`. If `BUSINESS` in `lib/seo/site-config.ts` has additional social URLs (LinkedIn, Facebook, X), they should be added — but only if they exist there. Do NOT invent URLs. If only YouTube is configured, leave `sameAs` as-is.

### Step 2: Enrich `HomepageJsonLd.tsx`

Find the `items.push({...HowTo...})` block. After it, append another `items.push({...})` for a `Service` entry:

```ts
items.push({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Pulse-Jet Thermal Fogging Equipment Supply",
  provider: {
    "@type": "Organization",
    name: "100x Circle Pvt Ltd",
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Fogging Equipment Programs",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Municipal & Government Procurement (GeM)",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Dealer & Distributor Partnership",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Export & International Buyers",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Industrial & Estate Buyers",
        },
      },
    ],
  },
})
```

### Step 3: Build + commit

```bash
npm run build
git add components/seo/GlobalJsonLd.tsx components/seo/HomepageJsonLd.tsx
git commit -m "feat(seo): enrich Organization (founding, knowsAbout, OfferCatalog, areaServed) + Service catalog on homepage"
```

---

## Task 3: "States We Serve" block — GEO SEO

**Files:**
- Create: `components/home/StatesServedBlock.tsx`
- Modify: `app/page.tsx`

State landings that exist today (based on prior commits): `/fogging-machine-supplier-in-bihar`. More may follow. Surface a "States We Serve" block on the homepage that links to whichever state landings exist and lists the major states served generally.

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Curated list of major states/regions served. Each entry can optionally link
// to a state-specific landing page; entries without `href` render as a plain
// list item. Add new state landings here as they ship.
const STATES = [
  { name: "Bihar", href: "/fogging-machine-supplier-in-bihar" },
  { name: "Uttar Pradesh" },
  { name: "Delhi" },
  { name: "Haryana" },
  { name: "Maharashtra" },
  { name: "Gujarat" },
  { name: "Rajasthan" },
  { name: "Madhya Pradesh" },
  { name: "Karnataka" },
  { name: "Tamil Nadu" },
  { name: "West Bengal" },
  { name: "Punjab" },
  { name: "Telangana" },
  { name: "Andhra Pradesh" },
  { name: "Odisha" },
  { name: "Jharkhand" },
]

export default function StatesServedBlock() {
  return (
    <section
      className="bg-gray-50 py-16 md:py-20"
      aria-labelledby="states-served-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10 md:mb-14">
          <Badge className="mb-5 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            Pan-India Coverage
          </Badge>
          <h2
            id="states-served-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight"
          >
            States We Serve
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Active distributors and direct supply across major Indian states — for municipal corporations, Nagar Nigams, Nagar Palikas, Panchayats, and private buyers.
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 list-none">
          {STATES.map((s) => {
            const inner = (
              <span className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:shadow-sm transition-all">
                <MapPin className="text-green-700 shrink-0" size={18} aria-hidden="true" />
                <span className="text-sm md:text-base text-gray-800 font-medium">{s.name}</span>
                {s.href && (
                  <ArrowRight className="text-green-700 ml-auto shrink-0" size={16} aria-hidden="true" />
                )}
              </span>
            )
            return (
              <li key={s.name}>
                {s.href ? <Link href={s.href}>{inner}</Link> : inner}
              </li>
            )
          })}
        </ul>

        <p className="text-center mt-8 text-sm text-gray-600">
          Don't see your state listed? <Link href="/contact-us" className="text-green-700 underline-offset-2 hover:underline font-medium">Get in touch</Link> — we ship nationwide.
        </p>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Import:
```tsx
import StatesServedBlock from "@/components/home/StatesServedBlock"
```

Insert between `<SpecialisedBuyersBlock />` (Task 6, will exist after Task 6 is committed) and `<BlogBlock ... />`.

For Task 3's own commit, insert just before `<BlogBlock ... />`. Task 6 will later add `<SpecialisedBuyersBlock />` above it.

### Step 3: Build + commit

```bash
npm run build
git add components/home/StatesServedBlock.tsx app/page.tsx
git commit -m "feat(home): add StatesServedBlock — pan-India coverage + state landings interlinking"
```

---

## Task 4: Inline inquiry CTAs between key sections

**Files:**
- Create: `components/home/InlineInquiryCTA.tsx`
- Modify: `app/page.tsx`

Sticky bars handle persistent CTA visibility; this task adds in-flow CTAs at narrative beats so users don't have to scroll to act.

### Step 1: Create `components/home/InlineInquiryCTA.tsx`

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"

interface Props {
  /** Lead-in line shown above the buttons. */
  text: string;
  /** Pre-filled WhatsApp message context. */
  whatsappMessage?: string;
  /** Tone: light (gray-50) or dark (gray-950). Use sparingly. */
  tone?: "light" | "dark";
}

export default function InlineInquiryCTA({
  text,
  whatsappMessage = "Hi, I'd like to discuss 100x Circle fogging machines.",
  tone = "light",
}: Props) {
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(whatsappMessage)}`
  const isDark = tone === "dark"
  return (
    <section
      className={isDark ? "bg-gray-950 py-12 md:py-16" : "bg-gray-50 py-12 md:py-16"}
      aria-label="Quick inquiry"
    >
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <p className={`text-lg md:text-xl font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
          {text}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-base md:text-lg px-7 py-5 shadow-lg shadow-green-900/20"
          >
            <Link href="/contact-us" className="flex items-center">
              Get a Quote <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className={
              isDark
                ? "border-2 border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-base md:text-lg px-7 py-5"
                : "border-2 border-green-700 text-green-700 hover:bg-green-50 text-base md:text-lg px-7 py-5"
            }
          >
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              data-gtm="cta_whatsapp"
              data-gtm-location="inline_inquiry"
            >
              <MessageCircle className="mr-2" size={20} />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

### Step 2: Wire 3 inline CTAs into `app/page.tsx`

Add the import:
```tsx
import InlineInquiryCTA from "@/components/home/InlineInquiryCTA"
```

Place THREE inline CTAs at these positions:

**Position 1** — between `<TechnologyBlock />` and the `<SectionConnector eyebrow="The Range" ... />`:
```tsx
<InlineInquiryCTA
  text="Need this technology for your municipality, farm, or estate?"
  whatsappMessage="Hi, I just read about your pulse-jet thermal fogging technology and would like to discuss requirements."
/>
```

**Position 2** — between `<ProductsBlock ... />` and `<ManufacturingAuthorityBlock />` (after Task 7 lands). For Task 4's commit, place it between `<ProductsBlock ... />` and `<YoutubeShortsCarousel />`:
```tsx
<InlineInquiryCTA
  text="Compare models or request a tailored quote for your tender."
  whatsappMessage="Hi, I'd like a quote tailored to my use case (please mention: municipal / agricultural / industrial / export)."
  tone="dark"
/>
```

**Position 3** — between `<TrustBlock />` and `<SpecialisedBuyersBlock />` (after Task 6 lands). For Task 4's commit, place it between `<TrustBlock />` and `<BlogBlock ... />`:
```tsx
<InlineInquiryCTA
  text="Join 10,000+ buyers — municipal, agricultural, and industrial — already running 100X equipment."
  whatsappMessage="Hi, I'd like to talk to your team about 100x Circle fogging machines."
/>
```

### Step 3: Build + commit

```bash
npm run build
git add components/home/InlineInquiryCTA.tsx app/page.tsx
git commit -m "feat(home): InlineInquiryCTA + three CTAs woven at narrative beats"
```

---

## Task 5: Secondary WhatsApp CTAs + trust badges in HeroBlock, HeroVideoBlock, TrustBlock

**Files:**
- Modify: `components/home/HeroBlock.tsx`
- Modify: `components/home/HeroVideoBlock.tsx`
- Modify: `components/home/TrustBlock.tsx`

The hero currently has "Explore Products" + "Watch Demo" buttons. We add a third button to both desktop and mobile heroes: a WhatsApp link, sitting alongside the existing two. Same for `HeroVideoBlock` (currently has only "Talk to Our Team"). We also add a tiny trust-cue row right under the primary CTAs in the hero.

### Step 1: Add WhatsApp helper at top of `HeroBlock.tsx`

Inside the component, derive the WhatsApp href once:

```tsx
import { MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

// ... inside the component body, before the return:
const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi, I'd like to discuss 100x Circle fogging machines."
)}`
```

### Step 2: Add a WhatsApp button to BOTH the desktop and mobile CTA rows in `HeroBlock.tsx`

Find both `<div className="flex flex-col sm:flex-row gap-4 md:gap-6 ...">` CTA wrappers (one in desktop branch, one in mobile branch). Currently each contains: `<Button ... bg-green-600 ...>Explore Products</Button>` + `<Button variant="outline" ...>Watch Demo</Button>`.

After the "Watch Demo" button (in both branches), insert this third button:

**Desktop branch:**
```tsx
<Button
  asChild
  size="lg"
  variant="outline"
  className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900 text-lg px-8 py-4 bg-transparent"
>
  <a href={waHref} target="_blank" rel="noopener noreferrer" data-gtm="cta_whatsapp" data-gtm-location="hero_desktop" className="flex items-center">
    <MessageCircle className="mr-2" size={20} />
    WhatsApp
  </a>
</Button>
```

**Mobile branch:**
```tsx
<Button
  asChild
  size="lg"
  variant="outline"
  className="border-2 border-green-600 text-green-600 hover:bg-green-50 text-lg px-8 py-4 bg-transparent"
>
  <a href={waHref} target="_blank" rel="noopener noreferrer" data-gtm="cta_whatsapp" data-gtm-location="hero_mobile" className="flex items-center justify-center">
    <MessageCircle className="mr-2" size={20} />
    WhatsApp
  </a>
</Button>
```

### Step 3: Add a tiny trust-cue row under the primary CTAs

In the desktop branch, immediately AFTER the CTA `<div>` and BEFORE the stats `<div className="grid grid-cols-2 ...">`, insert:

```tsx
<p className="text-xs md:text-sm text-gray-300 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 max-w-md mx-auto md:mx-0">
  <span className="inline-flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
    GeM-approved OEM
  </span>
  <span className="inline-flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
    Made in India
  </span>
  <span className="inline-flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
    10,000+ buyers
  </span>
</p>
```

In the mobile branch, insert the same paragraph immediately after the CTA `<div>` and before the stats grid — but change `text-gray-300` → `text-gray-600` so it's readable on the white mobile background.

### Step 4: Add a secondary WhatsApp CTA to `HeroVideoBlock.tsx`

Find the CTA `<div className="mt-10 flex justify-center">` and replace it with this two-button version:

```tsx
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
```

Add the imports at the top:
```tsx
import { MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"
```

(`MessageCircle` needs to be added to the existing lucide-react import; `BUSINESS` is a new import.)

### Step 5: Add trust badges row in `TrustBlock.tsx`

The 3-up trust-cue grid was added in Phase 2 and already exists. Make a small enhancement: add small badge accents (a green dot + label) directly above the H2 line. Find the `<div className="text-center mb-12 md:mb-14">` block. Right before the `<Badge>` (or `<h2>`), inject:

```tsx
<div className="flex flex-wrap justify-center items-center gap-3 mb-4 text-xs md:text-sm text-gray-500">
  <span className="inline-flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
    Field reviews
  </span>
  <span className="inline-flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
    Real customers
  </span>
  <span className="inline-flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
    Verified deployments
  </span>
</div>
```

This signals authenticity above the testimonials block.

### Step 6: Build + commit

```bash
npm run build
git add components/home/HeroBlock.tsx components/home/HeroVideoBlock.tsx components/home/TrustBlock.tsx
git commit -m "feat(conversion): secondary WhatsApp CTAs + trust-cue micro-rows in Hero/HeroVideo/Trust"
```

---

## Task 6: SpecialisedBuyersBlock — 4-card buyer programs

**Files:**
- Create: `components/home/SpecialisedBuyersBlock.tsx`
- Modify: `app/page.tsx`

Single homepage block containing four cards: Government/Tender, Distributor/Dealer, Export, Industrial/Enterprise. Each card has a short headline, 2-line value prop, and a primary CTA. Replaces what would otherwise be three separate positioning sections.

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import Link from "next/link"
import {
  Building2,
  Handshake,
  Globe2,
  Factory,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BUSINESS } from "@/lib/seo/site-config"

const PROGRAMS = [
  {
    icon: Building2,
    title: "Government & Tender",
    body: "GeM-listed OEM. Direct supply to Nagar Nigams, Nagar Palikas, Panchayats, and Health Departments. Tender-ready documentation in 48 hours.",
    cta: "Request Tender Quote",
    whatsappMessage:
      "Hi, I'd like a tender / GeM quote. Please share rate, GST, delivery, and compliance certificates.",
  },
  {
    icon: Handshake,
    title: "Dealer & Distributor",
    body: "Active partners across 50+ Indian locations. Marketing collateral, training, demo machines, and territory-routed leads.",
    cta: "Become a Distributor",
    whatsappMessage:
      "Hi, I'd like to discuss becoming a dealer / distributor for 100x Circle. Please share margins and territory details.",
  },
  {
    icon: Globe2,
    title: "Export Buyers",
    body: "Shipping to South Asia, Africa, and the Middle East. FOB Mumbai / EXW Gurugram, with CIF and DDP on larger orders.",
    cta: "Export Inquiry",
    whatsappMessage:
      "Hi, I'm interested in importing 100x Circle fogging machines. Please share export catalog, prices, and incoterms.",
  },
  {
    icon: Factory,
    title: "Industrial & Estate",
    body: "Pest control companies, warehouses, factories, and agricultural estates. Single-operator and vehicle-mounted ranges available.",
    cta: "Talk to Our Team",
    whatsappMessage:
      "Hi, I'm looking at industrial / estate fogging machines for our facility. Please share recommended models.",
  },
]

export default function SpecialisedBuyersBlock() {
  return (
    <section
      className="bg-white py-16 md:py-24"
      aria-labelledby="specialised-buyers-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-14">
          <Badge className="mb-5 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            Specialised Programs
          </Badge>
          <h2
            id="specialised-buyers-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight"
          >
            Built for Every Kind of Buyer
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Government procurement, distributor partnerships, export, and industrial supply — each with a dedicated lane and a dedicated team.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
          {PROGRAMS.map((p) => {
            const Icon = p.icon
            const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(p.whatsappMessage)}`
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-8 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid place-items-center w-11 h-11 rounded-xl bg-green-600/10 ring-1 ring-green-600/20">
                    <Icon className="text-green-700" size={22} aria-hidden="true" />
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">{p.title}</h3>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-6 flex-1">
                  {p.body}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/contact-us"
                    className="inline-flex items-center text-sm md:text-base font-semibold text-white bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-md transition-colors"
                  >
                    {p.cta} <ArrowRight className="ml-2" size={16} />
                  </Link>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-gtm="cta_whatsapp"
                    data-gtm-location={`specialised_${p.title.toLowerCase().replace(/\s+/g, "_")}`}
                    className="inline-flex items-center text-sm md:text-base font-semibold text-green-700 hover:text-green-800 underline-offset-2 hover:underline"
                  >
                    WhatsApp →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Add the import:
```tsx
import SpecialisedBuyersBlock from "@/components/home/SpecialisedBuyersBlock"
```

Insert directly **after** `<TrustBlock />` and **before** the InlineInquiryCTA #3 (the "Join 10,000+ buyers" one from Task 4).

So the flow becomes: `<TrustBlock />` → `<SpecialisedBuyersBlock />` → `<InlineInquiryCTA text="Join 10,000+ buyers..." />` → `<StatesServedBlock />` → `<BlogBlock ... />`.

### Step 3: Build + commit

```bash
npm run build
git add components/home/SpecialisedBuyersBlock.tsx app/page.tsx
git commit -m "feat(home): SpecialisedBuyersBlock — government/distributor/export/industrial programs"
```

---

## Task 7: ManufacturingAuthorityBlock — factory & founding authority

**Files:**
- Create: `components/home/ManufacturingAuthorityBlock.tsx`
- Modify: `app/page.tsx`

Surface manufacturing depth: founding year, in-house facility location, capacity, certifications. Visual: dark industrial card with stats + a short copy block.

### Step 1: Create the component

```tsx
"use client"

import React from "react"
import { Factory, MapPin, Award, Wrench } from "lucide-react"

const STATS = [
  { icon: Factory, value: "Gurugram", label: "Manufacturing facility" },
  { icon: Award, value: "10+ years", label: "Of OEM production" },
  { icon: Wrench, value: "In-house", label: "Engineering & assembly" },
  { icon: MapPin, value: "50+", label: "Distribution points" },
]

export default function ManufacturingAuthorityBlock() {
  return (
    <section
      className="bg-gradient-to-b from-gray-950 to-gray-900 py-16 md:py-24"
      aria-labelledby="manufacturing-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs md:text-sm uppercase tracking-widest text-green-400 font-semibold mb-3">
            Manufacturing Authority
          </p>
          <h2
            id="manufacturing-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            Designed, Built, and Tested in India
          </h2>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Pulse-jet thermal foggers engineered and assembled at our Gurugram facility. Every machine field-tested for Indian conditions before it ships — from monsoon humidity to high-vegetation municipal terrain.
          </p>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 list-none">
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <li
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-7 text-center"
              >
                <Icon className="text-green-400 mx-auto mb-3" size={28} aria-hidden="true" />
                <div className="text-xl md:text-2xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs md:text-sm text-gray-400">{s.label}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
```

### Step 2: Wire into `app/page.tsx`

Add the import:
```tsx
import ManufacturingAuthorityBlock from "@/components/home/ManufacturingAuthorityBlock"
```

Insert directly **after** `<ProductsBlock ... />` and **before** the existing InlineInquiryCTA #2 (the dark-tone "Compare models" one from Task 4).

So the flow becomes: `<ProductsBlock ... />` → `<ManufacturingAuthorityBlock />` → `<InlineInquiryCTA ... tone="dark" />` → `<YoutubeShortsCarousel />`.

### Step 3: Build + commit

```bash
npm run build
git add components/home/ManufacturingAuthorityBlock.tsx app/page.tsx
git commit -m "feat(home): ManufacturingAuthorityBlock — factory + founding authority stats"
```

---

## Task 8: Final verification

**Files:** none.

### Step 1: Build

```bash
npm run build
```

Exit 0. No new TS errors.

### Step 2: Section order audit

Grep `app/page.tsx` for the new and existing component names. The final order in `renderHomePage()` must be:

```
HomepageJsonLd
HeroBlock
HeroVideoBlock
SectionConnector (Built for India)
AccreditationsStrip
ManufacturerIntroBlock
SectionConnector (The Technology)
TechnologyBlock
InlineInquiryCTA (Need this technology...)
SectionConnector (The Range)
ProductsBlock
ManufacturingAuthorityBlock
InlineInquiryCTA (Compare models... tone="dark")
YoutubeShortsCarousel
OurCustomersScroll
SectionConnector (In Their Words)
TrustBlock
SpecialisedBuyersBlock
InlineInquiryCTA (Join 10,000+ buyers...)
StatesServedBlock
BlogBlock
FAQSection
ContactSection
```

### Step 3: Heading hierarchy re-audit

Same as Phase 2 step. Confirm exactly one `<h1>` and clean h2/h3/h4 nesting across all the new blocks.

### Step 4: JSON-LD validity check

Read `components/seo/GlobalJsonLd.tsx` and `components/seo/HomepageJsonLd.tsx`. Confirm the new fields are syntactically valid JSON.

### Step 5: Line-count sanity

```bash
wc -l app/page.tsx components/home/*.tsx components/FAQSection.tsx components/seo/*.tsx
```

`app/page.tsx` should be around 1100–1150 lines. New components in 40–180 line range each.

### Step 6: Tag Phase 3 complete

```bash
git tag phase-3-complete -m "Homepage Phase 3 — SEO + conversion + positioning"
```

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Schema enrichment introduces invalid JSON | Each Task 2 edit is reviewed for trailing-comma + bracket balance before commit |
| CTA overload — too many inline CTAs make the page feel pushy | Only 3 InlineInquiryCTAs are inserted, placed at narrative beats; not after every section |
| Adding 4 new blocks bloats homepage | Each block is ≤200 lines, lazy-loadable later if Lighthouse flags weight |
| Trust micro-rows clash with existing 3-up cue row in TrustBlock | The new badge row sits above the H2, the existing 3-up sits below the intro paragraph — visually separated |
| Schema bloat (multiple LD-JSON blocks) | Schema.org permits multiple types; AI engines parse them collectively. Standard practice. |
