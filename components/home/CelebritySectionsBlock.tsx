"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { optimizeCloudinary } from "@/lib/cloudinaryUrl"

// Source celebrity photos are tall cutout portraits (~3115x4672, ratio 1:1.5).
// Actual per-image aspect varies by CMS upload, but this is only used as
// next/image's intrinsic-size hint for CLS reservation -- the visible size is
// still fully controlled by each usage's height + object-contain className.
const CUTOUT_RATIO = 1.5
const cutoutHeight = (width: number) => Math.round(width * CUTOUT_RATIO)

export interface HomepageSection {
  _id: string
  sectionKey: string
  type: string
  enabled: boolean
  order: number
  placement: string
  layout?: "split" | "comparison" | "pillars" | "grid-cards" | "centered"
  headline: string
  subheadline?: string
  bodyText?: string
  ctaText?: string
  ctaUrl?: string
  ctaSecondaryText?: string
  ctaSecondaryUrl?: string
  imageUrl?: string
  imageAlt?: string
  imagePosition: "left" | "right" | "center" | "background"
  badge?: string
  theme: "light" | "dark" | "green" | "orange"
  stats?: { label: string; value: string }[]
  bullets?: string[]
  comparisonBadTitle?: string
  comparisonGoodTitle?: string
  comparisonBad?: string[]
  comparisonGood?: string[]
  showOnMobile: boolean
  showOnDesktop: boolean
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const T = {
  light: {
    section: "bg-white",
    headline: "text-gray-900",
    sub: "text-brand-700",
    body: "text-gray-600",
    badge: "bg-brand-100 text-brand-800 border border-brand-200",
    cta: "bg-brand-600 text-white hover:bg-brand-700 shadow-md",
    ctaAlt: "border-2 border-brand-600 text-brand-700 hover:bg-brand-50",
    stat: "bg-gray-50 border border-gray-100 text-gray-900",
    bullet: "text-brand-700",
    card: "bg-gray-50 border border-gray-100",
    cardText: "text-gray-800",
    divider: "border-gray-200",
    badBg: "bg-red-50 border border-red-100",
    badText: "text-red-700",
    badIcon: "text-red-500",
    goodBg: "bg-brand-50 border border-brand-100",
    goodText: "text-brand-800",
    goodIcon: "text-brand-600",
  },
  dark: {
    section: "bg-gray-900",
    headline: "text-white",
    sub: "text-brand-400",
    body: "text-gray-300",
    badge: "bg-white/10 text-gray-200 border border-white/20",
    cta: "bg-brand-500 text-white hover:bg-green-400 shadow-lg",
    ctaAlt: "border-2 border-white/40 text-white hover:border-white",
    stat: "bg-white/10 text-white",
    bullet: "text-brand-400",
    card: "bg-white/8 border border-white/10",
    cardText: "text-gray-200",
    divider: "border-white/10",
    badBg: "bg-red-900/30 border border-red-700/30",
    badText: "text-red-300",
    badIcon: "text-red-400",
    goodBg: "bg-green-900/30 border border-brand-700/30",
    goodText: "text-green-300",
    goodIcon: "text-brand-400",
  },
  green: {
    section: "bg-gradient-to-br from-brand-700 via-green-800 to-green-900",
    headline: "text-white",
    sub: "text-green-200",
    body: "text-green-100",
    badge: "bg-white/15 text-white border border-white/20",
    cta: "bg-white text-brand-800 hover:bg-brand-50 shadow-lg",
    ctaAlt: "border-2 border-white/40 text-white hover:border-white",
    stat: "bg-white/15 text-white",
    bullet: "text-green-200",
    card: "bg-white/10 border border-white/15",
    cardText: "text-white",
    divider: "border-white/20",
    badBg: "bg-red-900/40 border border-red-400/30",
    badText: "text-red-200",
    badIcon: "text-red-300",
    goodBg: "bg-white/15 border border-white/20",
    goodText: "text-white",
    goodIcon: "text-green-200",
  },
  orange: {
    section: "bg-gradient-to-br from-orange-600 to-orange-800",
    headline: "text-white",
    sub: "text-orange-100",
    body: "text-orange-50",
    badge: "bg-white/15 text-white border border-white/20",
    cta: "bg-white text-orange-800 hover:bg-orange-50 shadow-lg",
    ctaAlt: "border-2 border-white/40 text-white hover:border-white",
    stat: "bg-white/15 text-white",
    bullet: "text-orange-100",
    card: "bg-white/10 border border-white/15",
    cardText: "text-white",
    divider: "border-white/20",
    badBg: "bg-red-900/30 border border-red-300/20",
    badText: "text-red-100",
    badIcon: "text-red-200",
    goodBg: "bg-white/15 border border-white/20",
    goodText: "text-white",
    goodIcon: "text-orange-100",
  },
}

// ─── JSON-LD ───────────────────────────────────────────────────────────────────

function SectionJsonLd({ s }: { s: HomepageSection }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPageElement",
    name: s.headline,
    description: s.bodyText || s.subheadline || s.headline,
  }
  if (s.imageUrl) schema.image = { "@type": "ImageObject", url: s.imageUrl, description: s.imageAlt || s.headline }
  if (s.bullets?.length) schema.about = s.bullets.map((b) => ({ "@type": "Thing", name: b }))
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Badge({ text, cls }: { text: string; cls: string }) {
  if (!text) return null
  return <span className={cn("inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4", cls)}>{text}</span>
}

function CTAButtons({ s, tc }: { s: HomepageSection; tc: typeof T.light }) {
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      {s.ctaText && s.ctaUrl && (
        <Link href={s.ctaUrl} className={cn("px-6 py-2.5 rounded-xl font-semibold text-sm transition-all", tc.cta)}>
          {s.ctaText}
        </Link>
      )}
      {s.ctaSecondaryText && s.ctaSecondaryUrl && (
        <Link href={s.ctaSecondaryUrl} className={cn("px-6 py-2.5 rounded-xl font-semibold text-sm transition-all", tc.ctaAlt)}>
          {s.ctaSecondaryText}
        </Link>
      )}
    </div>
  )
}

