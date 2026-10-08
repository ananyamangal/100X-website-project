'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavProductGroup } from '@/lib/navProducts';
import type { NavCaseStudy } from '@/lib/navPerformance';

/**
 * Header dropdown menus ("Products", "Performance"): a desktop dropdown and a
 * mobile accordion sharing one content renderer per menu.
 *
 * Every link is server-rendered into the HTML (the desktop panel is only
 * display:none while closed) so crawlers see plain <a> tags. Thumbnails are
 * different: no <img> is rendered until the panel/accordion has been opened
 * once, so nothing downloads on page load and nothing competes with the
 * homepage LCP image.
 */

const THUMB = 48
const OPEN_DELAY_MS = 120
const CLOSE_DELAY_MS = 200

/** Renders the panel body; `showThumbs` is false until the first open. */
export type PanelContent =(showThumbs: boolean, onNavigate: () => void) => React.ReactNode

function NavThumb({ src, alt, show }: { src: string | null; alt: string; show: boolean }) {
  if (show && src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={THUMB}
        height={THUMB}
        sizes={`${THUMB}px`}
        loading="lazy"
        // Already a ~160 px Cloudinary rendition (lib/navProducts.ts) — no second resize.
        unoptimized
        className="h-12 w-12 shrink-0 rounded-md bg-gray-50 object-cover"
        draggable={false}
      />
    )
  }
  return <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-md border border-gray-100 bg-gray-50" />
}

const ROW_CLASS =
  'flex min-h-[44px] items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600'
const KICKER_CLASS = 'px-2 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500'
const VIEW_ALL_CLASS =
  'flex min-h-[44px] items-center gap-1 rounded-md px-2 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600'

