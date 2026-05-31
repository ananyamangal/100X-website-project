"use client"

import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { optimizeCloudinary } from "@/lib/cloudinaryUrl"

export interface HomepageSection {
  _id: string
  sectionKey: string
  type: string
  enabled: boolean
  order: number
  placement: string
  headline: string
  subheadline?: string
  bodyText?: string
  ctaText?: string
  ctaUrl?: string
  imageUrl?: string
  imageAlt?: string
  imagePosition: "left" | "right" | "center" | "background"
  badge?: string
  theme: "light" | "dark" | "green" | "orange"
  stats?: { label: string; value: string }[]
  showOnMobile: boolean
  showOnDesktop: boolean
}

const THEME_MAP: Record<string, { bg: string; text: string; sub: string; body: string; badge: string; cta: string; ctaHover: string; stat: string }> = {
  light: { bg: "bg-white", text: "text-gray-900", sub: "text-green-700", body: "text-gray-600", badge: "bg-green-100 text-green-800", cta: "bg-green-600 text-white hover:bg-green-700", ctaHover: "", stat: "bg-gray-50 border border-gray-100" },
  dark:  { bg: "bg-gray-900", text: "text-white", sub: "text-green-400", body: "text-gray-300", badge: "bg-white/10 text-white", cta: "bg-green-500 text-white hover:bg-green-400", ctaHover: "", stat: "bg-white/10" },
  green: { bg: "bg-gradient-to-br from-green-700 to-green-900", text: "text-white", sub: "text-green-200", body: "text-green-100", badge: "bg-white/15 text-white", cta: "bg-white text-green-800 hover:bg-green-50", ctaHover: "", stat: "bg-white/15" },
  orange:{ bg: "bg-gradient-to-br from-orange-600 to-orange-800", text: "text-white", sub: "text-orange-100", body: "text-orange-50", badge: "bg-white/15 text-white", cta: "bg-white text-orange-800 hover:bg-orange-50", ctaHover: "", stat: "bg-white/15" },
}

function SectionJsonLd({ section }: { section: HomepageSection }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPageElement",
    "name": section.headline,
    "description": section.bodyText || section.subheadline || section.headline,
    ...(section.imageUrl ? { "image": { "@type": "ImageObject", "url": section.imageUrl, "description": section.imageAlt || section.headline } } : {}),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

function StatCard({ value, label, statClass }: { value: string; label: string; statClass: string }) {
  return (
    <div className={cn("rounded-xl px-4 py-3 text-center", statClass)}>
      <p className="text-2xl font-bold leading-none mb-0.5">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  )
}

function SectionBackground({ section, tc }: { section: HomepageSection; tc: ReturnType<typeof resolveTheme> }) {
  if (section.imagePosition !== "background" || !section.imageUrl) return null
  const src = optimizeCloudinary(section.imageUrl, 1400)
  return (
    <div className="absolute inset-0 z-0">
      <img src={src} alt="" className="w-full h-full object-cover" aria-hidden />
      <div className="absolute inset-0 bg-black/55" />
    </div>
  )
}

function CelebrityImage({ section, side }: { section: HomepageSection; side: "left" | "right" }) {
  if (!section.imageUrl || section.imagePosition === "background") return null
  if (section.imagePosition === "center") return null
  if (section.imagePosition !== side) return null
  const src = optimizeCloudinary(section.imageUrl, 600)
  return (
    <div className={cn(
      "relative flex items-end justify-center",
      "order-first lg:order-none",
      side === "left" ? "lg:order-first" : "lg:order-last",
    )}>
      <img
        src={src}
        alt={section.imageAlt || section.headline}
        className="w-full max-w-sm md:max-w-md object-contain drop-shadow-2xl"
        style={{ maxHeight: "480px" }}
        loading="lazy"
      />
    </div>
  )
}

function CelebrityCenter({ section }: { section: HomepageSection }) {
  if (!section.imageUrl || section.imagePosition !== "center") return null
  const src = optimizeCloudinary(section.imageUrl, 500)
  return (
    <div className="flex justify-center mb-6 md:mb-0 md:absolute md:bottom-0 md:right-8 lg:right-16">
      <img src={src} alt={section.imageAlt || section.headline} className="h-64 md:h-80 object-contain drop-shadow-2xl" loading="lazy" />
    </div>
  )
}

function resolveTheme(section: HomepageSection) {
  return THEME_MAP[section.theme] || THEME_MAP.light
}

function SectionCard({ section, isMobile }: { section: HomepageSection; isMobile?: boolean }) {
  const tc = resolveTheme(section)
  const isBackground = section.imagePosition === "background"
  const isCenter = section.imagePosition === "center"
  const hasImage = !!section.imageUrl
  const hasSplitLayout = hasImage && !isBackground && !isCenter
  const hasLeft = section.imagePosition === "left" && hasSplitLayout
  const hasRight = section.imagePosition === "right" && hasSplitLayout

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        tc.bg,
        isMobile ? "block lg:hidden" : "hidden lg:block",
        isBackground && "py-20 md:py-28",
        !isBackground && "py-12 md:py-16",
      )}
      aria-label={section.headline}
    >
      <SectionJsonLd section={section} />

      {isBackground && <SectionBackground section={section} tc={tc} />}

      <div className={cn(
        "relative z-10 max-w-6xl mx-auto px-4 sm:px-6",
        hasSplitLayout && "grid lg:grid-cols-2 gap-10 items-center",
        isBackground && !hasSplitLayout && "text-center max-w-3xl",
        isCenter && "relative md:min-h-[380px]",
      )}>
        {hasLeft && <CelebrityImage section={section} side="left" />}

        {/* Text content */}
        <div className={cn(isBackground && "mx-auto", isCenter && "md:w-1/2")}>
          {section.badge && (
            <span className={cn("inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4", tc.badge)}>
              {section.badge}
            </span>
          )}

          <h2 className={cn("text-3xl md:text-4xl font-bold leading-tight mb-3", tc.text)}>
            {section.headline}
          </h2>

          {section.subheadline && (
            <p className={cn("text-lg font-medium mb-4", tc.sub)}>{section.subheadline}</p>
          )}

          {section.bodyText && (
            <p className={cn("text-base leading-relaxed mb-6 max-w-xl", tc.body)}>{section.bodyText}</p>
          )}

          {section.stats && section.stats.length > 0 && (
            <div className="flex gap-3 flex-wrap mb-6">
              {section.stats.map((stat, i) => (
                <StatCard key={i} value={stat.value} label={stat.label} statClass={cn(tc.stat, tc.text)} />
              ))}
            </div>
          )}

          {section.ctaText && section.ctaUrl && (
            <Link
              href={section.ctaUrl}
              className={cn(
                "inline-block px-7 py-3 rounded-xl font-semibold text-sm transition-all",
                tc.cta,
              )}
            >
              {section.ctaText}
            </Link>
          )}
        </div>

        {hasRight && <CelebrityImage section={section} side="right" />}

        {isCenter && <CelebrityCenter section={section} />}
      </div>
    </section>
  )
}

