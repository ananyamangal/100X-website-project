"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"

interface HeroSlide {
  image?: string;
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
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I'd like to discuss 100x Circle fogging machines."
  )}`
  return (
    <section id="home" className="pt-32 relative overflow-hidden">
      {/* Banner Images - Desktop View (swipeable on touch devices, arrows always) */}
      <div className="hidden md:block min-h-screen relative">
        <div
          className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => { bannerTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const start = bannerTouchStartX.current;
            if (start == null) return;
            bannerTouchStartX.current = null;
            const end = e.changedTouches[0].clientX;
            const diff = start - end;
            if (heroSlides.length <= 1) return;
            if (diff > 50) setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
            else if (diff < -50) setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
          }}
        >
          <img
            src={bannersLoading ? "/banner.jpeg" : (currentSlideData?.image || "/banner.jpeg")}
            alt="Agricultural equipment"
            className="w-full h-full object-cover transition-all duration-1000 pointer-events-none select-none"
            draggable={false}
          />
          {/* Very subtle overlay for text readability while maintaining brightness */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent pointer-events-none"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 flex items-center min-h-screen">
          <div className="grid md:grid-cols-2 gap-8 items-center w-full">
            {/* Text Content - Left Side */}
            <div className="text-white text-center md:text-left">
              <Badge className="mb-6 bg-green-600 hover:bg-green-700 text-lg px-6 py-2">
                Certified Professional Products
              </Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                100X – <span className="text-green-400">Thermal</span>  Fogging Machine Manufacturer
              </h1>
              <div className="text-lg md:text-xl lg:text-2xl font-semibold text-green-400 mb-4 min-h-[2.5rem] transition-all duration-500">
                {changingPhrases[phraseIndex]}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center md:justify-start mb-8">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-5 shadow-lg shadow-green-900/20">
                  <Link href="#products" className="flex items-center">
                    Explore Products <ArrowRight className="ml-2" size={20} />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-4 bg-transparent"
                  onClick={() =>
                    window.open(
                      "https://www.youtube.com/@100Xcircle",
                      "_blank",
                    )
                  }
                >
                  <Play className="mr-2" size={20} />
                  Watch Demo
                </Button>
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
              </div>

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

              {/* Stats Section - Left Side Only */}
              <div className="grid grid-cols-2 gap-6 md:gap-10 max-w-md mx-auto md:mx-0">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center md:text-left">
                    <div className="text-3xl font-bold text-green-400 mb-2">{stat.number}</div>
                    <div className="text-sm text-gray-300">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empty Right Side on Desktop */}
            <div className="hidden md:block">
              {rfqSlot}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View - Banner First, Then Content */}
      <div className="md:hidden">
        {/* Banner Images - Mobile View (swipeable) */}
        <div className="relative h-64 sm:h-72">
          <div
            className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
            onTouchStart={(e) => { bannerTouchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              const start = bannerTouchStartX.current;
              if (start == null) return;
              bannerTouchStartX.current = null;
              const end = e.changedTouches[0].clientX;
              const diff = start - end;
              if (heroSlides.length <= 1) return;
              if (diff > 50) setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
              else if (diff < -50) setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
            }}
          >
            <img
              src={bannersLoading ? "/banner.jpeg" : (currentSlideData?.image || "/banner.jpeg")}
              alt="Agricultural equipment"
              className="w-full h-full object-cover transition-all duration-1000 pointer-events-none select-none"
              draggable={false}
            />
            {/* No overlay for mobile to maintain full brightness */}
          </div>
        </div>

        {/* Slide indicators - Mobile: very small dots below the image */}
        <div className="flex justify-center items-center gap-2 py-2 bg-gray-100/90">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1} of ${heroSlides.length}`}
              aria-current={index === currentSlide ? "true" : undefined}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full transition-colors p-2 ${index === currentSlide ? "bg-green-600" : "bg-gray-400/70"
                }`}
            >
              <span className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-inherit" />
            </button>
          ))}
        </div>

        {/* Content Below Banner - Mobile View */}
        <div className="bg-white py-12">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <Badge className="mb-4 bg-green-600 hover:bg-green-700 text-lg px-6 py-2">
                Certified Professional Products
              </Badge>
              <h2 className="text-3xl font-bold text-gray-800 mb-4 leading-tight">
                100X – <span className="text-green-600">Thermal</span>  Fogging Machine Manufacturer
              </h2>
              <div className="text-lg font-semibold text-green-600 mb-4 min-h-[2rem] transition-all duration-500">
                {changingPhrases[phraseIndex]}
              </div>
              <div className="flex flex-col gap-3 justify-center mb-6">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-5 shadow-lg shadow-green-900/20">
                  <Link href="#products" className="flex items-center justify-center">
                    Explore Products <ArrowRight className="ml-2" size={20} />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-green-600 text-green-600 hover:bg-green-50 text-lg px-8 py-4 bg-transparent"
                  onClick={() =>
                    window.open(
                      "https://www.youtube.com/@100Xcircle",
                      "_blank",
                    )
                  }
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
                  <a href={waHref} target="_blank" rel="noopener noreferrer" data-gtm="cta_whatsapp" data-gtm-location="hero_mobile" className="flex items-center justify-center">
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

              {/* Stats Section - Mobile View */}
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
              {rfqSlot}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators - Desktop (click dots to go to slide) */}
      <div className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1} of ${heroSlides.length}`}
            aria-current={index === currentSlide ? "true" : undefined}
            onClick={() => setCurrentSlide(index)}
            className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${index === currentSlide ? "bg-green-400" : "bg-white/50 hover:bg-white/70"
              }`}
          />
        ))}
      </div>

      {/* Slide Navigation - Desktop (previous/next buttons) */}
      <button
        type="button"
        aria-label="Previous banner"
        onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
        className="hidden md:block absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        type="button"
        aria-label="Next banner"
        onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
        className="hidden md:block absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
      >
        <ChevronRight size={24} />
      </button>

      {/* Slide Navigation - Mobile (previous/next buttons) */}
      <button
        type="button"
        aria-label="Previous banner"
        onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
        className="md:hidden absolute left-4 top-40 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 text-gray-800 p-3 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        aria-label="Next banner"
        onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
        className="md:hidden absolute right-4 top-40 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/40 text-gray-800 p-3 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <ChevronRight size={20} />
      </button>
    </section>
  )
}
