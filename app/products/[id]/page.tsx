'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Star, CheckCircle, Menu, X } from 'lucide-react';
import Link from 'next/link';

const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  'GeM': '/Logos clipart 2/GeM logo.png',
  'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy Duty.png',
  'Heavy duty': '/Logos clipart 2/Heavy Duty.png', // Case variation
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
  'Ecofreidly': '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

const PRODUCT_META: Record<string, { title: string; description: string }> = {
  'power-tiller': {
    title: 'Power Tiller in Delhi | 100x Circle',
    description:
      'Looking for the best Power Tiller in Delhi? 100x Circle offers high-performance, durable, and affordable power tillers designed to make farming easier and more efficient. Explore our range of advanced agricultural machines today!',
  },
  'vehicle-mounted-fogging-machine': {
    title: 'Vehicle Mounted Fogging Machine in Delhi | 100x Circle',
    description:
      '100x Circle offers the best Vehicle Mounted Fogging Machine in Delhi, designed for large-scale mosquito control and disinfection. Our high-performance foggers ensure powerful spray coverage, durability, and easy operation for municipal and industrial use.',
  },
};

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-lg z-50 border-b">
      <div className="bg-green-600 text-white py-3">
        <div className="container mx-auto px-4 flex justify-center items-center">
          <div className="flex flex-wrap items-center gap-6 text-lg font-semibold justify-center">
            <span className="flex items-center">
              WhatsApp Us for queries
            </span>
            <span className="flex items-center">
              <MessageCircle size={18} className="mr-2" />
              <a href="tel:+917827229116" className="underline hover:text-green-200" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag) { (window as any).gtag('event', 'conversion', { 'send_to': 'AW-17730009010/0N2CCMvmudwbELLvqYZC' }); } }}>+91 7827229116</a>
            </span>
            <span className="flex items-center">
              <MessageCircle size={18} className="mr-2" />
              <a href="tel:+918178567520" className="underline hover:text-green-200">+91 8178567520</a>
            </span>
          </div>
        </div>
      </div>

      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
            <div className="flex flex-col">
              <span className="text-base md:text-lg text-black font-bold">Circle Pvt Ltd.</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/" className="font-semibold text-gray-700 hover:text-green-600 transition-colors">
              Home
            </Link>
            <Link href="/products" className="text-gray-700 hover:text-green-600 transition-colors">
              Products
            </Link>
            <Link href="/#contact" className="text-gray-700 hover:text-green-600 transition-colors" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) { (window as any).gtag_report_conversion(); } }}>
              Contact
            </Link>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                // Could link to a catalog or trigger a download; placeholder for now
                window.open('/', '_self');
              }}
            >
              <Download size={16} className="mr-2" />
              Brochure
            </Button>
          </div>

          <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t">
            <div className="flex flex-col space-y-4 pt-4">
              <Link href="/" className="text-left text-green-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <Link href="/products" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                Products
              </Link>
              <Link
                href="/#contact"
                className="text-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [product, setProduct] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageMeta = id ? PRODUCT_META[id] : undefined;

  // Carousel auto-scroll
  useEffect(() => {
    if (!product?.imageUrls?.length) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.imageUrls.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [product]);

  // Reset image index if product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="pt-40 text-center text-gray-500">Loading product...</div>;
  if (!product) return <div className="pt-40 text-center text-gray-500">Product not found.</div>;

  // Helper for images: use imageUrls if present, else fallback to imageUrl or image
  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : product.image
        ? [product.image]
        : [];

  // Helper for thumbnails: show up to 3, centered on current image if possible
  const getThumbnails = () => {
    if (images.length <= 3) return images;
    if (currentImageIndex === 0) return images.slice(0, 3);
    if (currentImageIndex === images.length - 1) return images.slice(-3);
    return images.slice(currentImageIndex - 1, currentImageIndex + 2);
  };
  const thumbnails = getThumbnails();

  return (
    <>
      {pageMeta && (
        <Head>
          <title>{pageMeta.title}</title>
          <meta name="description" content={pageMeta.description} />
        </Head>
      )}
    <div className="pt-32 min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/products">
            <Button variant="outline" className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent">
              <ChevronLeft className="mr-2" size={20} />
              Back to Products
            </Button>
          </Link>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="relative w-full flex flex-col items-center">
              {/* Main Image */}
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={images[currentImageIndex] || '/placeholder.svg'}
                  alt={product.name}
                  className="max-h-[400px] w-auto h-auto object-contain"
                  style={{ width: '100%', borderRadius: '1rem' }}
                />
                {/* Left/Right Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                      style={{ zIndex: 2 }}
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                      style={{ zIndex: 2 }}
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Next image"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              <div className="flex gap-2 mt-4 justify-center">
                {thumbnails.slice(0, 3).map((url: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(images.indexOf(url))}
                    className={`w-20 h-20 rounded-lg border-2 ${currentImageIndex === images.indexOf(url) ? 'border-green-600' : 'border-gray-200'}`}
                  >
                    <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
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
                    badge === 'Best Seller'
                      ? 'bg-red-500 hover:bg-red-600'
                      : badge === 'Eco-Friendly'
                      ? 'bg-green-500 hover:bg-green-600'
                      : badge === 'New Launch'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  } flex items-center gap-2 px-4 py-2 text-sm`}
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
                    className={`${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
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
                onClick={() => window.open(`https://wa.me/91${product.whatsappNumber || '7827229116'}?text=${encodeURIComponent('Hi, I am interested in this product: ' + product.name)}`, '_blank')}
              >
                <MessageCircle className="mr-2" size={20} />
                Get Quote on WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent flex-1"
                onClick={() => {
                  if (product.brochureUrl) {
                    window.open(product.brochureUrl, '_blank');
                  } else {
                    alert('Brochure download coming soon!');
                  }
                }}
              >
                <Download className="mr-2" size={20} />
                Download Brochure
              </Button>
            </div>
          </div>
        </div>
        {/* Features & Specs */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Features</h3>
              <div className="space-y-4">
                {product.features?.map((feature: string, index: number) => (
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
                {product.specifications?.map((spec: string, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">{spec.split(':')[0]}:</span>
                    <span className="font-semibold text-gray-800">{spec.split(':')[1]}</span>
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
            {product.applications?.map((application: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">{application}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Section */}
        {(product.badges || [product.badge]).length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Product Certifications & Features</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(product.badges || [product.badge]).map((badge: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {badgeLogoMap[badge] && (
                    <img 
                      src={badgeLogoMap[badge]} 
                      alt={badge + ' logo'} 
                      className="w-8 h-8 object-contain"
                    />
                  )}
                  <span className="text-gray-700 font-medium">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
} 