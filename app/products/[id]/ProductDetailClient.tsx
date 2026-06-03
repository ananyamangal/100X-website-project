'use client';
import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Play, CheckCircle2, ArrowRight, Star, Wrench, ShieldCheck, HelpCircle, Package, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import RFQForm from '@/components/forms/RFQForm';
import BrochureLeadModal from '@/components/BrochureLeadModal';
import RealWorldDeployments from '@/components/cinematic/RealWorldDeployments';
import { BUSINESS, SITE_URL } from '@/lib/seo/site-config';

// ── Utilities ─────────────────────────────────────────────────────────────────

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
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function safeStr(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v); }
function safeArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => typeof x === 'string' ? x : (x && typeof x === 'object' && 'name' in x && 'value' in x) ? `${(x as any).name}: ${(x as any).value}` : String(x)).filter(Boolean);
  if (typeof v === 'string') return v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return [];
}

// Spec group keywords
const SPEC_GROUPS: [string, string][] = [
  ['engine', 'Engine'], ['fuel', 'Engine'], ['ignition', 'Engine'], ['cylinder', 'Engine'], ['rpm', 'Engine'], ['power', 'Engine'],
  ['tank', 'Tank'], ['capacity', 'Tank'], ['solution', 'Tank'], ['reservoir', 'Tank'],
  ['output', 'Output'], ['coverage', 'Output'], ['spray', 'Output'], ['droplet', 'Output'], ['fog', 'Output'], ['range', 'Output'],
  ['weight', 'Dimensions'], ['dimension', 'Dimensions'], ['length', 'Dimensions'], ['width', 'Dimensions'], ['height', 'Dimensions'], ['size', 'Dimensions'],
  ['material', 'Material'], ['steel', 'Material'], ['body', 'Material'], ['body', 'Material'],
  ['compliance', 'Compliance'], ['certification', 'Compliance'], ['approved', 'Compliance'], ['standard', 'Compliance'], ['bis', 'Compliance'], ['iso', 'Compliance'],
  ['performance', 'Performance'], ['flow', 'Performance'], ['pressure', 'Performance'], ['speed', 'Performance'],
];
function groupSpecs(specs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const spec of specs) {
    const label = spec.split(':')[0].toLowerCase();
    let grp = 'Specifications';
    for (const [kw, g] of SPEC_GROUPS) { if (label.includes(kw)) { grp = g; break; } }
    if (!out[grp]) out[grp] = [];
    out[grp].push(spec);
  }
  return out;
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function ProductGallery({ images, videoId, name }: { images: string[]; videoId: string | null; name: string }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('center center');

  type MI = { kind: 'image'; url: string } | { kind: 'yt'; videoId: string; thumb: string };
  const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const items: MI[] = [...images.map((u): MI => ({ kind: 'image', url: u })), ...(videoId && ytThumb ? [{ kind: 'yt' as const, videoId, thumb: ytThumb }] : [])];
  const n = items.length;
  const cur = items[idx];
  const go = (i: number) => { setIdx(i); setPlaying(false); };

  return (
    <div className="flex flex-col gap-3">
      {/* Main viewer */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-900"
        style={{ aspectRatio: '4/3' }}
        onMouseMove={(e) => {
          if (cur?.kind !== 'image') return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
          setZoomed(true);
        }}
        onMouseLeave={() => setZoomed(false)}
      >
        {!cur ? (
          <div className="absolute inset-0 flex items-center justify-center text-cinema-600 text-sm">No image</div>
        ) : cur.kind === 'yt' ? (
          playing ? (
            <iframe src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&playsinline=1&rel=0`} title="Product video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
          ) : (
            <button className="absolute inset-0 w-full h-full flex items-center justify-center group" onClick={() => setPlaying(true)} aria-label="Play">
              <img src={cur.thumb} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={24} className="text-white ml-1" fill="white" />
              </div>
            </button>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(cur as any).url} alt={name} fetchPriority="high"
            className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-200"
            style={{ transform: zoomed ? 'scale(2)' : 'scale(1)', transformOrigin: origin }}
            draggable={false} onContextMenu={e => e.preventDefault()} />
        )}
        {n > 1 && <>
          <button onClick={() => go((idx - 1 + n) % n)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/10 transition-all"><ChevronLeft size={18} /></button>
          <button onClick={() => go((idx + 1) % n)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/10 transition-all"><ChevronRight size={18} /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {items.map((_, i) => <button key={i} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-brand-500' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />)}
          </div>
        </>}
      </div>
      {/* Thumbs */}
      {n > 1 && (
        <div className="flex gap-2 flex-wrap">
          {items.slice(0, 6).map((item, i) => (
            <button key={i} onClick={() => go(i)}
              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === idx ? 'border-brand-500 shadow-md' : 'border-white/10 hover:border-white/30'}`}>
              {item.kind === 'yt' ? (
                <><img src={item.thumb} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Play size={10} className="text-white" fill="white" /></div></>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="w-full h-full object-contain p-1 bg-gray-900" draggable={false} onContextMenu={e => e.preventDefault()} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Horizontal Tab System ─────────────────────────────────────────────────────

interface Tab { id: string; label: string; content: React.ReactNode; hidden?: boolean }

function TabPanel({ tabs }: { tabs: Tab[] }) {
  const visible = tabs.filter(t => !t.hidden);
  const [active, setActive] = useState(visible[0]?.id ?? '');
  const barRef = useRef<HTMLDivElement>(null);

  const current = visible.find(t => t.id === active);

  return (
    <div>
      {/* Tab bar */}
      <div ref={barRef} className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 bg-white sticky top-0 z-20" style={{ scrollbarWidth: 'none' }}>
        {visible.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 px-5 py-4 text-sm font-600 whitespace-nowrap border-b-2 transition-all ${active === tab.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="py-8 px-4 md:px-6 lg:px-8">
        {current?.content}
      </div>
    </div>
  );
}

// ── Tab Contents ──────────────────────────────────────────────────────────────

function SpecsContent({ specs, youtubeLink }: { specs: string[]; youtubeLink?: string }) {
  const groups = groupSpecs(specs);
  const multiGroup = Object.keys(groups).length > 1;
  return (
    <div className="max-w-4xl space-y-8">
      {Object.entries(groups).map(([grp, items]) => (
        <div key={grp}>
          {multiGroup && <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-3">{grp}</h4>}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {items.map((spec, i) => {
              const ci = spec.indexOf(':');
              if (ci === -1) return (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <CheckCircle2 size={13} className="text-brand-500 shrink-0" />
                  <span className="text-sm text-gray-700">{spec}</span>
                </div>
              );
              const label = spec.slice(0, ci).trim();
              const value = spec.slice(ci + 1).trim();
              return (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <span className="text-sm text-gray-500 w-48 shrink-0">{label}</span>
                  <span className="text-sm font-600 text-gray-900">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {youtubeLink && (
        <a href={youtubeLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-600 text-brand-600 hover:text-brand-700 hover:underline">
          ▶ Watch product demo on YouTube
        </a>
      )}
    </div>
  );
}

function ApplicationsContent({ features, applications }: { features: string[]; applications: string[] }) {
  return (
    <div className="max-w-4xl space-y-8">
      {features.length > 0 && (
        <div>
          <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-4">Key Features</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f, i) => {
              const ci = f.indexOf(':');
              const clean = ci !== -1 ? f.slice(0, ci).trim() : f.trim();
              const detail = ci !== -1 ? f.slice(ci + 1).trim() : '';
              return (
                <div key={i} className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                  <CheckCircle2 size={15} className="text-brand-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-600 text-gray-900">{clean}</p>
                    {detail && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {applications.length > 0 && (
        <div>
          <h4 className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-4">Applications</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {applications.map((app, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 transition-colors">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{app}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CertificationsContent({ certs, badges }: { certs: string[]; badges: string[] }) {
  const all = [...new Set([...certs, ...badges])];
  return (
    <div className="max-w-3xl grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {all.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 transition-colors">
          {badgeLogoMap[item]
            ? <img src={badgeLogoMap[item]} alt={item} className="w-10 h-10 object-contain shrink-0" />
            : <ShieldCheck size={20} className="text-brand-600 shrink-0" />}
          <span className="text-sm font-500 text-gray-800">{item}</span>
        </div>
      ))}
    </div>
  );
}

function SparePartsContent({ productId, productName }: { productId: string; productName: string }) {
  const [parts, setParts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/spare-parts?product=${productId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setParts(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [productId]);

  if (!loaded) return <p className="text-sm text-gray-400">Loading spare parts…</p>;
  if (!parts.length) return (
    <div className="text-center py-8">
      <p className="text-gray-500 text-sm mb-3">No spare parts listed for {productName} yet.</p>
      <Link href="/spare-parts" className="text-sm font-600 text-brand-600 hover:underline">Browse all spare parts →</Link>
    </div>
  );
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
        {parts.slice(0, 8).map(part => (
          <Link key={part._id}
            href={(() => {
              const n = part.compatibleProductNames?.[0];
              if (n) return `/spare-parts/${n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/${part.slug}`;
              return `/spare-parts/${part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts'}/${part.slug}`;
            })()}
            className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all">
            {part.images?.[0]
              ? <img src={part.images[0]} alt={part.name} className="w-full aspect-[4/3] object-contain bg-gray-50 p-4 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              : <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center"><Wrench size={28} className="text-gray-200" /></div>}
            <div className="p-4">
              {part.sku && <p className="text-[10px] font-600 text-brand-600 uppercase tracking-wide mb-1">{part.sku}</p>}
              <p className="font-600 text-gray-900 text-sm leading-snug mb-2 group-hover:text-brand-700 transition-colors">{part.name}</p>
              {part.priceRange && <p className="text-sm font-700 text-brand-600">{part.priceRange}</p>}
            </div>
          </Link>
        ))}
      </div>
      <Link href="/spare-parts" className="inline-flex items-center gap-1.5 text-sm font-600 text-brand-600 hover:text-brand-700 transition-colors">
        View all spare parts <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function DownloadsContent({ brochureUrl, productName, onBrochureClick }: { brochureUrl?: string; productName: string; onBrochureClick: () => void }) {
  if (!brochureUrl) return <p className="text-sm text-gray-400">No downloads available for this product.</p>;
  return (
    <div className="space-y-3 max-w-lg">
      <button onClick={onBrochureClick}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-600 text-sm transition-colors">
        <Download size={16} className="shrink-0" />
        <span>Product Brochure — {productName}</span>
        <ArrowRight size={13} className="ml-auto" />
      </button>
      <p className="text-xs text-gray-400">Technical datasheet, specifications, and compliance documentation.</p>
    </div>
  );
}

function FaqContent({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
      {faqs.map((f, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-100 transition-colors"
            aria-expanded={open === i}>
            <span className="text-sm font-600 text-gray-800 leading-snug">{f.q}</span>
            <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <div className="px-5 pb-5 pt-1"><p className="text-sm text-gray-600 leading-relaxed">{f.a}</p></div>}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  productId: string;
  initialProduct?: Record<string, unknown>;
}

const DEFAULT_FAQS = [
  { q: 'What fuel does this machine use?', a: 'The machine operates on regular petroleum/kerosene-based fogging oil. We recommend using certified fogging chemicals for best results and to maintain warranty validity.' },
  { q: 'Is this machine suitable for government tenders?', a: 'Yes. 100X Circle is GeM-registered and our machines meet government procurement standards. We have supplied to municipal corporations, health departments, and agriculture boards across India.' },
  { q: 'What is the delivery timeline?', a: 'Standard delivery is 5–7 working days across India. Bulk orders and government tenders may require 10–15 days. Contact us for urgent requirements.' },
  { q: 'Do you provide operator training?', a: 'Yes, we provide complimentary operator training on purchase. For large orders, on-site training can be arranged. Video training materials are also available.' },
  { q: 'Can I get a demo before purchasing?', a: 'Product demonstrations can be arranged at our Gurugram facility or at your location for bulk inquiries. Contact us to schedule.' },
];

export default function ProductDetailClient({ productId, initialProduct }: Props) {
  const [product, setProduct] = useState<any>(initialProduct ?? null);
  const [loading, setLoading] = useState(!initialProduct);
  const [brochureOpen, setBrochureOpen] = useState(false);

  useEffect(() => {
    if (initialProduct || !productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setProduct(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, initialProduct]);

  if (loading) return (
    <div className="pt-32 min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
  if (!product) return (
    <div className="pt-32 min-h-screen flex items-center justify-center text-center">
      <div>
        <p className="text-2xl font-700 text-gray-800 mb-2">Product not found</p>
        <Link href="/products" className="text-brand-600 hover:underline text-sm">← Back to products</Link>
      </div>
    </div>
  );

  // ── Field reads ────────────────────────────────────────────────────────────
  const name = safeStr(product.name);
  const h1 = safeStr(product.h1Title) || name;
  const tagline = safeStr(product.tagline);
  const price = safeStr(product.priceRange);
  const shortDesc = safeStr(product.shortDescription || product.detailedDescription);
  const brochureUrl = safeStr(product.brochureUrl) || undefined;
  const rating = Number(product.rating) || 0;
  const reviewsCount = Number(product.reviewsCount) || 0;

  const images = safeArr(product.imageUrls).filter(u => u.startsWith('http') || u.startsWith('/'));
  const specs = safeArr(product.specifications);
  const features = safeArr(product.features);
  const applications = safeArr(product.applications);
  const badges = safeArr(product.badges);
  const certifications = safeArr(product.certifications);

  const videoId = safeStr(product.heroVideoUrl || product.youtubeLink)
    ? getYouTubeId(safeStr(product.heroVideoUrl || product.youtubeLink))
    : null;

  const chapters = Array.isArray(product.filmChapters)
    ? (product.filmChapters as any[]).filter(c => c?.title).slice(0, 3)
    : [];

  // FAQs: handle both {q,a} objects and legacy "Q:|A:" strings
  const rawFaqs = Array.isArray(product.productFaqs) ? product.productFaqs : [];
  const parsedFaqs: Array<{ q: string; a: string }> = rawFaqs.flatMap((f: any) => {
    if (f && typeof f === 'object' && f.q) return [{ q: safeStr(f.q), a: safeStr(f.a) }];
    if (typeof f === 'string') {
      const m = f.match(/^Q:\s*(.*?)\s*\|\s*A:\s*([\s\S]*)$/i);
      return m ? [{ q: m[1].trim(), a: m[2].trim() }] : [];
    }
    return [];
  });
  const faqItems = parsedFaqs.length > 0 ? parsedFaqs : DEFAULT_FAQS;

  const waText = safeStr(product.whatsappMessageText) || `Hi, I'm interested in ${name}. Please share pricing.`;
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`;
  const shareUrl = `${SITE_URL}/products/${productId}`;

  // First 6 specs for the purchase-area panel
  const heroSpecs = specs.slice(0, 6);

  // Warranty
  const warrantyEnabled = Boolean(product.warrantyEnabled);
  const warrantyPeriod = safeStr(product.warrantyPeriod);
  const warrantyDesc = safeStr(product.warrantyDescription);
  const warrantyIcon = safeStr(product.warrantyIcon);

  // Tabs
  const tabs: Tab[] = [
    { id: 'specs', label: 'Specifications', hidden: specs.length === 0, content: <SpecsContent specs={specs} youtubeLink={safeStr(product.youtubeLink) || undefined} /> },
    { id: 'applications', label: 'Applications', hidden: features.length === 0 && applications.length === 0, content: <ApplicationsContent features={features} applications={applications} /> },
    { id: 'certifications', label: 'Certifications', hidden: certifications.length === 0 && badges.length === 0, content: <CertificationsContent certs={certifications} badges={badges} /> },
    { id: 'spareparts', label: 'Spare Parts', content: <SparePartsContent productId={productId} productName={name} /> },
    { id: 'downloads', label: 'Downloads', hidden: !brochureUrl, content: <DownloadsContent brochureUrl={brochureUrl} productName={name} onBrochureClick={() => setBrochureOpen(true)} /> },
    {
      id: 'warranty', label: 'Warranty', hidden: !warrantyEnabled, content: (
        <div className="max-w-xl flex items-start gap-5 p-6 bg-green-50 rounded-xl border border-green-100">
          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
            {warrantyIcon ? <span className="text-xl">{warrantyIcon}</span> : <ShieldCheck size={22} />}
          </div>
          <div>
            <h4 className="font-700 text-gray-900 mb-1">{warrantyPeriod ? `${warrantyPeriod} Manufacturer Warranty` : 'Manufacturer Warranty'}</h4>
            {warrantyDesc && <p className="text-sm text-gray-600 leading-relaxed">{warrantyDesc}</p>}
          </div>
        </div>
      )
    },
    { id: 'faq', label: 'FAQ', content: <FaqContent faqs={faqItems} /> },
  ];

  return (
    <div className="min-h-screen bg-white">
      <MobileCtaOverride audience="product" productName={name} whatsappMessage={safeStr(product.whatsappMessageText)} />
      <BrochureLeadModal open={brochureOpen} onClose={() => setBrochureOpen(false)} source="product-detail" brochureUrl={brochureUrl} productName={name} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — PURCHASE AREA
          Goal: everything visible above the fold on desktop
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-950 pt-20">
        <div className="container mx-auto px-4 md:px-6 pt-6 pb-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-cinema-300 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-cinema-300 line-clamp-1">{name}</span>
          </nav>

          <div className="grid lg:grid-cols-[55%_45%] gap-8 xl:gap-14 items-start">

            {/* LEFT: Gallery */}
            <div>
              {images.length > 0 || videoId
                ? <ProductGallery images={images} videoId={videoId} name={name} />
                : <div className="aspect-[4/3] rounded-2xl bg-cinema-800 flex items-center justify-center"><p className="text-cinema-500 text-sm">No image available</p></div>}
            </div>

            {/* RIGHT: Product info */}
            <div className="text-white flex flex-col gap-4">

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 4).map((b, i) => (
                    <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-600 px-2.5 py-1 rounded-full border ${b === 'Best Seller' ? 'bg-red-500/20 text-red-300 border-red-500/30' : b.includes('GeM') ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-brand-500/20 text-brand-300 border-brand-500/30'}`}>
                      {badgeLogoMap[b] && <img src={badgeLogoMap[b]} alt="" className="w-3.5 h-3.5 object-contain" />}
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Name & tagline */}
              <div>
                {product.category && <p className="text-[11px] font-700 text-brand-400 uppercase tracking-widest mb-1.5">{product.category}</p>}
                <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-800 text-white leading-tight">{h1}</h1>
                {tagline && <p className="text-sm text-cinema-400 italic mt-1">{tagline}</p>}
              </div>

              {/* Rating */}
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-600 fill-cinema-600'} />)}
                  </div>
                  <span className="text-xs text-cinema-400">{rating} ({reviewsCount} reviews)</span>
                </div>
              )}

              {/* Price */}
              {price && <div className="text-xl font-800 text-brand-400">{price}</div>}

              {/* Short description */}
              {shortDesc && (
                <div className="text-sm text-cinema-300 leading-relaxed line-clamp-4">
                  <RichContent html={shortDesc} />
                </div>
              )}

              {/* Key Specs Panel */}
              {heroSpecs.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-700 text-cinema-500 uppercase tracking-widest mb-3">Key Specifications</p>
                  <div className="divide-y divide-white/8">
                    {heroSpecs.map((spec, i) => {
                      const ci = spec.indexOf(':');
                      if (ci === -1) return <div key={i} className="py-1.5 text-xs text-cinema-300">{spec}</div>;
                      return (
                        <div key={i} className="flex gap-3 py-1.5">
                          <span className="text-[11px] text-cinema-500 w-36 shrink-0">{spec.slice(0, ci).trim()}</span>
                          <span className="text-xs font-600 text-white">{spec.slice(ci + 1).trim()}</span>
                        </div>
                      );
                    })}
                    {specs.length > 6 && (
                      <div className="pt-2">
                        <span className="text-[11px] text-brand-400">+ {specs.length - 6} more specs in Specifications tab ↓</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-2.5">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-700 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30 text-sm">
                  <MessageCircle size={16} /> Get Quote on WhatsApp
                </a>
                <a href="#rfq"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white hover:bg-white/8 font-500 rounded-full transition-all text-sm">
                  Request a Formal Quote
                </a>
                {brochureUrl && (
                  <button onClick={() => setBrochureOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-white/10 text-cinema-400 hover:text-white hover:border-white/20 font-500 rounded-full transition-all text-sm">
                    <Download size={14} /> Download Brochure
                  </button>
                )}
              </div>

              {/* Certification trust strip */}
              {(certifications.length > 0 || badges.length > 0) && (
                <div className="pt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  {[...new Set([...certifications, ...badges])].slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-cinema-400 text-xs">
                      <ShieldCheck size={11} className="text-brand-400" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — HORIZONTAL TABS
          All product detail inline. No stacking. Tab = content swap.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-t border-gray-100">
        <div className="container mx-auto">
          <TabPanel tabs={tabs} />
        </div>
        {/* SEO crawlable hidden content */}
        <div className="sr-only" aria-hidden>
          {specs.map((s, i) => <span key={i}>{s} </span>)}
          {applications.map((a, i) => <span key={i}>{a} </span>)}
          {certifications.map((c, i) => <span key={i}>{c} </span>)}
          {faqItems.map((f, i) => <span key={i}>{f.q} {f.a} </span>)}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — STORY BLOCKS (max 3)
          Only visible when filmChapters set in CMS
      ══════════════════════════════════════════════════════════════════ */}
      {chapters.length > 0 && (
        <section className="bg-gray-950 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <p className="text-[11px] font-700 text-brand-400 uppercase tracking-widest mb-2">Engineering</p>
              <h2 className="text-2xl md:text-3xl font-700 text-white">The machine behind the numbers</h2>
            </div>
            <div className="space-y-16">
              {chapters.map((ch: any, i: number) => {
                const chVid = safeStr(ch.videoUrl) ? getYouTubeId(safeStr(ch.videoUrl)) : null;
                const chImg = safeStr(ch.imageUrl);
                return (
                  <div key={i} className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 !== 0 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                    <div className="rounded-2xl overflow-hidden aspect-video bg-gray-800 flex items-center justify-center">
                      {chVid
                        ? <iframe src={`https://www.youtube.com/embed/${chVid}?rel=0`} title={ch.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                        : chImg
                          ? <img src={chImg} alt={ch.title} className="w-full h-full object-cover" loading="lazy" />
                          : <span className="text-4xl font-800 text-gray-600">{String(i + 1).padStart(2, '0')}</span>}
                    </div>
                    <div className="text-white space-y-4">
                      <p className="text-[11px] font-700 text-brand-400 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</p>
                      <h3 className="text-xl md:text-2xl font-700 leading-snug">{safeStr(ch.title)}</h3>
                      {safeStr(ch.subtitle) && <p className="text-brand-400 font-500">{safeStr(ch.subtitle)}</p>}
                      {safeStr(ch.description) && <p className="text-cinema-300 leading-relaxed">{safeStr(ch.description)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — CASE STUDIES / DEPLOYMENTS
      ══════════════════════════════════════════════════════════════════ */}
      <RealWorldDeployments productId={productId} productName={name} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — RFQ FORM
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-gray-950" id="rfq">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="text-white">
              <p className="text-[11px] font-700 text-brand-400 uppercase tracking-widest mb-4">Get a Quote</p>
              <h2 className="text-2xl md:text-3xl font-700 mb-4 text-balance">Request a quote for<br />{name}.</h2>
              <p className="text-cinema-300 mb-8 leading-relaxed">Tender, GeM, dealer, and bulk inquiries welcome. Response within 24 hours.</p>
              <div className="space-y-3">
                {['Competitive OEM pricing', 'GeM-registered for government procurement', 'Pan-India delivery', 'Spare parts guaranteed 5+ years', 'Post-sale technical support'].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-cinema-300 text-sm">
                    <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/30">
                  <MessageCircle size={16} /> WhatsApp Now
                </a>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
              <RFQForm variant="card" defaultProduct={name} defaultDescription={`Inquiring about: ${name}`} location={`product_detail_${productId}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="py-6 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/products" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-500 text-sm transition-colors group">
            <ChevronLeft size={15} className="group-hover:-translate-x-1 transition-transform" /> Back to all products
          </Link>
        </div>
      </div>
    </div>
  );
}