function ViewAll({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <Link href={href} onClick={onNavigate} className={VIEW_ALL_CLASS}>
        {label} <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

// ── Products ────────────────────────────────────────────────────────────────

export function productsPanel(groups: NavProductGroup[], variant: 'desktop' | 'mobile'): PanelContent {
  return function ProductsPanel(showThumbs, onNavigate) {
    return (
      <>
        <div className={variant === 'desktop' ? 'grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-3' : 'space-y-2'}>
          {groups.map((g) => (
            <div key={g.category} className="min-w-0">
              <p className={cn(KICKER_CLASS, variant === 'mobile' ? 'pt-3' : 'pt-1')}>{g.category}</p>
              <ul>
                {g.products.map((p, i) => (
                  <li key={`${i}:${p.href}`}>
                    <Link href={p.href} onClick={onNavigate} className={ROW_CLASS}>
                      <NavThumb src={p.thumb} alt={p.name} show={showThumbs} />
                      <span className="min-w-0 leading-snug">{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ViewAll href="/products" label="View all products" onNavigate={onNavigate} />
      </>
    )
  }
}

// ── Performance ─────────────────────────────────────────────────────────────

/** Static pages only (all 200 + self-canonical in the SEO snapshot). */
export const PERFORMANCE_LINKS = [
  { href: '/past-performance-government', label: 'Government Past Performance' },
  { href: '/past-performance-government#procurement-register', label: 'Procurement Register' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/deployments', label: 'Deployments' },
  { href: '/oem-authorization-letter', label: 'OEM Authorization Letter' },
  { href: '/gem-approved-fogging-machine-oem', label: 'GeM-Approved OEM' },
] as const

export function performancePanel(caseStudies: NavCaseStudy[], variant: 'desktop' | 'mobile'): PanelContent {
  return function PerformancePanel(showThumbs, onNavigate) {
    const desktop = variant === 'desktop'
    return (
      <>
        <div className={desktop ? 'grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-6' : 'space-y-2'}>
          <div className="min-w-0">
            <p className={cn(KICKER_CLASS, desktop ? 'pt-1' : 'pt-3')}>Track record</p>
            <ul>
              {PERFORMANCE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={onNavigate} className={ROW_CLASS}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          {caseStudies.length > 0 && (
            <div className="min-w-0">
              <p className={cn(KICKER_CLASS, desktop ? 'pt-1' : 'pt-3')}>Case studies</p>
              <ul className={desktop ? 'grid grid-cols-2 gap-x-4 xl:grid-cols-3' : undefined}>
                {caseStudies.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} onClick={onNavigate} className={ROW_CLASS}>
                      <NavThumb src={c.thumb} alt={c.label} show={showThumbs} />
                      <span className="min-w-0 leading-snug">
                        <span className="line-clamp-2">{c.label}</span>
                        {c.state && <span className="block text-xs font-normal text-gray-500">{c.state}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <ViewAll href="/past-performance-government" label="View all past performance" onNavigate={onNavigate} />
      </>
    )
  }
}

// ── Desktop dropdown ────────────────────────────────────────────────────────

/**
 * Desktop (lg+). The label stays a real link; the chevron button next to it
 * opens the panel on click/Enter/Space/ArrowDown. Hovering the item opens it
 * after a short intent delay. Closes on Escape (focus returns to the button),
 * outside click, focus leaving the menu, or a link being followed.
 */
export function DesktopNavDropdown({ href, label, toggleLabel, active, linkClassName, chevronClassName, children }: {
  href: string
  label: string
  /** aria-label of the chevron button, e.g. "Show all products". */
  toggleLabel: string
  active: boolean
  linkClassName: string
  chevronClassName: string
  children: PanelContent
}) {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelId = useId()

  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const show = useCallback(() => { setOpen(true); setEverOpened(true) }, [])
  const hide = useCallback(() => { clearTimer(); setOpen(false) }, [])

  useEffect(() => clearTimer, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) hide()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      hide()
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, hide])

  return (
    // No `relative` here on purpose: the panel is positioned against the fixed
    // <header>, so it can span the header's width instead of overflowing.
    <div
      ref={rootRef}
      className="flex items-center"
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return
        clearTimer()
        timer.current = setTimeout(show, OPEN_DELAY_MS)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'touch') return
        clearTimer()
        timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
      }}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) hide()
      }}
    >
      <Link href={href} aria-current={active ? 'page' : undefined} className={linkClassName}>
        {label}
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-label={toggleLabel}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn('ml-0.5 inline-flex h-8 w-6 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', chevronClassName)}
        onClick={() => { clearTimer(); if (open) setOpen(false); else show() }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown') return
          e.preventDefault()
          show()
          requestAnimationFrame(() => panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus())
        }}
      >
        <ChevronDown size={16} aria-hidden="true" className={cn('motion-safe:transition-transform motion-safe:duration-200', open && 'rotate-180')} />
      </button>

      <div ref={panelRef} id={panelId} className={cn('absolute inset-x-0 top-full z-50 pt-1', !open && 'hidden')}>
        <div className="container mx-auto px-4">
          <div className="mx-auto max-h-[calc(100vh-6rem)] max-w-5xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
            {children(everOpened, hide)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mobile accordion ────────────────────────────────────────────────────────

/** Mobile (< lg), inside the hamburger menu: link + accordion toggle, 44 px rows. */
export function MobileNavAccordion({ href, label, toggleLabel, active, onNavigate, children }: {
  href: string
  label: string
  toggleLabel: string
  active: boolean
  onNavigate: () => void
  children: PanelContent
}) {
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  return (
    <div>
      <div className="flex items-stretch">
        <Link
          href={href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex-1 rounded-md px-3 py-3 text-base font-medium transition-colors',
            active ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50',
          )}
          onClick={onNavigate}
        >
          {label}
        </Link>
        <button
          type="button"
          aria-label={toggleLabel}
          aria-expanded={expanded}
          aria-controls={regionId}
          className="ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown size={20} aria-hidden="true" className={cn('motion-safe:transition-transform motion-safe:duration-200', expanded && 'rotate-180')} />
        </button>
      </div>
      <div id={regionId} hidden={!expanded} className="pb-2 pl-2">
        {expanded && children(true, onNavigate)}
      </div>
    </div>
  )
}
