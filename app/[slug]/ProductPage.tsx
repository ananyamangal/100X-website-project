'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MessageCircle, Star, CheckCircle, Play, Shield, Download, Package, Wrench, FileText, HelpCircle, Layers, Award, ChevronDown, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ProductCinematicHero from '@/components/product/ProductCinematicHero';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import { getLandingPage } from '@/lib/seo/landing-pages';
import RFQForm from '@/components/forms/RFQForm';
import PremiumAccordion from '@/components/cinematic/PremiumAccordion';

// ── Utilities ────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

function safeStr(val: unknown): string {
    if (typeof val === 'string') return val;
    if (val == null) return '';
    return String(val);
}

function safeStrArray(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                const o = item as Record<string, unknown>;
                if (typeof o.name === 'string' && typeof o.value === 'string') return `${o.name}: ${o.value}`;
                if (typeof o.item === 'string') return o.item;
                return JSON.stringify(item);
            }
            return String(item);
        }).filter(Boolean);
    }
    if (typeof val === 'string') return val.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return [];
}

const badgeLogoMap: Record<string, string> = {
    'German Technology': '/Logos clipart 2/german technology.png',
    'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
    'GeM': '/Logos clipart 2/GeM logo.png',
    'GeM logo': '/Logos clipart 2/GeM logo.png',
    'Heavy Duty': '/Logos clipart 2/Heavy duty.png',
    'Heavy duty': '/Logos clipart 2/Heavy duty.png',
    'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
    'Ecofreidly': '/Logos clipart 2/Ecofreidly.png',
    'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

// ── Spec grouper ─────────────────────────────────────────────────────────
const SPEC_GROUP_MAP: Record<string, string> = {
    engine: 'Engine', fuel: 'Engine', ignition: 'Engine', cylinder: 'Engine', rpm: 'Engine', power: 'Engine',
    tank: 'Tank', capacity: 'Tank', reservoir: 'Tank', solution: 'Tank',
    output: 'Output', coverage: 'Output', spray: 'Output', droplet: 'Output', fog: 'Output',
    weight: 'Dimensions & Weight', dimension: 'Dimensions & Weight', length: 'Dimensions & Weight', width: 'Dimensions & Weight', height: 'Dimensions & Weight', size: 'Dimensions & Weight',
    material: 'Material', steel: 'Material', stainless: 'Material', body: 'Material',
    safety: 'Safety & Compliance', compliance: 'Safety & Compliance', certification: 'Safety & Compliance', approved: 'Safety & Compliance', standard: 'Safety & Compliance',
    performance: 'Performance', range: 'Performance', flow: 'Performance', pressure: 'Performance', speed: 'Performance',
};

function groupSpecs(specs: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    for (const spec of specs) {
        const label = spec.split(':')[0].toLowerCase();
        let group = 'Specifications';
        for (const [kw, grp] of Object.entries(SPEC_GROUP_MAP)) {
            if (label.includes(kw)) { group = grp; break; }
        }
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(spec);
    }
    return grouped;
}

// ── Sub-components ───────────────────────────────────────────────────────

function SpecRow({ spec }: { spec: string }) {
    const s = safeStr(spec);
    const ci = s.indexOf(':');
    if (ci === -1) return (
        <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0">
            <CheckCircle size={13} className="text-brand-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">{s}</span>
        </div>
    );
    return (
        <div className="flex items-baseline gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500 w-44 shrink-0 leading-relaxed">{s.slice(0, ci).trim()}</span>
            <span className="text-sm font-600 text-gray-900 leading-relaxed">{s.slice(ci + 1).trim()}</span>
        </div>
    );
}

function SpecsTabContent({ specs, youtubeLink }: { specs: string[]; youtubeLink?: string }) {
    const groups = groupSpecs(specs);
    const hasGroups = Object.keys(groups).length > 1 || (Object.keys(groups).length === 1 && Object.keys(groups)[0] !== 'Specifications');
    return (
        <div className="space-y-6">
            {hasGroups ? (
                Object.entries(groups).map(([group, items]) => (
                    <div key={group}>
                        <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-2">{group}</h4>
                        <div className="bg-gray-50 rounded-xl px-4 py-1 border border-gray-100">
                            {items.map((s, i) => <SpecRow key={i} spec={s} />)}
                        </div>
                    </div>
                ))
            ) : (
                <div className="bg-gray-50 rounded-xl px-4 py-1 border border-gray-100">
                    {specs.map((s, i) => <SpecRow key={i} spec={s} />)}
                </div>
            )}
            {youtubeLink && (
                <a href={youtubeLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-600 text-brand-600 hover:text-brand-700 hover:underline">
                    ▶ Watch product demo on YouTube
                </a>
            )}
        </div>
    );
}

function ApplicationsTabContent({ applications }: { applications: string[] }) {
    return (
        <div className="grid sm:grid-cols-2 gap-3">
            {applications.map((app, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <span className="text-sm text-gray-700 leading-relaxed">{safeStr(app)}</span>
                </div>
            ))}
        </div>
    );
}

function CertificationsTabContent({ certifications, badges }: { certifications: string[]; badges: string[] }) {
    const all = [...new Set([...certifications, ...badges])];
    return (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {all.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    {badgeLogoMap[item]
                        ? <img src={badgeLogoMap[item]} alt={item} className="w-9 h-9 object-contain shrink-0" />
                        : <CheckCircle size={18} className="text-brand-600 shrink-0" />}
                    <span className="text-sm font-500 text-gray-800">{item}</span>
                </div>
            ))}
        </div>
    );
}

