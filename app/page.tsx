"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Download,
  MessageCircle,
  ArrowRight,
  Star,
  Users,
  Award,
  Shield,
  ChevronRight,
  Play,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Calendar,
  User,
  Search,
  ChevronLeft,
  CheckCircle,
  Target,
  Eye,
  Heart,
  Package,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ProductCard from '@/components/ProductCard'

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
  createdAt?: string;
  updatedAt?: string;
}

// Add this mapping at the top of the file, after imports
const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/logos clipart 2/Korean Technology.png',
  'German Technology': '/logos clipart 2/german technology.png',
  'Japnese Technology': '/logos clipart 2/Japnese technology.png',
  'GeM': '/logos clipart 2/GeM logo.png',
  'GeM logo': '/logos clipart 2/GeM logo.png',
  'Heavy Duty': '/logos clipart 2/Heavy duty.png',
  'Eco Friendly': '/logos clipart 2/Ecofreidly.png',
  'Ecofreidly': '/logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/logos clipart 2/BIS approved.png',
};

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
    <section className="py-24 bg-gray-50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-red-100 text-red-800 hover:bg-red-200 text-lg px-6 py-2">
            YouTube Shorts
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Product Demo and Videos</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Watch our latest product demos, tips, and more on YouTube Shorts!
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
              <div key={id} className="min-w-[320px] max-w-xs flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-black">
                <iframe
                  width="320"
                  height="568"
                  src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&controls=0&loop=1&playlist=${id}`}
                  title="YouTube Short"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-[568px] border-0"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentPage, setCurrentPage] = useState("home")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [showBrochureForm, setShowBrochureForm] = useState(false)
  const [brochureFormData, setBrochureFormData] = useState({ name: "", phone: "", productName: "" })
  const [products, setProducts] = useState<Product[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [phraseIndex, setPhraseIndex] = useState(0)

  const changingPhrases = [
    "100 X your Productivity",
    "100 X your Performance",
    "100 X your Growth",
    "100 X your Harvest",
    "100 X Coverage",
    "100 X Results",
  ]

  // Default hero slides (fallback)
  const defaultHeroSlides = [
    {
      image: "/banner.jpeg",
      title: "Revolutionary Fogging Technology",
      subtitle: "Advanced pest control solutions for modern agriculture",
    },
    {
      image: "/banner.jpeg",
      title: "Precision Battery Sprayers",
      subtitle: "Eco-friendly spraying with unmatched efficiency",
    },
    {
      image: "/banner.jpeg",
      title: "Heavy-Duty Power Tillers",
      subtitle: "Built for the toughest farming conditions",
    },
    {
      image: "/banner.jpeg",
      title: "Complete Agricultural Solutions",
      subtitle: "[YOUR NEW TEXT HERE]",
    },
  ]

  // Use banners from API or fallback to default
  const heroSlides = banners.length > 0 ? banners.filter(b => b.isActive).sort((a, b) => a.order - b.order) : defaultHeroSlides

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
        setProducts(normalized);
      })
  }, [])

  // Fetch banners from API
  useEffect(() => {
    fetch("/api/admin/banners")
      .then(res => res.json())
      .then(data => {
        setBanners(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Error fetching banners:', error);
        setBanners([]);
      });
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % changingPhrases.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  const blogPosts = [
    {
      id: 1,
      title: "Top 10 Agricultural Equipment Maintenance Tips for 2024",
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

  const stats = [
    { number: "10000+", label: "happy customers", icon: Users },
    { number: "500+", label: "products", icon: Package },
    { number: "50+", label: "distributors", icon: BarChart3 },
    { number: "10+", label: "Years Industry Experience", icon: Award },
    
  ]

  const businessEmail = "100xcircle@gmail.com"
  const whatsappNumber = "917827229116"

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name")
    const phone = formData.get("phone")
    const email = formData.get("email")
    const subject = formData.get("subject")
    const message = formData.get("message")

    // Save submission to backend
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, subject, message, type: "contact" }),
    })

    const whatsappMessage = `New Contact Form Submission:\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`, "_blank")
  }

  const handleBrochureDownload = (productName: string) => {
    setBrochureFormData({ ...brochureFormData, productName })
    setShowBrochureForm(true)
  }

  const handleBrochureFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string

    // Save submission to backend
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, productName: brochureFormData.productName, type: "brochure" }),
    })

    // Create dummy PDF download
    const link = document.createElement("a")
    link.href = "/placeholder.pdf" // This would be your actual PDF URL
    link.download = `${brochureFormData.productName}-Brochure.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Send WhatsApp message
    const whatsappMessage = `Brochure Downloaded:\nProduct: ${brochureFormData.productName}\nName: ${name}\nPhone: ${phone}\nPlease follow up with detailed information.`
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`, "_blank")

    setShowBrochureForm(false)
    setBrochureFormData({ name: "", phone: "", productName: "" })
    alert("Brochure download started! We'll contact you soon with more details.")
  }

  const renderPage = () => {
    switch (currentPage) {
      case "blog":
        return <BlogPage blogPosts={blogPosts} setCurrentPage={setCurrentPage} />
      case "about":
        return <AboutPage setCurrentPage={setCurrentPage} />
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

  const renderHomePage = () => (
    <>
      {/* Hero Section with Image Slider */}
      <section id="home" className="pt-32 min-h-screen relative overflow-hidden flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroSlides[currentSlide].image || "/banner.jpeg"}
            alt="Agricultural equipment"
            className="w-full h-full object-cover transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/30 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Text Content - Left Side */}
            <div className="text-white text-center md:text-left">
              <Badge className="mb-6 bg-green-600 hover:bg-green-700 text-lg px-6 py-2">
                Certified Professional Products 
              </Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                100X – <span className="text-green-400">Built</span> with Technology
              </h1>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-green-400 mb-4 min-h-[2.5rem] transition-all duration-500">
                {changingPhrases[phraseIndex]}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center md:justify-start mb-8">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
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
              </div>

              {/* Stats Section - Left Side Only */}
              <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-md mx-auto md:mx-0">
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
            </div>
          </div>
        </div>

        {/* Stats Section - Mobile View */}
        <div className="md:hidden mt-8">
            <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">{stat.number}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-4 h-4 rounded-full transition-all ${
                index === currentSlide ? "bg-green-400" : "bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Slide Navigation */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
          className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
          className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-4 rounded-full transition-all"
        >
          <ChevronRight size={24} />
        </button>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-200 text-lg px-6 py-2">
              Our Products
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Wide Range of Products</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover our comprehensive range of prodcust designed to boost productivity and efficiency.
            </p>
          </div>

          {products.length <= 6 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <ProductCard
                  key={product._id || product.id || index}
                  product={product}
                  onViewDetails={() => {}}
                  onBrochureDownload={() => handleBrochureDownload(product.name)}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.slice(0, 6).map((product, index) => (
                  <ProductCard
                    key={product._id || product.id || index}
                    product={product}
                    onViewDetails={() => {}}
                    onBrochureDownload={() => handleBrochureDownload(product.name)}
                  />
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Link href="/products">
                  <Button className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
                    View All Products
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <YoutubeShortsCarousel />

      {/* Reviews Carousel Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-lg px-6 py-2">
              Customer Reviews
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">What Our Customers Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hear from real customers about their experience with 100X Circle Pvt Ltd.
            </p>
          </div>
          <ReviewsCarousel />
        </div>
      </section>

      {/* Blog Preview Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-purple-100 text-purple-800 hover:bg-purple-200 text-lg px-6 py-2">
              Latest Blog Posts
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Agricultural Insights & Tips</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay updated with the latest farming techniques, equipment guides, and industry insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {blogPosts.slice(0, 3).map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-xl transition-all duration-300">
                <img src={post.image || "/placeholder.svg"} alt={post.title} className="w-full h-48 object-cover" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">{post.category}</Badge>
                    <span className="text-sm text-gray-500">{post.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{post.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{new Date(post.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
              onClick={() => setCurrentPage("blog")}
            >
              View All Blog Posts <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-200 text-lg px-6 py-2">
              Get In Touch
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Contact Us</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to transform your work? Get in touch with our experts today!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-8">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-6 bg-white rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="text-green-600" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Phone</div>
                    <div className="text-gray-600"><a href="tel:+917827229116" className="underline hover:text-green-600">+91 7827229116</a></div>
                    <div className="text-gray-600"><a href="tel:+918178567520" className="underline hover:text-green-600">+91 8178567520</a></div>
                    <div className="text-sm text-gray-500">Mon-Sat: 9:00 AM - 6:00 PM</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-6 bg-white rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="text-green-600" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Business Email</div>
                    <div className="text-gray-600"><a href="mailto:100xcircle@gmail.com" className="underline hover:text-green-600">100xcircle@gmail.com</a></div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-6 bg-white rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <MapPin className="text-green-600" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Address</div>
                    <div className="text-gray-600">UG, 398, Sector 7, Industrial Model Township, Gurugram, Haryana</div>
                    {/* Google Map Embed */}
                    <div className="mt-4 rounded-xl overflow-hidden shadow-lg">
                      <iframe
                        src="https://www.google.com/maps?q=UG,398,Sector+7,Industrial+Model+Township,Gurugram,Haryana&output=embed"
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="100X Location Map"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="border-0 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h3>
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Input name="firstName" placeholder="First Name" required className="p-4" />
                    <Input name="lastName" placeholder="Last Name" required className="p-4" />
                  </div>
                  <Input name="phone" type="tel" placeholder="Phone Number" required className="p-4" />
                  <Input name="email" type="email" placeholder="Email Address" required className="p-4" />
                  <select
                    name="subject"
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Product Interest</option>
                    {products.map((product) => (
                      <option key={product._id || product.id || product.name} value={product.name}>
                        {product.name}
                      </option>
                    ))}
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="dealer">Dealer Partnership</option>
                  </select>
                  <Textarea name="message" placeholder="Your Message" rows={4} required className="p-4 resize-none" />
                  <Button type="submit" size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    Send Message via WhatsApp <MessageCircle className="ml-2" size={20} />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-green-600 to-green-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Boost Your Business?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
            Join thousands of successful customers who have transformed their operations with 100X equipment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-green-600 hover:bg-gray-100 text-lg px-8 py-4"
              onClick={() =>
                window.open(
                  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
                  "_blank",
                )
              }
            >
              <MessageCircle className="mr-2" size={20} />
              Get Free Consultation
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 text-lg px-8 py-4 bg-transparent"
              onClick={() => handleBrochureDownload("Complete Product Catalog")}
            >
              <Download className="mr-2" size={20} />
              Download Catalog
            </Button>
          </div>
        </div>
      </section>
    </>
  )

  // Helper to scroll to contact section
  const scrollToContact = () => {
    setCurrentPage("home");
    setTimeout(() => {
      const el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Brochure Form Modal */}
      {showBrochureForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Download Brochure</h3>
              <p className="text-gray-600 mb-6">Please provide your details to download the brochure for:</p>
              <p className="font-semibold text-green-600 mb-6">{brochureFormData.productName}</p>
              <form onSubmit={handleBrochureFormSubmit} className="space-y-4">
                <Input name="name" placeholder="Your Full Name" required className="p-3" />
                <Input name="phone" type="tel" placeholder="Phone Number" required className="p-3" />
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    <Download className="mr-2" size={16} />
                    Download Now
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBrochureForm(false)}
                    className="bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-lg z-50 border-b">
        {/* Top Bar */}
        <div className="bg-green-600 text-white py-2">
          <div className="container mx-auto px-4 flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Phone size={14} className="mr-1" />
                <a href="tel:+917827229116" className="underline hover:text-green-200">+91 7827229116</a>
              </span>
              <span className="flex items-center">
                <Phone size={14} className="mr-1" />
                <a href="tel:+918178567520" className="underline hover:text-green-200">+91 8178567520</a>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span>Contact Us for bulk orders</span>
            </div>
          </div>
        </div>

        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentPage("home")} className="flex items-center space-x-3">
              <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
              <div className="flex flex-col">
                <span className="text-sm text-green-600 font-medium">Circle Pvt Ltd.</span>
              </div>
            </button>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-8">
              <button
                onClick={() => setCurrentPage("home")}
                className={`font-semibold transition-colors ${
                  currentPage === "home" ? "text-green-600" : "text-gray-700 hover:text-green-600"
                }`}
              >
                Home
              </button>
              <Link href="/products" className="text-gray-700 hover:text-green-600 transition-colors">
                Products
              </Link>
              <button
                onClick={() => setCurrentPage("about")}
                className={`transition-colors ${
                  currentPage === "about" ? "text-green-600 font-semibold" : "text-gray-700 hover:text-green-600"
                }`}
              >
                About Us
              </button>
              <a
                href="#contact"
                className="text-gray-700 hover:text-green-600 transition-colors"
                onClick={e => {
                  e.preventDefault();
                  scrollToContact();
                }}
              >
                Contact
              </a>
              <button
                onClick={() => setCurrentPage("blog")}
                className={`transition-colors ${
                  currentPage === "blog" ? "text-green-600 font-semibold" : "text-gray-700 hover:text-green-600"
                }`}
              >
                Blog
              </button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleBrochureDownload("Complete Product Catalog")}
              >
                <Download size={16} className="mr-2" />
                Brochure
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t">
              <div className="flex flex-col space-y-4 pt-4">
                <button
                  onClick={() => {
                    setCurrentPage("home")
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-green-600 font-semibold"
                >
                  Home
                </button>
                <Link href="/products" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  Products
                </Link>
                <button
                  onClick={() => {
                    setCurrentPage("about")
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-gray-700"
                >
                  About Us
                </button>
                <Link
                  href="#contact"
                  className="text-gray-700"
                  onClick={e => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    scrollToContact();
                  }}
                >
                  Contact
                </Link>
                <button
                  onClick={() => {
                    setCurrentPage("blog")
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-gray-700"
                >
                  Blog
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main>{renderPage()}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
                <div>
                  <h3 className="text-xl font-bold">100X</h3>
                  <p className="text-green-400 text-sm">Certified professional products</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6">
                Leading manufacturer of premium products across India.
              </p>
              {/* Social Media Links */}
              <div className="flex space-x-4">
                <a
                  href="https://facebook.com/100x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="https://twitter.com/100x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors cursor-pointer"
                >
                  <Twitter size={20} />
                </a>
                <a
                  href="https://instagram.com/100x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors cursor-pointer"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://linkedin.com/company/100x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Linkedin size={20} />
                </a>
                <a
                  href="https://youtube.com/100x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <Youtube size={20} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">Products</h4>
              <ul className="space-y-3 text-gray-400">
                {products.slice(0, 5).map((product) => (
                  <li key={product.id}>
                    <button
                      onClick={() => {
                        setSelectedProduct(product.id ?? null)
                        setCurrentPage("product")
                      }}
                      className="hover:text-green-400 transition-colors text-left"
                    >
                      {product.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <button onClick={() => setCurrentPage("home")} className="hover:text-green-400 transition-colors">
                    Home
                  </button>
                </li>
                <li>
                  <Link href="/products" className="hover:text-green-400 transition-colors">
                    Products
                  </Link>
                </li>
                <li>
                  <button onClick={() => setCurrentPage("about")} className="hover:text-green-400 transition-colors">
                    About Us
                  </button>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-green-400 transition-colors"
                    onClick={e => {
                      e.preventDefault();
                      scrollToContact();
                    }}
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <button onClick={() => setCurrentPage("blog")} className="hover:text-green-400 transition-colors">
                    Blog
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">Contact Info</h4>
              <div className="space-y-4 text-gray-400">
                <p className="flex items-center">
                  <Phone className="mr-3" size={16} /> <a href="tel:+917827229116" className="underline hover:text-green-400">+91 7827229116</a>
                </p>
                <p className="flex items-center">
                  <Phone className="mr-3" size={16} /> <a href="tel:+918178567520" className="underline hover:text-green-400">+91 8178567520</a>
                </p>
                <p className="flex items-start">
                  <MapPin className="mr-3 mt-1" size={16} /> UG, 398, Sector 7, Industrial Model Township, Gurugram, Haryana
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              &copy; 2025 100X Circle Pvt Ltd.
            </p>
            <div className="flex space-x-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-green-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-green-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-green-400 transition-colors">
                FTP Access
              </a>
              <a href="/admin" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">Admin</a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <button
        onClick={() =>
          window.open(
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
            "_blank",
          )
        }
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 z-50 animate-pulse"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle size={28} />
      </button>
    </div>
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
  onBrochureDownload: (productName: string) => void
  whatsappNumber: string
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
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
              {(product.badges || [product.badge]).map((badge, index) => (
                <Badge
                  key={index}
                  className={`$${
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
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">{product.detailedDescription}</p>

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
                onClick={() => onBrochureDownload(product.name)}
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
              onClick={() =>
                window.open(
                  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
                  "_blank",
                )
              }
            >
              <MessageCircle className="mr-2" size={20} />
              Contact Sales Team
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 bg-transparent"
              onClick={() => onBrochureDownload(product.name)}
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
    </div>
  )
}

