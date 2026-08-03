import type { AppLocale } from "@/i18n/routing"

// Single source of truth for locale display names — shared by
// LanguageSwitcher and LocaleSuggestionBanner so they never drift.
// TypeScript enforces completeness: adding a locale to i18n/routing.ts's
// `locales` array without adding its label here is a compile error, not a
// silently-blank UI.
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  hi: "हिंदी",
  id: "Bahasa Indonesia",
}
