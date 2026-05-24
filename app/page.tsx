"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  Menu,
  X,
  Phone,
  Download,
  MessageCircle,
  Star,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Target,
  Eye,
  Heart,
  Package,
  BarChart3,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RichContent } from "@/components/RichContent"
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton"
import ContactSection from "@/components/ContactSection"
import FAQSection from "@/components/FAQSection"
import AccreditationsStrip from "@/components/home/AccreditationsStrip"
import ManufacturerIntroBlock from "@/components/home/ManufacturerIntroBlock"
import TechnologyBlock from "@/components/home/TechnologyBlock"
import TrustBlock from "@/components/home/TrustBlock"
import SpecialisedBuyersBlock from "@/components/home/SpecialisedBuyersBlock"
import ProductsBlock from "@/components/home/ProductsBlock"
import ManufacturingAuthorityBlock from "@/components/home/ManufacturingAuthorityBlock"
import HeroBlock from "@/components/home/HeroBlock"
import RFQHeroPanel from "@/components/forms/RFQHeroPanel"
import RFQMidPageBlock from "@/components/forms/RFQMidPageBlock"
import RFQFloatingRibbon from "@/components/forms/RFQFloatingRibbon"
import HeroVideoBlock from "@/components/home/HeroVideoBlock"
import SectionConnector from "@/components/home/SectionConnector"
import StatesServedBlock from "@/components/home/StatesServedBlock"
import InlineInquiryCTA from "@/components/home/InlineInquiryCTA"
import HomepageJsonLd from "@/components/seo/HomepageJsonLd"
import { plainTextFromHtml } from "@/lib/rich-text"
import { blogPostSlug } from "@/lib/blogSlug"
import { BUSINESS } from "@/lib/seo/site-config"
import { getPersistedAttribution, pushDataLayer, setBrochureLeadContext } from "@/lib/gtm"

// Dynamic imports for below-fold components (code-split JS bundles)
const BlogBlock = dynamic(() => import("@/components/home/BlogBlock"))
const FAQSection = dynamic(() => import("@/components/FAQSection"))
const ContactSection = dynamic(() => import("@/components/ContactSection"))