// About Page Component
function AboutPage({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  const milestones = [
    { year: "2015", title: "Company Founded", description: "Started with a vision to revolutionize agriculture" },
    { year: "2017", title: "First 1000 Customers", description: "Reached our first major milestone" },
    { year: "2019", title: "National Expansion", description: "Expanded operations across 10 states" },
    { year: "2021", title: "Technology Innovation", description: "Launched precision agriculture solutions" },
    { year: "2023", title: "10,000+ curstomers", description: "Serving over 10,000 satisfied curstomers" },
    {
      year: "2024",
      title: "Digital Transformation",
      description: "Complete web solutions for agricultural businesses",
    },
  ]

  const values = [
    {
      icon: Target,
      title: "Mission",
      description:
        "To empower curstomers with innovative, reliable, and affordable agricultural equipment that enhances productivity, reduces labor intensity, and contributes to sustainable farming practices.",
    },
    {
      icon: Eye,
      title: "Vision",
      description:
        "To be the leading provider of agricultural equipment solutions, driving the transformation of farming practices through technology, innovation, and unwavering commitment to farmer success.",
    },
    {
      icon: Heart,
      title: "Values",
      description:
        "Quality, integrity, innovation, and customer-centricity form the foundation of everything we do. We believe in building lasting relationships based on trust and mutual success.",
    },
  ]

  const team = [
    {
      name: "Rajesh Kumar",
      position: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
      description: "20+ years experience in agricultural engineering and business development.",
    },
    {
      name: "Priya Sharma",
      position: "Head of Engineering",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
      description: "Expert in precision agriculture technology and product development.",
    },
    {
      name: "Amit Singh",
      position: "Operations Director",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
      description: "Specialist in supply chain management and quality control.",
    },
  ]

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* About Header */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-200 text-lg px-6 py-2">About Us</Badge>
          <h1 className="text-5xl font-bold text-gray-800 mb-6">About 100X Circle Pvt Ltd</h1>
        
        </div>

        {/* Company Story */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Our Journey</h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            100X Circle Pvt Ltd is India's fast-growing OEM of advanced fogging machines, agri implements, and airport ground equipment. Located at Sector 7, IMT Manesar, Gurgaon, we proudly uphold the 'Make in India' mission by delivering CE-certified, ISO 9001-compliant, and W.H.O-compliant solutions for both public and private sectors. Our brand '100X' stands for innovation, reliability, and scalable performance across segments
            </p>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Our range includes:
            </p>
            <ul className="text-lg text-gray-600 mb-6 leading-relaxed">
                            <li>Thermal Fogging Machines (Portable & Vehicle-Mounted)</li>
                            <li>Bio-Foggers for sensitive applications</li>
                            <li>Mini Fogging Machines for compact operations</li>
                            <li>Complete Agricultural Machinery line</li>
                            <li>Heavy-duty Airport Baggage Trolleys</li>
                          </ul>
               <br></br>         
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Tested in approved labs, our machines are available and listed on the Government e-Marketplace (GeM) and widely used by defense forces, municipal bodies, and agriculture departments. 100X Circle is UDYAM/MSME registered and offers authorized dealership support across India.

            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">2015</div>
                <div className="text-gray-600">Founded</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">10K+</div>
                <div className="text-gray-600">Happy curstomers</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="/new.png"
              alt="About 100X Circle Pvt Ltd"
              className="w-full rounded-2xl shadow-2xl"
            />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-green-600 rounded-2xl flex items-center justify-center">
              <Award className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Mission, Vision, Values */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Foundation</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide our work and define our commitment to agricultural excellence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <value.icon className="text-green-600" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Manufacturing Excellence */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Manufacturing Excellence</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Our state-of-the-art manufacturing facility combines traditional craftsmanship with modern technology to
                produce agricultural equipment of the highest quality. Every product undergoes rigorous testing to
                ensure durability and performance in real field conditions.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">ISO</div>
                  <div className="text-sm text-gray-600">Certified</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">99.5%</div>
                  <div className="text-sm text-gray-600">Quality Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">24/7</div>
                  <div className="text-sm text-gray-600">Production</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 mb-1">50+</div>
                  <div className="text-sm text-gray-600">Products</div>
                </div>
              </div>
            </div>
            <div>
              <img
                src="/production.png"
                alt="Manufacturing facility"
                className="w-full rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setCurrentPage("home")}
            className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent"
          >
            <ChevronLeft className="mr-2" size={20} />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

// Blog Page Component
function BlogPage({
  blogPosts,
  setCurrentPage,
}: {
  blogPosts: any[]
  setCurrentPage: (page: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Maintenance", "Equipment Guide", "Technology", "Seasonal Tips"]

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Blog Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-200">Agricultural Blog</Badge>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Latest Insights & Tips</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest farming techniques, equipment guides, and industry insights from our experts
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-xl transition-all duration-300">
              <img src={post.image || "/placeholder.svg"} alt={post.title} className="w-full h-48 object-cover" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 hover:text-purple-600 transition-colors cursor-pointer">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Read Full Article <ArrowRight className="ml-2" size={16} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setCurrentPage("home")}
            className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent"
          >
            <ChevronLeft className="mr-2" size={20} />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewsCarousel() {
  const reviews = [
    {
      name: "Ramesh S.",
      title: "EcoCare Pest Services, Bihar & Jharkhand",
      review:
        "We've been using 100X fogging machines for over a year now in our pest control business across Bihar and Jharkhand. The coverage and performance are excellent, especially in dense residential areas. Easy to operate, low maintenance, and highly effective in mosquito control. Definitely recommended for professional use.",
      avatar: "/review-avatars/review1.jpg",
    },
    {
      name: "Dr. Meena Verma",
      title: "Public Health Officer, UP",
      review:
        "100X's Double Barrel Fogging Machine was a game-changer during our dengue prevention drives. It covers large areas in less time, and the pulse jet technology really improves the fog output. Our teams found it reliable and easy to handle in both urban and rural campaigns.",
      avatar: "/review-avatars/review3.jpg",
    },
    {
      name: "Vijay Kumar",
      title: "Farmer from Muzaffarpur, Bihar",
      review:
        "I bought the 100X power weeder last season for my vegetable farm. It's strong, fuel-efficient, and saved me a lot of labor. Even my son can handle it without much training. Great support from the company too!",
      avatar: "/review-avatars/review5.jpg",
    },
    {
      name: "Ramdas Yadav",
      title: "Agri Cooperative Leader, UP",
      review:
        "Our cooperative purchased 2 tillers  from 100X for shared farming. These machines are robust and ideal for small and medium farms. We're happy with the results and cost savings. Many farmers in our group are planning to buy their own now.",
      avatar: "/review-avatars/review2.jpg",
    },
    {
      name: "Mahesh Patel",
      title: "Gujarat",
      review:
        "I've used different machines from 100X – from hand carried foggers to vehicle mounted type foggers . All products are solid, well-engineered, and suited for Indian conditions. Their double barrel fogger especially stands out for its fog throw and area coverage.",
      avatar: "/review-avatars/review4.jpg",
    },
  ];

  return (
    <div className="relative max-w-7xl mx-auto">
      <div className="flex items-center justify-center mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full overflow-x-auto">
          {reviews.map((review, idx) => (
            <Card key={idx} className="p-6 text-center shadow-xl border-0 flex flex-col items-center min-h-[260px] max-w-[320px] mx-auto">
              <img
                src={review.avatar}
                alt={review.name}
                className="w-16 h-16 rounded-full mb-3 object-cover border-2 border-yellow-200"
              />
              <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">{review.name}</h3>
              <p className="text-sm text-gray-500 mb-2 line-clamp-1">{review.title}</p>
              <p className="text-base text-gray-700 italic line-clamp-6">"{review.review}"</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
