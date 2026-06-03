"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Play } from "lucide-react"

import { BUSINESS } from "@/lib/seo/site-config"
import { optimizeCloudinary, HERO_BLUR_DATA_URL } from "@/lib/cloudinaryUrl"
import { pushDataLayer } from "@/lib/gtm"

interface HeroSlide {
  _id?: string;
  id?: string;
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
  slideshowInterval?: number;
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
  return slide.tabletBannerImage || slide.desktopBannerImage || slide.image || TABLET_FALLBACK
}
function pickMobileSrc(slide: HeroSlide | null) {
  if (!slide) return MOBILE_FALLBACK
  if (slide.mobileBannerEnabled === false) return MOBILE_FALLBACK
  return slide.mobileBannerImage || slide.desktopBannerImage || slide.image || MOBILE_FALLBACK
}

const TEXT_ALIGN_CTAS: Record<NonNullable<HeroSlide["textAlign"]>, string> = {
  left: "md:justify-start",
  center: "md:justify-center",
  right: "md:justify-end",
}

interface Props {
  heroSlides: HeroSlide[];
}

export default function HeroBlock({ heroSlides }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const bannerTouchStartX = useRef<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const slideCount = heroSlides.length
  const currentSlideData = slideCount > 0 ? heroSlides[Math.min(currentSlide, slideCount - 1)] : null

  // Slideshow auto-advance
  const rawInterval = heroSlides[0]?.slideshowInterval ?? 4000
  const intervalMs = rawInterval > 0 && rawInterval < 1000 ? rawInterval * 1000 : Math.max(1000, rawInterval)
  useEffect(() => {
    if (slideCount <= 1) return
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % slideCount), intervalMs)
    return () => clearInterval(timer)
  }, [slideCount, intervalMs])

  // Banner impression analytics
  useEffect(() => {
    if (!currentSlideData) return
    pushDataLayer({
      event: "banner_impression",
      banner_slide_index: currentSlide,
      banner_slide_id: currentSlideData._id || currentSlideData.id || `slide-${currentSlide}`,
      banner_desktop_alt: currentSlideData.desktopBannerAlt || "",
    })
  }, [currentSlide, currentSlideData])

  // Keyboard navigation
  useEffect(() => {
    const section = sectionRef.current
    if (!section || slideCount <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement && !section.contains(document.activeElement)) return
      if (e.key === "ArrowLeft") { e.preventDefault(); setCurrentSlide((p) => (p - 1 + slideCount) % slideCount) }
      else if (e.key === "ArrowRight") { e.preventDefault(); setCurrentSlide((p) => (p + 1) % slideCount) }
    }
    section.addEventListener("keydown", handler)
    return () => section.removeEventListener("keydown", handler)
  }, [slideCount])

  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I'd like to discuss 100x Circle fogging machines.")}`

  const trackCta = (cta: string, location: string) => () => {
    pushDataLayer({
      event: "hero_cta_click",
      hero_cta: cta,
      hero_cta_location: location,
      banner_slide_index: currentSlide,
      banner_slide_id: currentSlideData?._id || currentSlideData?.id || `slide-${currentSlide}`,
    })
  }

  const overlayOpacity = Math.max(0, Math.min(1, currentSlideData?.overlayOpacity ?? 0.4))
  const textAlign: NonNullable<HeroSlide["textAlign"]> = currentSlideData?.textAlign ?? "left"

  const desktopSrc = optimizeCloudinary(pickDesktopSrc(currentSlideData), 1920)
  const tabletSrc = optimizeCloudinary(pickTabletSrc(currentSlideData), 1200)
  const mobileSrc = optimizeCloudinary(pickMobileSrc(currentSlideData), 800)

  const desktopFocalX = currentSlideData?.desktopFocalX ?? 50
  const desktopFocalY = currentSlideData?.desktopFocalY ?? 50
  const tabletFocalX = currentSlideData?.tabletFocalX ?? 50
  const tabletFocalY = currentSlideData?.tabletFocalY ?? 50
  const mobileFocalX = currentSlideData?.mobileFocalX ?? 50
  const mobileFocalY = currentSlideData?.mobileFocalY ?? 50

  const desktopAlt = currentSlideData?.desktopBannerAlt || DEFAULT_DESKTOP_ALT
  const tabletAlt = currentSlideData?.tabletBannerAlt || currentSlideData?.desktopBannerAlt || DEFAULT_DESKTOP_ALT
  const mobileAlt = currentSlideData?.mobileBannerAlt || currentSlideData?.desktopBannerAlt || DEFAULT_MOBILE_ALT

  const swipeHandlers = (dir: "ltr" | "rtl") => ({
    onTouchStart: (e: React.TouchEvent) => { bannerTouchStartX.current = e.touches[0].clientX },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = bannerTouchStartX.current
      if (start == null || slideCount <= 1) return
      bannerTouchStartX.current = null
      const diff = start - e.changedTouches[0].clientX
      if (diff > 50) setCurrentSlide((p) => (p + 1) % slideCount)
      else if (diff < -50) setCurrentSlide((p) => (p - 1 + slideCount) % slideCount)
    },
  })

  return (
    <section
      ref={sectionRef}
      id="home"
      role="region"
      aria-label="Hero banner carousel"
      aria-roledescription="carousel"
      tabIndex={-1}
      className="relative overflow-hidden focus:outline-none"
    >
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

      {/* DESKTOP (lg+) */}
      <div
        className="hidden lg:block relative w-full h-screen min-h-[600px] overflow-hidden"
        aria-roledescription="slide"
        aria-label={`Slide ${currentSlide + 1} of ${slideCount || 1}: ${desktopAlt}`}
      >
        <div className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing" {...swipeHandlers("ltr")}>
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
            style={{ objectPosition: `${desktopFocalX}% ${desktopFocalY}%`, backgroundImage: `url("${HERO_BLUR_DATA_URL}")`, backgroundSize: "cover" }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to right, rgba(0,0,0,${overlayOpacity}) 0%, rgba(0,0,0,${overlayOpacity * 0.4}) 40%, rgba(0,0,0,0) 100%)` }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-12 pt-16">
          <div className={`flex flex-col sm:flex-row gap-3 ${TEXT_ALIGN_CTAS[textAlign]}`}>
            <Link
              href="#products"
              onClick={trackCta("explore_products", "hero_desktop")}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-base shadow-xl shadow-brand-900/30 transition-all hover:-translate-y-0.5"
            >
              Explore Products <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => { trackCta("watch_demo", "hero_desktop")(); window.open("https://www.youtube.com/@100Xcircle", "_blank") }}
              className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-white/50 text-white hover:border-white hover:bg-white/10 font-600 rounded-full text-base transition-all"
            >
              <Play size={18} /> Watch Demo
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="cta_whatsapp"
              data-gtm-location="hero_desktop"
              onClick={trackCta("whatsapp", "hero_desktop")}
              className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-brand-400/70 text-brand-300 hover:border-brand-400 hover:bg-brand-600/20 font-600 rounded-full text-base transition-all"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* TABLET (md → lg) */}
      <div className="hidden md:block lg:hidden">
        <div className="relative aspect-[1200/900] overflow-hidden" aria-roledescription="slide" aria-label={`Slide ${currentSlide + 1} of ${slideCount || 1}: ${tabletAlt}`}>
          <div className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing" {...swipeHandlers("ltr")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`tablet-${tabletSrc}`} src={tabletSrc} alt={tabletAlt} fetchPriority="high" decoding="async" loading="eager" draggable={false} className="hero-ken-burns w-full h-full object-cover pointer-events-none select-none" style={{ objectPosition: `${tabletFocalX}% ${tabletFocalY}%`, backgroundImage: `url("${HERO_BLUR_DATA_URL}")`, backgroundSize: "cover" }} />
          </div>
          {slideCount > 1 && <>
            <button type="button" aria-label="Previous banner" onClick={() => setCurrentSlide((p) => (p - 1 + slideCount) % slideCount)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-brand-500 text-gray-900 p-2.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft size={20} /></button>
            <button type="button" aria-label="Next banner" onClick={() => setCurrentSlide((p) => (p + 1) % slideCount)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-brand-500 text-gray-900 p-2.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight size={20} /></button>
          </>}
        </div>
        {slideCount > 1 && (
          <div className="flex justify-center items-center gap-2 py-2 bg-gray-100/90" role="tablist" aria-label="Slide selectors">
            {heroSlides.map((_, i) => <button key={i} type="button" role="tab" aria-label={`Go to slide ${i + 1} of ${slideCount}`} aria-selected={i === currentSlide} onClick={() => setCurrentSlide(i)} className={`rounded-full transition-colors p-2 focus-visible:ring-2 focus-visible:ring-brand-500 ${i === currentSlide ? "bg-brand-600" : "bg-gray-400/70"}`}><span className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-inherit" /></button>)}
          </div>
        )}
        <HeroContentBelow waHref={waHref} trackCta={trackCta} location="hero_tablet" />
      </div>

      {/* MOBILE (<md) */}
      <div className="md:hidden">
        <div className="relative aspect-[800/1200]" aria-roledescription="slide" aria-label={`Slide ${currentSlide + 1} of ${slideCount || 1}: ${mobileAlt}`}>
          <div className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing" {...swipeHandlers("ltr")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`mobile-${mobileSrc}`} src={mobileSrc} alt={mobileAlt} fetchPriority="high" decoding="async" loading="eager" draggable={false} className="hero-ken-burns w-full h-full object-cover pointer-events-none select-none" style={{ objectPosition: `${mobileFocalX}% ${mobileFocalY}%`, backgroundImage: `url("${HERO_BLUR_DATA_URL}")`, backgroundSize: "cover" }} />
          </div>
          {slideCount > 1 && <>
            <button type="button" aria-label="Previous banner" onClick={() => setCurrentSlide((p) => (p - 1 + slideCount) % slideCount)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-brand-500 text-gray-800 p-2.5 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next banner" onClick={() => setCurrentSlide((p) => (p + 1) % slideCount)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-brand-500 text-gray-800 p-2.5 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"><ChevronRight size={18} /></button>
          </>}
        </div>
        {slideCount > 1 && (
          <div className="flex justify-center items-center gap-2 py-2 bg-gray-100/90" role="tablist" aria-label="Slide selectors">
            {heroSlides.map((_, i) => <button key={i} type="button" role="tab" aria-label={`Go to slide ${i + 1} of ${slideCount}`} aria-selected={i === currentSlide} onClick={() => setCurrentSlide(i)} className={`rounded-full transition-colors p-2 focus-visible:ring-2 focus-visible:ring-brand-500 ${i === currentSlide ? "bg-brand-600" : "bg-gray-400/70"}`}><span className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-inherit" /></button>)}
          </div>
        )}
        <HeroContentBelow waHref={waHref} trackCta={trackCta} location="hero_mobile" />
      </div>

      {/* Desktop indicators + arrows */}
      {slideCount > 1 && (
        <div className="hidden lg:flex absolute bottom-8 left-1/2 transform -translate-x-1/2 space-x-3 z-20" role="tablist" aria-label="Slide selectors">
          {heroSlides.map((_, i) => <button key={i} type="button" role="tab" aria-label={`Go to slide ${i + 1} of ${slideCount}`} aria-selected={i === currentSlide} onClick={() => setCurrentSlide(i)} className={`w-4 h-4 rounded-full transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-500 ${i === currentSlide ? "bg-green-400" : "bg-white/50 hover:bg-white/70"}`} />)}
        </div>
      )}
      {slideCount > 1 && <>
        <button type="button" aria-label="Previous banner" onClick={() => setCurrentSlide((p) => (p - 1 + slideCount) % slideCount)} className="hidden lg:block absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-brand-500 text-white p-4 rounded-full transition-all"><ChevronLeft size={24} /></button>
        <button type="button" aria-label="Next banner" onClick={() => setCurrentSlide((p) => (p + 1) % slideCount)} className="hidden lg:block absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-brand-500 text-white p-4 rounded-full transition-all"><ChevronRight size={24} /></button>
      </>}
    </section>
  )
}

function HeroContentBelow({ waHref, trackCta, location }: { waHref: string; trackCta: (cta: string, location: string) => () => void; location: string }) {
  return (
    <div className="bg-white py-5">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row gap-3 max-w-sm sm:max-w-none mx-auto">
          <Link
            href="#products"
            onClick={trackCta("explore_products", location)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm shadow-lg shadow-brand-900/20 transition-all hover:-translate-y-0.5"
          >
            Explore Products <ArrowRight size={15} />
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="cta_whatsapp"
            data-gtm-location={location}
            onClick={trackCta("whatsapp", location)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 border-2 border-brand-600 text-brand-700 hover:bg-brand-50 font-600 rounded-full text-sm transition-all"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
