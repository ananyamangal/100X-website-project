'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { LOCALE_LABELS } from '@/lib/i18n/locale-labels'
import { cn } from '@/lib/utils'

interface Props {
  currentLocale: AppLocale
  /** Locale-agnostic path, e.g. "/gem-approved-fogging-machine-oem" or "/blog/my-post". */
  canonicalPath: string
  /** From getAvailableLocales() — locales with real translated content for THIS page, "en" always included. */
  availableLocales: string[]
  /**
   * Extra classes (e.g. "mt-20") for pages with no other clearance from the
   * fixed header at this point in their layout. Only takes effect when the
   * banner actually renders — unlike a static wrapper div, this can't leave
   * behind empty space on the (overwhelmingly common) visit where no
   * suggestion is shown at all. Omit on pages that already have header
   * clearance above this point (e.g. blog post's own pt-20 wrapper).
   */
  topOffsetClassName?: string
}

const DISMISS_KEY_PREFIX = 'localeSuggestionDismissed:'

/**
 * Client-side-only "this page is available in your language" suggestion.
 * Mounts after server render (SSR output is always null — no server HTML/SEO
 * impact, verified via view-source), detects navigator.language, and only
 * ever suggests a locale that's both in availableLocales (real content, not
 * just configured) and not the current one. Never auto-navigates — the user
 * must click. Dismissal persists per page+locale in localStorage.
 */
export default function LocaleSuggestionBanner({
  currentLocale,
  canonicalPath,
  availableLocales,
  topOffsetClassName,
}: Props) {
  const [suggested, setSuggested] = useState<AppLocale | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const browserLangs = (
        navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
      ).map((l) => l.toLowerCase().split('-')[0])

      let match: AppLocale | null = null
      for (const lang of browserLangs) {
        const candidate = routing.locales.find((l) => l === lang)
        if (candidate && candidate !== currentLocale && availableLocales.includes(candidate)) {
          match = candidate
          break
        }
      }
      if (!match) return

      const dismissKey = `${DISMISS_KEY_PREFIX}${canonicalPath}:${match}`
      if (localStorage.getItem(dismissKey) === '1') return

      setSuggested(match)
    } catch {
      // navigator/localStorage unavailable (privacy mode, SSR-adjacent edge
      // cases) — fail closed, just don't show the suggestion.
    }
  }, [currentLocale, canonicalPath, availableLocales])

  if (!suggested) return null

  const dismiss = () => {
    try {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${canonicalPath}:${suggested}`, '1')
    } catch {
      // ignore — worst case the banner reappears next visit
    }
    setSuggested(null)
  }

  const switchLocale = () => {
    router.replace(canonicalPath, { locale: suggested })
  }

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-3 bg-brand-50 border-b border-brand-100 px-4 py-2.5 text-sm text-brand-900',
        topOffsetClassName,
      )}
    >
      <span>
        This page is available in <strong>{LOCALE_LABELS[suggested]}</strong>.
      </span>
      <button
        type="button"
        onClick={switchLocale}
        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
      >
        View in {LOCALE_LABELS[suggested]}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss language suggestion"
        className="text-brand-400 hover:text-brand-700"
      >
        <X size={16} />
      </button>
    </div>
  )
}
