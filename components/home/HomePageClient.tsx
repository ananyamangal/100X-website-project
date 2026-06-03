"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Download, MessageCircle, Star, ChevronRight, ChevronLeft, X, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RichContent } from "@/components/RichContent"
import AccreditationsStrip from "@/components/home/AccreditationsStrip"
import ManufacturerIntroBlock from "@/components/home/ManufacturerIntroBlock"
import SpecialisedBuyersBlock from "@/components/home/SpecialisedBuyersBlock"
import HeroBlock from "@/components/home/HeroBlock"
import RFQMidPageBlock from "@/components/forms/RFQMidPageBlock"
import HomepageJsonLd from "@/components/seo/HomepageJsonLd"
import CelebritySectionsBlock from "@/components/home/CelebritySectionsBlock"
import BrochureLeadModal from "@/components/BrochureLeadModal"
import IndustryApplicationsSection from "@/components/home/IndustryApplicationsSection"
import CinematicTrustSection from "@/components/home/CinematicTrustSection"
import CinematicCTASection from "@/components/home/CinematicCTASection"
import CinematicProductsSection from "@/components/home/CinematicProductsSection"
import ReviewsSection from "@/components/home/ReviewsSection"
import { BUSINESS } from "@/lib/seo/site-config"
import { getPersistedAttribution, pushDataLayer, setBrochureLeadContext } from "@/lib/gtm"
import { type HomeContent } from "@/lib/homeContentTypes"

const BlogBlock = dynamic(() => import("@/components/home/BlogBlock"))
const FAQSection = dynamic(() => import("@/components/FAQSection"))

interface Product {
  _id?: string
  id?: string
  name: string
  imageUrls: string[]
  priceRange: string
  rating: number
  reviewsCount: number
  shortDescription: string
  detailedDescription: string
  features: string[]
  specifications: string[]
  applications: string[]
  badges: string[]
  youtubeLink?: string
  whatsappMessageText: string
  category: string
  inStock: boolean
  brochureUrl?: string
  createdAt?: string
  updatedAt?: string
}

interface HomePageClientProps {
  products: Product[]
  banners: any[]
  blogPosts: any[]
  accreditations: any[]
  customers: any[]
  mainBrochureUrl: string | null
  homeContent: HomeContent
  homepageSections?: any[]
  spareParts?: any[]
  trustBadges?: any[]
}

