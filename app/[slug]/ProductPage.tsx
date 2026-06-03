'use client';
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, MessageCircle, Star, CheckCircle, Play, Shield } from 'lucide-react';
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
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

// Safe string coercion — never returns non-string even for objects
function safeStr(val: unknown): string {
    if (typeof val === 'string') return val;
    if (val == null) return '';
    return String(val);
}

// Safe string array — handles strings, arrays, objects with {name,value}
function safeStrArray(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                const o = item as Record<string, unknown>;
                if (typeof o.name === 'string' && typeof o.value === 'string') return `${o.name}: ${o.value}`;
                if (typeof o.item === 'string') return o.item; // boxContents-style
                return JSON.stringify(item);
            }
            return String(item);
        }).filter(Boolean);
    }
    if (typeof val === 'string') return val.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return [];
}

function SpecRow({ spec }: { spec: string }) {
    const s = safeStr(spec);
    const colonIdx = s.indexOf(':');
    if (colonIdx === -1) return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <CheckCircle size={13} className="text-brand-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">{s}</span>
        </div>
    );
    const label = s.slice(0, colonIdx).trim();
    const value = s.slice(colonIdx + 1).trim();
    return (
        <div className="flex items-baseline gap-2 py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500 w-40 shrink-0 leading-relaxed">{label}</span>
            <span className="text-sm font-600 text-gray-900 leading-relaxed">{value}</span>
        </div>
    );
}

type ProductMeta = Pick<LandingPageDef, "content1" | "content2" | "content3">;

interface Props {
    product: Record<string, unknown>;
    slug: string;
}

