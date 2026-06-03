'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Star, CheckCircle, Play, Shield, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import { getLandingPage, type LandingPageDef } from '@/lib/seo/landing-pages';
import RFQForm from '@/components/forms/RFQForm';
import FAQSection from '@/components/FAQSection';

const badgeLogoMap: Record<string, string> = {
    'Korean Technology': '/Logos clipart 2/Korean Technology.png',
    'German Technology': '/Logos clipart 2/german technology.png',
    'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
    'GeM': '/Logos clipart 2/GeM logo.png',
    'GeM logo': '/Logos clipart 2/GeM logo.png',
    'Heavy Duty': '/Logos clipart 2/Heavy Duty.png',
    'Heavy duty': '/Logos clipart 2/Heavy Duty.png',
    'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
    'Ecofreidly': '/Logos clipart 2/Ecofreidly.png',
    'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

function getYouTubeId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

type ProductMeta = Pick<LandingPageDef, "content1" | "content2" | "content3">;

function SpecRow({ spec }: { spec: string }) {
    const colonIdx = spec.indexOf(':');
    if (colonIdx === -1) return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <CheckCircle size={14} className="text-brand-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">{spec}</span>
        </div>
    );
    const label = spec.slice(0, colonIdx).trim();
    const value = spec.slice(colonIdx + 1).trim();
    return (
        <div className="flex items-baseline gap-2 py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500 w-36 shrink-0 leading-relaxed">{label}</span>
            <span className="text-sm font-600 text-gray-900 leading-relaxed">{value}</span>
        </div>
    );
}

