'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Star, CheckCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import { getLandingPage, type LandingPageDef } from '@/lib/seo/landing-pages';
import RFQForm from '@/components/forms/RFQForm';

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

// Landing-page narrative content is sourced from the single registry at
// `lib/seo/landing-pages.ts`. Adding a new landing page is a one-file edit
// there — this component renders whatever it finds.
type ProductMeta = Pick<LandingPageDef, "content1" | "content2" | "content3">;

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
        const intervalTime = product.slideshowInterval || 3000;
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % total);
        }, intervalTime);
        return () => clearInterval(interval);
    }, [product]);

    // Reset image index if product changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [product]);

    function decodeSlug(slug: string) {
        return slug
            .replace(/-/g, " ")
            .replace(/\band\b/g, "&")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/admin/${decodeSlug(slug)}`)
            .then(res => res.json())
            .then(data => {
                setProduct(data);
                setLoading(false);
            });
    }, [slug]);

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

    const videoId = product.youtubeLink ? getYouTubeId(product.youtubeLink) : null;
    const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    type MediaItem = { kind: 'image'; url: string } | { kind: 'youtube'; videoId: string; thumb: string };
    const mediaItems: MediaItem[] = [
        ...images.map((url: string): MediaItem => ({ kind: 'image', url })),
        ...(videoId && ytThumb ? [{ kind: 'youtube' as const, videoId, thumb: ytThumb }] : []),
    ];

    const getThumbnails = () => {
        if (mediaItems.length <= 3) return mediaItems;
        if (currentImageIndex === 0) return mediaItems.slice(0, 3);
        if (currentImageIndex === mediaItems.length - 1) return mediaItems.slice(-3);
        return mediaItems.slice(currentImageIndex - 1, currentImageIndex + 2);
    };
    const thumbnails = getThumbnails();

    return (

        <div className="pt-32 min-h-screen bg-gray-50 relative">
            <MobileCtaOverride
                audience="product"
                productName={product?.name}
                whatsappMessage={product?.whatsappMessageText}
            />
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
                            {/* Main Media Viewer */}
                            <div
                                className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-gray-100"
                                style={{ minHeight: 280 }}
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
                                            <img
                                                src={(mediaItems[currentImageIndex] as any).thumb}
                                                alt="Video thumbnail"
                                                className="w-full h-full object-cover rounded-2xl"
                                                draggable="false"
                                                onContextMenu={(e) => e.preventDefault()}
                                            />
                                            <div className="absolute inset-0 bg-black/30 rounded-2xl group-hover:bg-black/40 transition-colors" />
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
                                            className="max-h-[400px] w-auto h-auto object-contain transition-transform duration-200 ease-out mx-auto block"
                                            style={{ width: '100%', transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin }}
                                            draggable="false"
                                            onContextMenu={(e) => e.preventDefault()}
                                        />
                                        <div className="absolute inset-0 select-none" style={{ zIndex: 1 }} onContextMenu={(e) => e.preventDefault()} />
                                    </div>
                                )}
                                {mediaItems.length > 1 && (
                                    <>
                                        <button
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                                            style={{ zIndex: 2 }}
                                            onClick={() => { setCurrentImageIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length); setActiveVideoId(null); }}
                                            aria-label="Previous"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                                            style={{ zIndex: 2 }}
                                            onClick={() => { setCurrentImageIndex((prev) => (prev + 1) % mediaItems.length); setActiveVideoId(null); }}
                                            aria-label="Next"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    </>
                                )}
                            </div>
                            {/* Thumbnails */}
                            <div className="flex gap-2 mt-4 justify-center">
                                {thumbnails.slice(0, 4).map((item, idx) => {
                                    const globalIdx = mediaItems.indexOf(item);
                                    const isActive = currentImageIndex === globalIdx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => { setCurrentImageIndex(globalIdx); setActiveVideoId(null); }}
                                            className={`relative w-20 h-20 rounded-lg border-2 overflow-hidden ${isActive ? 'border-green-600' : 'border-gray-200'}`}
                                        >
                                            {item.kind === 'youtube' ? (
                                                <>
                                                    <img src={item.thumb} alt="Video" className="w-full h-full object-cover" draggable="false" />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                        <Play size={18} className="text-white" fill="white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <img src={item.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" draggable="false" onContextMenu={(e) => e.preventDefault()} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {(product.badges || [] as string[]).map((badge: string, index: number) => (
                                <Badge
                                    key={index}
                                    className={`$${badge === 'Best Seller'
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
                        <div className="text-lg text-gray-600 mb-8 leading-relaxed">
                            <RichContent html={product.detailedDescription || ''} />
                        </div>
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
                {pageMeta && pageMeta.content1 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content1.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content1.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}
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

                {pageMeta && pageMeta.content2 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content2.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content2.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}

                {pageMeta && pageMeta.content3 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content3.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content3.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* RFQ form pre-filled for this product */}
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl shadow-xl p-6 md:p-10 mb-12" id="rfq">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                Request a Quote for {product.name}
                            </h3>
                            <p className="text-sm md:text-base text-gray-600">
                                Tender, GeM, dealer &amp; bulk inquiries — we&apos;ll respond within 48 hours.
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
    );
} 