export default function ProductDetailPage({ product, slug }: Props) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('center center');
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    const pageMeta: ProductMeta | undefined = getLandingPage(slug);

    // Safe field reads — all normalized server-side but belt-and-suspenders here too
    const images = safeStrArray(product.imageUrls).filter(u => u.startsWith('http') || u.startsWith('/'));
    const specs = safeStrArray(product.specifications);
    const features = safeStrArray(product.features);
    const applications = safeStrArray(product.applications);
    const badges = safeStrArray(product.badges);
    const certifications = safeStrArray(product.certifications);
    const chapters = Array.isArray(product.filmChapters)
        ? (product.filmChapters as any[]).filter(c => c && typeof c.title === 'string' && c.title.trim())
        : [];

    const productName = safeStr(product.name);
    const h1 = safeStr(product.h1Title) || productName;
    const tagline = safeStr(product.tagline);
    const priceRange = safeStr(product.priceRange);
    const detailedDescription = safeStr(product.detailedDescription);
    const rating = Number(product.rating) || 0;
    const reviewsCount = Number(product.reviewsCount) || 0;

    // Structured FAQs — normalizer already ran server-side
    const productFaqs: Array<{ q: string; a: string }> = (() => {
        const raw = product.productFaqs;
        if (!Array.isArray(raw) || raw.length === 0) return [];
        return (raw as unknown[]).flatMap((f): Array<{ q: string; a: string }> => {
            if (f && typeof f === 'object' && 'q' in f) {
                const fq = f as { q?: unknown; a?: unknown };
                const q = safeStr(fq.q).trim();
                if (!q) return [];
                return [{ q, a: safeStr(fq.a).trim() }];
            }
            if (typeof f === 'string') {
                const sep = f.indexOf(' | A:');
                if (sep !== -1) return [{ q: f.slice(0, sep).replace(/^Q:\s*/i, ''), a: f.slice(sep + 5) }];
                const q = f.replace(/^Q:\s*/i, '').trim();
                return q ? [{ q, a: '' }] : [];
            }
            return [];
        });
    })();

    const videoId = safeStr(product.youtubeLink) ? getYouTubeId(safeStr(product.youtubeLink)) : null;
    const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

    type MediaItem = { kind: 'image'; url: string } | { kind: 'youtube'; videoId: string; thumb: string };
    const mediaItems: MediaItem[] = [
        ...images.map((url): MediaItem => ({ kind: 'image', url })),
        ...(videoId && ytThumb ? [{ kind: 'youtube' as const, videoId, thumb: ytThumb }] : []),
    ];

    // Slideshow auto-advance
    useEffect(() => {
        if (mediaItems.length <= 1) return;
        const ms = Number(product.slideshowInterval) || 3500;
        const id = setInterval(() => setCurrentImageIndex(p => (p + 1) % mediaItems.length), ms);
        return () => clearInterval(id);
    }, [mediaItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const waText = encodeURIComponent(`Hi, I am interested in: ${productName}. Please share pricing.`);
    const waHref = `https://wa.me/917827229116?text=${waText}`;

    const warranty = {
        enabled: Boolean(product.warrantyEnabled),
        period: safeStr(product.warrantyPeriod),
        description: safeStr(product.warrantyDescription),
        icon: safeStr(product.warrantyIcon),
    };

    return (
        <div className="min-h-screen bg-white">
            <MobileCtaOverride
                audience="product"
                productName={productName || undefined}
                whatsappMessage={safeStr(product.whatsappMessageText) || undefined}
            />

            {/* ── Breadcrumb ── */}
            <div className="bg-gray-950 pt-20 pb-3">
                <div className="container mx-auto px-4">
                    <nav className="flex items-center gap-2 text-xs text-cinema-500" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-cinema-300 transition-colors">Products</Link>
                        <span>/</span>
                        <span className="text-cinema-300 truncate max-w-[180px] sm:max-w-none">{productName}</span>
                    </nav>
                </div>
            </div>

            {/* ── Hero: Gallery + Info + Inline Specs ── */}
            <div className="bg-gray-950 pb-10">
                <div className="container mx-auto px-4 pt-6">
                    <Link href="/products" className="inline-flex items-center gap-1.5 text-cinema-400 hover:text-white font-500 text-xs mb-5 transition-colors">
                        <ChevronLeft size={14} />
                        Back to Products
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-start">
                        {/* ── Left: Gallery ── */}
                        <div className="flex flex-col">
                            <div
                                className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-gray-900"
                                style={{ minHeight: 320 }}
                                onMouseMove={(e) => {
                                    if (mediaItems[currentImageIndex]?.kind !== 'image') return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setTransformOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
                                    setIsZoomed(true);
                                }}
                                onMouseLeave={() => setIsZoomed(false)}
                            >
                                {mediaItems.length === 0 ? (
                                    <div className="w-full aspect-video flex items-center justify-center">
                                        <span className="text-cinema-600 text-sm">No image</span>
                                    </div>
                                ) : mediaItems[currentImageIndex]?.kind === 'youtube' ? (
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
                                            <img src={(mediaItems[currentImageIndex] as any).thumb} alt="Video thumbnail" className="w-full h-full object-cover rounded-2xl" />
                                            <div className="absolute inset-0 bg-black/40 rounded-2xl group-hover:bg-black/50 transition-colors" />
                                            <div className="absolute w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <Play size={28} className="text-white ml-1" fill="white" />
                                            </div>
                                        </button>
                                    )
                                ) : (
                                    <img
                                        src={safeStr((mediaItems[currentImageIndex] as any)?.url) || '/placeholder.svg'}
                                        alt={productName}
                                        fetchPriority="high"
                                        className="max-h-[460px] w-full object-contain transition-transform duration-200 ease-out"
                                        style={{ transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin }}
                                        draggable={false}
                                        onContextMenu={(e) => e.preventDefault()}
                                    />
                                )}
                                {/* Nav arrows */}
                                {mediaItems.length > 1 && (
                                    <>
                                        <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 border border-white/10 text-white transition-colors z-10"
                                            onClick={() => { setCurrentImageIndex(p => (p - 1 + mediaItems.length) % mediaItems.length); setActiveVideoId(null); }} aria-label="Previous">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 border border-white/10 text-white transition-colors z-10"
                                            onClick={() => { setCurrentImageIndex(p => (p + 1) % mediaItems.length); setActiveVideoId(null); }} aria-label="Next">
                                            <ChevronRight size={20} />
                                        </button>
                                        {/* Dots */}
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                                            {mediaItems.map((_, i) => (
                                                <button key={i} onClick={() => { setCurrentImageIndex(i); setActiveVideoId(null); }}
                                                    className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5 hover:bg-white/60'}`} aria-label={`Image ${i + 1}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Thumbnails */}
                            {mediaItems.length > 1 && (
                                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                                    {mediaItems.slice(0, 5).map((item, idx) => (
                                        <button key={idx} onClick={() => { setCurrentImageIndex(idx); setActiveVideoId(null); }}
                                            className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 overflow-hidden transition-all ${idx === currentImageIndex ? 'border-brand-500' : 'border-white/10 hover:border-white/30'}`}>
                                            {item.kind === 'youtube' ? (
                                                <><img src={item.thumb} alt="Video" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Play size={14} className="text-white" fill="white" /></div></>
                                            ) : (
                                                <img src={item.url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" draggable={false} onContextMenu={e => e.preventDefault()} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Right: Product info + Quick Specs ── */}
                        <div className="text-white">
                            {badges.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {badges.slice(0, 4).map((badge, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-600 ${badge === 'Best Seller' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : badge === 'GeM' || badge === 'GeM logo' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'}`}>
                                            {badgeLogoMap[badge] && <img src={badgeLogoMap[badge]} alt="" className="w-4 h-4 object-contain" />}
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-800 text-white mb-3 leading-tight">{h1}</h1>
                            {tagline && <p className="text-sm text-cinema-400 mb-4 italic leading-relaxed">{tagline}</p>}

                            {rating > 0 && (
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-600 text-white">{rating}</span>
                                    <span className="text-xs text-cinema-400">({reviewsCount} reviews)</span>
                                </div>
                            )}

                            {priceRange && <div className="text-2xl font-800 text-brand-400 mb-5">{priceRange}</div>}

                            {detailedDescription && (
                                <div className="text-sm text-cinema-300 mb-6 leading-relaxed">
                                    <RichContent html={detailedDescription} />
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 mb-7">
                                <a href={waHref} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 flex-1 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-600 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm">
                                    <MessageCircle size={16} />
                                    Get Quote on WhatsApp
                                </a>
                                <a href="#rfq"
                                    className="inline-flex items-center justify-center gap-2 flex-1 px-6 py-3.5 border border-white/20 text-white hover:bg-white/10 font-500 rounded-full transition-all text-sm">
                                    Request a Quote
                                </a>
                            </div>

                            {/* ── Quick Specs (inline hero panel) ── */}
                            {specs.length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <h2 className="text-[11px] font-700 text-cinema-400 uppercase tracking-widest mb-3">Key Specifications</h2>
                                    <div className="divide-y divide-white/8">
                                        {specs.slice(0, 7).map((spec, i) => {
                                            const s = safeStr(spec);
                                            const ci = s.indexOf(':');
                                            if (ci === -1) return (
                                                <div key={i} className="flex items-start gap-2 py-2">
                                                    <CheckCircle size={12} className="text-brand-400 mt-0.5 shrink-0" />
                                                    <span className="text-xs text-cinema-300">{s}</span>
                                                </div>
                                            );
                                            return (
                                                <div key={i} className="flex items-baseline gap-3 py-2">
                                                    <span className="text-[11px] text-cinema-500 w-32 shrink-0">{s.slice(0, ci).trim()}</span>
                                                    <span className="text-xs font-600 text-white">{s.slice(ci + 1).trim()}</span>
                                                </div>
                                            );
                                        })}
                                        {specs.length > 7 && <div className="pt-2"><a href="#full-specs" className="text-[11px] text-brand-400 hover:text-brand-300">↓ See all {specs.length} specs below</a></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main content (white) ── */}
            <div className="bg-white">
                <div className="container mx-auto px-4 py-12">

                    {pageMeta?.content1 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content1.h2}</h2>
                            <div className="space-y-3">{pageMeta.content1.p.map((p, i) => <p key={i} className="text-base text-gray-700 leading-relaxed">{p}</p>)}</div>
                        </div>
                    )}

                    {/* ── Features & Full Specs ── */}
                    <div id="full-specs" className="grid md:grid-cols-2 gap-10 mb-14">
                        {features.length > 0 && (
                            <div>
                                <h2 className="text-xl font-700 text-gray-900 mb-5">Key Features</h2>
                                <div className="space-y-3">
                                    {features.map((f, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                                            <CheckCircle className="text-brand-600 mt-0.5 shrink-0" size={16} />
                                            <span className="text-sm text-gray-800 leading-relaxed">{safeStr(f)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {specs.length > 0 && (
                            <div>
                                <h2 className="text-xl font-700 text-gray-900 mb-5">Full Technical Specifications</h2>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-2">
                                    {specs.map((spec, i) => <SpecRow key={i} spec={safeStr(spec)} />)}
                                    {safeStr(product.youtubeLink) && (
                                        <div className="flex items-baseline gap-2 py-2.5 border-t border-gray-100 mt-1">
                                            <span className="text-xs text-gray-500 w-40 shrink-0">Demo Video</span>
                                            <a href={safeStr(product.youtubeLink)} target="_blank" rel="noopener noreferrer" className="text-sm font-600 text-brand-600 hover:text-brand-700 hover:underline">Watch on YouTube →</a>
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
                                <p className="text-xs font-700 text-brand-600 uppercase tracking-widest mb-2">Product Story</p>
                                <h2 className="text-2xl md:text-3xl font-700 text-gray-900">Engineering Behind the Machine</h2>
                            </div>
                            <div className="space-y-16">
                                {chapters.map((ch: any, i: number) => {
                                    const youtubeId = safeStr(ch.videoUrl) ? getYouTubeId(safeStr(ch.videoUrl)) : null;
                                    const imgUrl = safeStr(ch.imageUrl);
                                    return (
                                        <div key={i} className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 !== 0 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                                            <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
                                                {youtubeId ? (
                                                    <iframe src={`https://www.youtube.com/embed/${youtubeId}`} title={ch.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                                                ) : imgUrl ? (
                                                    <img src={imgUrl} alt={ch.title} className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <span className="text-3xl font-800 text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="text-xs font-700 text-brand-600 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</div>
                                                <h3 className="text-xl md:text-2xl font-700 text-gray-900 leading-snug">{safeStr(ch.title)}</h3>
                                                {safeStr(ch.subtitle) && <p className="text-base font-500 text-brand-600">{safeStr(ch.subtitle)}</p>}
                                                {safeStr(ch.description) && <p className="text-base text-gray-600 leading-relaxed">{safeStr(ch.description)}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Applications ── */}
                    {applications.length > 0 && (
                        <div className="mb-14">
                            <h2 className="text-2xl font-700 text-gray-900 mb-6">Applications</h2>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {applications.map((app, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                        <span className="text-sm text-gray-700 leading-relaxed">{safeStr(app)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pageMeta?.content2 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content2.h2}</h2>
                            <div className="space-y-3">{pageMeta.content2.p.map((p, i) => <p key={i} className="text-base text-gray-700 leading-relaxed">{p}</p>)}</div>
                        </div>
                    )}

                    {/* ── Warranty ── */}
                    {warranty.enabled && (
                        <div className="mb-14">
                            <div className="bg-gradient-to-br from-green-50 to-brand-50 rounded-2xl border border-green-200 p-8 flex items-start gap-6">
                                <div className="shrink-0 w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white shadow-md">
                                    {warranty.icon ? <span className="text-2xl">{warranty.icon}</span> : <Shield size={28} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-700 text-gray-900 mb-1">
                                        {warranty.period ? `${warranty.period} Warranty` : 'Manufacturer Warranty'}
                                    </h3>
                                    {warranty.description && <p className="text-base text-gray-600 leading-relaxed mt-2">{warranty.description}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {pageMeta?.content3 && (
                        <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-100">
                            <h2 className="text-2xl font-700 text-gray-900 mb-5 leading-snug">{pageMeta.content3.h2}</h2>
                            <div className="space-y-3">{pageMeta.content3.p.map((p, i) => <p key={i} className="text-base text-gray-700 leading-relaxed">{p}</p>)}</div>
                        </div>
                    )}

                    {/* ── RFQ Form ── */}
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100 p-6 md:p-10 mb-14" id="rfq">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl md:text-3xl font-700 text-gray-900 mb-2">Request a Quote for {productName || 'this product'}</h2>
                                <p className="text-sm text-gray-500">Tender, GeM, dealer &amp; bulk inquiries — response within 48 hours.</p>
                            </div>
                            <RFQForm
                                variant="card"
                                defaultProduct="Custom Requirement"
                                defaultDescription={`Inquiring about: ${productName}`}
                                location={`product_landing_${slug}`}
                            />
                        </div>
                    </div>

                    {/* ── Certifications ── */}
                    {(certifications.length > 0 || badges.length > 0) && (
                        <div className="mb-14">
                            <h2 className="text-2xl font-700 text-gray-900 mb-6">Certifications &amp; Approvals</h2>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[...certifications, ...badges].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        {badgeLogoMap[item] ? (
                                            <img src={badgeLogoMap[item]} alt={item} className="w-10 h-10 object-contain shrink-0" />
                                        ) : (
                                            <CheckCircle size={18} className="text-brand-600 shrink-0" />
                                        )}
                                        <span className="text-sm font-500 text-gray-800">{item}</span>
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
