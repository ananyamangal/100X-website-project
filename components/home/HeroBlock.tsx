"use client"

import React, { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"
import { optimizeCloudinary, HERO_BLUR_DATA_URL } from "@/lib/cloudinaryUrl"
import { pushDataLayer } from "@/lib/gtm"

interface HeroSlide {
  _id?: string;
  id?: string;
  // Legacy single-image field. Still populated by the API shim so older readers
  // keep working; new code prefers desktop/tablet/mobileBannerImage.
  image?: string;
  desktopBannerImage?: string;
  tabletBannerImage?: string;
  mobileBannerImage?: string;
  desktopBannerAlt?: string;
  tabletBannerAlt?: string;
  mobileBannerAlt?: string;
  desktopBannerEnabled?: boolean;
  tabletBannerEnabled?: boolean;
  mobileBannerEnabled?: boolean;
  desktopFocalX?: number;
  desktopFocalY?: number;
  tabletFocalX?: number;
  tabletFocalY?: number;
  mobileFocalX?: number;
  mobileFocalY?: number;
  overlayOpacity?: number;
  textAlign?: "left" | "center" | "right";
  contentWidth?: "narrow" | "medium" | "wide";
  [key: string]: any;
}

const DESKTOP_FALLBACK = "/banner-desktop.jpg"
const TABLET_FALLBACK = "/banner-tablet.jpg"
const MOBILE_FALLBACK = "/banner-mobile.jpg"
const DEFAULT_DESKTOP_ALT = "100X thermal fogging machine — operator at work"
const DEFAULT_MOBILE_ALT = "100X thermal fogger in action"

function pickDesktopSrc(slide: HeroSlide | null) {
  if (!slide) return DESKTOP_FALLBACK
  if (slide.desktopBannerEnabled === false) return DESKTOP_FALLBACK
  return slide.desktopBannerImage || slide.image || DESKTOP_FALLBACK
}
function pickTabletSrc(slide: HeroSlide | null) {
  if (!slide) return TABLET_FALLBACK
  if (slide.tabletBannerEnabled === false) return TABLET_FALLBACK
  // Graceful: prefer tablet creative; else desktop; else legacy; else fallback.
  return slide.tabletBannerImage || slide.desktopBannerImage || slide.image || TABLET_FALLBACK
}
function pickMobileSrc(slide: HeroSlide | null) {
  if (!slide) return MOBILE_FALLBACK
  if (slide.mobileBannerEnabled === false) return MOBILE_FALLBACK
  return slide.mobileBannerImage || slide.desktopBannerImage || slide.image || MOBILE_FALLBACK
}

const CONTENT_WIDTH_CLASS: Record<NonNullable<HeroSlide["contentWidth"]>, string> = {
  narrow: "md:max-w-sm",
  medium: "md:max-w-md",
  wide: "md:max-w-xl",
}

const TEXT_ALIGN_CONTENT: Record<NonNullable<HeroSlide["textAlign"]>, string> = {
  left: "md:text-left",
  center: "md:text-center",
  right: "md:text-right",
}

const TEXT_ALIGN_CTAS: Record<NonNullable<HeroSlide["textAlign"]>, string> = {
  left: "md:justify-start",
  center: "md:justify-center",
  right: "md:justify-end",
}

interface Stat {
  number: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface Props {
  heroSlides: HeroSlide[];
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  currentSlideData: HeroSlide | null;
  bannersLoading: boolean;
  bannerTouchStartX: React.MutableRefObject<number | null>;
  stats: Stat[];
  changingPhrases: string[];
  phraseIndex: number;
  rfqSlot?: React.ReactNode;
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
  rfqSlot,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null)

  // Banner impression analytics — fires on mount and on slide change, but only
  // once API data has loaded (so fallback-only sessions don't pollute counts).
  useEffect(() => {
    if (bannersLoading || !currentSlideData) return
    pushDataLayer({
      event: "banner_impression",
      banner_slide_index: currentSlide,
      banner_slide_id: currentSlideData._id || currentSlideData.id || `slide-${currentSlide}`,
      banner_desktop_alt: currentSlideData.desktopBannerAlt || "",
    })
  }, [currentSlide, bannersLoading, currentSlideData])

  // Keyboard navigation — arrow keys advance/rewind the carousel when focus is
  // anywhere inside the hero section. Reduced-motion users still get this.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || heroSlides.length <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement && !section.contains(document.activeElement)) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
      }
    }
    section.addEventListener("keydown", handler)
    return () => section.removeEventListener("keydown", handler)
  }, [heroSlides.length, setCurrentSlide])

  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I'd like to discuss 100x Circle fogging machines."
  )}`

  // CTA analytics — wraps onClick on the desktop+mobile CTAs so each click is
  // attributable to the slide it was shown over.
  const trackCta = (cta: string, location: string) => () => {
    pushDataLayer({
      event: "hero_cta_click",
      hero_cta: cta,
      hero_cta_location: location,
      banner_slide_index: currentSlide,
      banner_slide_id: currentSlideData?._id || currentSlideData?.id || `slide-${currentSlide}`,
    })
  }

  // Per-slide content layer settings, with defaults.
  const overlayOpacity = Math.max(0, Math.min(1, currentSlideData?.overlayOpacity ?? 0.4))
  const textAlign: NonNullable<HeroSlide["textAlign"]> = currentSlideData?.textAlign ?? "left"
  const contentWidth: NonNullable<HeroSlide["contentWidth"]> = currentSlideData?.contentWidth ?? "medium"

  // Optimized image URLs (Cloudinary f_auto,q_auto + width hint; no-op on
  // /public fallbacks).
  const desktopSrc = optimizeCloudinary(bannersLoading ? DESKTOP_FALLBACK : pickDesktopSrc(currentSlideData), 1920)
  const tabletSrc = optimizeCloudinary(bannersLoading ? TABLET_FALLBACK : pickTabletSrc(currentSlideData), 1200)
  const mobileSrc = optimizeCloudinary(bannersLoading ? MOBILE_FALLBACK : pickMobileSrc(currentSlideData), 800)

  const desktopFocalX = currentSlideData?.desktopFocalX ?? 50
  const desktopFocalY = currentSlideData?.desktopFocalY ?? 50
  const tabletFocalX = currentSlideData?.tabletFocalX ?? 50
  const tabletFocalY = currentSlideData?.tabletFocalY ?? 50
  const mobileFocalX = currentSlideData?.mobileFocalX ?? 50
  const mobileFocalY = currentSlideData?.mobileFocalY ?? 50

  const desktopAlt = currentSlideData?.desktopBannerAlt || DEFAULT_DESKTOP_ALT
  const tabletAlt = currentSlideData?.tabletBannerAlt || currentSlideData?.desktopBannerAlt || DEFAULT_DESKTOP_ALT
  const mobileAlt = currentSlideData?.mobileBannerAlt || currentSlideData?.desktopBannerAlt || DEFAULT_MOBILE_ALT

  return (
    <section
      ref={sectionRef}
      id="home"
      role="region"
      aria-label="Hero banner carousel"
      aria-roledescription="carousel"
      tabIndex={-1}
      className="pt-32 relative overflow-hidden focus:outline-none"
    >
      {/* CSS-only Ken-Burns slow zoom on hero images. Respects reduced-motion.
          GPU-accelerated transform; no library, no main-thread cost. */}
      <style jsx>{`
        .hero-ken-burns {
          animation: heroKenBurns 20s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes heroKenBurns {
          from { transform: scale(1); }
          to   { transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-ken-burns { animation: none; }
        }
      `}</style>

      {/* DESKTOP (lg+) — banner with overlaid content on the LEFT column.
          Aspect locked to 1920/850. */}
      <div
        className="hidden lg:block relative aspect-[1920/850] max-h-[80vh] min-h-[520px] overflow-hidden"
        aria-roledescription="slide"
        aria-label={`Slide ${currentSlide + 1} of ${heroSlides.length || 1}: ${desktopAlt}`}
      >
        <div
          className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => { bannerTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const start = bannerTouchStartX.current
            if (start == null) return
            bannerTouchStartX.current = null
            const end = e.changedTouches[0].clientX
            const diff = start - end
            if (heroSlides.length <= 1) return
            if (diff > 50) setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
            else if (diff < -50) setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`desktop-${desktopSrc}`}
            src={desktopSrc}
            alt={desktopAlt}
            fetchPriority="high"
            decoding="async"
            loading="eager"
            draggable={false}
            className="hero-ken-burns w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700"
            style={{
              objectPosition: `${desktopFocalX}% ${desktopFocalY}%`,
              backgroundImage: `url("${HERO_BLUR_DATA_URL}")`,
              backgroundSize: "cover",
            }}
          />
          {/* Left-side gradient. Strength controlled by overlayOpacity slider. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to right, rgba(0,0,0,${overlayOpacity}) 0%, rgba(0,0,0,${overlayOpacity * 0.4}) 40%, rgba(0,0,0,0) 100%)`,
            }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4 flex items-center h-full">
          <div className="grid md:grid-cols-2 gap-8 items-center w-full">
            <div className={`text-white ${TEXT_ALIGN_CONTENT[textAlign]} ${CONTENT_WIDTH_CLASS[contentWidth]}`}>
              <Badge className="mb-4 bg-green-600 hover:bg-green-700 text-base px-5 py-1.5">
                Certified Professional Products
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                100X – <span className="text-green-400">Thermal</span> Fogging Machine Manufacturer
              </h1>
              <div className="text-base md:text-lg font-semibold text-green-400 mb-4 min-h-[1.75rem] transition-all duration-500">
                {changingPhrases[phraseIndex]}
              </div>

              {rfqSlot ? (
                <div className="mb-4 md:max-w-md">
                  {rfqSlot}
                </div>
              ) : null}

              <div className={`flex flex-col sm:flex-row gap-3 ${TEXT_ALIGN_CTAS[textAlign]}`}>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-base px-6 py-3 shadow-lg shadow-green-900/20 transition-shadow hover:shadow-green-500/40"
                  onClick={trackCta("explore_products", "hero_desktop")}
                >
                  <Link href="#products" className="flex items-center">
                    Explore Products <ArrowRight className="ml-2" size={18} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900 text-base px-6 py-3 bg-transparent transition-shadow hover:shadow-lg hover:shadow-green-400/30"
                >
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-gtm="cta_whatsapp"
                    data-gtm-location="hero_desktop"
                    className="flex items-center"
                    onClick={trackCta("whatsapp", "hero_desktop")}
                  >
                    <MessageCircle className="mr-2" size={18} />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <div className="hidden md:block" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* TABLET (md → lg only) — image splash on top, content below. 4:3 ratio. */}
      <div className="hidden md:block lg:hidden">
        <div
          className="relative aspect-[1200/900] overflow-hidden"
          aria-roledescription="slide"
          aria-label={`Slide ${currentSlide + 1} of ${heroSlides.length || 1}: ${tabletAlt}`}
        >
          <div
            className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
            onTouchStart={(e) => { bannerTouchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              const start = bannerTouchStartX.current
              if (start == null) return
              bannerTouchStartX.current = null
              const end = e.changedTouches[0].clientX
              const diff = start - end
              if (heroSlides.length <= 1) return
              if (diff > 50) setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
              else if (diff < -50) setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`tablet-${tabletSrc}`}
              src={tabletSrc}
              alt={tabletAlt}
              fetchPriority="high"
              decoding="async"
              loading="eager"
              draggable={false}
              className="hero-ken-burns w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: `${tabletFocalX}% ${tabletFocalY}%`,
                backgroundImage: `url("${HERO_BLUR_DATA_URL}")`,
                backgroundSize: "cover",
              }}
            />
          </div>
          {heroSlides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous banner"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-green-500 text-gray-900 p-2.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Next banner"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-green-500 text-gray-900 p-2.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronRight size={20} />
              </button>
            </>
          ) : null}
        </div>

        {/* Slide indicators - Tablet */}
        {heroSlides.length > 1 && (
          <div className="flex justify-center items-center gap-2 py-2 bg-gray-100/90" role="tablist" aria-label="Slide selectors">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-label={`Go to slide ${index + 1} of ${heroSlides.length}`}
                aria-selected={index === currentSlide}
                onClick={() => setCurrentSlide(index)}
                className={`rounded-full transition-colors p-2 focus-visible:ring-2 focus-visible:ring-green-500 ${
                  index === currentSlide ? "bg-green-600" : "bg-gray-400/70"
                }`}
              >
                <span className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-inherit" />
              </button>
            ))}
          </div>
        )}

        {/* Content Below Banner - Tablet (same content set as mobile) */}
        <HeroContentBelow
          changingPhrases={changingPhrases}
          phraseIndex={phraseIndex}
          rfqSlot={rfqSlot}
          waHref={waHref}
          stats={stats}
          trackCta={trackCta}
          location="hero_tablet"
        />
      </div>

      {/* MOBILE (<md) — portrait splash, content below. */}
      <div className="md:hidden">
        <div
          className="relative aspect-[800/1200]"
          aria-roledescription="slide"
          aria-label={`Slide ${currentSlide + 1} of ${heroSlides.length || 1}: ${mobileAlt}`}
        >
          <div
            className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
            onTouchStart={(e) => { bannerTouchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              const start = bannerTouchStartX.current
              if (start == null) return
              bannerTouchStartX.current = null
              const end = e.changedTouches[0].clientX
              const diff = start - end
              if (heroSlides.length <= 1) return
              if (diff > 50) setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
              else if (diff < -50) setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`mobile-${mobileSrc}`}
              src={mobileSrc}
              alt={mobileAlt}
              fetchPriority="high"
              decoding="async"
              loading="eager"
              draggable={false}
              className="hero-ken-burns w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: `${mobileFocalX}% ${mobileFocalY}%`,
                backgroundImage: `url("${HERO_BLUR_DATA_URL}")`,
                backgroundSize: "cover",
              }}
            />
          </div>
          {heroSlides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous banner"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-green-500 text-gray-800 p-2.5 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next banner"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-green-500 text-gray-800 p-2.5 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
        </div>

        {/* Slide indicators - Mobile */}
        {heroSlides.length > 1 && (
          <div className="flex justify-center items-center gap-2 py-2 bg-gray-100/90" role="tablist" aria-label="Slide selectors">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-label={`Go to slide ${index + 1} of ${heroSlides.length}`}
                aria-selected={index === currentSlide}
                onClick={() => setCurrentSlide(index)}
                className={`rounded-full transition-colors p-2 focus-visible:ring-2 focus-visible:ring-green-500 ${
                  index === currentSlide ? "bg-green-600" : "bg-gray-400/70"
                }`}
              >
                <span className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-inherit" />
              </button>
            ))}
          </div>
        )}

        <HeroContentBelow
          changingPhrases={changingPhrases}
          phraseIndex={phraseIndex}
          rfqSlot={rfqSlot}
          waHref={waHref}
          stats={stats}
          trackCta={trackCta}
          location="hero_mobile"
        />
      </div>

      {/* Desktop-only slide indicators + nav arrows (visible at lg+) */}
      {heroSlides.length > 1 && (
        <div
          className="hidden lg:flex absolute bottom-8 left-1/2 transform -translate-x-1/2 space-x-3 z-20"
          role="tablist"
          aria-label="Slide selectors"
        >
          {heroSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-label={`Go to slide ${index + 1} of ${heroSlides.length}`}
              aria-selected={index === currentSlide}
              onClick={() => setCurrentSlide(index)}
              className={`w-4 h-4 rounded-full transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-green-500 ${
                index === currentSlide ? "bg-green-400" : "bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      {heroSlides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
            className="hidden lg:block absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-green-500 text-white p-4 rounded-full transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
            className="hidden lg:block absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-green-500 text-white p-4 rounded-full transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </section>
  )
}

// Tablet + mobile share the same "content below the banner" treatment.
function HeroContentBelow({
  changingPhrases,
  phraseIndex,
  rfqSlot,
  waHref,
  stats,
  trackCta,
  location,
}: {
  changingPhrases: string[]
  phraseIndex: number
  rfqSlot?: React.ReactNode
  waHref: string
  stats: Stat[]
  trackCta: (cta: string, location: string) => () => void
  location: string
}) {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <Badge className="mb-4 bg-green-600 hover:bg-green-700 text-lg px-6 py-2">
            Certified Professional Products
          </Badge>
          <h2 className="text-3xl font-bold text-gray-800 mb-4 leading-tight">
            100X – <span className="text-green-600">Thermal</span> Fogging Machine Manufacturer
          </h2>
          <div className="text-lg font-semibold text-green-600 mb-4 min-h-[2rem] transition-all duration-500">
            {changingPhrases[phraseIndex]}
          </div>

          {rfqSlot ? (
            <div className="mb-5">
              {rfqSlot}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 justify-center mb-6">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-5 shadow-lg shadow-green-900/20"
              onClick={trackCta("explore_products", location)}
            >
              <Link href="#products" className="flex items-center justify-center">
                Explore Products <ArrowRight className="ml-2" size={20} />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-green-600 text-green-600 hover:bg-green-50 text-lg px-8 py-4 bg-transparent"
              onClick={() => {
                trackCta("watch_demo", location)()
                window.open("https://www.youtube.com/@100Xcircle", "_blank")
              }}
            >
              <Play className="mr-2" size={20} />
              Watch Demo
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-green-600 text-green-600 hover:bg-green-50 text-lg px-8 py-4 bg-transparent"
            >
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                data-gtm="cta_whatsapp"
                data-gtm-location={location}
                className="flex items-center justify-center"
                onClick={trackCta("whatsapp", location)}
              >
                <MessageCircle className="mr-2" size={20} />
                WhatsApp
              </a>
            </Button>
          </div>

          <p className="text-xs text-gray-600 mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
              GeM-approved OEM
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
              Made in India
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden="true" />
              10,000+ buyers
            </span>
          </p>

          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