export default function ProductDetailPage() {
    const params = useParams();
    const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    const [product, setProduct] = useState<any>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isZoomed, setIsZoomed] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('center center');
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    const pageMeta: ProductMeta | undefined = slug ? getLandingPage(slug) : undefined;

    useEffect(() => {
        if (!product) return;
        const imgs: string[] = product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls
            : product.imageUrl ? [product.imageUrl] : product.image ? [product.image] : [];
        const hasVideo = Boolean(product.youtubeLink);
        const total = imgs.length + (hasVideo ? 1 : 0);
        if (total <= 1) return;
        const intervalTime = product.slideshowInterval || 3500;
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % total);
        }, intervalTime);
        return () => clearInterval(interval);
    }, [product]);

    useEffect(() => { setCurrentImageIndex(0); }, [product]);

    function decodeSlug(slug: string) {
        return slug.replace(/-/g, " ").replace(/\band\b/g, "&").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/admin/${decodeSlug(slug)}`)
            .then(res => res.json())
            .then(data => { setProduct(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center pt-20">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading product…</p>
            </div>
        </div>
    );
    if (!product) return <div className="pt-40 text-center text-gray-500">Product not found.</div>;

    const images: string[] = product.imageUrls && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl ? [product.imageUrl] : product.image ? [product.image] : [];

    const videoId = product.youtubeLink ? getYouTubeId(product.youtubeLink) : null;
    const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    type MediaItem = { kind: 'image'; url: string } | { kind: 'youtube'; videoId: string; thumb: string };
    const mediaItems: MediaItem[] = [
        ...images.map((url: string): MediaItem => ({ kind: 'image', url })),
        ...(videoId && ytThumb ? [{ kind: 'youtube' as const, videoId, thumb: ytThumb }] : []),
    ];

    const chapters: any[] = Array.isArray(product.filmChapters) ? product.filmChapters.filter((c: any) => c?.title) : [];
    const specs: string[] = Array.isArray(product.specifications) ? product.specifications : [];
    const features: string[] = Array.isArray(product.features) ? product.features : [];

    // Build structured FAQs from productFaqs
    const productFaqs: Array<{ q: string; a: string }> = (() => {
        const raw = product.productFaqs;
        if (!Array.isArray(raw) || raw.length === 0) return [];
        return raw
            .map((f: any) => {
                if (f && typeof f === 'object' && f.q) return { q: String(f.q), a: String(f.a || '') };
                if (typeof f === 'string') {
                    const sep = f.indexOf(' | A:');
                    if (sep !== -1) return { q: f.slice(0, sep).replace(/^Q:\s*/i, ''), a: f.slice(sep + 5) };
                    return { q: f.replace(/^Q:\s*/i, ''), a: '' };
                }
                return null;
            })
            .filter((f): f is { q: string; a: string } => f !== null && Boolean(f.q));
    })();

    const h1 = product.h1Title || product.name;

    return (
        <div className="min-h-screen bg-white">
            <MobileCtaOverride
                audience="product"
                productName={product?.name}
                whatsappMessage={product?.whatsappMessageText}
            />

            {/* ── Breadcrumb ── */}
            <div className="bg-gray-950 pt-20 pb-3">
                <div className="container mx-auto px-4">
                    <nav className="flex items-center gap-2 text-xs text-cinema-500" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-cinema-300 transition-colors">Products</Link>
                        <span>/</span>
                        <span className="text-cinema-300 truncate max-w-[180px] sm:max-w-none">{product?.name}</span>
                    </nav>
                </div>
            </div>

            {/* ── Hero: Gallery + Info ── */}
            <div className="bg-gray-950 pb-10">
                <div className="container mx-auto px-4 pt-6">
                    <Link href="/products" className="inline-flex items-center gap-1.5 text-cinema-400 hover:text-white font-500 text-xs mb-5 transition-colors">
                        <ChevronLeft size={14} />
                        Back to Products
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-start">
                        {/* Left: Gallery */}
                        <div className="flex flex-col">
                            {/* Main viewer */}
                            <div
                                className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-gray-900"
                                style={{ minHeight: 320 }}
                                onMouseMove={(e) => {
                                    if (mediaItems[currentImageIndex]?.kind !== 'image') return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setTransformOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
                                    setIsZoomed(true);
                                }}
                                onMouseLeave={() => setIsZoomed(false)}
                            >
                                {mediaItems[currentImageIndex]?.kind === 'youtube' ? (
                                    activeVideoId === (mediaItems[currentImageIndex] as any).videoId ? (
                                        <iframe
                                            src={`https://www.youtube.com/embed/${(mediaItems[currentImageIndex] as any).videoId}?autoplay=1&playsinline=1`}
                                            title="Product video"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full aspect-video rounded-2xl"
                                        />
                                    ) : (
                                        <button
                                            className="relative w-full aspect-video flex items-center justify-center group"
                                            onClick={() => setActiveVideoId((mediaItems[currentImageIndex] as any).videoId)}
                                            aria-label="Play video"
                                        >
                                            <img src={(mediaItems[currentImageIndex] as any).thumb} alt="Video thumbnail" className="w-full h-full object-cover rounded-2xl" draggable="false" />
                                            <div className="absolute inset-0 bg-black/40 rounded-2xl group-hover:bg-black/50 transition-colors" />
                                            <div className="absolute w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <Play size={28} className="text-white ml-1" fill="white" />
                                            </div>
                                        </button>
                                    )
                                ) : (
                                    <div className="relative w-full">
                                        <img
                                            src={(mediaItems[currentImageIndex] as any)?.url || '/placeholder.svg'}
                                            alt={product.name}
                                            className="max-h-[440px] w-full h-auto object-contain transition-transform duration-200 ease-out block"
                                            style={{ transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin }}
                                            draggable="false"
                                            onContextMenu={(e) => e.preventDefault()}
                                        />
                                    </div>
                                )}
                                {mediaItems.length > 1 && (
                                    <>
                                        <button
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 shadow border border-white/10 text-white transition-colors"
                                            style={{ zIndex: 2 }}
                                            onClick={() => { setCurrentImageIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length); setActiveVideoId(null); }}
                                            aria-label="Previous"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 shadow border border-white/10 text-white transition-colors"
                                            style={{ zIndex: 2 }}
                                            onClick={() => { setCurrentImageIndex((prev) => (prev + 1) % mediaItems.length); setActiveVideoId(null); }}
                                            aria-label="Next"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </>
                                )}
                                {/* Dot indicators */}
                                {mediaItems.length > 1 && (
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5" style={{ zIndex: 2 }}>
                                        {mediaItems.map((_, i) => (
                                            <button key={i} onClick={() => { setCurrentImageIndex(i); setActiveVideoId(null); }} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`} aria-label={`Image ${i + 1}`} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {mediaItems.length > 1 && (
                                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                                    {mediaItems.slice(0, 5).map((item, idx) => {
                                        const isActive = currentImageIndex === idx;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => { setCurrentImageIndex(idx); setActiveVideoId(null); }}
                                                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 overflow-hidden transition-all ${isActive ? 'border-brand-500 shadow-md' : 'border-white/10 hover:border-white/30'}`}
                                            >
                                                {item.kind === 'youtube' ? (
                                                    <>
                                                        <img src={item.thumb} alt="Video" className="w-full h-full object-cover" draggable="false" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Play size={14} className="text-white" fill="white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img src={item.url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" draggable="false" onContextMenu={(e) => e.preventDefault()} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right: Product info + inline specs */}
                        <div className="text-white">
                            {/* Badges */}
                            {(product.badges || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(product.badges as string[]).map((badge, index) => (
                                        <span key={index} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-600 ${badge === 'Best Seller' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : badge === 'GeM' || badge === 'GeM logo' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'}`}>
                                            {badgeLogoMap[badge] && <img src={badgeLogoMap[badge]} alt="" className="w-4 h-4 object-contain" />}
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* H1 */}
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-800 text-white mb-3 leading-tight">
                                {h1}
                            </h1>

                            {/* Tagline */}
                            {product.tagline && (
                                <p className="text-base text-cinema-400 mb-4 leading-relaxed italic">{product.tagline}</p>
                            )}

                            {/* Rating */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                                    ))}
                                </div>
                                <span className="text-sm font-600 text-white">{product.rating}</span>
                                <span className="text-sm text-cinema-400">({product.reviewsCount} reviews)</span>
                            </div>

                            {/* Price */}
                            {product.priceRange && (
                                <div className="text-2xl font-800 text-brand-400 mb-5">{product.priceRange}</div>
                            )}

                            {/* Short description */}
                            <div className="text-sm text-cinema-300 mb-6 leading-relaxed">
                                <RichContent html={product.detailedDescription || ''} />
                            </div>

                            {/* CTA buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                                <button
                                    className="inline-flex items-center justify-center gap-2 flex-1 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-600 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm"
                                    onClick={() => window.open(`https://wa.me/917827229116?text=${encodeURIComponent('Hi, I am interested in: ' + product.name + '. Please share pricing.')}`, '_blank')}
                                >
                                    <MessageCircle size={16} />
                                    Get Quote on WhatsApp
                                </button>
                                <a
                                    href="#rfq"
                                    className="inline-flex items-center justify-center gap-2 flex-1 px-6 py-3.5 border border-white/20 text-white hover:bg-white/10 font-500 rounded-full transition-all text-sm"
                                >
                                    <Download size={16} />
                                    Request a Quote
                                </a>
                            </div>

                            {/* ── Inline Specifications ── */}
                            {specs.length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-xs font-700 text-cinema-400 uppercase tracking-widest mb-3">Key Specifications</h3>
                                    <div className="divide-y divide-white/8">
                                        {specs.slice(0, 8).map((spec, i) => {
                                            const colonIdx = spec.indexOf(':');
                                            if (colonIdx === -1) return (
                                                <div key={i} className="flex items-start gap-2 py-2">
                                                    <CheckCircle size={12} className="text-brand-400 mt-0.5 shrink-0" />
                                                    <span className="text-xs text-cinema-300">{spec}</span>
                                                </div>
                                            );
                                            return (
                                                <div key={i} className="flex items-baseline gap-3 py-2">
                                                    <span className="text-[11px] text-cinema-500 w-32 shrink-0">{spec.slice(0, colonIdx).trim()}</span>
                                                    <span className="text-xs font-600 text-white">{spec.slice(colonIdx + 1).trim()}</span>
                                                </div>
                                            );
                                        })}
                                        {specs.length > 8 && (
                                            <div className="pt-2">
                                                <span className="text-[11px] text-cinema-500">+ {specs.length - 8} more specifications below</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main content (white background) ── */}
            <div className="bg-white">
                <div className="container mx-auto px-4 py-12">

                    {/* ── Optional landing page content 1 ── */}
                    {pageMeta?.content1 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content1.h2}</h2>
                            <div className="space-y-3">
                                {pageMeta.content1.p.map((paragraph, index) => (
                                    <p key={index} className="text-base text-gray-700 leading-relaxed">{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Features & Full Specs ── */}
                    <div className="grid md:grid-cols-2 gap-10 mb-14">
                        {/* Features */}
                        {features.length > 0 && (
                            <div>
                                <h2 className="text-xl font-700 text-gray-900 mb-5">Key Features</h2>
                                <div className="space-y-3">
                                    {features.map((feature, index) => (
                                        <div key={index} className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                                            <CheckCircle className="text-brand-600 mt-0.5 shrink-0" size={18} />
                                            <span className="text-sm text-gray-800 leading-relaxed">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Full Specifications */}
                        {specs.length > 0 && (
                            <div>
                                <h2 className="text-xl font-700 text-gray-900 mb-5">Technical Specifications</h2>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-2">
                                    {specs.map((spec, index) => (
                                        <SpecRow key={index} spec={spec} />
                                    ))}
                                    {product.youtubeLink && (
                                        <div className="flex items-baseline gap-2 py-2.5 border-t border-gray-100 mt-1">
                                            <span className="text-xs text-gray-500 w-36 shrink-0">Demo Video</span>
                                            <a href={product.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-sm font-600 text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                                                Watch on YouTube →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Film Chapters / Storytelling ── */}
                    {chapters.length > 0 && (
                        <div className="mb-14">
                            <div className="text-center mb-10">
                                <p className="eyebrow text-brand-600 mb-2 text-xs font-700 uppercase tracking-widest">Product Story</p>
                                <h2 className="text-2xl md:text-3xl font-700 text-gray-900">Engineering Behind the Machine</h2>
                            </div>
                            <div className="space-y-16">
                                {chapters.map((chapter, i) => {
                                    const isEven = i % 2 === 0;
                                    const youtubeId = chapter.videoUrl ? getYouTubeId(chapter.videoUrl) : null;
                                    return (
                                        <div key={i} className={`grid md:grid-cols-2 gap-10 items-center ${isEven ? '' : 'md:[&>*:first-child]:order-2'}`}>
                                            {/* Media */}
                                            <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
                                                {youtubeId ? (
                                                    <iframe
                                                        src={`https://www.youtube.com/embed/${youtubeId}`}
                                                        title={chapter.title}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                        className="w-full h-full"
                                                    />
                                                ) : chapter.imageUrl ? (
                                                    <img src={chapter.imageUrl} alt={chapter.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                                        <span className="text-3xl font-800 text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Text */}
                                            <div className="space-y-4">
                                                <div className="inline-block text-xs font-700 text-brand-600 uppercase tracking-widest px-3 py-1 bg-brand-50 rounded-full border border-brand-100">
                                                    {String(i + 1).padStart(2, '0')}
                                                </div>
                                                <h3 className="text-xl md:text-2xl font-700 text-gray-900 leading-snug">{chapter.title}</h3>
                                                {chapter.subtitle && <p className="text-base font-500 text-brand-600">{chapter.subtitle}</p>}
                                                {chapter.description && <p className="text-base text-gray-600 leading-relaxed">{chapter.description}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Applications ── */}
                    {(product.applications || []).length > 0 && (
                        <div className="mb-14">
                            <h2 className="text-2xl font-700 text-gray-900 mb-6">Applications</h2>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(product.applications as string[]).map((application, index) => (
                                    <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                        <span className="text-sm text-gray-700 leading-relaxed">{application}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pageMeta?.content2 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content2.h2}</h2>
                            <div className="space-y-3">
                                {pageMeta.content2.p.map((paragraph, index) => (
                                    <p key={index} className="text-base text-gray-700 leading-relaxed">{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Warranty ── */}
                    {product.warrantyEnabled && (
                        <div className="mb-14">
                            <div className="bg-gradient-to-br from-green-50 to-brand-50 rounded-2xl border border-green-200 p-8 flex items-start gap-6">
                                <div className="shrink-0 w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl shadow-md">
                                    {product.warrantyIcon || <Shield size={28} className="text-white" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-700 text-gray-900 mb-1">
                                        {product.warrantyPeriod ? `${product.warrantyPeriod} Warranty` : 'Manufacturer Warranty'}
                                    </h3>
                                    {product.warrantyDescription && (
                                        <p className="text-base text-gray-600 leading-relaxed mt-2">{product.warrantyDescription}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {pageMeta?.content3 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content3.h2}</h2>
                            <div className="space-y-3">
                                {pageMeta.content3.p.map((paragraph, index) => (
                                    <p key={index} className="text-base text-gray-700 leading-relaxed">{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── RFQ Form ── */}
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100 p-6 md:p-10 mb-14" id="rfq">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl md:text-3xl font-700 text-gray-900 mb-2">
                                    Request a Quote for {product.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Tender, GeM, dealer &amp; bulk inquiries — response within 48 hours.
                                </p>
                            </div>
                            <RFQForm
                                variant="card"
                                defaultProduct="Custom Requirement"
                                defaultDescription={`Inquiring about: ${product.name}`}
                                location={`product_landing_${slug ?? "unknown"}`}
                            />
                        </div>
                    </div>

                    {/* ── Badges / Certifications ── */}
                    {(product.badges || []).length > 0 && (
                        <div className="mb-14">
                            <h2 className="text-2xl font-700 text-gray-900 mb-6">Product Certifications</h2>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {(product.badges as string[]).map((badge, index) => (
                                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        {badgeLogoMap[badge] ? (
                                            <img src={badgeLogoMap[badge]} alt={badge} className="w-10 h-10 object-contain shrink-0" />
                                        ) : (
                                            <CheckCircle size={20} className="text-brand-600 shrink-0" />
                                        )}
                                        <span className="text-sm font-500 text-gray-800">{badge}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── FAQs ── */}
                    <FAQSection faqs={productFaqs.length > 0 ? productFaqs : undefined} />
                </div>
            </div>
        </div>
    );
}
