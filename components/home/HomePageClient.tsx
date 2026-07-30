"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Download, MessageCircle, Star, ChevronRight, ChevronLeft, X, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RichContent } from "@/components/RichContent"
// Above-the-fold: eagerly loaded — these must be ready for first paint
import HeroBlock from "@/components/home/HeroBlock"
import HomepageJsonLd from "@/components/seo/HomepageJsonLd"
import BrochureLeadModal from "@/components/BrochureLeadModal"
import { BUSINESS } from "@/lib/seo/site-config"
import { getPersistedAttribution, pushDataLayer, setBrochureLeadContext } from "@/lib/gtm"
import { type HomeContent } from "@/lib/homeContentTypes"
import { HOMEPAGE_SECTIONS, resolveSections, toSectionMap, type PageSectionRecord } from "@/lib/pageSections"

// Below-the-fold: lazy-loaded — reduces initial JS bundle by ~40%
const AccreditationsStrip = dynamic(() => import("@/components/home/AccreditationsStrip"))
const ManufacturerIntroBlock = dynamic(() => import("@/components/home/ManufacturerIntroBlock"))
const TechnologyBlock = dynamic(() => import("@/components/home/TechnologyBlock"))
const SpecialisedBuyersBlock = dynamic(() => import("@/components/home/SpecialisedBuyersBlock"))
const RFQMidPageBlock = dynamic(() => import("@/components/forms/RFQMidPageBlock"))
const CelebritySectionsBlock = dynamic(() => import("@/components/home/CelebritySectionsBlock"))
const IndustryApplicationsSection = dynamic(() => import("@/components/home/IndustryApplicationsSection"))
const CinematicTrustSection = dynamic(() => import("@/components/home/CinematicTrustSection"))
const CinematicCTASection = dynamic(() => import("@/components/home/CinematicCTASection"))
const CinematicProductsSection = dynamic(() => import("@/components/home/CinematicProductsSection"))
const ReviewsSection = dynamic(() => import("@/components/home/ReviewsSection"))
const BlogBlock = dynamic(() => import("@/components/home/BlogBlock"))
const FAQSection = dynamic(() => import("@/components/FAQSection"))
const GovPerformanceSnapshot = dynamic(() => import("@/components/home/GovPerformanceSnapshot"))
const HomeCaseStudiesSection = dynamic(() => import("@/components/home/HomeCaseStudiesSection"))
const HomeDeploymentsSection = dynamic(() => import("@/components/home/HomeDeploymentsSection"))
const HomeGovSuppliesSection = dynamic(() => import("@/components/home/HomeGovSuppliesSection"))

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
  pageSections?: any[]
  caseStudies?: any[]
  govSupplies?: any[]
  govKpis?: any
  deployments?: any[]
}

const getYouTubeId = (url: string): string | null => {
  if (!url || typeof url !== "string") return null
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

const badgeLogoMap: Record<string, string> = {
  "German Technology":  "/Logos clipart 2/german technology.png",
  "Japnese Technology": "/Logos clipart 2/Japnese technology.png",
  "Korean Technology":  "/Logos clipart 2/Korean Technology.png",
  GeM:                  "/Logos clipart 2/GeM logo.png",
  "GeM logo":           "/Logos clipart 2/GeM logo.png",
  "GeM Registered":     "/Logos clipart 2/GeM logo.png",
  "GeM Approved":       "/Logos clipart 2/GeM logo.png",
  "Heavy Duty":         "/Logos clipart 2/Heavy duty.png",
  "Heavy duty":         "/Logos clipart 2/Heavy duty.png",
  "Eco Friendly":       "/Logos clipart 2/Ecofreidly.png",
  Ecofreidly:           "/Logos clipart 2/Ecofreidly.png",
  "BIS Approved":       "/Logos clipart 2/BIS approved.png",
  BIS:                  "/Logos clipart 2/BIS approved.png",
}

function decodeBadge(b: string): string {
  return b.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim()
}

function itemToString(x: unknown): string {
  if (typeof x === 'string') return x
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    if (typeof o.title === 'string') return o.value ? `${o.title}: ${o.value}` : o.title
    if (typeof o.label === 'string') return o.value ? `${o.label}: ${o.value}` : o.label
    if (typeof o.name === 'string') return o.value ? `${o.name}: ${o.value}` : o.name
  }
  return ''
}