// Mobile layout: always stacked
function SectionMobile({ section }: { section: HomepageSection }) {
  const tc = resolveTheme(section)
  const isBackground = section.imagePosition === "background"

  return (
    <section className={cn("relative overflow-hidden py-10 px-4 lg:hidden", tc.bg)}>
      <SectionJsonLd section={section} />
      {isBackground && <SectionBackground section={section} tc={tc} />}

      <div className="relative z-10 text-center max-w-sm mx-auto">
        {section.imageUrl && !isBackground && (
          <img
            src={optimizeCloudinary(section.imageUrl, 320)}
            alt={section.imageAlt || section.headline}
            className="w-48 h-48 object-contain mx-auto mb-6 drop-shadow-xl"
            loading="lazy"
          />
        )}

        {section.badge && (
          <span className={cn("inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3", tc.badge)}>
            {section.badge}
          </span>
        )}

        <h2 className={cn("text-2xl font-bold leading-tight mb-2", tc.text)}>{section.headline}</h2>
        {section.subheadline && <p className={cn("text-base font-medium mb-3", tc.sub)}>{section.subheadline}</p>}
        {section.bodyText && <p className={cn("text-sm leading-relaxed mb-4", tc.body)}>{section.bodyText}</p>}

        {section.stats && section.stats.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {section.stats.map((stat, i) => (
              <StatCard key={i} value={stat.value} label={stat.label} statClass={cn(tc.stat, tc.text)} />
            ))}
          </div>
        )}

        {section.ctaText && section.ctaUrl && (
          <Link href={section.ctaUrl} className={cn("inline-block px-6 py-2.5 rounded-xl font-semibold text-sm", tc.cta)}>
            {section.ctaText}
          </Link>
        )}
      </div>
    </section>
  )
}

interface Props {
  sections: HomepageSection[]
  placement: string
}

export default function CelebritySectionsBlock({ sections, placement }: Props) {
  const filtered = sections
    .filter((s) => s.placement === placement && s.enabled)
    .sort((a, b) => a.order - b.order)

  if (filtered.length === 0) return null

  return (
    <>
      {filtered.map((section) => (
        <div key={section._id}>
          {/* Desktop */}
          <div className="hidden lg:block">
            <SectionCard section={section} />
          </div>
          {/* Mobile */}
          <div className="lg:hidden">
            <SectionMobile section={section} />
          </div>
        </div>
      ))}
    </>
  )
}