// Product interface to match backend
interface Product {
  _id?: string;
  id?: string;
  name: string;
  imageUrls: string[];
  priceRange: string;
  rating: number;
  reviewsCount: number;
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  badges: string[]; // Changed from badge: string to badges: string[]
  youtubeLink?: string; // Added YouTube link field
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  brochureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

const getYouTubeId = (url: string): string | null => {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

// Add this mapping at the top of the file, after imports
const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  'GeM': '/Logos clipart 2/GeM logo.png',
  'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
  'Ecofreidly': '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

const LOGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23e5e7eb' width='80' height='80' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'%3ELogo%3C/text%3E%3C/svg%3E";

function OurCustomersScroll({ customers }: { customers: any[] }) {
  if (customers.length === 0) return null;

  const n = customers.length;
  const extendedCustomers = [...customers, ...customers];
  const itemWidthPercent = 100 / n;

  return (
    <section className="py-6 md:py-12 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-2 md:px-4">
        <p className="text-xl md:text-3xl font-bold text-gray-800 text-center mb-4 md:mb-8">OUR CUSTOMERS</p>
        <div className="relative overflow-hidden">
          <div className="flex animate-logo-marquee">
            {extendedCustomers.map((c, i) => (
              <div key={`cust-${i}-${c._id ?? c.logo ?? i}`} className="flex-shrink-0 px-1 md:px-4 max-md:!w-1/3" style={{ width: `${itemWidthPercent}%` }}>
                <div className="bg-white rounded-lg p-1.5 md:p-6 h-20 md:h-28 lg:h-32 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.logo || LOGO_PLACEHOLDER}
                    alt={c.name ? `${c.name} — 100x Circle customer` : "100x Circle customer"}
                    className="object-contain max-w-full max-h-full min-h-0 min-w-0 w-full h-full"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = LOGO_PLACEHOLDER }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function YoutubeShortsCarousel() {
  const [shorts, setShorts] = useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetch("/api/youtube-shorts")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) ? setShorts(data) : setShorts([]));
  }, []);
  if (!shorts.length) return null;
  return (
    <section className="py-16 md:py-20 bg-gray-50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-red-100 text-red-800 hover:bg-red-200 text-lg px-6 py-2">
            YouTube Shorts
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Fogging Machine Supplier - Watch Real Product Demos</h2>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto">
            100X Circle shares real product demo videos to help you understand machine performance before buying.
          </p>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto">
            Watch our latest demos, working guides, and quick tips to see fog output, coverage area, and ease of use in real conditions. Our videos showcase thermal and pulse jet fogging machines used for mosquito control, public health, and commercial pest management across India.
          </p>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto">
            Explore our YouTube Shorts to stay updated and choose the right fogging machine with confidence.
          </p>
        </div>
        <div className="relative">
          {/* Left Arrow */}
          <button
            type="button"
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow p-2 rounded-full"
            style={{ display: shorts.length > 1 ? 'block' : 'none' }}
            onClick={() => scrollBy(-340)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          {/* Scrollable Shorts */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {shorts.map((id) => (
              <div
                key={id}
                className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-black w-[70vw] max-w-xs sm:w-[320px] sm:min-w-[320px]"
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&controls=0&loop=1&playlist=${id}`}
                  title="YouTube Short"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-[9/16] border-0"
                ></iframe>
              </div>
            ))}
          </div>
          {/* Right Arrow */}
          <button
            type="button"
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow p-2 rounded-full"
            style={{ display: shorts.length > 1 ? 'block' : 'none' }}
            onClick={() => scrollBy(340)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentPage, setCurrentPage] = useState("home")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [showBrochureForm, setShowBrochureForm] = useState(false)
  const [brochureFormData, setBrochureFormData] = useState<{ name: string; phone: string; productName: string; brochureUrl?: string }>({ name: "", phone: "", productName: "" })
  const [brochureSubmitting, setBrochureSubmitting] = useState(false)
  const [brochureFormError, setBrochureFormError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [accreditations, setAccreditations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [bannersLoading, setBannersLoading] = useState(true)
  const [mainBrochureUrl, setMainBrochureUrl] = useState<string | null>(null)
  const bannerTouchStartX = useRef<number | null>(null)

  const changingPhrases = [
    "100 X your Productivity",
    "100 X your Performance",
    "100 X your Growth",
    "100 X your Harvest",
    "100 X Coverage",
    "100 X Results",
  ]

  // Use banners from API only
  // The first banner (order 0 or lowest order) is the default loading banner
  const heroSlides = banners
    .filter(b => b.isActive && b.image) // Only show active banners with images
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  // Fetch products from API
  useEffect(() => {
    fetch("/api/admin/products")
      .then(res => res.json())
      .then(data => {
        const normalized = Array.isArray(data)
          ? data.map((p: any) => ({
            ...p,
            imageUrls: Array.isArray(p.imageUrls)
              ? p.imageUrls
              : p.imageUrl
                ? [p.imageUrl]
                : [],
          }))
          : [];
        // Sort by order (lower numbers first), then by creation date
        normalized.sort((a: any, b: any) => {
          const orderA = a.order !== undefined ? a.order : Infinity;
          const orderB = b.order !== undefined ? b.order : Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setProducts(normalized);
      })
  }, [])

  // Fetch banners from API
  useEffect(() => {
    setBannersLoading(true);

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      setBannersLoading(false);
      console.warn('Banner fetch timeout - using fallback');
    }, 3000); // 3 second timeout

    fetch("/api/admin/banners")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        clearTimeout(timeoutId);
        console.log('Banners fetched:', data);
        setBanners(Array.isArray(data) ? data : []);
        setBannersLoading(false);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('Error fetching banners:', error);
        setBanners([]);
        setBannersLoading(false);
      });
  }, [])

  // Fetch blogs from API
  useEffect(() => {
    fetch("/api/admin/blogs")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Blogs fetched:', data);
        setBlogPosts(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Error fetching blogs:', error);
        setBlogPosts([]);
      });
  }, [])

  // Fetch accreditations from API
  useEffect(() => {
    fetch("/api/admin/accreditations")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Accreditations fetched:', data);
        setAccreditations(Array.isArray(data) ? data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)) : []);
      })
      .catch(error => {
        console.error('Error fetching accreditations:', error);
        setAccreditations([]);
      });
  }, [])

  // Fetch main website brochure URL (used for "Complete Product Catalog" in header)
  useEffect(() => {
    fetch("/api/brochure")
      .then((res) => res.json())
      .then((data) => setMainBrochureUrl(data?.mainBrochureUrl ?? null))
      .catch(() => setMainBrochureUrl(null))
  }, [])

  // Fetch customers from API
  useEffect(() => {
    fetch("/api/admin/customers")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCustomers(Array.isArray(data) ? data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)) : []);
      })
      .catch(error => {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      });
  }, [])

  // Banner slideshow: use stable numeric deps so the interval isn't cleared every render. Normalize timer to ms (admin may have saved seconds).
  const slideCount = heroSlides.length
  const rawInterval = heroSlides[0]?.slideshowInterval ?? 4000
  const intervalMs = rawInterval > 0 && rawInterval < 1000 ? rawInterval * 1000 : Math.max(1000, rawInterval)

  useEffect(() => {
    if (slideCount === 0 || slideCount === 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideCount)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [slideCount, intervalMs])

  // Handle legacy hash links (e.g., /#about, /#contact)
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : ""
      if (hash === "#about") {
        router.push("/about")
      } else if (hash === "#contact") {
        router.push("/contact-us")
      }
    }

    handleHashNavigation()
    window.addEventListener("hashchange", handleHashNavigation)
    return () => window.removeEventListener("hashchange", handleHashNavigation)
  }, [router])

  // Close mobile menu and brochure modal on Escape; never close the modal mid-submit.
  useEffect(() => {
    if (!isMenuOpen && !showBrochureForm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isMenuOpen) setIsMenuOpen(false)
      if (showBrochureForm && !brochureSubmitting) {
        setBrochureFormError(null)
        setShowBrochureForm(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMenuOpen, showBrochureForm, brochureSubmitting])

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % changingPhrases.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  // Default blog posts (fallback)
  const defaultBlogPosts = [
    {
      id: 1,
      title: "Top 10 Equipment Maintenance Tips for 2024",
      excerpt:
        "Learn essential maintenance practices to extend the life of your farming equipment and maximize productivity.",
      image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=250&fit=crop",
      date: "2024-01-15",
      author: "Dr. Rajesh Kumar",
      category: "Maintenance",
      readTime: "5 min read",
    },
    {
      id: 2,
      title: "Battery vs Fuel-Powered Sprayers: Which is Right for Your Farm?",
      excerpt:
        "Compare the pros and cons of battery and fuel-powered sprayers to make the best choice for your agricultural needs.",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=250&fit=crop",
      date: "2024-01-10",
      author: "Priya Sharma",
      category: "Equipment Guide",
      readTime: "7 min read",
    },
    {
      id: 3,
      title: "Precision Agriculture: How Modern Equipment is Changing Farming",
      excerpt:
        "Discover how precision agriculture technology is revolutionizing farming practices and increasing crop yields.",
      image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=250&fit=crop",
      date: "2024-01-05",
      author: "Amit Singh",
      category: "Technology",
      readTime: "6 min read",
    },
    {
      id: 4,
      title: "Seasonal Equipment Checklist: Preparing for Monsoon Season",
      excerpt:
        "Essential equipment preparation tips to ensure your machinery is ready for the challenging monsoon season.",
      image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=250&fit=crop",
      date: "2024-01-01",
      author: "Suresh Patel",
      category: "Seasonal Tips",
      readTime: "4 min read",
    },
  ]

  // Use blogs from API or fallback to default
  const displayBlogPosts = blogPosts.length > 0 ?
    blogPosts
      .filter((b) => Boolean(b.isPublished))
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Infinity
        const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Infinity
        if (orderA !== orderB) return orderA - orderB
        const ta = new Date(a.publishedAt as string).getTime()
        const tb = new Date(b.publishedAt as string).getTime()
        return tb - ta
      })
    : defaultBlogPosts

  const stats = [
    { number: "10000+", label: "happy customers", icon: Users },
    { number: "500+", label: "products", icon: Package },
    { number: "50+", label: "distributors", icon: BarChart3 },
    { number: "10+", label: "Years Industry Experience", icon: Award },

  ]

  const whatsappNumber = BUSINESS.whatsappE164

  const handleBrochureDownload = (productName: string, brochureUrl?: string) => {
    setBrochureFormError(null)
    setBrochureFormData({ ...brochureFormData, productName, brochureUrl })
    setShowBrochureForm(true)
  }

  const handleBrochureFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBrochureFormError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const hp = String(formData.get("company_website") ?? "").trim()

    if (!name || !phone) {
      setBrochureFormError("Please enter your name and phone number.")
      return
    }
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 10 || digits.length > 15) {
      setBrochureFormError("Please enter a valid phone number (10–15 digits).")
      return
    }
    if (hp) {
      setBrochureFormError("Something went wrong. Please try again.")
      return
    }

    setBrochureSubmitting(true)
    pushDataLayer({
      event: "brochure_form_submit_attempt",
      product: brochureFormData.productName,
    })

    try {
      const attribution = getPersistedAttribution()
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          productName: brochureFormData.productName,
          type: "brochure",
          attribution,
          form_page_url: window.location.href,
          form_page_path: window.location.pathname,
          company_website: hp,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")

      setBrochureLeadContext({
        productName: brochureFormData.productName,
        brochureUrl: brochureFormData.brochureUrl || "",
        product: brochureFormData.productName,
        has_brochure_file: Boolean(brochureFormData.brochureUrl),
      })

      pushDataLayer({
        event: "brochure_form_success",
        product: brochureFormData.productName,
      })

      form.reset()
      setShowBrochureForm(false)
      setBrochureFormData({ name: "", phone: "", productName: "", brochureUrl: undefined })
      router.push("/brochure-thank-you")
    } catch {
      setBrochureFormError("We could not save your request. Please try again or contact us by phone.")
    } finally {
      setBrochureSubmitting(false)
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case "product":
        return selectedProduct ? (
          <ProductDetailPage
            product={products.find((p) => p.id === selectedProduct)!}
            setCurrentPage={setCurrentPage}
            setSelectedProduct={setSelectedProduct}
            onBrochureDownload={handleBrochureDownload}
            whatsappNumber={whatsappNumber}
          />
        ) : (
          renderHomePage()
        )
      default:
        return renderHomePage()
    }
  }

  const renderHomePage = () => {
    // Ensure we have valid slides and currentSlide is within bounds
    const validSlides = heroSlides;
    const safeCurrentSlide = heroSlides.length > 0 ? Math.max(0, Math.min(currentSlide, heroSlides.length - 1)) : 0;
    const currentSlideData = heroSlides.length > 0 ? heroSlides[safeCurrentSlide] : null;

    return (
      <>

        <HomepageJsonLd />

        {/* Hero Section with Image Slider */}
        <HeroBlock
          heroSlides={heroSlides}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          currentSlideData={currentSlideData}
          bannersLoading={bannersLoading}
          bannerTouchStartX={bannerTouchStartX}
          stats={stats}
          changingPhrases={changingPhrases}
          phraseIndex={phraseIndex}
          rfqSlot={<RFQHeroPanel />}
        />

        <HeroVideoBlock />

        <SectionConnector eyebrow="Built for India" text="A decade of manufacturing for the field." />

        {/* Accreditations Autoscroll Bar - just above Our Products */}
        <AccreditationsStrip accreditations={accreditations} />

        <SectionConnector eyebrow="The Range" text="From handheld to vehicle-mounted." />

        <ProductsBlock products={products} onBrochureDownload={handleBrochureDownload} />

        <ManufacturerIntroBlock />

        <SectionConnector eyebrow="The Technology" text="Inside every 100X fogger." />

        <TechnologyBlock />

        <RFQMidPageBlock />

        <ManufacturingAuthorityBlock />

        <InlineInquiryCTA
          text="Compare models or request a tailored quote for your tender."
          whatsappMessage="Hi, I'd like a quote tailored to my use case (please mention: municipal / agricultural / industrial / export)."
          tone="dark"
        />

        <YoutubeShortsCarousel />

        {/* Our Customers bar - above Customer Reviews */}
        <OurCustomersScroll customers={customers} />

        <SectionConnector eyebrow="In Their Words" text="Reviews from the field." />

        <TrustBlock />

        <SpecialisedBuyersBlock />

        <StatesServedBlock />

        <BlogBlock posts={displayBlogPosts} hasApiPosts={blogPosts.length > 0} />

        <FAQSection />

        <ContactSection products={products} />

      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Brochure Form Modal */}
        {showBrochureForm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="brochure-modal-title"
            onClick={() => {
              if (brochureSubmitting) return
              setBrochureFormError(null)
              setShowBrochureForm(false)
            }}
          >
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6">
                <h3 id="brochure-modal-title" className="text-xl font-bold text-gray-800 mb-4">Download brochure</h3>
                <p className="text-gray-600 mb-6">Please provide your details to download the brochure for:</p>
                <p className="font-semibold text-green-600 mb-6">{brochureFormData.productName}</p>
                <form onSubmit={handleBrochureFormSubmit} className="relative space-y-4">
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label htmlFor="brochure-hp-website">Company website</label>
                    <input id="brochure-hp-website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
                  </div>
                  <Input name="name" placeholder="Your full name" required className="p-3 min-h-[48px]" disabled={brochureSubmitting} />
                  <Input name="phone" type="tel" placeholder="Phone number" required className="p-3 min-h-[48px]" disabled={brochureSubmitting} />
                  {brochureFormError ? (
                    <p className="text-sm text-red-600" role="alert">
                      {brochureFormError}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px]" disabled={brochureSubmitting}>
                      {brochureSubmitting ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={16} aria-hidden />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Download className="mr-2" size={16} aria-hidden />
                          Continue
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBrochureFormError(null)
                        setShowBrochureForm(false)
                      }}
                      className="bg-transparent min-h-[48px]"
                      disabled={brochureSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header — global Navbar from app/layout.tsx renders site-wide; the
            previously duplicated inline header on this route was overlapping
            the Navbar and hiding the Call / WhatsApp buttons. */}

        {/* Main Content */}
        {/* Main content (root layout already exposes a landmark <main>) */}
        <div>{renderPage()}</div>

        <RFQFloatingRibbon />
        <WhatsAppFloatingButton
          waNumber={BUSINESS.whatsappE164}
          displayPhone="+91 78272 29116"
          phoneDigitsForEvents="7827229116"
        />
      </div>
    </>
  )
}

// Product Detail Page Component
function ProductDetailPage({
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoClosed, setVideoClosed] = useState(false);

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const videoId = product.youtubeLink ? getYouTubeId(product.youtubeLink) : null;

  return (
    <div className="pt-32 min-h-screen bg-gray-50 relative">
      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <button onClick={() => setCurrentPage("home")} className="hover:text-green-600">
            Home
          </button>
          <ChevronRight size={16} />
          <span>Products</span>
          <ChevronRight size={16} />
          <span className="text-green-600">{product.name}</span>
        </div>

        {/* Product Header */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="relative">
              <img
                src={product.imageUrls[currentImageIndex] || "/placeholder.svg"}
                alt={product.name}
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {product.imageUrls.map((url: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className="w-1/4 h-full bg-black/50 hover:bg-black"
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
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
                  className={`$${badge === "Best Seller"
                    ? "bg-red-500 hover:bg-red-600"
                    : badge === "Eco-Friendly"
                      ? "bg-green-500 hover:bg-green-600"
                      : badge === "New Launch"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-orange-500 hover:bg-orange-600"
                    } flex items-center gap-2`}
                >
                  {badgeLogoMap[badge] && (
                    <img src={badgeLogoMap[badge]} alt={badge + ' logo'} className="inline-block w-6 h-6 object-contain mr-1" />
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
                    "_blank",
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

        {/* Product Details Tabs */}
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

        {/* Applications */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Applications</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.applications.map((application: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">{application}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
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
                if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) {
                  (window as any).gtag_report_conversion();
                }
                window.open(
                  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
                  "_blank",
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

        {/* Back to Products */}
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
        <div
          className="fixed right-6 bottom-24 z-[51] flex flex-col items-end gap-1"
          style={{ bottom: "7rem" }}
        >
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