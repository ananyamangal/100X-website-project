'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight, Play, Star, Download, MessageCircle,
  ShieldCheck, Award, Package, Phone, Zap, Droplets, Gauge, Weight,
  Leaf, CheckCircle2, ArrowRight, ChevronDown, Wrench, Building2,
} from 'lucide-react'
import Link from 'next/link'
import { BUSINESS } from '@/lib/seo/site-config'
import { MobileCtaOverride } from '@/components/cta/MobileCtaContext'
import BrochureLeadModal from '@/components/BrochureLeadModal'
import RFQForm from '@/components/forms/RFQForm'
import { plainTextFromHtml } from '@/lib/rich-text'

// ── Utilities ──────────────────────────────────────────────────────────────────

function s(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}
function arr(v: unknown): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map(x => {
    if (typeof x === 'string') return x
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>
      if (typeof o.title === 'string') return o.value ? `${o.title}: ${o.value}` : o.title
      if (typeof o.label === 'string') return o.value ? `${o.label}: ${o.value}` : o.label
      if (typeof o.name  === 'string') return o.value ? `${o.name}: ${o.value}`  : o.name
    }
    return ''
  }).filter(Boolean)
  if (typeof v === 'string') return v.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
  return []
}
function ytId(url: string): string | null {
  const m = s(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const BADGE_LOGOS: Record<string, string> = {
  'Korean Technology': '/Logos clipart 2/Korean Technology.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  GeM: '/Logos clipart 2/GeM logo.png', 'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy duty.png', 'Heavy duty': '/Logos clipart 2/Heavy duty.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png', Ecofreidly: '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
}

function featureIcon(label: string): React.ReactNode {
  const l = label.toLowerCase()
  if (l.includes('engine') || l.includes('power') || l.includes('hp'))   return <Zap size={20} />
  if (l.includes('tank') || l.includes('litre') || l.includes('capacity') || l.includes('liters')) return <Droplets size={20} />
  if (l.includes('range') || l.includes('fog') || l.includes('output') || l.includes('coverage'))  return <Gauge size={20} />
  if (l.includes('weight') || l.includes('kg'))   return <Weight size={20} />
  if (l.includes('eco') || l.includes('environ')) return <Leaf size={20} />
  if (l.includes('gem') || l.includes('certif') || l.includes('iso') || l.includes('bis')) return <Award size={20} />
  if (l.includes('warr') || l.includes('support')) return <ShieldCheck size={20} />
  if (l.includes('deliver') || l.includes('ship')) return <Package size={20} />
  return <CheckCircle2 size={20} />
}

const SPEC_GROUPS: [string, string][] = [
  ['engine','Engine'],['fuel','Engine'],['ignition','Engine'],['cylinder','Engine'],['rpm','Engine'],['power','Engine'],
  ['tank','Tank'],['capacity','Tank'],['solution','Tank'],['reservoir','Tank'],
  ['output','Performance'],['coverage','Performance'],['spray','Performance'],['droplet','Performance'],['fog','Performance'],['range','Performance'],['flow','Performance'],['pressure','Performance'],['speed','Performance'],
  ['weight','Dimensions'],['dimension','Dimensions'],['length','Dimensions'],['width','Dimensions'],['height','Dimensions'],['size','Dimensions'],
  ['material','Material'],['steel','Material'],['body','Material'],
  ['compliance','Compliance'],['certification','Compliance'],['approved','Compliance'],['standard','Compliance'],['bis','Compliance'],['iso','Compliance'],
]
function groupSpecs(specs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const spec of specs) {
    const label = spec.split(':')[0].toLowerCase()
    let grp = 'General'
    for (const [kw, g] of SPEC_GROUPS) { if (label.includes(kw)) { grp = g; break } }
    ;(out[grp] = out[grp] ?? []).push(spec)
  }
  return out
}

// ── Gallery V2 — vertical thumb strip on desktop, horizontal below on mobile ──

type MI = { kind: 'image'; url: string; isHighlight?: boolean } | { kind: 'yt'; videoId: string; thumb: string }

function GalleryV2({ images, highlightImages = [], videoId, name }: { images: string[]; highlightImages?: string[]; videoId: string | null; name: string }) {
  const [idx, setIdx]       = useState(0)
  const [playing, setPlaying] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('center center')
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const isTouchDevice = useRef(false)

  const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
  const items: MI[] = [
    ...images.map((url): MI => ({ kind: 'image', url })),
    ...highlightImages.map((url): MI => ({ kind: 'image', url, isHighlight: true })),
    ...(videoId && ytThumb ? [{ kind: 'yt' as const, videoId, thumb: ytThumb }] : []),
  ]
  const n   = items.length
  const cur = items[idx]
  const go  = (i: number) => { setIdx((i + n) % n); setPlaying(false) }

  return (
    <div className="flex flex-col lg:flex-row gap-3">

      {/* Thumbnail strip — horizontal below main on mobile, vertical left strip on desktop */}
      {n > 1 && (
        <div className="order-2 lg:order-1 lg:w-[68px] flex flex-row lg:flex-col gap-2
                        overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto
                        pb-1 lg:pb-0 lg:max-h-[520px]
                        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-pressed={i === idx}
              aria-label={item.kind === 'yt' ? 'Video thumbnail' : `Image ${i + 1}`}
              className={`relative flex-shrink-0 w-[60px] h-[60px] lg:w-full lg:h-auto lg:aspect-square
                          rounded-xl overflow-hidden border-2 transition-all bg-gray-50
                          ${i === idx
                            ? 'border-brand-600 ring-1 ring-brand-200 shadow-sm'
                            : 'border-gray-100 hover:border-gray-300'}`}
            >
              {item.kind === 'yt' ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play size={10} fill="white" className="text-white" />
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main viewer */}
      <div
        className="order-1 lg:order-2 flex-1 aspect-square relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 select-none touch-pan-y"
        onMouseMove={e => {
          // Touch devices fire a synthetic mousemove after tap-release; without this
          // guard that ghost event was reopening the hover-zoom right after a tap,
          // making mobile taps look like they triggered zoom instead of navigating.
          if (isTouchDevice.current || cur?.kind !== 'image') return
          const r = e.currentTarget.getBoundingClientRect()
          setOrigin(`${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`)
          setZoomed(true)
        }}
        onMouseLeave={() => setZoomed(false)}
        onTouchStart={e => {
          isTouchDevice.current = true
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={e => {
          if (!touchStart.current) return
          const dx = touchStart.current.x - e.changedTouches[0].clientX
          const dy = touchStart.current.y - e.changedTouches[0].clientY
          // Only treat it as a swipe-navigate if the gesture was clearly more
          // horizontal than vertical, so a vertical page scroll started on the
          // gallery doesn't get misread as a slide change.
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx > 0 ? 1 : -1))
          touchStart.current = null
        }}
      >
        {!cur && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">No image</div>
        )}

        {cur?.kind === 'yt' && (
          playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&playsinline=1&rel=0`}
              title="Product video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button
              className="absolute inset-0 w-full h-full group"
              onClick={() => setPlaying(true)}
              aria-label="Play product video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur.thumb} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={22} className="text-brand-600 ml-1" fill="currentColor" />
                </div>
              </div>
              <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                VIDEO
              </div>
            </button>
          )
        )}

        {cur?.kind === 'image' && (
          <Image
            src={cur.url}
            alt={name}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="object-contain p-6 transition-transform duration-150 cursor-zoom-in"
            style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
        )}

        {/* Nav arrows — hidden while video is playing */}
        {n > 1 && !playing && (
          <>
            <button onClick={() => go(idx - 1)} aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 border border-gray-100 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(idx + 1)} aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-gray-700 border border-gray-100 transition-all">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Counter badge */}
        {n > 1 && (
          <div className="absolute bottom-3 right-3 z-10 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            {idx + 1} / {n}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Feature icons row ──────────────────────────────────────────────────────────

function FeatureIconsRow({ features }: { features: string[] }) {
  const items = features.slice(0, 6)
  if (!items.length) return null
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-4 border-y border-gray-100">
      {items.map((f, i) => {
        const ci    = f.indexOf(':')
        const label = ci !== -1 ? f.slice(0, ci).trim() : f.trim()
        const value = ci !== -1 ? f.slice(ci + 1).trim() : ''
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors text-center">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              {featureIcon(label)}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 leading-tight">{label}</span>
            {value && <span className="text-[10px] text-brand-600 font-bold leading-none">{value}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Trust row ──────────────────────────────────────────────────────────────────

function TrustRow({ certs, badges }: { certs: string[]; badges: string[] }) {
  const defaults = [
    { icon: <Award size={16} />,       label: 'GeM Registered',    sub: 'Govt. procurement ready' },
    { icon: <ShieldCheck size={16} />, label: 'BIS / ISO Certified', sub: 'Quality assured' },
    { icon: <Package size={16} />,     label: 'Pan-India Delivery', sub: '5–7 working days' },
    { icon: <Phone size={16} />,       label: '5-Year Parts Support', sub: 'After-sales care' },
  ]
  const all   = [...new Set([...certs, ...badges])].slice(0, 4)
  const items = all.length >= 2
    ? all.map(c => ({
        icon: BADGE_LOGOS[c]
          ? <img src={BADGE_LOGOS[c]} alt={c} className="w-4 h-4 object-contain" />
          : <ShieldCheck size={16} />,
        label: c, sub: 'Certified'
      }))
    : defaults

  return (
    <div className="grid grid-cols-2 gap-3 py-4 border-t border-gray-100">
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
  )
}

// ── Specs table (grouped) ──────────────────────────────────────────────────────

function SpecsTable({ specs, youtubeLink }: { specs: string[]; youtubeLink?: string }) {
  const groups = groupSpecs(specs)
  const multi  = Object.keys(groups).length > 1
  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([grp, items]) => (
        <div key={grp}>
          {multi && <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-2.5">{grp}</p>}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {items.map((spec, i) => {
              const ci = spec.indexOf(':')
              if (ci === -1) return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <CheckCircle2 size={13} className="text-brand-500 shrink-0" />
                  <span className="text-sm text-gray-700">{spec}</span>
                </div>
              )
              return (
                <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <span className="text-sm text-gray-400 w-44 shrink-0">{spec.slice(0, ci).trim()}</span>
                  <span className="text-sm font-semibold text-gray-900">{spec.slice(ci + 1).trim()}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {youtubeLink && (
        <a href={youtubeLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
          <Play size={14} /> Watch product demo on YouTube
        </a>
      )}
    </div>
  )
}

// ── Featured video ─────────────────────────────────────────────────────────────

function FeaturedVideoSection({ videoId, productName }: { videoId: string; productName: string }) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
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
            <button className="absolute inset-0 w-full h-full flex items-center justify-center group"
              onClick={() => setPlaying(true)} aria-label="Play product demo video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={`${productName} demo`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute w-20 h-20 bg-brand-600 group-hover:bg-brand-700 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all">
                <Play size={32} className="text-white ml-2" fill="white" />
              </div>
            </button>
          )}
        </div>
        <div className="text-center mt-6">
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <Play size={13} /> Open on YouTube
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Film chapters (product features editorial) ────────────────────────────────

function ProductFeaturesSection({ chapters }: { chapters: any[] }) {
  if (!chapters.length) return null
  return (
    <>
      {chapters.map((ch: any, i: number) => {
        const chVid = s(ch.videoUrl) ? ytId(s(ch.videoUrl)) : null
        const chImg = s(ch.imageUrl)
        const isDark = i % 2 !== 0
        return (
          <section key={i} className={`border-t ${isDark ? 'bg-gray-950 border-white/5' : 'bg-white border-gray-100'}`}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
              <div className="grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-center">
                <div className={`w-full${i % 2 !== 0 ? ' lg:order-2' : ''}`}>
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
                      <img src={chImg} alt={s(ch.title)} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-7xl font-black text-gray-200 select-none">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-full${i % 2 !== 0 ? ' lg:order-1' : ''} space-y-5`}>
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className={`text-2xl md:text-3xl font-bold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {s(ch.title)}
                  </h3>
                  {s(ch.subtitle) && (
                    <p className={`text-base font-semibold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>{s(ch.subtitle)}</p>
                  )}
                  {s(ch.description) && (
                    <p className={`leading-relaxed text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s(ch.description)}</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}

// ── Applications ───────────────────────────────────────────────────────────────

function ApplicationsSection({ features, applications }: { features: string[]; applications: string[] }) {
  if (!features.length && !applications.length) return null
  return (
    <section className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {features.length > 0 && (
          <div className="mb-12">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Key Features</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {features.map((f, i) => {
                const ci    = f.indexOf(':')
                const label = ci !== -1 ? f.slice(0, ci).trim() : f
                const detail = ci !== -1 ? f.slice(ci + 1).trim() : ''
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
                )
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
  )
}

// ── Certifications ─────────────────────────────────────────────────────────────

function CertificationsSection({ certs, badges }: { certs: string[]; badges: string[] }) {
  const all = [...new Set([...certs, ...badges])]
  if (!all.length) return null
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Certifications &amp; Approvals</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Built to standard. Verified by labs.</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {all.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {BADGE_LOGOS[item]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={BADGE_LOGOS[item]} alt={item} className="w-10 h-10 object-contain shrink-0" />
                : <ShieldCheck size={22} className="text-brand-600 shrink-0" />}
              <span className="text-sm font-medium text-gray-800">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── UGC carousel ───────────────────────────────────────────────────────────────

function UGCCarousel({ images, productName }: { images: string[]; productName: string }) {
  if (!images.length) return null
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
            <img src={img} alt={`${productName} deployment ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Spare parts (async) ────────────────────────────────────────────────────────

function SparePartsSection({ productId, productName }: { productId: string; productName: string }) {
  const [parts, setParts]   = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    fetch(`/api/spare-parts?product=${productId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setParts(d); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [productId])

  // While the fetch is in flight this section previously returned null,
  // which reserves zero height -- the instant the fetch resolved, the
  // section snapped into existence and shoved everything below it (FAQ,
  // Related Products) down by ~888px in a single frame. Anyone who clicked
  // in that region at the wrong instant had their target yanked out from
  // under their cursor. Rendering a same-shaped skeleton keeps the box's
  // height stable from first paint, so nothing shifts once real data
  // arrives -- only the skeleton's contents swap in.
  if (!loaded) {
    return (
      <section className="py-16 bg-gray-50 border-t border-gray-100" aria-hidden="true">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Genuine OEM Parts</p>
              <h2 className="text-2xl font-bold text-gray-900">Spare Parts for {productName}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!parts.length) return null

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
        <div data-clickable-grid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {parts.slice(0, 10).map(part => {
            const n2 = part.compatibleProductNames?.[0]
            const seg = n2
              ? n2.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
              : (part.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'parts')
            return (
              <Link key={part._id} href={`/spare-parts/${seg}/${part.slug}`}
                className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-brand-300 hover:shadow-md transition-all">
                <div className="aspect-square bg-gray-50">
                  {part.images?.[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={part.images[0]} alt={part.name} className="w-full h-full object-contain p-3" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><Wrench size={28} className="text-gray-200" /></div>}
                </div>
                <div className="p-3">
                  {part.sku && <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide mb-0.5">{part.sku}</p>}
                  <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">{part.name}</p>
                  {part.priceRange && <p className="text-sm font-bold text-gray-900 mt-1">{part.priceRange}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────────────────────────

const DEFAULT_FAQS = [
  { q: 'What fuel does this machine use?', a: 'The machine operates on regular petroleum/kerosene-based fogging oil. We recommend certified fogging chemicals for best results and to maintain warranty validity.' },
  { q: 'Is this machine suitable for government tenders?', a: 'Yes. 100X Circle is GeM-registered with complete tender-ready documentation available in 48 hours. We have supplied to municipal corporations, health departments, and agriculture boards across India.' },
  { q: 'What is the delivery timeline?', a: 'Standard delivery is 5–7 working days across India. Bulk and government orders may require 10–15 days. Contact us for urgent requirements.' },
  { q: 'Do you provide operator training?', a: 'Yes — complimentary operator training on purchase. On-site training available for large orders. Video training materials also provided.' },
  { q: 'What spare parts support is available?', a: 'Genuine OEM spare parts are stocked at our Gurugram factory and available nationwide through our dealer network. We guarantee 5+ years of parts availability.' },
  { q: 'Can I get a demonstration before purchasing?', a: 'Yes. Product demonstrations at our Gurugram facility or at your location for bulk inquiries. Contact us to schedule.' },
]

function FAQSection({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(null)
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
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

interface Props { product: Record<string, unknown> }

export default function ProductDetailV2({ product }: Props) {
  const [brochureOpen, setBrochureOpen] = useState(false)
  const [showFullDesc, setShowFullDesc]   = useState(false)

  // Data extraction
  const name         = s(product.name)
  const rawH1        = s(product.h1Title)
  const h1           = rawH1.includes(' ') ? rawH1 : name
  const tagline      = s(product.tagline)
  const price        = s(product.priceRange)
  const shortDesc    = plainTextFromHtml(product.shortDescription || product.detailedDescription)
  const brochureUrl  = s(product.brochureUrl) || undefined
  const rating       = Number(product.rating) || 0
  const reviews      = Number(product.reviewsCount) || 0
  const images       = arr(product.imageUrls).filter(u => u.startsWith('http') || u.startsWith('/'))
  const specs        = arr(product.specifications)
  const features     = arr(product.features)
  const applications = arr(product.applications)
  const badges       = arr(product.badges)
  const certs        = arr(product.certifications)
  const category     = s(product.category)
  const videoId      = ytId(s(product.heroVideoUrl || product.youtubeLink))
  const chapters     = (Array.isArray(product.filmChapters) ? product.filmChapters as any[] : []).filter(c => c?.title).slice(0, 3)
  const ugcImages    = arr(product.ugcImages).filter(u => u.startsWith('http') || u.startsWith('/'))
  // Highlight images for the main gallery: one photo per film chapter first
  // (story/credibility content), then deployment/UGC photos fill any
  // remaining slots, capped at 5 total so the busiest product (currently 8
  // combined chapter+UGC images) doesn't overwhelm the gallery.
  const chapterImages = (Array.isArray(product.filmChapters) ? product.filmChapters as any[] : [])
    .map(c => s(c?.imageUrl))
    .filter(u => u.startsWith('http') || u.startsWith('/'))
  const galleryExcluded = arr(product.galleryExcludedImageUrls)
  const highlightImages = [...chapterImages, ...ugcImages]
    .filter(u => !images.includes(u) && !galleryExcluded.includes(u))
    .slice(0, 5)
  const productId    = s(product._id)
  const productSlug  = s(product.slug) || productId
  const youtubeLink  = s(product.heroVideoUrl || product.youtubeLink)

  const rawFaqs = Array.isArray(product.productFaqs) ? product.productFaqs : []
  const parsedFaqs: Array<{ q: string; a: string }> = rawFaqs.flatMap((f: any) => {
    if (f?.q) return [{ q: s(f.q), a: s(f.a) }]
    if (typeof f === 'string') { const m = f.match(/^Q:\s*(.*?)\s*\|\s*A:\s*([\s\S]*)$/i); return m ? [{ q: m[1], a: m[2] }] : [] }
    return []
  })
  const faqItems = parsedFaqs.length > 0 ? parsedFaqs : DEFAULT_FAQS

  const waText = s(product.whatsappMessageText) || `Hi, I'm interested in ${name}. Please share pricing and availability.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  const heroSpecs = specs.slice(0, 5)

  return (
    <div className="min-h-screen bg-white">
      <MobileCtaOverride audience="product" productName={name} whatsappMessage={waText} />
      <BrochureLeadModal open={brochureOpen} onClose={() => setBrochureOpen(false)}
        source="product-detail-v2" brochureUrl={brochureUrl} productName={name} />

      {/* ══ PURCHASE AREA — 55 / 45 SPLIT ════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 bg-white">
        <div className="grid lg:grid-cols-[55fr_45fr] gap-8 xl:gap-14 py-8 md:py-12">

          {/* LEFT — gallery, sticky on desktop */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            {images.length > 0 || highlightImages.length > 0 || videoId
              ? <GalleryV2 images={images} highlightImages={highlightImages} videoId={videoId} name={name} />
              : <div className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-sm">No image available</div>
            }
          </div>

          {/* RIGHT — sticky panel, scrolls internally when taller than viewport */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex flex-col gap-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto
                            [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1
                            [&::-webkit-scrollbar-track]:transparent
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-gray-200">

              {/* Category + badges */}
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">
                    {category}
                  </span>
                )}
                {badges.slice(0, 3).map((b, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    b === 'Best Seller'  ? 'bg-red-50 text-red-700 border-red-200' :
                    b.includes('GeM')   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-brand-50 text-brand-700 border-brand-200'
                  }`}>
                    {BADGE_LOGOS[b] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={BADGE_LOGOS[b]} alt="" className="w-3.5 h-3.5 object-contain" />
                    )}
                    {b}
                  </span>
                ))}
              </div>

              {/* H1 — product name lives here (no separate cinematic hero above) */}
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-[1.85rem] font-black text-gray-900 leading-tight tracking-tight">{h1}</h1>
                {tagline && <p className="text-sm text-gray-500 mt-1.5 italic">{tagline}</p>}
              </div>

              {/* Rating */}
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={14} className={star <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{rating}</span>
                  <span className="text-sm text-gray-400">({reviews} reviews)</span>
                </div>
              )}

              {/* Feature icons grid */}
              <FeatureIconsRow features={features} />

              {/* Short description — collapsible after 4 lines */}
              {shortDesc && (
                <div>
                  <div className={showFullDesc ? '' : 'max-h-[5rem] overflow-hidden relative'}>
                    <p className="text-sm text-gray-600 leading-relaxed">{shortDesc}</p>
                    {!showFullDesc && shortDesc.length > 220 && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>
                  {!showFullDesc && shortDesc.length > 220 && (
                    <button onClick={() => setShowFullDesc(true)}
                      className="mt-1.5 text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                      Read more <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Price */}
              {price && (
                <div className="py-3 border-y border-gray-100">
                  <p className="text-2xl font-black text-gray-900">{price}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Prices vary by configuration. Contact us for exact quote.</p>
                </div>
              )}

              {/* Mini specs — first 5 specs + link to full table */}
              {heroSpecs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Key Specs</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {heroSpecs.map((spec, i) => {
                      const ci = spec.indexOf(':')
                      if (ci === -1) return (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                          <CheckCircle2 size={12} className="text-brand-500 shrink-0" />
                          <span className="text-sm text-gray-700">{spec}</span>
                        </div>
                      )
                      return (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                          <span className="text-xs text-gray-400 w-28 shrink-0 leading-snug">{spec.slice(0, ci).trim()}</span>
                          <span className="text-sm font-semibold text-gray-900">{spec.slice(ci + 1).trim()}</span>
                        </div>
                      )
                    })}
                  </div>
                  {specs.length > 5 && (
                    <a href="#full-specs" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
                      View all {specs.length} specs ↓
                    </a>
                  )}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-3 pt-1">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] hover:bg-[#1fba59] text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
                >
                  <MessageCircle size={18} fill="currentColor" />
                  Chat on WhatsApp
                </a>
                <a
                  href="#rfq-section"
                  className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-brand-600 text-brand-600 hover:bg-brand-50 font-bold rounded-xl transition-colors text-sm"
                >
                  Request Formal Quote
                </a>
                {brochureUrl && (
                  <button
                    onClick={() => setBrochureOpen(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
                  >
                    <Download size={14} />
                    Download Brochure
                  </button>
                )}
              </div>

              {/* Trust row */}
              <TrustRow certs={certs} badges={badges} />

            </div>
          </div>

        </div>
      </div>

      {/* ══ BELOW-FOLD SECTIONS ════════════════════════════════════════════════ */}

      {/* Full specs */}
      {specs.length > 0 && (
        <section id="full-specs" className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Technical Details</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Full Specifications</h2>
            <SpecsTable specs={specs} youtubeLink={youtubeLink || undefined} />
          </div>
        </section>
      )}

      {/* Featured video */}
      {videoId && <FeaturedVideoSection videoId={videoId} productName={name} />}

      {/* Film chapters */}
      <ProductFeaturesSection chapters={chapters} />

      {/* Applications + features grid */}
      <ApplicationsSection features={features} applications={applications} />

      {/* Certifications */}
      <CertificationsSection certs={certs} badges={badges} />

      {/* UGC carousel */}
      <UGCCarousel images={ugcImages} productName={name} />

      {/* Spare parts */}
      {productId && <SparePartsSection productId={productId} productName={name} />}

      {/* FAQ */}
      <FAQSection faqs={faqItems} />

      {/* RFQ form */}
      <section id="rfq-section" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Request a Quote</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Get a tailored quote for {name}</h2>
          <RFQForm defaultProduct={name} location="product-detail-v2" />
        </div>
      </section>

      {/* Back to products */}
      <div className="py-10 text-center border-t border-gray-100">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline font-medium">
          ← Browse all products
        </Link>
      </div>
    </div>
  )
}
