'use client';
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, MessageCircle, Play, Star, Wrench, ShieldCheck, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import RFQForm from '@/components/forms/RFQForm';
import BrochureLeadModal from '@/components/BrochureLeadModal';
import { BUSINESS, SITE_URL } from '@/lib/seo/site-config';

// ─── utilities ───────────────────────────────────────────────────────────────

function safeStr(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v); }
function safeArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => typeof x === 'string' ? x : (x && typeof x === 'object' && 'name' in x && 'value' in x) ? `${(x as any).name}: ${(x as any).value}` : String(x)).filter(Boolean);
  if (typeof v === 'string') return v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return [];
}

function getYouTubeId(url: string): string | null {
  const m = safeStr(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  GeM: '/Logos clipart 2/GeM logo.png', 'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy Duty.png', 'Heavy duty': '/Logos clipart 2/Heavy Duty.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png', Ecofreidly: '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

const SPEC_GROUPS: [string, string][] = [
  ['engine','Engine'],['fuel','Engine'],['ignition','Engine'],['cylinder','Engine'],['rpm','Engine'],['power','Engine'],
  ['tank','Tank'],['capacity','Tank'],['solution','Tank'],['reservoir','Tank'],
  ['output','Performance'],['coverage','Performance'],['spray','Performance'],['droplet','Performance'],['fog','Performance'],['range','Performance'],['flow','Performance'],['pressure','Performance'],['speed','Performance'],
  ['weight','Dimensions'],['dimension','Dimensions'],['length','Dimensions'],['width','Dimensions'],['height','Dimensions'],['size','Dimensions'],
  ['material','Material'],['steel','Material'],['body','Material'],
  ['compliance','Compliance'],['certification','Compliance'],['approved','Compliance'],['standard','Compliance'],['bis','Compliance'],['iso','Compliance'],
];

function groupSpecs(specs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const spec of specs) {
    const label = spec.split(':')[0].toLowerCase();
    let grp = 'General';
    for (const [kw, g] of SPEC_GROUPS) { if (label.includes(kw)) { grp = g; break; } }
    (out[grp] = out[grp] || []).push(spec);
  }
  return out;
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

type MI = { kind: 'image'; url: string } | { kind: 'yt'; videoId: string; thumb: string };

function Gallery({ images, videoId, name }: { images: string[]; videoId: string | null; name: string }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('center center');

  const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const items: MI[] = [
    ...images.map((url): MI => ({ kind: 'image', url })),
    ...(videoId && ytThumb ? [{ kind: 'yt' as const, videoId, thumb: ytThumb }] : []),
  ];
  const n = items.length;
  const cur = items[idx];
  const go = (i: number) => { setIdx(i); setPlaying(false); };

  return (
    <div className="flex flex-col gap-3">
      {/* Main viewer */}
      <div
        className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
        style={{ aspectRatio: '4/3' }}
        onMouseMove={e => {
          if (cur?.kind !== 'image') return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
          setZoomed(true);
        }}
        onMouseLeave={() => setZoomed(false)}
      >
        {!cur ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No image</div>
        ) : cur.kind === 'yt' ? (
          playing
            ? <iframe src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&playsinline=1&rel=0`} title="Product video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
            : (
              <button className="absolute inset-0 w-full h-full flex items-center justify-center group" onClick={() => setPlaying(true)} aria-label="Play video">
                <img src={cur.thumb} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={20} className="text-gray-900 ml-1" fill="currentColor" />
                </div>
              </button>
            )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(cur as any).url} alt={name} fetchPriority="high"
            className="absolute inset-0 w-full h-full object-contain p-6 transition-transform duration-200"
            style={{ transform: zoomed ? 'scale(2)' : 'scale(1)', transformOrigin: origin }}
            draggable={false} onContextMenu={e => e.preventDefault()}
          />
        )}
        {n > 1 && (
          <>
            <button onClick={() => go((idx - 1 + n) % n)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-700 transition-all border border-gray-100">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => go((idx + 1) % n)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-700 transition-all border border-gray-100">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {items.map((_, i) => (
                <button key={i} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {n > 1 && (
        <div className="flex gap-2">
          {items.slice(0, 6).map((item, i) => (
            <button key={i} onClick={() => go(i)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === idx ? 'border-brand-600' : 'border-gray-200 hover:border-gray-400'}`}>
              {item.kind === 'yt'
                ? <><img src={item.thumb} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Play size={9} fill="white" className="text-white" /></div></>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={item.url} alt="" className="w-full h-full object-contain p-1 bg-gray-50" draggable={false} onContextMenu={e => e.preventDefault()} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Accordion (Nuuk-style: chevron right, white bg, seamless) ────────────────

interface AItem { id: string; label: string; content: React.ReactNode; hidden?: boolean; }

function Accordion({ items, defaultOpen }: { items: AItem[]; defaultOpen?: string }) {
  const visible = items.filter(i => !i.hidden);
  const [open, setOpen] = useState<string>(defaultOpen ?? visible[0]?.id ?? '');

  return (
    <div className="border-t border-gray-200">
      {visible.map(item => (
        <div key={item.id} className="border-b border-gray-200">
          <button
            onClick={() => setOpen(open === item.id ? '' : item.id)}
            aria-expanded={open === item.id}
            className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
          >
            <span className={`text-sm font-medium ${open === item.id ? 'text-gray-900' : 'text-gray-700'}`}>
              {item.label}
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-gray-400 transition-transform duration-200 ${open === item.id ? 'rotate-180' : ''}`}
            />
          </button>
          {open === item.id && (
            <div className="px-6 pb-8 pt-2">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Accordion tab contents ───────────────────────────────────────────────────

function SpecsTab({ specs, youtubeLink }: { specs: string[]; youtubeLink?: string }) {
  const groups = groupSpecs(specs);
  const multi = Object.keys(groups).length > 1;
  return (
    <div className="space-y-6 max-w-2xl">
      {Object.entries(groups).map(([grp, items]) => (
        <div key={grp}>
          {multi && <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">{grp}</p>}
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {items.map((spec, i) => {
              const ci = spec.indexOf(':');
              if (ci === -1) return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white even:bg-gray-50/50">
                  <CheckCircle2 size={13} className="text-brand-500 shrink-0" />
                  <span className="text-sm text-gray-700">{spec}</span>
                </div>
              );
              return (
                <div key={i} className="flex items-center gap-4 px-4 py-3 bg-white even:bg-gray-50/50">
                  <span className="text-sm text-gray-500 w-44 shrink-0">{spec.slice(0, ci).trim()}</span>
                  <span className="text-sm font-medium text-gray-900">{spec.slice(ci + 1).trim()}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {youtubeLink && (
        <a href={youtubeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
          ▶ Watch product demo on YouTube
        </a>
      )}
    </div>
  );
}

function FeaturesTab({ chapters }: { chapters: any[] }) {
  return (
    <div className="space-y-10 max-w-3xl">
      {chapters.map((ch: any, i: number) => {
        const chVid = safeStr(ch.videoUrl) ? getYouTubeId(safeStr(ch.videoUrl)) : null;
        const chImg = safeStr(ch.imageUrl);
        return (
          <div key={i} className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 !== 0 ? 'md:[&>*:first-child]:order-2' : ''}`}>
            <div className="rounded-lg overflow-hidden aspect-video bg-gray-100 flex items-center justify-center">
              {chVid
                ? <iframe src={`https://www.youtube.com/embed/${chVid}?rel=0`} title={safeStr(ch.title)} allowFullScreen className="w-full h-full" />
                : chImg
                  ? <img src={chImg} alt={safeStr(ch.title)} className="w-full h-full object-cover" loading="lazy" />
                  : <span className="text-3xl font-bold text-gray-200">{String(i + 1).padStart(2, '0')}</span>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="text-lg font-semibold text-gray-900 leading-snug">{safeStr(ch.title)}</h3>
              {safeStr(ch.subtitle) && <p className="text-sm text-brand-600">{safeStr(ch.subtitle)}</p>}
              {safeStr(ch.description) && <p className="text-sm text-gray-600 leading-relaxed">{safeStr(ch.description)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationsTab({ features, applications }: { features: string[]; applications: string[] }) {
  return (
    <div className="space-y-6 max-w-3xl">
      {features.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">Key Features</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {features.map((f, i) => {
              const ci = f.indexOf(':');
              return (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-100 bg-gray-50">
                  <CheckCircle2 size={14} className="text-brand-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{ci !== -1 ? f.slice(0, ci).trim() : f}</span>
                    {ci !== -1 && <p className="text-xs text-gray-500 mt-0.5">{f.slice(ci + 1).trim()}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {applications.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">Applications</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {applications.map((app, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-lg border border-gray-100 bg-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{app}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CertificationsTab({ certs, badges }: { certs: string[]; badges: string[] }) {
  const all = [...new Set([...certs, ...badges])];
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
      {all.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-gray-100 bg-gray-50">
          {badgeLogoMap[item]
            ? <img src={badgeLogoMap[item]} alt={item} className="w-8 h-8 object-contain shrink-0" />
            : <ShieldCheck size={18} className="text-brand-600 shrink-0" />}
          <span className="text-sm text-gray-800">{item}</span>
        </div>
      ))}
    </div>
  );
}

function SparePartsTab({ productId, productName }: { productId: string; productName: string }) {
  const [parts, setParts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/spare-parts?product=${productId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setParts(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [productId]);

  if (!loaded) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!parts.length) return (
    <div>
      <p className="text-sm text-gray-500 mb-2">No spare parts listed for {productName} yet.</p>
      <Link href="/spare-parts" className="text-sm text-brand-600 hover:underline">Browse all spare parts →</Link>
    </div>
  );
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
        {parts.slice(0, 8).map(part => (
          <Link key={part._id}
            href={(() => {
              const n = part.compatibleProductNames?.[0];
              const seg = n ? n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : (part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts');
              return `/spare-parts/${seg}/${part.slug}`;
            })()}
            className="group block rounded-lg border border-gray-100 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
            {part.images?.[0]
              ? <img src={part.images[0]} alt={part.name} className="w-full aspect-square object-contain bg-gray-50 p-3" loading="lazy" />
              : <div className="w-full aspect-square bg-gray-50 flex items-center justify-center"><Wrench size={24} className="text-gray-200" /></div>}
            <div className="p-3">
              {part.sku && <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide mb-0.5">{part.sku}</p>}
              <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{part.name}</p>
              {part.priceRange && <p className="text-sm font-semibold text-gray-900 mt-0.5">{part.priceRange}</p>}
            </div>
          </Link>
        ))}
      </div>
      <Link href="/spare-parts" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        View all spare parts <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function CaseStudiesTab({ productId, productName }: { productId: string; productName: string }) {
  const [studies, setStudies] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/case-studies/by-product?productId=${productId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setStudies(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [productId]);

  if (!loaded) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!studies.length) return (
    <div>
      <p className="text-sm text-gray-500 mb-2">No case studies for {productName} yet.</p>
      <Link href="/case-studies" className="text-sm text-brand-600 hover:underline">View all case studies →</Link>
    </div>
  );
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {studies.map((cs: any) => (
          <Link key={cs._id} href={`/case-studies/${cs.slug}`}
            className="group block rounded-lg border border-gray-100 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
            {cs.images?.[0]
              ? <img src={cs.images[0]} alt={cs.title} className="w-full aspect-video object-cover" loading="lazy" />
              : <div className="w-full aspect-video bg-gray-50 flex items-center justify-center"><Building2 size={24} className="text-gray-200" /></div>}
            <div className="p-4">
              {(cs.industry || cs.state) && (
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {cs.industry && <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{cs.industry}</span>}
                  {cs.state && <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cs.state}</span>}
                </div>
              )}
              <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{cs.title}</p>
              {cs.customer && <p className="text-xs text-gray-500 mt-1">{cs.customer}</p>}
            </div>
          </Link>
        ))}
      </div>
      <Link href="/case-studies" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        View all case studies <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function FaqTab({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-2xl divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
      {faqs.map((f, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-800 leading-snug">{f.q}</span>
            <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="px-5 pb-5 pt-1 bg-gray-50/50">
              <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DEFAULT_FAQS = [
  { q: 'What fuel does this machine use?', a: 'The machine operates on regular petroleum/kerosene-based fogging oil. We recommend certified fogging chemicals for best results and to maintain warranty validity.' },
  { q: 'Is this machine suitable for government tenders?', a: 'Yes. 100X Circle is GeM-registered. We have supplied to municipal corporations, health departments, and agriculture boards across India. Tender-ready documentation available in 48 hours.' },
  { q: 'What is the delivery timeline?', a: 'Standard delivery is 5–7 working days across India. Bulk orders and government tenders may require 10–15 days. Contact us for urgent requirements.' },
  { q: 'Do you provide operator training?', a: 'Yes — complimentary operator training on purchase. On-site training available for large orders. Video training materials also provided.' },
  { q: 'Can I get a demo before purchasing?', a: 'Product demonstrations available at our Gurugram facility or at your location for bulk inquiries. Contact us to schedule.' },
];

interface Props { productId: string; initialProduct?: Record<string, unknown>; }

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
      <div className="w-10 h-10 border-2 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
  if (!product) return (
    <div className="pt-32 min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-xl font-semibold text-gray-900 mb-2">Product not found</p>
        <Link href="/products" className="text-sm text-brand-600 hover:underline">← Back to products</Link>
      </div>
    </div>
  );

  // field reads
  const name         = safeStr(product.name);
  const h1           = safeStr(product.h1Title) || name;
  const tagline      = safeStr(product.tagline);
  const price        = safeStr(product.priceRange);
  const shortDesc    = safeStr(product.shortDescription || product.detailedDescription);
  const brochureUrl  = safeStr(product.brochureUrl) || undefined;
  const rating       = Number(product.rating) || 0;
  const reviewsCount = Number(product.reviewsCount) || 0;
  const images       = safeArr(product.imageUrls).filter(u => u.startsWith('http') || u.startsWith('/'));
  const specs        = safeArr(product.specifications);
  const features     = safeArr(product.features);
  const applications = safeArr(product.applications);
  const badges       = safeArr(product.badges);
  const certs        = safeArr(product.certifications);
  const allCerts     = [...new Set([...certs, ...badges])];
  const videoId      = getYouTubeId(safeStr(product.heroVideoUrl || product.youtubeLink));
  const chapters     = (Array.isArray(product.filmChapters) ? product.filmChapters as any[] : []).filter(c => c?.title).slice(0, 3);
  const warrantyOn   = Boolean(product.warrantyEnabled);
  const warrantyPeriod = safeStr(product.warrantyPeriod);
  const warrantyDesc = safeStr(product.warrantyDescription);
  const warrantyIcon = safeStr(product.warrantyIcon);

  const rawFaqs = Array.isArray(product.productFaqs) ? product.productFaqs : [];
  const parsedFaqs: Array<{ q: string; a: string }> = rawFaqs.flatMap((f: any) => {
    if (f?.q) return [{ q: safeStr(f.q), a: safeStr(f.a) }];
    if (typeof f === 'string') { const m = f.match(/^Q:\s*(.*?)\s*\|\s*A:\s*([\s\S]*)$/i); return m ? [{ q: m[1], a: m[2] }] : []; }
    return [];
  });
  const faqItems = parsedFaqs.length > 0 ? parsedFaqs : DEFAULT_FAQS;

  const waText = safeStr(product.whatsappMessageText) || `Hi, I'm interested in ${name}. Please share pricing and availability.`;
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`;

  // first 5 specs for the purchase panel
  const heroSpecs = specs.slice(0, 5);

  const accordionItems: AItem[] = [
    { id: 'specs',    label: 'Technical Specifications',  hidden: specs.length === 0,                             content: <SpecsTab specs={specs} youtubeLink={safeStr(product.youtubeLink) || undefined} /> },
    { id: 'features', label: 'Product Features',           hidden: chapters.length === 0,                         content: <FeaturesTab chapters={chapters} /> },
    { id: 'apps',     label: 'Applications',               hidden: features.length === 0 && applications.length === 0, content: <ApplicationsTab features={features} applications={applications} /> },
    { id: 'certs',    label: 'Certifications & Approvals', hidden: allCerts.length === 0,                         content: <CertificationsTab certs={certs} badges={badges} /> },
    {
      id: 'warranty', label: 'Warranty',                   hidden: !warrantyOn,
      content: (
        <div className="flex items-start gap-4 p-5 bg-green-50 rounded-lg border border-green-100 max-w-lg">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
            {warrantyIcon ? <span className="text-lg">{warrantyIcon}</span> : <ShieldCheck size={18} />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">{warrantyPeriod ? `${warrantyPeriod} Manufacturer Warranty` : 'Manufacturer Warranty'}</p>
            {warrantyDesc && <p className="text-sm text-gray-600 leading-relaxed">{warrantyDesc}</p>}
          </div>
        </div>
      ),
    },
    { id: 'parts',    label: 'Spare Parts',                content: <SparePartsTab productId={productId} productName={name} /> },
    { id: 'cases',    label: 'Case Studies',               content: <CaseStudiesTab productId={productId} productName={name} /> },
    {
      id: 'downloads', label: 'Downloads',                 hidden: !brochureUrl,
      content: (
        <div className="max-w-sm space-y-2">
          <button onClick={() => setBrochureOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-medium transition-colors">
            <Download size={15} className="shrink-0 text-brand-600" />
            <span>Product Brochure — {name}</span>
            <ArrowRight size={13} className="ml-auto text-gray-400" />
          </button>
          <p className="text-xs text-gray-400">Technical datasheet, specifications, and compliance documentation.</p>
        </div>
      ),
    },
    { id: 'faq',      label: 'Frequently Asked Questions', content: <FaqTab faqs={faqItems} /> },
  ];

  return (
    <div className="min-h-screen bg-white">
      <MobileCtaOverride audience="product" productName={name} whatsappMessage={waText} />
      <BrochureLeadModal open={brochureOpen} onClose={() => setBrochureOpen(false)} source="product-detail" brochureUrl={brochureUrl} productName={name} />

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <div className="pt-20 pb-0 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-gray-600 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-[240px]">{name}</span>
          </nav>
        </div>
      </div>

      {/* ── Purchase area — WHITE, same bg as accordion below ──────── */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-16 items-start">

            {/* LEFT: Gallery */}
            <div>
              {images.length > 0 || videoId
                ? <Gallery images={images} videoId={videoId} name={name} />
                : <div className="aspect-[4/3] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-sm">No image available</div>}
            </div>

            {/* RIGHT: Product info */}
            <div className="flex flex-col gap-5">

              {/* Category + badges */}
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">{product.category}</span>
                )}
                {badges.slice(0, 3).map((b, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    b === 'Best Seller' ? 'bg-red-50 text-red-600 border-red-200' :
                    b.includes('GeM') ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-brand-50 text-brand-600 border-brand-200'
                  }`}>
                    {badgeLogoMap[b] && <img src={badgeLogoMap[b]} alt="" className="w-3 h-3 object-contain" />}
                    {b}
                  </span>
                ))}
              </div>

              {/* Name */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{h1}</h1>
                {tagline && <p className="text-sm text-gray-500 italic mt-1">{tagline}</p>}
              </div>

              {/* Rating */}
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{rating} ({reviewsCount} reviews)</span>
                </div>
              )}

              {/* Price */}
              {price && <p className="text-2xl font-bold text-gray-900">{price}</p>}

              {/* Short description */}
              {shortDesc && (
                <div className="text-sm text-gray-600 leading-relaxed">
                  <RichContent html={shortDesc} />
                </div>
              )}

              {/* Key specs */}
              {heroSpecs.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Key Specifications</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {heroSpecs.map((spec, i) => {
                      const ci = spec.indexOf(':');
                      if (ci === -1) return <div key={i} className="px-4 py-2.5 text-sm text-gray-700">{spec}</div>;
                      return (
                        <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                          <span className="text-sm text-gray-500 w-36 shrink-0">{spec.slice(0, ci).trim()}</span>
                          <span className="text-sm font-medium text-gray-900">{spec.slice(ci + 1).trim()}</span>
                        </div>
                      );
                    })}
                    {specs.length > 5 && (
                      <div className="px-4 py-2 bg-gray-50">
                        <span className="text-xs text-brand-600">+{specs.length - 5} more in Specifications below ↓</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-2.5">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-sm">
                  <MessageCircle size={16} />
                  Get Quote on WhatsApp
                </a>
                <a href="#rfq"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 font-medium rounded-lg transition-colors text-sm">
                  Request a Formal Quote
                </a>
                {brochureUrl && (
                  <button onClick={() => setBrochureOpen(true)}
                    className="inline-flex items-center justify-center gap-2 w-full px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <Download size={14} />
                    Download Brochure (PDF)
                  </button>
                )}
              </div>

              {/* Trust badges */}
              {allCerts.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                  {allCerts.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <ShieldCheck size={11} className="text-brand-500" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Accordion — same white bg, no section break, Nuuk-style ── */}
      <div className="bg-white max-w-7xl mx-auto px-4 md:px-6">
        <Accordion items={accordionItems} defaultOpen="specs" />
      </div>

      {/* SEO-crawlable hidden content */}
      <div className="sr-only" aria-hidden>
        {specs.map((s, i) => <span key={i}>{s} </span>)}
        {applications.map((a, i) => <span key={i}>{a} </span>)}
        {certs.map((c, i) => <span key={i}>{c} </span>)}
        {faqItems.map((f, i) => <span key={i}>{f.q} {f.a} </span>)}
      </div>

      {/* ── RFQ — gray-50 to separate from accordion ──────────────── */}
      <section className="py-16 md:py-20 bg-gray-50 border-t border-gray-200 mt-8" id="rfq">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-4">Request a Quote</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{name}</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Tender, GeM, dealer, and bulk inquiries welcome. We respond within 24 hours.</p>
              <ul className="space-y-2.5">
                {['Competitive OEM pricing', 'GeM-registered — government procurement ready', 'Pan-India delivery 5–7 working days', 'Spare parts guaranteed 5+ years', 'Post-sale technical support'].map((p, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm">
                  <MessageCircle size={15} /> WhatsApp Now
                </a>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-200">
              <RFQForm variant="card" defaultProduct={name} defaultDescription={`Inquiring about: ${name}`} location={`product_detail_${productId}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="py-5 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ChevronLeft size={14} /> Back to all products
          </Link>
        </div>
      </div>
    </div>
  );
}