const getYouTubeId = (url: string): string | null => {
  if (!url || typeof url !== "string") return null
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

const badgeLogoMap: Record<string, string> = {
  "Korean Technology": "/Logos clipart 2/Korean Technology.png",
  "German Technology": "/Logos clipart 2/german technology.png",
  "Japnese Technology": "/Logos clipart 2/Japnese technology.png",
  GeM: "/Logos clipart 2/GeM logo.png",
  "GeM logo": "/Logos clipart 2/GeM logo.png",
  "Eco Friendly": "/Logos clipart 2/Ecofreidly.png",
  Ecofreidly: "/Logos clipart 2/Ecofreidly.png",
  "BIS Approved": "/Logos clipart 2/BIS approved.png",
}

const LOGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23e5e7eb' width='80' height='80' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'%3ELogo%3C/text%3E%3C/svg%3E"

const defaultBlogPosts = [
  {
    id: 1,
    title: "Top 10 Equipment Maintenance Tips for 2024",
    excerpt: "Learn essential maintenance practices to extend the life of your farming equipment and maximize productivity.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=250&fit=crop",
    date: "2024-01-15",
    author: "Dr. Rajesh Kumar",
    category: "Maintenance",
    readTime: "5 min read",
  },
  {
    id: 2,
    title: "Battery vs Fuel-Powered Sprayers: Which is Right for Your Farm?",
    excerpt: "Compare the pros and cons of battery and fuel-powered sprayers to make the best choice for your agricultural needs.",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=250&fit=crop",
    date: "2024-01-10",
    author: "Priya Sharma",
    category: "Equipment Guide",
    readTime: "7 min read",
  },
  {
    id: 3,
    title: "Precision Agriculture: How Modern Equipment is Changing Farming",
    excerpt: "Discover how precision agriculture technology is revolutionizing farming practices and increasing crop yields.",
    image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=250&fit=crop",
    date: "2024-01-05",
    author: "Amit Singh",
    category: "Technology",
    readTime: "6 min read",
  },
  {
    id: 4,
    title: "Seasonal Equipment Checklist: Preparing for Monsoon Season",
    excerpt: "Essential equipment preparation tips to ensure your machinery is ready for the challenging monsoon season.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=250&fit=crop",
    date: "2024-01-01",
    author: "Suresh Patel",
    category: "Seasonal Tips",
    readTime: "4 min read",
  },
]

function OurCustomersScroll({ customers }: { customers: any[] }) {
  if (customers.length === 0) return null
  const n = customers.length
  const extendedCustomers = [...customers, ...customers]
  const itemWidthPercent = 100 / n
  return (
    <section className="py-12 md:py-16 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-2 md:px-4">
        <p className="eyebrow text-brand-600 text-center mb-2">Trusted by</p>
        <p className="text-2xl md:text-3xl font-700 text-gray-900 text-center mb-8 md:mb-10">Our customers across India</p>
        <div className="relative overflow-hidden">
          <div className="flex animate-logo-marquee">
            {extendedCustomers.map((c, i) => (
              <div
                key={`cust-${i}-${c._id ?? c.logo ?? i}`}
                className="flex-shrink-0 px-1 md:px-4 max-md:!w-1/3"
                style={{ width: `${itemWidthPercent}%` }}
              >
                <div className="bg-white rounded-lg p-1.5 md:p-6 h-20 md:h-28 lg:h-32 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.logo || LOGO_PLACEHOLDER}
                    alt={c.name ? `${c.name} — 100x Circle customer` : "100x Circle customer"}
                    className="object-contain max-w-full max-h-full min-h-0 min-w-0 w-full h-full"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = LOGO_PLACEHOLDER
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function YoutubeShortsCarousel() {
  const [shorts, setShorts] = useState<string[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const scrollBy = (offset: number) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
  }
  useEffect(() => {
    fetch("/api/youtube-shorts")
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setShorts(data) : setShorts([])))
  }, [])
  if (!shorts.length) return null
  return (
    <section className="py-16 md:py-20 bg-gray-50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="eyebrow text-red-600 mb-3">YouTube</p>
          <h2 className="text-3xl md:text-4xl font-700 text-gray-800 mb-4">
            See our machines in action.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Real demos, field tests, and operating guides — watch before you buy.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow p-2 rounded-full"
            style={{ display: shorts.length > 1 ? "block" : "none" }}
            onClick={() => scrollBy(-340)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth" style={{ scrollBehavior: "smooth" }}>
            {shorts.map((id) => (
              <div key={id} className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-black w-[70vw] max-w-xs sm:w-[320px] sm:min-w-[320px]">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&controls=0&loop=1&playlist=${id}`}
                  title="YouTube Short"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-[9/16] border-0"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow p-2 rounded-full"
            style={{ display: shorts.length > 1 ? "block" : "none" }}
            onClick={() => scrollBy(340)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

export default function HomePageClient({
  products,
  banners,
  blogPosts,
  accreditations,
  customers,
  homeContent,
  homepageSections = [],
  spareParts = [],
  trustBadges = [],
}: HomePageClientProps) {
  const router = useRouter()
  const [brochureModalOpen, setBrochureModalOpen] = useState(false)
  const [brochureModalData, setBrochureModalData] = useState<{ productName?: string; brochureUrl?: string }>({})

  const heroSlides = banners
    .filter((b) => b.isActive && (b.desktopBannerImage || b.image))
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const displayBlogPosts = blogPosts.length > 0 ? blogPosts : defaultBlogPosts

  // Handle legacy hash links (e.g., /#about, /#contact)
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : ""
      if (hash === "#about") router.push("/about")
      else if (hash === "#contact") router.push("/contact-us")
    }
    handleHashNavigation()
    window.addEventListener("hashchange", handleHashNavigation)
    return () => window.removeEventListener("hashchange", handleHashNavigation)
  }, [router])

  const handleBrochureDownload = (productName: string, brochureUrl?: string) => {
    setBrochureModalData({ productName, brochureUrl })
    setBrochureModalOpen(true)
  }

  const renderHomePage = () => (
    <>
      <HomepageJsonLd />

      {/* 1. HERO */}
      <HeroBlock heroSlides={heroSlides} />

      {/* 2. ADMIN CUSTOM SECTIONS (after-hero placement only) */}
      <CelebritySectionsBlock sections={homepageSections} placement="after-hero" />

      {/* 3. ACCREDITATIONS — compact trust strip */}
      <AccreditationsStrip accreditations={accreditations} />

      {/* 4. PRODUCTS */}
      <CinematicProductsSection products={products} onBrochureDownload={handleBrochureDownload} />

      {/* 5. SPARE PARTS — cross-sell, 4 items max */}
      {spareParts.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-950" aria-labelledby="spare-parts-heading">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
              <div>
                <p className="text-xs font-700 text-brand-400 uppercase tracking-widest mb-1">Genuine Parts</p>
                <h2 id="spare-parts-heading" className="text-xl md:text-2xl font-700 text-white">Spare Parts &amp; Accessories</h2>
              </div>
              <a href="/spare-parts" className="shrink-0 inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-white hover:bg-white/10 rounded-full text-sm font-500 transition-all">
                View All →
              </a>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {spareParts.slice(0, 4).map((part: any) => (
                <a key={part._id} href={`/spare-parts/${part.slug || part._id}`}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/8 hover:border-brand-500/30 transition-all">
                  {part.images?.[0] ? (
                    <div className="aspect-square overflow-hidden bg-gray-900">
                      <img src={part.images[0]} alt={part.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-800 flex items-center justify-center">
                      <span className="text-3xl text-gray-600">⚙️</span>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-xs text-cinema-500 mb-1">{part.category || 'Spare Part'}</p>
                    <h3 className="text-sm font-600 text-white mb-1 leading-snug group-hover:text-brand-400 transition-colors">{part.name}</h3>
                    {part.priceRange && <p className="text-xs text-brand-400 font-600">{part.priceRange}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. INDUSTRY APPLICATIONS */}
      <IndustryApplicationsSection />

      {/* 7. BRAND STORY */}
      <ManufacturerIntroBlock content={homeContent.manufacturerIntro} />

      {/* 8. MID-PAGE RFQ */}
      <RFQMidPageBlock />

      {/* 9. SOCIAL PROOF — YouTube + customers + reviews */}
      <YoutubeShortsCarousel />
      <OurCustomersScroll customers={customers} />
      <ReviewsSection limit={4} />

      {/* 10. TRUST & CERTIFICATIONS */}
      <CinematicTrustSection accreditations={accreditations} />

      {/* 11. SPECIALISED BUYERS — B2B segments */}
      <SpecialisedBuyersBlock />

      {/* 12. BLOG */}
      <BlogBlock posts={displayBlogPosts} hasApiPosts={blogPosts.length > 0} />

      {/* 13. FAQ */}
      <FAQSection faqs={homeContent.faqs} />

      {/* 14. FINAL CTA */}
      <CinematicCTASection />
    </>
  )

  return (
    <>
      <BrochureLeadModal
        open={brochureModalOpen}
        onClose={() => setBrochureModalOpen(false)}
        source="product-card"
        brochureUrl={brochureModalData.brochureUrl}
        productName={brochureModalData.productName}
      />

      <div className="min-h-screen bg-white">
        <div>{renderHomePage()}</div>

      </div>
    </>
  )
}

// Legacy component removed — product detail pages use app/products/[id]/ProductDetailClient.tsx
// Kept as type-only placeholder to avoid import errors during removal
function _unused_ProductDetailPage({
  product,
  setCurrentPage,
  setSelectedProduct,
  onBrochureDownload,
  whatsappNumber,
}: {
  product: any
  setCurrentPage: (page: string) => void
  setSelectedProduct: (id: string | null) => void
  onBrochureDownload: (productName: string, brochureUrl?: string) => void
  whatsappNumber: string
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [videoClosed, setVideoClosed] = useState(false)
  const videoId = product.youtubeLink ? getYouTubeId(product.youtubeLink) : null

  return (
    <div className="pt-32 min-h-screen bg-gray-50 relative">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <button onClick={() => setCurrentPage("home")} className="hover:text-green-600">
            Home
          </button>
          <ChevronRight size={16} />
          <span>Products</span>
          <ChevronRight size={16} />
          <span className="text-green-600">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrls[currentImageIndex] || "/placeholder.svg"}
                alt={product.name}
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {product.imageUrls.map((url: string, index: number) => (
                  <button key={index} onClick={() => setCurrentImageIndex(index)} className="w-1/4 h-full bg-black/50 hover:bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              {(product.badges || [product.badge]).map((badge: string, index: number) => (
                <Badge
                  key={index}
                  className={`${
                    badge === "Best Seller"
                      ? "bg-red-500 hover:bg-red-600"
                      : badge === "Eco-Friendly"
                        ? "bg-green-500 hover:bg-green-600"
                        : badge === "New Launch"
                          ? "bg-blue-500 hover:bg-blue-600"
                          : "bg-orange-500 hover:bg-orange-600"
                  } flex items-center gap-2`}
                >
                  {badgeLogoMap[badge] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={badgeLogoMap[badge]} alt={badge + " logo"} className="inline-block w-6 h-6 object-contain mr-1" />
                  )}
                  {badge}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                    size={20}
                  />
                ))}
                <span className="ml-2 text-lg font-semibold">{product.rating}</span>
                <span className="text-gray-600">({product.reviewsCount} reviews)</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-6">{product.priceRange}</div>
            <div className="text-lg text-gray-600 mb-8 leading-relaxed">
              <RichContent html={product.detailedDescription || ""} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={() =>
                  window.open(
                    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
                    "_blank"
                  )
                }
              >
                <MessageCircle className="mr-2" size={20} />
                Get Quote on WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                onClick={() => onBrochureDownload(product.name, product.brochureUrl)}
              >
                <Download className="mr-2" size={20} />
                Download Brochure
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Features</h3>
              <div className="space-y-4">
                {product.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Technical Specifications</h3>
              <div className="space-y-3">
                {product.specifications.map((spec: string, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">{spec.split(":")[0]}:</span>
                    <span className="font-semibold text-gray-800">{spec.split(":")[1]}</span>
                  </div>
                ))}
                {product.youtubeLink && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">YouTube Demo:</span>
                    <a
                      href={product.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Watch Demo Video
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Applications</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.applications.map((application: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700">{application}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Purchase?</h3>
          <p className="text-xl mb-8 opacity-90">
            Get in touch with our experts for detailed pricing, customization options, and delivery information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-green-600 hover:bg-gray-100"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).gtag_report_conversion) {
                  ;(window as any).gtag_report_conversion()
                }
                window.open(
                  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
                  "_blank"
                )
              }}
            >
              <MessageCircle className="mr-2" size={20} />
              Contact Sales Team
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 bg-transparent"
              onClick={() => onBrochureDownload(product.name, product.brochureUrl)}
            >
              <Download className="mr-2" size={20} />
              Download Technical Specs
            </Button>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setSelectedProduct(null)
              setCurrentPage("home")
            }}
            className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent"
          >
            <ChevronLeft className="mr-2" size={20} />
            Back to Products
          </Button>
        </div>
      </div>

      {videoId && !videoClosed && (
        <div className="fixed right-6 bottom-24 z-[51] flex flex-col items-end gap-1" style={{ bottom: "7rem" }}>
          <button
            onClick={() => setVideoClosed(true)}
            className="rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors -mb-1 z-10"
            aria-label="Close video"
          >
            <X size={18} />
          </button>
          <div className="w-[280px] sm:w-[320px] overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black">
            <div className="aspect-video w-full relative">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}`}
                title="Product video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