function WarrantyTabContent({ period, description, icon }: { period?: string; description?: string; icon?: string }) {
    return (
        <div className="flex items-start gap-5 p-5 bg-brand-50 rounded-xl border border-brand-100">
            <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                {icon ? <span className="text-xl">{icon}</span> : <Shield size={22} />}
            </div>
            <div>
                <h4 className="font-700 text-gray-900 mb-1">{period ? `${period} Manufacturer Warranty` : 'Manufacturer Warranty'}</h4>
                {description && <p className="text-sm text-gray-600 leading-relaxed">{description}</p>}
                {!description && <p className="text-sm text-gray-500">Covers manufacturing defects and material failure. Contact our support team for warranty claims.</p>}
            </div>
        </div>
    );
}

function BoxContentsTabContent({ items }: { items: Array<{ item: string; quantity: string; imageUrl?: string }> }) {
    return (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    {b.imageUrl
                        ? <img src={b.imageUrl} alt={b.item} className="w-12 h-12 object-cover rounded-lg shrink-0" loading="lazy" />
                        : <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0"><Package size={18} className="text-gray-400" /></div>}
                    <div>
                        <p className="text-sm font-600 text-gray-900">{b.item}</p>
                        <p className="text-xs text-gray-500">Qty: {b.quantity}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FAQTabContent({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
    const [open, setOpen] = useState<number | null>(null);
    if (!faqs.length) return <p className="text-sm text-gray-400">No FAQs for this product.</p>;
    return (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
            {faqs.map((f, i) => (
                <div key={i}>
                    <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-gray-100 transition-colors"
                        aria-expanded={open === i}
                    >
                        <span className="text-sm font-600 text-gray-800 leading-snug">{f.q}</span>
                        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
                    </button>
                    {open === i && (
                        <div className="px-4 pb-4 pt-1">
                            <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function SparePartsTabContent({ productId }: { productId: string }) {
    const [parts, setParts] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (loaded || !productId) return;
        setLoaded(true);
        fetch(`/api/spare-parts?product=${productId}`)
            .then(r => r.json())
            .then(data => setParts(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [productId, loaded]);

    if (!parts.length && !loaded) return <p className="text-sm text-gray-400">Loading compatible parts…</p>;
    if (!parts.length) return (
        <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">No spare parts listed yet for this product.</p>
            <a href="/spare-parts" className="text-sm font-600 text-brand-600 hover:underline">Browse all spare parts →</a>
        </div>
    );
    return (
        <div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {parts.map((part) => (
                    <a key={part._id} href={(() => {
                            const n = part.compatibleProductNames?.[0];
                            const seg = n
                                ? n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                                : part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts';
                            return `/spare-parts/${seg}/${part.slug || part._id}`;
                        })()}
                        className="group flex gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                        {part.images?.[0]
                            ? <img src={part.images[0]} alt={part.name} className="w-14 h-14 object-cover rounded-lg shrink-0" loading="lazy" />
                            : <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center shrink-0"><Wrench size={18} className="text-gray-400" /></div>}
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">{part.sku || part.category}</p>
                            <p className="text-sm font-600 text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{part.name}</p>
                            {part.priceRange && <p className="text-xs text-brand-600 font-600 mt-0.5">{part.priceRange}</p>}
                        </div>
                    </a>
                ))}
            </div>
            <a href="/spare-parts" className="text-sm font-600 text-brand-600 hover:underline">View all spare parts →</a>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────

interface Props {
    product?: Record<string, unknown>;
    slug?: string;
}

function CaseStudiesSection({ productId, productName }: { productId: string; productName: string }) {
    const [studies, setStudies] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        fetch(`/api/case-studies/by-product?productId=${productId}`)
            .then(r => r.json()).then(d => { if (Array.isArray(d)) setStudies(d); setLoaded(true); })
            .catch(() => setLoaded(true));
    }, [productId]);
    if (!loaded || !studies.length) return null;
    return (
        <section className="py-16 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                    <div>
                        <p className="text-xs font-700 text-brand-600 uppercase tracking-widest mb-2">Real Deployments</p>
                        <h2 className="text-2xl font-700 text-gray-900">Case Studies</h2>
                    </div>
                    <Link href="/case-studies" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1 shrink-0">
                        View all <ArrowRight size={13} />
                    </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studies.map((cs: any) => (
                        <Link key={cs._id} href={`/case-studies/${cs.slug}`}
                            className="group block bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden hover:border-brand-200 hover:shadow-lg transition-all">
                            <div className="aspect-video bg-gray-100 overflow-hidden">
                                {cs.images?.[0]
                                    ? <img src={cs.images[0]} alt={cs.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                                    : <div className="w-full h-full flex items-center justify-center"><Building2 size={32} className="text-gray-200" /></div>}
                            </div>
                            <div className="p-5">
                                {(cs.industry || cs.state) && (
                                    <div className="flex gap-1.5 mb-3 flex-wrap">
                                        {cs.industry && <span className="text-[10px] font-700 uppercase tracking-wide bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{cs.industry}</span>}
                                        {cs.state && <span className="text-[10px] font-700 uppercase tracking-wide bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{cs.state}</span>}
                                    </div>
                                )}
                                <p className="font-600 text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{cs.title}</p>
                                {cs.customer && <p className="text-xs text-gray-500 mt-1">{cs.customer}</p>}
                                <p className="text-brand-600 text-sm font-600 mt-3 inline-flex items-center gap-1">Read study <ArrowRight size={13} /></p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

function decodeSlugToName(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\band\b/g, '&').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProductDetailPage({ product: productProp, slug: slugProp }: Props) {
    const params = useParams();
    const slugFromParams = Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? '';
    const slug = slugProp ?? slugFromParams;

    const [fetchedProduct, setFetchedProduct] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(!productProp);

    useEffect(() => {
        if (productProp) return;
        if (!slug) { setLoading(false); return; }
        fetch(`/api/admin/${encodeURIComponent(decodeSlugToName(slug))}`)
            .then(async res => {
                if (!res.ok) { setLoading(false); return; }
                const data = await res.json();
                if (data?.error) { setLoading(false); return; }
                setFetchedProduct(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [slug, productProp]);

    const product: Record<string, unknown> | null = productProp ?? fetchedProduct;

    // Gallery state — hooks must come before early returns
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('center center');
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    const pageMeta = slug ? getLandingPage(slug) : undefined;

    // Compute media items (needed for slideshow effect)
    const images = safeStrArray(product?.imageUrls).filter((u: string) => u.startsWith('http') || u.startsWith('/'));
    const videoId = safeStr(product?.youtubeLink) ? getYouTubeId(safeStr(product?.youtubeLink)) : null;
    const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    type MI = { kind: 'image'; url: string } | { kind: 'yt'; videoId: string; thumb: string };
    const mediaItems: MI[] = [
        ...images.map((url): MI => ({ kind: 'image', url })),
        ...(videoId && ytThumb ? [{ kind: 'yt' as const, videoId, thumb: ytThumb }] : []),
    ];

    // Slideshow
    useEffect(() => {
        if (mediaItems.length <= 1) return;
        const ms = Number(product?.slideshowInterval) || 4000;
        const id = setInterval(() => setCurrentIdx(p => (p + 1) % mediaItems.length), ms);
        return () => clearInterval(id);
    }, [mediaItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center pt-20">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!product) return <div className="pt-40 text-center text-gray-500">Product not found.</div>;

    // ── Field reads ────────────────────────────────────────────────────────
    const productName  = safeStr(product.name);
    const h1           = safeStr(product.h1Title) || productName;
    const tagline      = safeStr(product.tagline);
    const priceRange   = safeStr(product.priceRange);
    const shortDesc    = safeStr(product.shortDescription);
    const detailedDesc = safeStr(product.detailedDescription);
    const brochureUrl  = safeStr(product.brochureUrl);
    const rating       = Number(product.rating) || 0;
    const reviewsCount = Number(product.reviewsCount) || 0;
    const productId    = safeStr(product._id) || safeStr(product.id);

    const specs           = safeStrArray(product.specifications);
    const features        = safeStrArray(product.features);
    const applications    = safeStrArray(product.applications);
    const badges          = safeStrArray(product.badges);
    const certifications  = safeStrArray(product.certifications);

    const chapters = Array.isArray(product.filmChapters)
        ? (product.filmChapters as any[]).filter(c => c && typeof c.title === 'string' && c.title.trim()).slice(0, 3)
        : [];

    const boxContents = Array.isArray(product.boxContents)
        ? (product.boxContents as any[]).filter(b => b?.item)
        : [];

    const productFaqs: Array<{ q: string; a: string }> = (() => {
        const raw = product.productFaqs;
        if (!Array.isArray(raw) || raw.length === 0) return [];
        return (raw as unknown[]).flatMap((f): Array<{ q: string; a: string }> => {
            if (f && typeof f === 'object' && 'q' in f) {
                const fq = f as { q?: unknown; a?: unknown };
                const q = safeStr(fq.q).trim();
                return q ? [{ q, a: safeStr(fq.a).trim() }] : [];
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

    const warranty = {
        enabled: Boolean(product.warrantyEnabled),
        period: safeStr(product.warrantyPeriod),
        description: safeStr(product.warrantyDescription),
        icon: safeStr(product.warrantyIcon),
    };

    const waText = encodeURIComponent(`Hi, I am interested in: ${productName}. Please share pricing.`);
    const waHref = `https://wa.me/917827229116?text=${waText}`;

    // Hero featured specs — first 5 from the spec list
    const featuredSpecs = specs.slice(0, 5);

    // ── Accordion tabs ─────────────────────────────────────────────────────
    const accordionItems = [
        specs.length > 0 && {
            id: 'specs',
            label: 'Technical Specifications',
            badge: `${specs.length} specs`,
            icon: <Layers size={14} />,
            children: <SpecsTabContent specs={specs} youtubeLink={safeStr(product.youtubeLink) || undefined} />,
        },
        (features.length > 0 || applications.length > 0) && {
            id: 'applications',
            label: 'Features & Applications',
            badge: `${features.length + applications.length} items`,
            icon: <CheckCircle size={14} />,
            children: (
                <div className="space-y-6">
                    {features.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-3">Key Features</h4>
                            <div className="space-y-2">
                                {features.map((f, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-brand-50 rounded-lg border border-brand-100">
                                        <CheckCircle size={13} className="text-brand-600 mt-0.5 shrink-0" />
                                        <span className="text-sm text-gray-800 leading-relaxed">{safeStr(f)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {applications.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-3">Applications</h4>
                            <ApplicationsTabContent applications={applications} />
                        </div>
                    )}
                </div>
            ),
        },
        (certifications.length > 0 || badges.length > 0) && {
            id: 'certifications',
            label: 'Certifications & Approvals',
            badge: `${[...new Set([...certifications, ...badges])].length}`,
            icon: <Award size={14} />,
            children: <CertificationsTabContent certifications={certifications} badges={badges} />,
        },
        warranty.enabled && {
            id: 'warranty',
            label: 'Warranty',
            badge: warranty.period || 'Included',
            icon: <Shield size={14} />,
            children: <WarrantyTabContent period={warranty.period} description={warranty.description} icon={warranty.icon} />,
        },
        boxContents.length > 0 && {
            id: 'box',
            label: "What's In The Box",
            badge: `${boxContents.length} items`,
            icon: <Package size={14} />,
            children: <BoxContentsTabContent items={boxContents} />,
        },
        brochureUrl && {
            id: 'downloads',
            label: 'Downloads & Documents',
            icon: <Download size={14} />,
            children: (
                <div className="space-y-3">
                    <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-600 transition-colors">
                        <Download size={15} /> Download Product Brochure (PDF)
                    </a>
                    <p className="text-xs text-gray-400">Technical datasheet, specifications, and compliance documentation.</p>
                </div>
            ),
        },
        productId && {
            id: 'spareparts',
            label: 'Compatible Spare Parts',
            icon: <Wrench size={14} />,
            children: <SparePartsTabContent productId={productId} />,
        },
        {
            id: 'faq',
            label: 'Frequently Asked Questions',
            badge: productFaqs.length > 0 ? `${productFaqs.length} Q&A` : undefined,
            icon: <HelpCircle size={14} />,
            children: <FAQTabContent faqs={productFaqs} />,
        },
    ].filter(Boolean) as any[];

    return (
        <div className="min-h-screen bg-white">
            <MobileCtaOverride
                audience="product"
                productName={productName || undefined}
                whatsappMessage={safeStr(product.whatsappMessageText) || undefined}
            />

            {/* ── Cinematic Hero ────────────────────────────────────── */}
            <ProductCinematicHero
                name={productName}
                h1={h1}
                tagline={tagline}
                category={safeStr(product.category)}
                badges={badges}
                price={priceRange}
                specs={specs}
                rating={rating}
                reviewsCount={reviewsCount}
                imageUrl={images[0]}
            />

            {/* ══════════════════════════════════════════════════════════
                SECTION 1 — PURCHASE AREA
                Goal: everything a buyer needs to decide, in one screen
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-gray-950">
                <div className="container mx-auto px-4 pt-8 pb-10">
                    <Link href="/products" className="inline-flex items-center gap-1.5 text-cinema-500 hover:text-white text-xs mb-6 transition-colors">
                        <ChevronLeft size={13} /> Back to Products
                    </Link>

                    <div className="grid lg:grid-cols-[55%_45%] gap-8 xl:gap-12 items-start">

                        {/* ── Gallery ─────────────────────────────── */}
                        <div className="flex flex-col">
                            <div
                                className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-gray-900"
                                style={{ minHeight: 340 }}
                                onMouseMove={(e) => {
                                    if (mediaItems[currentIdx]?.kind !== 'image') return;
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setTransformOrigin(`${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
                                    setIsZoomed(true);
                                }}
                                onMouseLeave={() => setIsZoomed(false)}
                            >
                                {mediaItems.length === 0 ? (
                                    <div className="flex items-center justify-center w-full aspect-video text-cinema-600 text-sm">No image</div>
                                ) : mediaItems[currentIdx]?.kind === 'yt' ? (
                                    activeVideoId === (mediaItems[currentIdx] as any).videoId ? (
                                        <iframe src={`https://www.youtube.com/embed/${(mediaItems[currentIdx] as any).videoId}?autoplay=1&playsinline=1`}
                                            title="Product video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full aspect-video rounded-2xl" />
                                    ) : (
                                        <button className="relative w-full aspect-video flex items-center justify-center group"
                                            onClick={() => setActiveVideoId((mediaItems[currentIdx] as any).videoId)} aria-label="Play video">
                                            <img src={(mediaItems[currentIdx] as any).thumb} alt="Video thumbnail" className="w-full h-full object-cover rounded-2xl" />
                                            <div className="absolute inset-0 bg-black/40 rounded-2xl group-hover:bg-black/50 transition-colors" />
                                            <div className="absolute w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <Play size={28} className="text-white ml-1" fill="white" />
                                            </div>
                                        </button>
                                    )
                                ) : (
                                    <img
                                        src={safeStr((mediaItems[currentIdx] as any)?.url) || '/placeholder.svg'}
                                        alt={productName}
                                        fetchPriority="high"
                                        className="max-h-[480px] w-full object-contain transition-transform duration-200"
                                        style={{ transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin }}
                                        draggable={false}
                                        onContextMenu={e => e.preventDefault()}
                                    />
                                )}
                                {/* 100X Circle brand badge — always visible on product images */}
                                {mediaItems[currentIdx]?.kind === 'image' && (
                                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 shadow-md">
                                        <img src="/logo-main.png" alt="100X Circle" className="h-5 w-auto object-contain" />
                                    </div>
                                )}
                                {mediaItems.length > 1 && (
                                    <>
                                        <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 border border-white/10 text-white z-10"
                                            onClick={() => { setCurrentIdx(p => (p - 1 + mediaItems.length) % mediaItems.length); setActiveVideoId(null); }} aria-label="Previous">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 border border-white/10 text-white z-10"
                                            onClick={() => { setCurrentIdx(p => (p + 1) % mediaItems.length); setActiveVideoId(null); }} aria-label="Next">
                                            <ChevronRight size={18} />
                                        </button>
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                                            {mediaItems.map((_, i) => (
                                                <button key={i} onClick={() => { setCurrentIdx(i); setActiveVideoId(null); }}
                                                    className={`h-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-white w-4' : 'bg-white/40 w-1.5 hover:bg-white/60'}`} aria-label={`Image ${i + 1}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Thumbnails */}
                            {mediaItems.length > 1 && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {mediaItems.slice(0, 5).map((item, idx) => (
                                        <button key={idx} onClick={() => { setCurrentIdx(idx); setActiveVideoId(null); }}
                                            className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${idx === currentIdx ? 'border-brand-500' : 'border-white/10 hover:border-white/30'}`}>
                                            {item.kind === 'yt'
                                                ? <><img src={item.thumb} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Play size={12} className="text-white" fill="white" /></div></>
                                                : <img src={item.url} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={e => e.preventDefault()} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Product Info ─────────────────────────── */}
                        <div className="text-white flex flex-col gap-4">
                            {/* Badges */}
                            {badges.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {badges.slice(0, 3).map((badge, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-600 border ${badge === 'Best Seller' ? 'bg-red-500/20 text-red-300 border-red-500/30' : badge.includes('GeM') ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-brand-500/20 text-brand-300 border-brand-500/30'}`}>
                                            {badgeLogoMap[badge] && <img src={badgeLogoMap[badge]} alt="" className="w-3.5 h-3.5 object-contain" />}
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div>
                                <h1 className="text-2xl sm:text-3xl font-800 text-white leading-tight mb-1">{h1}</h1>
                                {tagline && <p className="text-sm text-cinema-400 italic">{tagline}</p>}
                            </div>

                            {rating > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />)}
                                    </div>
                                    <span className="text-xs text-cinema-400">{rating} ({reviewsCount} reviews)</span>
                                </div>
                            )}

                            {priceRange && (
                                <div className="text-xl font-800 text-brand-400">{priceRange}</div>
                            )}

                            {/* Short description (not the long one) */}
                            {shortDesc && (
                                <p className="text-sm text-cinema-300 leading-relaxed line-clamp-3">{shortDesc.replace(/<[^>]*>/g, '')}</p>
                            )}

                            {/* Featured Specs — 5 most important */}
                            {featuredSpecs.length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-[10px] font-700 text-cinema-500 uppercase tracking-widest mb-3">Key Specifications</p>
                                    <div className="space-y-0 divide-y divide-white/8">
                                        {featuredSpecs.map((spec, i) => {
                                            const s = safeStr(spec);
                                            const ci = s.indexOf(':');
                                            if (ci === -1) return <div key={i} className="py-1.5 text-xs text-cinema-300">{s}</div>;
                                            return (
                                                <div key={i} className="flex gap-3 py-1.5">
                                                    <span className="text-[11px] text-cinema-500 w-32 shrink-0">{s.slice(0, ci).trim()}</span>
                                                    <span className="text-xs font-600 text-white">{s.slice(ci + 1).trim()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {specs.length > 5 && (
                                        <button className="mt-2 text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                                            + {specs.length - 5} more specs in Technical Specifications tab ↓
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* CTAs */}
                            <div className="flex flex-col gap-2.5">
                                <a href={waHref} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-700 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm">
                                    <MessageCircle size={16} /> Get Quote on WhatsApp
                                </a>
                                <a href="#rfq"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white hover:bg-white/10 font-500 rounded-full transition-all text-sm">
                                    Request a Formal Quote
                                </a>
                                {brochureUrl && (
                                    <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-cinema-400 hover:text-white hover:border-white/20 font-500 rounded-full transition-all text-sm">
                                        <Download size={14} /> Download Brochure
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 2 — COLLAPSIBLE INFORMATION TABS
                All product detail in compact accordions
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white border-t border-gray-100">
                <div className="container mx-auto px-4 py-10">
                    {/* Optional landing page intro content */}
                    {pageMeta?.content1 && (
                        <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <h2 className="text-lg font-700 text-gray-900 mb-3">{pageMeta.content1.h2}</h2>
                            {pageMeta.content1.p.map((p, i) => <p key={i} className="text-sm text-gray-600 leading-relaxed mb-2">{p}</p>)}
                        </div>
                    )}

                    {accordionItems.length > 0 && (
                        <PremiumAccordion
                            items={accordionItems}
                            defaultOpen="specs"
                            allowMultiple={false}
                            variant="light"
                        />
                    )}

                    {/* SEO crawlable hidden content (specs, applications, certifications rendered visibly above in accordion) */}
                    <div aria-hidden className="sr-only">
                        {specs.map((s, i) => <span key={i}>{s} </span>)}
                        {applications.map((a, i) => <span key={i}>{a} </span>)}
                        {certifications.map((c, i) => <span key={i}>{c} </span>)}
                        {productFaqs.map((f, i) => <span key={i}>{f.q} {f.a} </span>)}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 3 — STORYTELLING (max 3 chapters)
            ══════════════════════════════════════════════════════════ */}
            {chapters.length > 0 && (
                <div className="bg-gray-950 py-16 md:py-20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <p className="text-xs font-700 text-brand-400 uppercase tracking-widest mb-2">Engineering</p>
                            <h2 className="text-2xl md:text-3xl font-700 text-white">The Machine Behind the Numbers</h2>
                        </div>
                        <div className="space-y-16">
                            {chapters.map((ch: any, i: number) => {
                                const yId = safeStr(ch.videoUrl) ? getYouTubeId(safeStr(ch.videoUrl)) : null;
                                const imgUrl = safeStr(ch.imageUrl);
                                return (
                                    <div key={i} className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 !== 0 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                                        <div className="rounded-2xl overflow-hidden aspect-video bg-gray-900 flex items-center justify-center">
                                            {yId
                                                ? <iframe src={`https://www.youtube.com/embed/${yId}`} title={ch.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                                                : imgUrl
                                                    ? <img src={imgUrl} alt={ch.title} className="w-full h-full object-cover" loading="lazy" />
                                                    : <span className="text-4xl font-800 text-gray-700">{String(i + 1).padStart(2, '0')}</span>}
                                        </div>
                                        <div className="text-white space-y-4">
                                            <div className="text-xs font-700 text-brand-400 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</div>
                                            <h3 className="text-xl md:text-2xl font-700 leading-snug">{safeStr(ch.title)}</h3>
                                            {safeStr(ch.subtitle) && <p className="text-brand-400 font-500">{safeStr(ch.subtitle)}</p>}
                                            {safeStr(ch.description) && <p className="text-cinema-300 leading-relaxed text-sm md:text-base">{safeStr(ch.description)}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                SECTION 4 — CASE STUDIES
            ══════════════════════════════════════════════════════════ */}
            <CaseStudiesSection productId={productId} productName={productName} />

            {/* ══════════════════════════════════════════════════════════
                SECTION 5 — RFQ FORM
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white py-14" id="rfq">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl md:text-3xl font-700 text-gray-900 mb-2">Request a Quote</h2>
                            <p className="text-sm text-gray-500">Tender, GeM, dealer &amp; bulk inquiries — response within 48 hours.</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 md:p-8">
                            <RFQForm
                                variant="card"
                                defaultProduct="Custom Requirement"
                                defaultDescription={`Inquiring about: ${productName}`}
                                location={`product_landing_${slug}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