function StatsRow({ stats, cls }: { stats: HomepageSection["stats"]; cls: string }) {
  if (!stats?.length) return null
  return (
    <div className="flex flex-wrap gap-3 mt-5">
      {stats.map((st, i) => (
        <div key={i} className={cn("rounded-xl px-4 py-3 text-center min-w-[80px]", cls)}>
          <p className="text-2xl font-bold leading-none mb-0.5">{st.value}</p>
          <p className="text-xs opacity-75">{st.label}</p>
        </div>
      ))}
    </div>
  )
}

function CutoutImage({ s, maxH = 480 }: { s: HomepageSection; maxH?: number }) {
  if (!s.imageUrl) return null
  const src = optimizeCloudinary(s.imageUrl, 640)
  return (
    <div className="flex items-end justify-center h-full">
      <Image
        src={src}
        alt={s.imageAlt || s.headline}
        width={640}
        height={cutoutHeight(640)}
        unoptimized
        className="w-full h-auto object-contain drop-shadow-2xl select-none pointer-events-none"
        style={{ maxHeight: `${maxH}px` }}
        loading="lazy"
        draggable={false}
      />
    </div>
  )
}

// ─── LAYOUT: Comparison (Buyer's Dilemma) ─────────────────────────────────────

function ComparisonLayout({ s }: { s: HomepageSection }) {
  const tc = T[s.theme] || T.light
  const hasImage = !!s.imageUrl
  const imageLeft = s.imagePosition === "left"
  const imageRight = s.imagePosition === "right"

  const bad = s.comparisonBad || []
  const good = s.comparisonGood || []
  const rows = Math.max(bad.length, good.length)

  return (
    <section id={s.sectionKey} className={cn("py-14 md:py-20 overflow-hidden", tc.section)}>
      <SectionJsonLd s={s} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header — always full width */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <Badge text={s.badge || ""} cls={tc.badge} />
          <h2 className={cn("text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3", tc.headline)}>{s.headline}</h2>
          {s.subheadline && <p className={cn("text-lg mb-2 font-medium", tc.sub)}>{s.subheadline}</p>}
          {s.bodyText && <p className={cn("text-base leading-relaxed", tc.body)}>{s.bodyText}</p>}
        </div>

        {/* Split: image + comparison table */}
        <div className={cn("grid gap-8 items-start", hasImage ? "lg:grid-cols-2" : "")}>
          {hasImage && imageLeft && (
            <div className="flex items-end justify-center min-h-[320px] lg:min-h-[420px]">
              <CutoutImage s={s} maxH={460} />
            </div>
          )}

          {/* Comparison table */}
          <div className="w-full">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className={cn("rounded-xl px-4 py-2.5 text-center font-bold text-sm", tc.badBg, tc.badText)}>
                ✗ {s.comparisonBadTitle || "Trading Company"}
              </div>
              <div className={cn("rounded-xl px-4 py-2.5 text-center font-bold text-sm", tc.goodBg, tc.goodText)}>
                ✓ {s.comparisonGoodTitle || "Genuine Manufacturer"}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <div className={cn("rounded-lg px-3 py-2.5 text-xs flex items-start gap-2", tc.badBg)}>
                    <span className={cn("shrink-0 mt-0.5 font-bold", tc.badIcon)}>✗</span>
                    <span className={tc.badText}>{bad[i] || ""}</span>
                  </div>
                  <div className={cn("rounded-lg px-3 py-2.5 text-xs flex items-start gap-2", tc.goodBg)}>
                    <span className={cn("shrink-0 mt-0.5 font-bold", tc.goodIcon)}>✓</span>
                    <span className={tc.goodText}>{good[i] || ""}</span>
                  </div>
                </div>
              ))}
            </div>

            <StatsRow stats={s.stats} cls={tc.stat} />
            <CTAButtons s={s} tc={tc} />
          </div>

          {hasImage && imageRight && (
            <div className="hidden lg:flex items-end justify-center min-h-[420px]">
              <CutoutImage s={s} maxH={460} />
            </div>
          )}
        </div>

        {/* Mobile image (always at top for comparison layout) */}
        {hasImage && imageRight && (
          <div className="lg:hidden flex justify-center mt-6">
            <Image
              src={optimizeCloudinary(s.imageUrl!, 360)}
              alt={s.imageAlt || s.headline}
              width={360}
              height={cutoutHeight(360)}
              unoptimized
              className="h-48 w-auto object-contain drop-shadow-xl"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  )
}

