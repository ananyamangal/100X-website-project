"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
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