function buildPartUrl(part: any): string {
  const productName = part.compatibleProductNames?.[0]
  if (productName) {
    const productSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return `/spare-parts/${productSlug}/${part.slug}`
  }
  const cat = (part.category || 'parts').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `/spare-parts/${cat}/${part.slug}`
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
              <div key={id} className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-black w-[75vw] max-w-[320px] sm:w-[280px] sm:min-w-[280px]">
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
  pageSections = [],
  caseStudies = [],
  govSupplies = [],
  govKpis,
  deployments = [],
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

  // ── CMS section control ────────────────────────────────────────────────────
  // Merge DB overrides with hardcoded defaults. Falls back to all-enabled
  // default order when pageSections is empty (DB never populated yet).
  const resolvedSections = resolveSections(HOMEPAGE_SECTIONS, pageSections as PageSectionRecord[])
  const sectionMap = toSectionMap(resolvedSections)
  const isEnabled = (key: string) => sectionMap[key]?.isEnabled !== false

  // Section renderer map — keys match HOMEPAGE_SECTIONS keys
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    hero: () => (
      <>
        <HeroBlock heroSlides={heroSlides} />
        <CelebritySectionsBlock sections={homepageSections} placement="after-hero" />
      </>
    ),
    accreditations: () => <AccreditationsStrip accreditations={accreditations} />,
    products: () => (
      <>
        <CinematicProductsSection products={products} onBrochureDownload={handleBrochureDownload} />
        <CelebritySectionsBlock sections={homepageSections} placement="after-products" />
      </>
    ),
    spare_parts: () => spareParts.length > 0 ? (
      <section className="py-12 md:py-16 bg-gray-950" aria-labelledby="spare-parts-heading">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
            <div>
              <p className="text-xs font-700 text-brand-400 uppercase tracking-widest mb-1">
                {sectionMap['spare_parts']?.eyebrow || 'Genuine Parts'}
              </p>
              <h2 id="spare-parts-heading" className="text-xl md:text-2xl font-700 text-white">
                {sectionMap['spare_parts']?.heading || 'Spare Parts & Accessories'}
              </h2>
            </div>
            <a href="/spare-parts" className="shrink-0 inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-white hover:bg-white/10 rounded-full text-sm font-500 transition-all">
              {sectionMap['spare_parts']?.ctaText || 'View All →'}
            </a>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {spareParts.slice(0, 4).map((part: any) => (
              <a key={part._id} href={buildPartUrl(part)}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/8 hover:border-brand-500/30 transition-all">
                {part.images?.[0] ? (
                  <div className="aspect-square overflow-hidden bg-gray-900 relative">
                    <Image src={part.images[0]} alt={part.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
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
    ) : null,
    industry_applications: () => <IndustryApplicationsSection />,
    manufacturer_story: () => <ManufacturerIntroBlock content={homeContent.manufacturerIntro} />,
    technology: () => <TechnologyBlock content={homeContent.technology} />,
    rfq_midpage: () => <RFQMidPageBlock />,
    youtube_shorts: () => <YoutubeShortsCarousel />,
    customers: () => <OurCustomersScroll customers={customers} />,
    gov_supplies: () => <HomeGovSuppliesSection initialData={govSupplies.length > 0 ? govSupplies : undefined} />,
    gov_performance: () => <GovPerformanceSnapshot initialKpis={govKpis ?? undefined} />,
    gov_success: () => <HomeCaseStudiesSection initialData={caseStudies.length > 0 ? caseStudies : undefined} />,
    deployments: () => <HomeDeploymentsSection initialData={deployments.length > 0 ? deployments : undefined} />,
    reviews: () => <ReviewsSection />,
    trust_certifications: () => (
      <>
        <CelebritySectionsBlock sections={homepageSections} placement="before-trust" />
        <CinematicTrustSection accreditations={accreditations} />
      </>
    ),
    specialised_buyers: () => <SpecialisedBuyersBlock />,
    blog: () => <BlogBlock posts={displayBlogPosts} hasApiPosts={blogPosts.length > 0} />,
    faq: () => (
      <>
        <CelebritySectionsBlock sections={homepageSections} placement="before-faq" />
        <FAQSection faqs={homeContent.faqs} />
      </>
    ),
    cta_final: () => <CinematicCTASection />,
  }

  const renderHomePage = () => (
    <>
      <HomepageJsonLd />
      {/* Page-level H1 — visually hidden but present for SEO and screen readers */}
      <h1 className="sr-only">100X Circle — Thermal Fogging Machine Manufacturer in India</h1>

      {resolvedSections.map(section => {
        if (!section.isEnabled) return null
        const renderer = sectionRenderers[section.key]
        if (!renderer) return null
        return <React.Fragment key={section.key}>{renderer()}</React.Fragment>
      })}
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

// Legacy ProductDetailPage removed — product detail pages use app/products/[id]/ProductDetailClient.tsx
function LegacyProductDetailPage({
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
          <button onClick={() => setCurrentPage("home")} className="hover:text-brand-600">
            Home
          </button>
          <ChevronRight size={16} />
          <span>Products</span>
          <ChevronRight size={16} />
          <span className="text-brand-600">{product.name}</span>
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
              {(product.badges || [product.badge]).map((rawBadge: string, index: number) => {
                const badge = decodeBadge(rawBadge)
                return (
                <Badge
                  key={index}
                  className={`${
                    badge === "Best Seller"
                      ? "bg-red-500 hover:bg-red-600"
                      : badge === "Eco-Friendly"
                        ? "bg-brand-500 hover:bg-brand-600"
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
                )
              })}
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
            <div className="text-3xl font-bold text-brand-600 mb-6">{product.priceRange}</div>
            <div className="text-lg text-gray-600 mb-8 leading-relaxed">
              <RichContent html={product.detailedDescription || ""} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="bg-brand-600 hover:bg-brand-700 flex-1"
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
                className="border-brand-600 text-brand-600 hover:bg-brand-50 bg-transparent"
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
                {product.features.map((feature: unknown, index: number) => {
                  const text = itemToString(feature)
                  if (!text) return null
                  const ci = text.indexOf(':')
                  const label = ci !== -1 ? text.slice(0, ci).trim() : text
                  const detail = ci !== -1 ? text.slice(ci + 1).trim() : ''
                  return (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-brand-50 rounded-lg">
                    <CheckCircle className="text-brand-600" size={20} />
                    <span className="text-gray-700 font-medium">{label}{detail ? `: ${detail}` : ''}</span>
                  </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Technical Specifications</h3>
              <div className="space-y-3">
                {product.specifications.map((spec: unknown, index: number) => {
                  const text = itemToString(spec)
                  if (!text) return null
                  const ci = text.indexOf(':')
                  const label = ci !== -1 ? text.slice(0, ci).trim() : text
                  const val = ci !== -1 ? text.slice(ci + 1).trim() : ''
                  return (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">{label}:</span>
                    <span className="font-semibold text-gray-800">{val}</span>
                  </div>
                  )
                })}
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
            {product.applications.map((application: unknown, index: number) => {
              const text = itemToString(application)
              if (!text) return null
              return (
              <div key={index} className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700">{text}</span>
              </div>
              )
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Purchase?</h3>
          <p className="text-xl mb-8 opacity-90">
            Get in touch with our experts for detailed pricing, customization options, and delivery information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-600 hover:bg-gray-100"
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
              className="border-2 border-white text-white hover:bg-white hover:text-brand-600 bg-transparent"
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
          <div className="w-[calc(100vw-3rem)] max-w-[280px] sm:max-w-[320px] overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black">
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