// ─── LAYOUT: Trust Pillars (100X Difference) ──────────────────────────────────

function PillarsLayout({ s }: { s: HomepageSection }) {
  const tc = T[s.theme] || T.light
  const bullets = s.bullets || []
  const hasImage = !!s.imageUrl
  const imageLeft = s.imagePosition === "left" || !hasImage
  const half = Math.ceil(bullets.length / 2)

  return (
    <section id={s.sectionKey} className={cn("py-14 md:py-20 overflow-hidden relative", tc.section)}>
      <SectionJsonLd s={s} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={cn("grid gap-10 items-center", hasImage ? "lg:grid-cols-[1fr_1fr]" : "")}>
          {/* Image — left side (desktop only; mobile stacks above) */}
          {hasImage && imageLeft && (
            <div className="hidden lg:flex items-end justify-center min-h-[400px]">
              <CutoutImage s={s} maxH={500} />
            </div>
          )}

          {/* Content */}
          <div>
            <Badge text={s.badge || ""} cls={tc.badge} />
            <h2 className={cn("text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3", tc.headline)}>{s.headline}</h2>
            {s.subheadline && <p className={cn("text-lg font-medium mb-3", tc.sub)}>{s.subheadline}</p>}
            {s.bodyText && <p className={cn("text-sm leading-relaxed mb-5 max-w-xl", tc.body)}>{s.bodyText}</p>}

            {/* Two-column checklist */}
            {bullets.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-2">
                {bullets.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className={cn("text-lg font-bold shrink-0", tc.goodIcon)}>✔</span>
                    <span className={cn("text-sm font-medium", tc.headline)}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            <StatsRow stats={s.stats} cls={tc.stat} />
            <CTAButtons s={s} tc={tc} />
          </div>

          {hasImage && !imageLeft && (
            <div className="hidden lg:flex items-end justify-center min-h-[400px]">
              <CutoutImage s={s} maxH={500} />
            </div>
          )}
        </div>

        {/* Mobile image */}
        {hasImage && (
          <div className="lg:hidden flex justify-center mt-8">
            <Image
              src={optimizeCloudinary(s.imageUrl!, 320)}
              alt={s.imageAlt || s.headline}
              width={320}
              height={cutoutHeight(320)}
              unoptimized
              className="h-56 w-auto object-contain drop-shadow-xl"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  )
}

// ─── LAYOUT: Grid Cards (Authority Section) ───────────────────────────────────

const GRID_ICONS: Record<string, string> = {
  "Government Procurement Support": "🏛️",
  "GeM Procurement Ready": "📋",
  "GeM Qualified Supplier": "📋",
  "Tender Documentation Support": "📄",
  "Technical Compliance Support": "⚙️",
  "After Sales Service": "🔧",
  "Custom Manufacturing": "🏭",
  "Custom Specification Manufacturing": "🏭",
  "OEM Branding": "🏷️",
  "OEM Branding Available": "🏷️",
  "OEM Branding for Distributors": "🏷️",
  "Deployment Support": "🚛",
  "Factory & Manufacturing Plant": "🏗️",
  "In-house Testing & QC": "🔬",
  "ISO 9001:2015 & CE Certification": "🏅",
  "Engineering & R&D Capability": "⚙️",
  "Tender Qualified Products": "📝",
  "GeM & Tender Qualification": "📋",
  "Government Supply Track Record": "📊",
  "Domestic Spare Parts & Service": "🔧",
  "Spare Parts Support": "🔧",
  "Made In India": "🇮🇳",
  "Lab Tested Products": "🔬",
  "Indian & International Certifications": "🏅",
  "Government Supply Experience": "📊",
}

function getIcon(text: string): string {
  return GRID_ICONS[text] || "✓"
}

function GridCardsLayout({ s }: { s: HomepageSection }) {
  const tc = T[s.theme] || T.light
  const items = s.bullets || []
  const hasImage = !!s.imageUrl

  return (
    <section id={s.sectionKey} className={cn("py-14 md:py-20", tc.section)}>
      <SectionJsonLd s={s} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <Badge text={s.badge || ""} cls={tc.badge} />
          <h2 className={cn("text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3", tc.headline)}>{s.headline}</h2>
          {s.subheadline && <p className={cn("text-lg font-medium mb-2", tc.sub)}>{s.subheadline}</p>}
          {s.bodyText && <p className={cn("text-base leading-relaxed", tc.body)}>{s.bodyText}</p>}
        </div>

        {/* Optional celebrity image above grid */}
        {hasImage && (
          <div className="flex justify-center mb-10">
            <Image
              src={optimizeCloudinary(s.imageUrl!, 320)}
              alt={s.imageAlt || s.headline}
              width={320}
              height={cutoutHeight(320)}
              unoptimized
              className="h-52 w-auto object-contain drop-shadow-xl"
              loading="lazy"
            />
          </div>
        )}

        {/* Grid of cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <div key={i} className={cn("rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-all hover:scale-[1.02]", tc.card)}>
              <span className="text-3xl" aria-hidden>{getIcon(item)}</span>
              <p className={cn("text-sm font-semibold leading-tight", tc.cardText)}>{item}</p>
            </div>
          ))}
        </div>

        <StatsRow stats={s.stats} cls={tc.stat} />
        <div className="flex justify-center mt-8">
          <CTAButtons s={s} tc={tc} />
        </div>
      </div>
    </section>
  )
}

// ─── LAYOUT: Split (generic left/right) ───────────────────────────────────────

function SplitLayout({ s }: { s: HomepageSection }) {
  const tc = T[s.theme] || T.light
  const hasImage = !!s.imageUrl
  const imageLeft = s.imagePosition === "left"

  return (
    <section id={s.sectionKey} className={cn("py-14 md:py-20 overflow-hidden", tc.section)}>
      <SectionJsonLd s={s} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={cn("grid gap-10 items-center", hasImage ? "lg:grid-cols-2" : "")}>
          {hasImage && imageLeft && (
            <div className="hidden lg:flex items-end justify-center min-h-[360px]">
              <CutoutImage s={s} maxH={480} />
            </div>
          )}

          <div>
            <Badge text={s.badge || ""} cls={tc.badge} />
            <h2 className={cn("text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3", tc.headline)}>{s.headline}</h2>
            {s.subheadline && <p className={cn("text-lg font-medium mb-3", tc.sub)}>{s.subheadline}</p>}
            {s.bodyText && <p className={cn("text-base leading-relaxed mb-5", tc.body)}>{s.bodyText}</p>}
            {s.bullets?.map((b, i) => (
              <div key={i} className="flex items-center gap-2.5 mb-2">
                <span className={cn("font-bold", tc.goodIcon)}>✔</span>
                <span className={cn("text-sm font-medium", tc.headline)}>{b}</span>
              </div>
            ))}
            <StatsRow stats={s.stats} cls={tc.stat} />
            <CTAButtons s={s} tc={tc} />
          </div>

          {hasImage && !imageLeft && (
            <div className="hidden lg:flex items-end justify-center min-h-[360px]">
              <CutoutImage s={s} maxH={480} />
            </div>
          )}
        </div>

        {hasImage && (
          <div className="lg:hidden flex justify-center mt-8">
            <Image
              src={optimizeCloudinary(s.imageUrl!, 300)}
              alt={s.imageAlt || s.headline}
              width={300}
              height={cutoutHeight(300)}
              unoptimized
              className="h-48 w-auto object-contain drop-shadow-xl"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  )
}

// ─── LAYOUT: Centered (full-width hero-style) ─────────────────────────────────

function CenteredLayout({ s }: { s: HomepageSection }) {
  const tc = T[s.theme] || T.light

  return (
    <section id={s.sectionKey} className={cn("py-16 md:py-24 text-center overflow-hidden", tc.section)}>
      <SectionJsonLd s={s} />
      <div className="max-w-3xl mx-auto px-4">
        {s.imageUrl && (
          <div className="flex justify-center mb-8">
            <Image
            src={optimizeCloudinary(s.imageUrl, 280)}
            alt={s.imageAlt || s.headline}
            width={280}
            height={cutoutHeight(280)}
            unoptimized
            className="h-56 w-auto object-contain drop-shadow-xl"
            loading="lazy"
          />
          </div>
        )}
        <Badge text={s.badge || ""} cls={tc.badge} />
        <h2 className={cn("text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-4", tc.headline)}>{s.headline}</h2>
        {s.subheadline && <p className={cn("text-lg font-medium mb-3", tc.sub)}>{s.subheadline}</p>}
        {s.bodyText && <p className={cn("text-base leading-relaxed mb-6", tc.body)}>{s.bodyText}</p>}
        <StatsRow stats={s.stats} cls={tc.stat} />
        <CTAButtons s={s} tc={tc} />
      </div>
    </section>
  )
}

// ─── Router — picks layout based on section.layout field ─────────────────────

function renderSection(s: HomepageSection) {
  const layout = s.layout || (s.imageUrl ? "split" : "centered")
  switch (layout) {
    case "comparison": return <ComparisonLayout s={s} />
    case "pillars":    return <PillarsLayout s={s} />
    case "grid-cards": return <GridCardsLayout s={s} />
    case "centered":   return <CenteredLayout s={s} />
    default:           return <SplitLayout s={s} />
  }
}

// ─── Public export ─────────────────────────────────────────────────────────────

interface Props {
  sections: HomepageSection[]
  placement: string
}

export default function CelebritySectionsBlock({ sections, placement }: Props) {
  const filtered = sections
    .filter((s) => s.placement === placement && s.enabled)
    .sort((a, b) => a.order - b.order)

  if (!filtered.length) return null

  return (
    <>
      {filtered.map((s) => (
        <div key={s._id}>{renderSection(s)}</div>
      ))}
    </>
  )
}
