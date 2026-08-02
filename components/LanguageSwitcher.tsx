'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { isLocaleManagedPathname } from '@/lib/i18n/locale-routes'
import { cn } from '@/lib/utils'

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  hi: 'हिंदी',
  id: 'Bahasa Indonesia',
}

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
          {routing.locales.map((l) => (
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
