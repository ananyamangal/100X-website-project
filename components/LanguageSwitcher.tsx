'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { isLocaleManagedPathname } from '@/lib/i18n/locale-routes'
import { isUntranslatableProductLanding } from '@/lib/seo/landing-pages'
import { LOCALE_LABELS } from '@/lib/i18n/locale-labels'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  triggerClassName?: string
}

export default function LanguageSwitcher({ triggerClassName }: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('LanguageSwitcher')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Only the Phase 1 slice of routes actually has locale variants (see
  // lib/i18n/locale-routes.ts) — everywhere else on the site stays
  // English-only, so there's nothing to switch to.
  if (!isLocaleManagedPathname(pathname)) return null

  // Within that slice, the 3 "type":"product" landing pages (TFS50/DB400/
  // SSMA20) render body content straight from the live Mongo product doc,
  // which has no translation mechanism — hi/id 404 for them (see
  // isUntranslatableProductLanding). Everywhere else in LOCALE_MANAGED_SLUGS
  // this filters down to all 3 locales unchanged.
  const slug = pathname.replace(/^\//, '')
  const availableLocales = routing.locales.filter((l) => !isUntranslatableProductLanding(slug, l))

  if (availableLocales.length <= 1) {
    // Nothing to switch to on this page — a static label, not a dropdown
    // trigger with one dead option that 404s. Strip interaction-affordance
    // classes (hover/focus/transition) from the shared trigger styling so it
    // doesn't visually invite a click it can't act on.
    const staticClassName = triggerClassName
      ?.split(' ')
      .filter((c) => !c.startsWith('hover:') && !c.startsWith('focus-visible:') && !c.startsWith('focus:') && c !== 'transition-colors')
      .join(' ')
    return (
      <span className={cn(staticClassName, 'cursor-default')}>
        <Globe size={18} aria-hidden="true" />
        <span className="hidden md:inline">{LOCALE_LABELS[locale]}</span>
      </span>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
      >
        <Globe size={18} aria-hidden="true" />
        <span className="hidden md:inline">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50"
        >
          {availableLocales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              onClick={() => {
                setOpen(false)
                router.replace(pathname, { locale: l })
              }}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm text-left transition-colors hover:bg-brand-50 hover:text-brand-700',
                l === locale ? 'font-semibold text-brand-700' : 'text-gray-700',
              )}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
