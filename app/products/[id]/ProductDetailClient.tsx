'use client';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Play, CheckCircle2, ArrowRight, Star, Zap, Wrench, FileText, ShieldCheck, Info, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import RFQForm from '@/components/forms/RFQForm';
import BrochureLeadModal from '@/components/BrochureLeadModal';
import ScrollReveal from '@/components/cinematic/ScrollReveal';
import PremiumAccordion from '@/components/cinematic/PremiumAccordion';
import ShareButtons from '@/components/cinematic/ShareButtons';
import WhatsInTheBox from '@/components/cinematic/WhatsInTheBox';
import RealWorldDeployments from '@/components/cinematic/RealWorldDeployments';
import SpecificationsTable from '@/components/cinematic/SpecificationsTable';
import { BUSINESS, SITE_URL } from '@/lib/seo/site-config';

const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  GeM: '/Logos clipart 2/GeM logo.png',
  'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy Duty.png',
  'Heavy duty': '/Logos clipart 2/Heavy Duty.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
  Ecofreidly: '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/* ─── Image Gallery ──────────────────────────────────────────── */
function ProductGallery({ images, videoId, productName }: { images: string[]; videoId: string | null; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');

  type MediaItem = { kind: 'image'; url: string } | { kind: 'youtube'; videoId: string; thumb: string };
  const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const mediaItems: MediaItem[] = [
    ...images.map((url: string): MediaItem => ({ kind: 'image', url })),
    ...(videoId && ytThumb ? [{ kind: 'youtube' as const, videoId, thumb: ytThumb }] : []),
  ];
  const total = mediaItems.length;
  const current = mediaItems[activeIndex];

  const prev = () => { setActiveIndex((p) => (p - 1 + total) % total); setVideoPlaying(false); };
  const next = () => { setActiveIndex((p) => (p + 1) % total); setVideoPlaying(false); };

  return (
    <div className="flex flex-col gap-4">
      {/* Main viewer */}
      <div
        className="relative rounded-2xl overflow-hidden bg-cinema-800 border border-white/8"
        style={{ aspectRatio: '4/3' }}
        onMouseMove={(e) => {
          if (current?.kind !== 'image') return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setTransformOrigin(`${x}% ${y}%`);
          setIsZoomed(true);
        }}
        onMouseLeave={() => setIsZoomed(false)}
      >
        {current?.kind === 'youtube' ? (
          videoPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&playsinline=1&rel=0`}
              title="Product video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button
              className="absolute inset-0 w-full h-full flex items-center justify-center group"
              onClick={() => setVideoPlaying(true)}
              aria-label="Play product video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.thumb} alt="Video thumbnail" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={24} className="text-white ml-1" fill="white" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs font-500">Watch Product Demo</p>
            </button>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(current as any)?.url || '/placeholder.svg'}
            alt={productName}
            className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-200"
            style={{ transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin }}
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
        {/* Arrows */}
        {total > 1 && (
          <>
            <button onClick={prev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-105 border border-white/10">
              <ChevronLeft size={18} />
            </button>
            <button onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all hover:scale-105 border border-white/10">
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {/* Index dots */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {mediaItems.map((_, i) => (
              <button key={i} onClick={() => { setActiveIndex(i); setVideoPlaying(false); }} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-5 bg-brand-500' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="flex gap-2 flex-wrap">
          {mediaItems.slice(0, 6).map((item, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setVideoPlaying(false); }}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activeIndex ? 'border-brand-500 shadow-md shadow-brand-900/30' : 'border-white/10 hover:border-white/30'}`}
            >
              {item.kind === 'youtube' ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt="Video" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play size={10} className="text-white" fill="white" />
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="w-full h-full object-contain p-1 bg-cinema-800" draggable="false" onContextMenu={(e) => e.preventDefault()} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Feature Spotlight ──────────────────────────────────────── */
function FeatureSpotlight({ features }: { features: string[] }) {
  const [active, setActive] = useState(0);
  if (!features?.length) return null;
  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Tab list */}
      <div className="md:col-span-2 space-y-1">
        {features.map((feat, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`feature-tab w-full text-left px-4 py-3 rounded-lg transition-all ${i === active ? 'active bg-brand-50 border-l-brand-600' : ''}`}
          >
            <span className={`text-sm font-500 ${i === active ? 'text-brand-700' : 'text-gray-600'}`}>
              {feat.split(':')[0] || feat}
            </span>
          </button>
        ))}
      </div>
      {/* Active content */}
      <div className="md:col-span-3 bg-brand-50 rounded-2xl p-6 flex flex-col justify-center min-h-[140px]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <div>
            <p className="font-600 text-gray-900 mb-1">{features[active].split(':')[0]}</p>
            {features[active].includes(':') && (
              <p className="text-gray-600 text-sm leading-relaxed">{features[active].split(':').slice(1).join(':').trim()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Compatible Spare Parts ────────────────────────────────── */
function CompatibleSpareParts({ productId, productName }: { productId: string; productName: string }) {
  const [parts, setParts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/spare-parts?product=${productId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setParts(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [productId]);

  if (!loaded || parts.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow text-brand-600 mb-3">OEM Spare Parts</p>
              <h2 className="text-display-xs text-gray-900">Compatible spare parts.</h2>
              <p className="text-gray-500 text-sm mt-2">Genuine parts for the {productName} — shipped pan-India.</p>
            </div>
            <Link href="/spare-parts" className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-600 text-sm transition-colors shrink-0">
              View all parts <ArrowRight size={14} />
            </Link>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {parts.slice(0, 8).map((part, i) => (
            <ScrollReveal key={part._id} animation="fade-up" delay={i * 60}>
              <Link
                href={(() => {
                  const pName = part.compatibleProductNames?.[0];
                  if (pName) {
                    const pSlug = pName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return `/spare-parts/${pSlug}/${part.slug}`;
                  }
                  return `/spare-parts/${part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts'}/${part.slug}`;
                })()}
                className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all duration-300"
              >
                {part.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={part.images[0]}
                    alt={part.name}
                    className="w-full aspect-[4/3] object-contain bg-gray-50 p-4 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center">
                    <Wrench size={28} className="text-gray-200" />
                  </div>
                )}
                <div className="p-4">
                  {part.sku && <p className="text-[10px] font-600 text-brand-600 uppercase tracking-wide mb-1">{part.sku}</p>}
                  <h3 className="font-600 text-gray-900 text-sm leading-snug mb-2 group-hover:text-brand-700 transition-colors">{part.name}</h3>
                  {part.priceRange && <p className="text-sm font-700 text-brand-600 mb-3">{part.priceRange}</p>}
                  <div className="flex items-center gap-1 text-brand-600 text-xs font-500 group-hover:gap-2 transition-all">
                    View Part <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Related Products ──────────────────────────────────────── */
function RelatedProducts({ currentId, category }: { currentId: string; category: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data: any[]) => {
        const related = data
          .filter((p) => p._id !== currentId && (p.category === category || !category))
          .slice(0, 3);
        setProducts(related);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [currentId, category]);

  if (!loaded || products.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-10">
          <p className="eyebrow text-brand-600 mb-3">You may also like</p>
          <h2 className="text-2xl font-700 text-gray-900">Related products.</h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => {
            const imgSrc = p.imageUrls?.[0] || p.imageUrl || '/placeholder.svg';
            const id = p._id;
            return (
              <ScrollReveal key={id} animation="fade-up" delay={i * 80}>
                <Link href={`/products/${id}`} className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc} alt={p.name} className="w-full aspect-[4/3] object-contain bg-gray-50 p-4 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="p-5">
                    {p.category && <p className="eyebrow text-brand-600 mb-1">{p.category}</p>}
                    <h3 className="font-600 text-gray-900 leading-snug mb-3 group-hover:text-brand-700 transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1.5 text-brand-600 text-sm font-500 group-hover:gap-2.5 transition-all">
                      View Product <ArrowRight size={13} />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function ProductDetailClient({ productId }: { productId: string }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [brochureModalOpen, setBrochureModalOpen] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then((res) => res.json())
      .then((data) => { setProduct(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading product…</p>
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="pt-32 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-700 text-gray-800 mb-2">Product not found</p>
          <Link href="/products" className="text-brand-600 hover:underline text-sm">← Back to products</Link>
        </div>
      </div>
    );
  }

  const images: string[] = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  const videoId = product.heroVideoUrl
    ? getYouTubeId(product.heroVideoUrl)
    : product.youtubeLink
    ? getYouTubeId(product.youtubeLink)
    : null;
  const features: string[] = product.features || [];
  const specs: string[] = product.specifications || [];
  const applications: string[] = product.applications || [];
  const badges: string[] = product.badges || [];
  const certifications: string[] = product.certifications || [];
  const performanceMetrics: string[] = product.performanceMetrics || [];

  const parsedMetrics = performanceMetrics.map((m: string) => {
    const parts = m.split("|").map((p: string) => p.trim());
    return { value: parts[0] || "", label: parts[1] || "", description: parts[2] || "" };
  });
  const waText = product.whatsappMessageText || `Hi, I'm interested in ${product.name}. Please share pricing and availability.`;
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`;
  const shareUrl = `${SITE_URL}/products/${productId}`;

  /* Build accordion items */
  const accordionItems = [
    specs.length > 0 && {
      id: 'specs',
      label: 'Technical Specifications',
      icon: <Info size={14} />,
      children: (
        <div className="divide-y divide-gray-50">
          {specs.map((spec, i) => {
            const [label, ...rest] = spec.split(':');
            const value = rest.join(':').trim();
            return (
              <div key={i} className="flex items-center justify-between py-2.5 gap-4">
                <span className="text-gray-500 text-sm">{label.trim()}</span>
                <span className="text-gray-900 font-600 text-sm text-right">{value || spec}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    certifications.length > 0 && {
      id: 'certifications',
      label: 'Certifications & Approvals',
      icon: <ShieldCheck size={14} />,
      children: (
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 font-600 text-sm">
              <CheckCircle2 size={12} className="text-brand-600" />
              {cert}
            </span>
          ))}
          {badges.filter((b) => !badgeLogoMap[b]).map((badge, i) => (
            <span key={`b-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-600 text-sm">{badge}</span>
          ))}
        </div>
      ),
    },
    product.brochureUrl && {
      id: 'downloads',
      label: 'Downloads & Brochures',
      icon: <FileText size={14} />,
      children: (
        <div className="space-y-2">
          <button
            onClick={() => setBrochureModalOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-600 text-sm transition-colors"
          >
            <Download size={15} className="shrink-0" />
            <span>Product Brochure — {product.name}</span>
            <ArrowRight size={13} className="ml-auto" />
          </button>
        </div>
      ),
    },
    {
      id: 'warranty',
      label: 'Warranty & Service',
      icon: <ShieldCheck size={14} />,
      children: (
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-600 mt-0.5 shrink-0" />
            <p><strong className="text-gray-800">1-Year Comprehensive Warranty</strong> — covers manufacturing defects and component failures under normal usage conditions.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-600 mt-0.5 shrink-0" />
            <p><strong className="text-gray-800">Spare Parts Availability</strong> — guaranteed for 5+ years from date of purchase. All parts are OEM-sourced from the same production line.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-600 mt-0.5 shrink-0" />
            <p><strong className="text-gray-800">Pan-India Service Network</strong> — technical support available across all major states. On-site assistance arranged within 48–72 hours.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-600 mt-0.5 shrink-0" />
            <p><strong className="text-gray-800">AMC Available</strong> — Annual Maintenance Contracts available for government departments and bulk buyers.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      label: 'Frequently Asked Questions',
      icon: <HelpCircle size={14} />,
      children: (
        <div className="space-y-4">
          {[
            { q: 'What fuel does this machine use?', a: 'The machine operates on regular petroleum/kerosene-based fogging oil. We recommend using certified fogging chemicals for best results and to maintain warranty validity.' },
            { q: 'Is this machine suitable for government tenders?', a: 'Yes. 100X Circle is GeM-registered and our machines meet government procurement standards. We have supplied to municipal corporations, health departments, and agriculture boards across India.' },
            { q: 'What is the delivery timeline?', a: 'Standard delivery is 5–7 working days across India. Bulk orders and government tenders may require 10–15 days. Contact us for urgent requirements.' },
            { q: 'Do you provide operator training?', a: 'Yes, we provide complimentary operator training on purchase. For large orders, on-site training can be arranged. Video training materials are also available.' },
            { q: 'Can I get a demo before purchasing?', a: 'Yes. Product demonstrations can be arranged at our Gurugram facility or at your location for bulk inquiries. Contact us to schedule.' },
          ].map((item, i) => (
            <div key={i} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
              <p className="font-600 text-gray-800 text-sm mb-1.5">{item.q}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      ),
    },
  ].filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-white">
      <MobileCtaOverride audience="product" productName={product.name} whatsappMessage={product.whatsappMessageText} />
      <BrochureLeadModal open={brochureModalOpen} onClose={() => setBrochureModalOpen(false)} source="product-detail" brochureUrl={product.brochureUrl} productName={product.name} />

      {/* ── 1. HERO SECTION ──────────────────────────────────────── */}
      <section className="relative pt-20 pb-0 bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-600/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-600/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 md:px-6 pt-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-cinema-300 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-cinema-300">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center pb-16">
            {/* Left: Product image */}
            <ScrollReveal animation="fade-right" className="order-2 lg:order-1">
              {images.length > 0 || videoId ? (
                <ProductGallery images={images} videoId={videoId} productName={product.name} />
              ) : (
                <div className="aspect-[4/3] rounded-2xl bg-cinema-800 flex items-center justify-center">
                  <p className="text-cinema-500 text-sm">No image available</p>
                </div>
              )}
            </ScrollReveal>

            {/* Right: Product info */}
            <div className="order-1 lg:order-2">
              {/* Badges */}
              {badges.length > 0 && (
                <ScrollReveal animation="fade-left">
                  <div className="flex flex-wrap gap-2 mb-5">
                    {badges.map((badge, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">
                        {badgeLogoMap[badge] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={badgeLogoMap[badge]} alt="" className="w-4 h-4 object-contain" />
                        )}
                        {badge}
                      </span>
                    ))}
                  </div>
                </ScrollReveal>
              )}

              <ScrollReveal animation="fade-left" delay={60}>
                {product.category && <p className="eyebrow text-brand-400 mb-3">{product.category}</p>}
              </ScrollReveal>

              <ScrollReveal animation="fade-left" delay={100}>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-800 text-white leading-tight mb-2 text-balance">
                  {product.name}
                </h1>
                {product.tagline && (
                  <p className="text-brand-400 text-lg font-500 mb-4">{product.tagline}</p>
                )}
              </ScrollReveal>

              {/* Rating */}
              {product.rating && (
                <ScrollReveal animation="fade-left" delay={140}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} className={s <= Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-600 fill-cinema-600'} />
                      ))}
                    </div>
                    <span className="text-cinema-300 text-sm">{product.rating} ({product.reviewsCount || 0} reviews)</span>
                  </div>
                </ScrollReveal>
              )}

              {/* Price */}
              {product.priceRange && (
                <ScrollReveal animation="fade-left" delay={160}>
                  <div className="text-2xl font-800 text-brand-400 mb-5">{product.priceRange}</div>
                </ScrollReveal>
              )}

              {/* Short description */}
              <ScrollReveal animation="fade-left" delay={200}>
                <div className="text-cinema-300 leading-relaxed mb-8 text-base">
                  <RichContent html={product.shortDescription || product.detailedDescription || ''} />
                </div>
              </ScrollReveal>

              {/* CTAs */}
              <ScrollReveal animation="fade-left" delay={260}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm"
                  >
                    <MessageCircle size={16} /> Get Quote on WhatsApp
                  </a>
                  <button
                    onClick={() => setBrochureModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-white/20 hover:border-white/40 text-white font-500 rounded-full transition-all hover:bg-white/5 text-sm"
                  >
                    <Download size={15} /> Download Brochure
                  </button>
                </div>
              </ScrollReveal>

              {/* Quick feature bullets */}
              {features.slice(0, 3).length > 0 && (
                <ScrollReveal animation="fade-left" delay={320}>
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
                    {features.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-cinema-300 text-sm">
                        <CheckCircle2 size={13} className="text-brand-500 flex-shrink-0" />
                        <span>{f.split(':')[0]}</span>
                      </div>
                    ))}
                  </div>
                </ScrollReveal>
              )}

              {/* Share buttons */}
              <ScrollReveal animation="fade-left" delay={380}>
                <div className="mt-6 pt-5 border-t border-white/8">
                  <ShareButtons url={shareUrl} title={`${product.name} — 100X Circle`} variant="dark" />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PRODUCT FILM SECTION (YouTube video) ──────────────── */}
      {videoId && (
        <section className="bg-cinema-900 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up" className="text-center mb-10">
              <p className="eyebrow text-brand-400 mb-3">Product Film</p>
              <h2 className="text-2xl md:text-3xl font-700 text-white">{product.name} — in action</h2>
            </ScrollReveal>
            <ScrollReveal animation="scale">
              <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={`${product.name} product video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── 3. FEATURES SPOTLIGHT ────────────────────────────────── */}
      {features.length > 0 && (
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up" className="mb-12">
              <p className="eyebrow text-brand-600 mb-3">Engineering Excellence</p>
              <h2 className="text-display-sm text-gray-900 mb-4 text-balance max-w-2xl">
                Every feature designed with purpose.
              </h2>
              <p className="text-gray-500 max-w-xl">
                Each capability of the {product.name} was engineered to solve a real operational problem — not to fill a spec sheet.
              </p>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={150}>
              <FeatureSpotlight features={features} />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── 3b. PROBLEM / SOLUTION NARRATIVE ────────────────────── */}
      {(product.problem || product.solution) && (
        <section className="py-20 md:py-24 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16">
              {product.problem && (
                <ScrollReveal animation="fade-right">
                  <div className="glass-card rounded-2xl p-8">
                    <p className="eyebrow text-red-400 mb-4">The Challenge</p>
                    <h3 className="text-xl font-700 text-white mb-4">The problem.</h3>
                    <p className="text-cinema-300 leading-relaxed">{product.problem}</p>
                  </div>
                </ScrollReveal>
              )}
              {product.solution && (
                <ScrollReveal animation="fade-left" delay={100}>
                  <div className="glass-card rounded-2xl p-8 border-brand-600/20">
                    <p className="eyebrow text-brand-400 mb-4">The Solution</p>
                    <h3 className="text-xl font-700 text-white mb-4">Why {product.name}.</h3>
                    <p className="text-cinema-300 leading-relaxed">{product.solution}</p>
                  </div>
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. PERFORMANCE METRICS ──────────────────────────────── */}
      {parsedMetrics.length > 0 && (
        <section className="py-20 md:py-24 bg-cinema-900">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up" className="text-center mb-14">
              <p className="eyebrow text-brand-400 mb-3">Performance</p>
              <h2 className="text-display-xs text-white">By the numbers.</h2>
            </ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
              {parsedMetrics.map((metric, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 80} className="text-center">
                  <div className="metric-value text-white">{metric.value}</div>
                  <p className="mt-2 eyebrow text-brand-400">{metric.label}</p>
                  {metric.description && <p className="text-cinema-500 text-xs mt-1">{metric.description}</p>}
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. APPLICATIONS ──────────────────────────────────────── */}
      {applications.length > 0 && (
        <section className="py-20 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up" className="mb-12">
              <p className="eyebrow text-brand-600 mb-3">Where It Works</p>
              <h2 className="text-display-xs text-gray-900 text-balance max-w-xl">
                Deployed wherever performance matters.
              </h2>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((app, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 60}>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <Zap size={14} className="text-brand-700" />
                    </div>
                    <span className="text-gray-700 text-sm font-500">{app}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. CERTIFICATIONS STRIP ──────────────────────────────── */}
      {(certifications.length > 0 || badges.length > 0) && (
        <section className="py-16 bg-white border-y border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up" className="text-center mb-10">
              <p className="eyebrow text-brand-600 mb-2">Certified & Approved</p>
              <h2 className="text-2xl font-700 text-gray-900">Backed by verified credentials.</h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                {certifications.map((cert, i) => (
                  <div key={`cert-${i}`} className="flex flex-col items-center gap-2">
                    <div className="h-12 px-5 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                      <span className="text-brand-700 font-600 text-sm">{cert}</span>
                    </div>
                  </div>
                ))}
                {badges.map((badge, i) => (
                  <div key={`badge-${i}`} className="flex flex-col items-center gap-2">
                    {badgeLogoMap[badge] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={badgeLogoMap[badge]} alt={badge} className="h-12 w-auto object-contain" />
                    ) : (
                      <div className="h-12 px-4 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                        <span className="text-brand-700 font-600 text-sm">{badge}</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500">{badge}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── 7. WHAT'S IN THE BOX ─────────────────────────────────── */}
      {product.boxContents?.length > 0 && (
        <WhatsInTheBox items={product.boxContents} productName={product.name} />
      )}

      {/* ── 8. REDESIGNED SPECIFICATIONS ─────────────────────────── */}
      <SpecificationsTable specs={specs} />

      {/* ── 9. PRODUCT INFO ACCORDION (Downloads / FAQs / Warranty) ─ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <ScrollReveal animation="fade-up" className="mb-10">
            <p className="eyebrow text-brand-600 mb-3">Product Information</p>
            <h2 className="text-display-xs text-gray-900">Everything you need to know.</h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={100}>
            <PremiumAccordion
              items={accordionItems.filter(a => a.id !== 'specs')}
              defaultOpen="warranty"
              variant="light"
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ── 10. DETAILED DESCRIPTION ─────────────────────────────── */}
      {product.detailedDescription && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <ScrollReveal animation="fade-up">
              <p className="eyebrow text-brand-600 mb-3">Product Details</p>
              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
                <RichContent html={product.detailedDescription} />
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── 11. COMPATIBLE SPARE PARTS ───────────────────────────── */}
      <CompatibleSpareParts productId={productId} productName={product.name} />

      {/* ── 12. REAL WORLD DEPLOYMENTS (Case Studies) ────────────── */}
      <RealWorldDeployments productId={productId} productName={product.name} />

      {/* ── 13. RFQ SECTION ──────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-gray-950" id="rfq">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left: persuasion copy */}
            <div>
              <ScrollReveal animation="fade-right">
                <p className="eyebrow text-brand-400 mb-5">Get a Quote</p>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={80}>
                <h2 className="text-display-sm text-white mb-6 text-balance">
                  Request a quote for<br />{product.name}.
                </h2>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={160}>
                <p className="text-cinema-300 text-lg mb-8 leading-relaxed">
                  Tender, GeM, dealer, and bulk inquiries welcome. Our team responds within 24 hours.
                </p>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={240}>
                <div className="space-y-4">
                  {[
                    'Competitive OEM pricing',
                    'GeM-registered for government procurement',
                    'Pan-India delivery and installation',
                    'Spare parts guaranteed for 5+ years',
                    'Post-sale technical support included',
                  ].map((point, i) => (
                    <div key={i} className="flex items-center gap-3 text-cinema-300">
                      <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />
                      <span className="text-sm">{point}</span>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-right" delay={320}>
                <div className="mt-10 pt-8 border-t border-white/10">
                  <p className="text-cinema-400 text-sm mb-3">Or reach us directly</p>
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm">
                    <MessageCircle size={16} /> WhatsApp Now
                  </a>
                </div>
              </ScrollReveal>
            </div>

            {/* Right: RFQ form */}
            <ScrollReveal animation="fade-left" delay={100}>
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
                <RFQForm
                  variant="card"
                  defaultProduct={product.name}
                  defaultDescription={`Inquiring about: ${product.name}`}
                  location={`product_detail_${productId}`}
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── 14. RELATED PRODUCTS ─────────────────────────────────── */}
      <RelatedProducts currentId={productId} category={product.category || ''} />

      {/* ── 15. BACK TO PRODUCTS ─────────────────────────────────── */}
      <div className="py-8 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/products" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-500 text-sm transition-colors group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to all products
          </Link>
        </div>
      </div>
    </div>
  );
}
