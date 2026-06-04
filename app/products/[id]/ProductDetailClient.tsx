'use client';
import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, Download, MessageCircle, Play,
  Star, Wrench, ShieldCheck, Building2, ArrowRight, CheckCircle2, Zap,
  Droplets, Gauge, Weight, Award, Leaf, Phone, Package, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { RichContent } from '@/components/RichContent';
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext';
import RFQForm from '@/components/forms/RFQForm';
import BrochureLeadModal from '@/components/BrochureLeadModal';
import { BUSINESS } from '@/lib/seo/site-config';
import ProductCinematicHero from '@/components/product/ProductCinematicHero';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function s(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v); }
function arr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => typeof x === 'string' ? x : (x && typeof x === 'object' && 'name' in x && 'value' in x) ? `${(x as any).name}: ${(x as any).value}` : String(x)).filter(Boolean);
  if (typeof v === 'string') return v.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return [];
}
function ytId(url: string): string | null {
  const m = s(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const BADGE_LOGOS: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  GeM: '/Logos clipart 2/GeM logo.png', 'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy Duty.png', 'Heavy duty': '/Logos clipart 2/Heavy Duty.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png', Ecofreidly: '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
};

// Map feature label keywords → Lucide icon
function featureIcon(label: string): React.ReactNode {
  const l = label.toLowerCase();
  if (l.includes('engine') || l.includes('power') || l.includes('hp')) return <Zap size={22} />;
  if (l.includes('tank') || l.includes('litre') || l.includes('capacity') || l.includes('liters')) return <Droplets size={22} />;
  if (l.includes('range') || l.includes('fog') || l.includes('output') || l.includes('coverage')) return <Gauge size={22} />;
  if (l.includes('weight') || l.includes('kg')) return <Weight size={22} />;
  if (l.includes('eco') || l.includes('environ')) return <Leaf size={22} />;
  if (l.includes('gem') || l.includes('certif') || l.includes('iso') || l.includes('bis')) return <Award size={22} />;
  if (l.includes('warr') || l.includes('support')) return <ShieldCheck size={22} />;
  if (l.includes('deliver') || l.includes('ship')) return <Package size={22} />;
  return <CheckCircle2 size={22} />;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Gallery — stays sticky on desktop while right panel scrolls
// ─────────────────────────────────────────────────────────────────────────────

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
  const go = (i: number) => { setIdx((i + n) % n); setPlaying(false); };

  return (
    <div className="flex flex-col gap-3">
      {/* Main image viewer */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 cursor-zoom-in select-none"
        style={{ aspectRatio: '1/1' }}
        onMouseMove={e => {
          if (cur?.kind !== 'image') return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
          setZoomed(true);
        }}
        onMouseLeave={() => setZoomed(false)}
      >
        {!cur && <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No image</div>}

        {cur?.kind === 'yt' && (
          playing
            ? <iframe src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&playsinline=1&rel=0`} title="Product video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
            : (
              <button className="absolute inset-0 w-full h-full flex items-center justify-center group" onClick={() => setPlaying(true)} aria-label="Play">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.thumb} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
                <div className="absolute w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={22} className="text-gray-900 ml-1" fill="currentColor" />
                </div>
              </button>
            )
        )}

        {cur?.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(cur as any).url} alt={name} fetchPriority="high"
            width={600} height={600}
            className="absolute inset-0 w-full h-full object-contain p-8 transition-transform duration-150"
            style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
            draggable={false} onContextMenu={e => e.preventDefault()}
          />
        )}

        {/* Nav arrows */}
        {n > 1 && (
          <>
            <button onClick={() => go(idx - 1)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-all border border-gray-100">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(idx + 1)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-all border border-gray-100">
              <ChevronRight size={18} />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {items.map((_, i) => (
                <button key={i} onClick={() => go(i)} aria-label={`View image ${i + 1}`} aria-pressed={i === idx} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {n > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.slice(0, 8).map((item, i) => (
            <button key={i} onClick={() => go(i)} aria-label={item.kind === 'yt' ? 'View product video' : `View image ${i + 1}`} aria-pressed={i === idx} className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === idx ? 'border-brand-600 shadow-sm' : 'border-transparent hover:border-gray-300'} bg-gray-50`}>
              {item.kind === 'yt'
                ? <><img src={item.thumb} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Play size={10} fill="white" className="text-white" /></div></>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={item.url} alt="" className="w-full h-full object-contain p-2" draggable={false} onContextMenu={e => e.preventDefault()} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature icons row — Nuuk-style horizontal grid in right panel
// ─────────────────────────────────────────────────────────────────────────────

function FeatureIconsRow({ features }: { features: string[] }) {
  const items = features.slice(0, 6);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-4 border-y border-gray-100">
      {items.map((f, i) => {
        const ci = f.indexOf(':');
        const label = ci !== -1 ? f.slice(0, ci).trim() : f.trim();
        const value = ci !== -1 ? f.slice(ci + 1).trim() : '';
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors text-center">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              {featureIcon(label)}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 leading-tight">{label}</span>
            {value && <span className="text-[10px] text-brand-600 font-bold leading-none">{value}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust row — always visible, 4 signals
// ─────────────────────────────────────────────────────────────────────────────

function TrustRow({ certs, badges }: { certs: string[]; badges: string[] }) {
  const defaults = [
    { icon: <Award size={16} />, label: 'GeM Registered', sub: 'Govt. procurement ready' },
    { icon: <ShieldCheck size={16} />, label: 'BIS / ISO Certified', sub: 'Quality assured' },
    { icon: <Package size={16} />, label: 'Pan-India Delivery', sub: '5–7 working days' },
    { icon: <Phone size={16} />, label: '5-Year Parts Support', sub: 'After-sales care' },
  ];
  // Override from product data if available
  const all = [...new Set([...certs, ...badges])].slice(0, 4);
  const items = all.length >= 2
    ? all.map(c => ({ icon: BADGE_LOGOS[c] ? <img src={BADGE_LOGOS[c]} alt={c} className="w-4 h-4 object-contain" /> : <ShieldCheck size={16} />, label: c, sub: 'Certified' }))
    : defaults;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-t border-gray-100">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mt-0.5">
            {item.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">{item.label}</p>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Specs table — grouped, clean
// ─────────────────────────────────────────────────────────────────────────────

function SpecsTable({ specs, youtubeLink }: { specs: string[]; youtubeLink?: string }) {
  const groups = groupSpecs(specs);
  const multi = Object.keys(groups).length > 1;
  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([grp, items]) => (
        <div key={grp}>
          {multi && <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-2.5">{grp}</p>}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {items.map((spec, i) => {
              const ci = spec.indexOf(':');
              if (ci === -1) return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <CheckCircle2 size={13} className="text-brand-500 shrink-0" />
                  <span className="text-sm text-gray-700">{spec}</span>
                </div>
              );
              return (
                <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <span className="text-sm text-gray-400 w-44 shrink-0">{spec.slice(0, ci).trim()}</span>
                  <span className="text-sm font-semibold text-gray-900">{spec.slice(ci + 1).trim()}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {youtubeLink && (
        <a href={youtubeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
          <Play size={14} /> Watch product demo on YouTube
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured video — large full-width embed section
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedVideoSection({ videoId, productName }: { videoId: string; productName: string }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  return (
    <section className="bg-gray-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">Watch In Action</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{productName} — Product Demo</h2>
        </div>
        <div className="relative rounded-2xl overflow-hidden aspect-video max-w-4xl mx-auto shadow-2xl">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={`${productName} product demo`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button
              className="absolute inset-0 w-full h-full flex items-center justify-center group"
              onClick={() => setPlaying(true)}
              aria-label="Play product demo video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={`${productName} demo`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              {/* Play button */}
              <div className="absolute w-20 h-20 bg-brand-600 group-hover:bg-brand-700 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all">
                <Play size={32} className="text-white ml-2" fill="white" />
              </div>
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <span className="inline-block bg-black/60 text-white text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
                  Watch full demo on YouTube
                </span>
              </div>
            </button>
          )}
        </div>
        {/* Direct YouTube link */}
        <div className="text-center mt-6">
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Play size={13} /> Open on YouTube
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UGC / Social proof image carousel
// ─────────────────────────────────────────────────────────────────────────────

function UGCCarousel({ images, productName }: { images: string[]; productName: string }) {
  if (!images.length) return null;
  return (
    <section className="py-14 bg-gray-50 border-t border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">From the Field</p>
        <h2 className="text-xl font-bold text-gray-900">{productName} — Real-world Deployments</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
        {images.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-72 md:w-80 aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 snap-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`${productName} deployment ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product features (filmChapters) — editorial, large images, Nuuk-style
// ─────────────────────────────────────────────────────────────────────────────

function ProductFeaturesSection({ chapters }: { chapters: any[] }) {
  if (!chapters.length) return null;
  return (
    <>
      {chapters.map((ch: any, i: number) => {
        const chVid = s(ch.videoUrl) ? ytId(s(ch.videoUrl)) : null;
        const chImg = s(ch.imageUrl);
        const isDark = i % 2 !== 0;
        const isReverse = i % 2 !== 0;

        return (
          <section
            key={i}
            className={`border-t ${isDark ? 'bg-gray-950 border-white/5' : 'bg-white border-gray-100'}`}
          >
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
              <div className={`flex flex-col ${isReverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-center`}>

                {/* LARGE IMAGE / VIDEO — 60% on desktop */}
                <div className="w-full lg:w-[60%] shrink-0">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 shadow-xl">
                    {chVid ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${chVid}?rel=0`}
                        title={s(ch.title)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : chImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chImg}
                        alt={s(ch.title)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-7xl font-black text-gray-200 select-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TEXT — 40% on desktop */}
                <div className="w-full lg:w-[40%] space-y-5">
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className={`text-2xl md:text-3xl font-bold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {s(ch.title)}
                  </h3>
                  {s(ch.subtitle) && (
                    <p className={`text-base font-semibold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                      {s(ch.subtitle)}
                    </p>
                  )}
                  {s(ch.description) && (
                    <p className={`leading-relaxed text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {s(ch.description)}
                    </p>
                  )}
                  {/* Video link if chapter has video */}
                  {chVid && (
                    <a
                      href={`https://www.youtube.com/watch?v=${chVid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-brand-400 hover:text-brand-300' : 'text-brand-600 hover:text-brand-700'}`}
                    >
                      <Play size={14} fill="currentColor" /> Watch on YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Applications — always visible grid
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationsSection({ features, applications }: { features: string[]; applications: string[] }) {
  if (!features.length && !applications.length) return null;
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {features.length > 0 && (
          <div className="mb-12">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Key Features</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {features.map((f, i) => {
                const ci = f.indexOf(':');
                const label = ci !== -1 ? f.slice(0, ci).trim() : f;
                const detail = ci !== -1 ? f.slice(ci + 1).trim() : '';
                return (
                  <div key={i} className="flex items-start gap-3.5 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                      {featureIcon(label)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
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
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Applications</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
              {applications.map((app, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <span className="text-sm text-gray-700 leading-relaxed">{app}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Certifications — always visible
// ─────────────────────────────────────────────────────────────────────────────

function CertificationsSection({ certs, badges }: { certs: string[]; badges: string[] }) {
  const all = [...new Set([...certs, ...badges])];
  if (!all.length) return null;
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Certifications &amp; Approvals</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Built to standard. Verified by labs.</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {all.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {BADGE_LOGOS[item]
                ? <img src={BADGE_LOGOS[item]} alt={item} className="w-10 h-10 object-contain shrink-0" />
                : <ShieldCheck size={22} className="text-brand-600 shrink-0" />}
              <span className="text-sm font-medium text-gray-800">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spare parts — always visible grid
// ─────────────────────────────────────────────────────────────────────────────

function SparePartsSection({ productId, productName }: { productId: string; productName: string }) {
  const [parts, setParts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/spare-parts?product=${productId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setParts(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [productId]);

  if (!loaded || !parts.length) return null;
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Genuine OEM Parts</p>
            <h2 className="text-2xl font-bold text-gray-900">Spare Parts for {productName}</h2>
          </div>
          <Link href="/spare-parts" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {parts.slice(0, 10).map(part => (
            <Link key={part._id}
              href={(() => {
                const n = part.compatibleProductNames?.[0];
                const seg = n ? n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : (part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts');
                return `/spare-parts/${seg}/${part.slug}`;
              })()}
              className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-brand-300 hover:shadow-md transition-all">
              <div className="aspect-square bg-gray-50">
                {part.images?.[0]
                  ? <img src={part.images[0]} alt={part.name} className="w-full h-full object-contain p-3" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center"><Wrench size={28} className="text-gray-200" /></div>}
              </div>
              <div className="p-3">
                {part.sku && <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide mb-0.5">{part.sku}</p>}
                <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{part.name}</p>
                {part.priceRange && <p className="text-sm font-bold text-gray-900 mt-1">{part.priceRange}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Case studies — always visible
// ─────────────────────────────────────────────────────────────────────────────

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
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Real Deployments</p>
            <h2 className="text-2xl font-bold text-gray-900">Case Studies</h2>
          </div>
          <Link href="/case-studies" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
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
                    {cs.industry && <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{cs.industry}</span>}
                    {cs.state && <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{cs.state}</span>}
                  </div>
                )}
                <p className="font-semibold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{cs.title}</p>
                {cs.customer && <p className="text-xs text-gray-500 mt-1">{cs.customer}</p>}
                <p className="text-brand-600 text-sm font-semibold mt-3 inline-flex items-center gap-1">Read study <ArrowRight size={13} /></p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — THE ONLY ACCORDION (Nuuk-accurate)
// ─────────────────────────────────────────────────────────────────────────────

function FAQSection({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Common Questions</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200 bg-white">
          {faqs.map((f, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-900 leading-snug">{f.q}</span>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open === i ? 'rotate-180 text-brand-600' : ''}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-5 pt-1 bg-gray-50/50">
                  <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FAQS = [
  { q: 'What fuel does this machine use?', a: 'The machine operates on regular petroleum/kerosene-based fogging oil. We recommend certified fogging chemicals for best results and to maintain warranty validity.' },
  { q: 'Is this machine suitable for government tenders?', a: 'Yes. 100X Circle is GeM-registered with complete tender-ready documentation available in 48 hours. We have supplied to municipal corporations, health departments, and agriculture boards across India.' },
  { q: 'What is the delivery timeline?', a: 'Standard delivery is 5–7 working days across India. Bulk and government orders may require 10–15 days. Contact us for urgent requirements.' },
  { q: 'Do you provide operator training?', a: 'Yes — complimentary operator training on purchase. On-site training available for large orders. Video training materials also provided.' },
  { q: 'What spare parts support is available?', a: 'Genuine OEM spare parts are stocked at our Gurugram factory and available nationwide through our dealer network. We guarantee 5+ years of parts availability.' },
  { q: 'Can I get a demonstration before purchasing?', a: 'Yes. Product demonstrations at our Gurugram facility or at your location for bulk inquiries. Contact us to schedule.' },
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
        <p className="text-xl font-bold text-gray-900 mb-3">Product not found</p>
        <Link href="/products" className="text-sm text-brand-600 hover:underline">← Back to products</Link>
      </div>
    </div>
  );

  // Data extraction
  const name        = s(product.name);
  const h1          = s(product.h1Title) || name;
  const tagline     = s(product.tagline);
  const price       = s(product.priceRange);
  const shortDesc   = s(product.shortDescription || product.detailedDescription);
  const brochureUrl = s(product.brochureUrl) || undefined;
  const rating      = Number(product.rating) || 0;
  const reviews     = Number(product.reviewsCount) || 0;
  const images      = arr(product.imageUrls).filter(u => u.startsWith('http') || u.startsWith('/'));
  const specs       = arr(product.specifications);
  const features    = arr(product.features);
  const applications = arr(product.applications);
  const badges      = arr(product.badges);
  const certs       = arr(product.certifications);
  const allCerts    = [...new Set([...certs, ...badges])];
  const videoId     = ytId(s(product.heroVideoUrl || product.youtubeLink));
  const chapters    = (Array.isArray(product.filmChapters) ? product.filmChapters as any[] : []).filter(c => c?.title).slice(0, 3);
  const ugcImages   = arr(product.ugcImages).filter(u => u.startsWith('http') || u.startsWith('/'));
  const warrantyOn  = Boolean(product.warrantyEnabled);
  const warrantyPeriod = s(product.warrantyPeriod);
  const warrantyDesc = s(product.warrantyDescription);

  const rawFaqs = Array.isArray(product.productFaqs) ? product.productFaqs : [];
  const parsedFaqs: Array<{ q: string; a: string }> = rawFaqs.flatMap((f: any) => {
    if (f?.q) return [{ q: s(f.q), a: s(f.a) }];
    if (typeof f === 'string') { const m = f.match(/^Q:\s*(.*?)\s*\|\s*A:\s*([\s\S]*)$/i); return m ? [{ q: m[1], a: m[2] }] : []; }
    return [];
  });
  const faqItems = parsedFaqs.length > 0 ? parsedFaqs : DEFAULT_FAQS;

  const waText = s(product.whatsappMessageText) || `Hi, I'm interested in ${name}. Please share pricing and availability.`;
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`;

  // First 5 specs for the mini table in right panel
  const heroSpecs = specs.slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      <MobileCtaOverride audience="product" productName={name} whatsappMessage={waText} />
      <BrochureLeadModal open={brochureOpen} onClose={() => setBrochureOpen(false)} source="product-detail" brochureUrl={brochureUrl} productName={name} />

      {/* ══ CINEMATIC HERO ══════════════════════════════════════════════════ */}
      <ProductCinematicHero
        name={name}
        h1={h1}
        tagline={tagline}
        category={s(product.category)}
        badges={badges}
        price={price}
        specs={specs}
        rating={rating}
        reviewsCount={reviews}
        imageUrl={images[0]}
      />

      {/* ══ PURCHASE AREA — TWO COLUMNS, LEFT STICKY ════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 bg-white">
        <div className="grid lg:grid-cols-[48%_52%] gap-10 xl:gap-16 py-8 md:py-12">

          {/* LEFT — sticky gallery */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            {images.length > 0 || videoId
              ? <Gallery images={images} videoId={videoId} name={name} />
              : <div className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-sm">No image available</div>}
          </div>

          {/* RIGHT — scrolls freely */}
          <div className="flex flex-col gap-5">

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.category && <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">{product.category}</span>}
                {badges.slice(0, 3).map((b, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    b === 'Best Seller' ? 'bg-red-50 text-red-700 border-red-200' :
                    b.includes('GeM') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-brand-50 text-brand-700 border-brand-200'
                  }`}>
                    {BADGE_LOGOS[b] && <img src={BADGE_LOGOS[b]} alt="" className="w-3.5 h-3.5 object-contain" />}
                    {b}
                  </span>
                ))}
              </div>
            )}

            {/* H1 */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-[2rem] font-black text-gray-900 leading-tight tracking-tight">{h1}</h1>
              {tagline && <p className="text-sm text-gray-500 mt-1.5 italic">{tagline}</p>}
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} size={15} className={star <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900">{rating}</span>
                <span className="text-sm text-gray-400">({reviews} reviews)</span>
              </div>
            )}

            {/* Price */}
            {price && (
              <div>
                <p className="text-2xl font-black text-gray-900">{price}</p>
                <p className="text-xs text-gray-400 mt-0.5">Prices vary by configuration. Contact us for exact quote.</p>
              </div>
            )}

            {/* Feature icons row — pulled from product.features */}
            <FeatureIconsRow features={features} />

            {/* Short description */}
            {shortDesc && (
              <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                <RichContent html={shortDesc} />
              </div>
            )}

            {/* Key specs mini table */}
            {heroSpecs.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Key Specifications</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {heroSpecs.map((spec, i) => {
                    const ci = spec.indexOf(':');
                    if (ci === -1) return <div key={i} className="px-4 py-2.5 text-sm text-gray-700">{spec}</div>;
                    return (
                      <div key={i} className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50/50">
                        <span className="text-sm text-gray-400 w-40 shrink-0">{spec.slice(0, ci).trim()}</span>
                        <span className="text-sm font-semibold text-gray-900">{spec.slice(ci + 1).trim()}</span>
                      </div>
                    );
                  })}
                  {specs.length > 5 && (
                    <div className="px-4 py-2 bg-brand-50">
                      <span className="text-xs text-brand-600 font-medium">+{specs.length - 5} more specifications below ↓</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2.5 pt-1">
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-brand-600/20">
                <MessageCircle size={18} />
                Get Quote on WhatsApp
              </a>
              <a href="#rfq"
                className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-3.5 border-2 border-gray-200 text-gray-700 hover:border-brand-600 hover:text-brand-700 font-semibold rounded-xl transition-colors text-sm">
                Request a Formal Quote
              </a>
              {brochureUrl && (
                <button onClick={() => setBrochureOpen(true)}
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  <Download size={14} />
                  Download Brochure (PDF)
                </button>
              )}
            </div>

            {/* Trust row */}
            <TrustRow certs={certs} badges={badges} />

            {/* Warranty inline if enabled */}
            {warrantyOn && (
              <div className="flex items-start gap-3.5 p-4 bg-brand-50 rounded-xl border border-brand-100">
                <ShieldCheck size={20} className="text-brand-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{warrantyPeriod ? `${warrantyPeriod} Manufacturer Warranty` : 'Manufacturer Warranty Included'}</p>
                  {warrantyDesc && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{warrantyDesc}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ FULL SPECS — always visible below two columns ═══════════════════ */}
      {specs.length > 0 && (
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Technical Details</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Full Specifications</h2>
            <div className="max-w-3xl">
              <SpecsTable specs={specs} youtubeLink={s(product.youtubeLink) || undefined} />
            </div>
          </div>
        </section>
      )}

      {/* ══ FEATURED VIDEO — large embed, dark section ══════════════════════ */}
      {videoId && <FeaturedVideoSection videoId={videoId} productName={name} />}

      {/* ══ PRODUCT FEATURES — editorial, large images, Nuuk-style ══════════ */}
      <ProductFeaturesSection chapters={chapters} />

      {/* ══ APPLICATIONS — always visible ══════════════════════════════════ */}
      <ApplicationsSection features={features} applications={applications} />

      {/* ══ CERTIFICATIONS — always visible ════════════════════════════════ */}
      <CertificationsSection certs={certs} badges={badges} />

      {/* ══ UGC CAROUSEL — deployment images from admin ═════════════════════ */}
      <UGCCarousel images={ugcImages} productName={name} />

      {/* ══ SPARE PARTS — always visible (async loaded) ════════════════════ */}
      <SparePartsSection productId={productId} productName={name} />

      {/* ══ CASE STUDIES — always visible (async loaded) ═══════════════════ */}
      <CaseStudiesSection productId={productId} productName={name} />

      {/* ══ FAQ — ONLY THIS IS AN ACCORDION ════════════════════════════════ */}
      <FAQSection faqs={faqItems} />

      {/* ══ SEO crawlable hidden content ════════════════════════════════════ */}
      <div className="sr-only" aria-hidden>
        {specs.map((x, i) => <span key={i}>{x} </span>)}
        {applications.map((x, i) => <span key={i}>{x} </span>)}
        {certs.map((x, i) => <span key={i}>{x} </span>)}
        {faqItems.map((f, i) => <span key={i}>{f.q} {f.a} </span>)}
      </div>

      {/* ══ RFQ FORM ════════════════════════════════════════════════════════ */}
      <section id="rfq" className="py-20 bg-white border-t border-gray-100">
        {/* Subtle geometric art background */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #dc2626 0, transparent 50%), radial-gradient(circle at 80% 20%, #991b1b 0, transparent 40%)',
          }} />
          <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
            <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
              <div>
                <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Request a Quote</p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
                  Get a tailored quote<br />
                  <span className="text-brand-600">for {name}.</span>
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">Tender, GeM, dealer, and bulk inquiries welcome. Our team responds within 24 hours with pricing, compliance certificates, and delivery timeline.</p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Competitive OEM pricing — direct from manufacturer',
                    'GeM-registered — government procurement ready',
                    'Pan-India delivery in 5–7 working days',
                    'Genuine spare parts guaranteed for 5+ years',
                    'Post-sale technical support in Hindi & English',
                  ].map((p, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="text-brand-600" />
                      </div>
                      {p}
                    </li>
                  ))}
                </ul>
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-brand-600/25">
                  <MessageCircle size={16} /> WhatsApp Now
                </a>
              </div>
              <div className="bg-white rounded-2xl p-7 md:p-9 shadow-xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Send Enquiry</h3>
                <p className="text-sm text-gray-500 mb-6">We reply within 24 hours. No spam.</p>
                <RFQForm variant="card" defaultProduct={name} defaultDescription={`Inquiring about: ${name}`} location={`product_detail_${productId}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back */}
      <div className="py-5 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={14} /> Back to all products
          </Link>
        </div>
      </div>
    </div>
  );
}
