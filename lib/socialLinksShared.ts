/**
 * Pure helpers + types for the social platform schema — no server-only
 * imports (no MongoDB), so this file is safe to import from client
 * components too (e.g. ContactSection fetching /api/site-settings client
 * side). Server code that needs to read the DB should import
 * `getSocialLinks` from `lib/socialLinks.ts` instead, which wraps this file.
 */
export const SOCIAL_PLATFORM_KEYS = [
  "youtube",
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "whatsapp",
  "telegram",
  "googleBiz",
] as const

export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number]

export interface SocialPlatformConfig {
  url: string
  showInHeader: boolean
  showInFooter: boolean
  showOnContactPage: boolean
  showOnProductPages: boolean
}

export type SocialLinks = Record<SocialPlatformKey, SocialPlatformConfig>

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformKey, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  googleBiz: "Google Business",
}

// Same values that were previously hardcoded in lib/seo/site-config.ts —
// kept as the fallback so the site renders identically until an admin
// explicitly changes something, and so a fresh/partial DB doc never breaks.
export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  youtube: { url: "https://www.youtube.com/@100Xcircle", showInHeader: true, showInFooter: true, showOnContactPage: true, showOnProductPages: false },
  facebook: { url: "https://www.facebook.com/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: true, showOnProductPages: false },
  instagram: { url: "https://www.instagram.com/100xcircle", showInHeader: true, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  linkedin: { url: "https://www.linkedin.com/company/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  twitter: { url: "https://x.com/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  whatsapp: { url: "https://wa.me/917827229116", showInHeader: false, showInFooter: true, showOnContactPage: true, showOnProductPages: true },
  telegram: { url: "", showInHeader: false, showInFooter: false, showOnContactPage: false, showOnProductPages: false },
  googleBiz: { url: "", showInHeader: false, showInFooter: false, showOnContactPage: true, showOnProductPages: false },
}

function flag(raw: Record<string, unknown>, canonicalKey: string, legacyKey: string, fallback: boolean): boolean {
  if (typeof raw[canonicalKey] === "boolean") return raw[canonicalKey] as boolean
  if (typeof raw[legacyKey] === "boolean") return raw[legacyKey] as boolean
  return fallback
}

/**
 * Normalizes one platform's stored record against its defaults. Accepts
 * both the canonical field names (showInHeader, ...) and the legacy short
 * names (header, footer, contact, products) that the admin form used to
 * write, so old documents keep working without a hard migration.
 */
export function normalizeSocialPlatform(
  raw: unknown,
  fallback: SocialPlatformConfig,
): SocialPlatformConfig {
  if (!raw || typeof raw !== "object") return fallback
  const r = raw as Record<string, unknown>
  return {
    url: typeof r.url === "string" ? r.url.trim() : fallback.url,
    showInHeader: flag(r, "showInHeader", "header", fallback.showInHeader),
    showInFooter: flag(r, "showInFooter", "footer", fallback.showInFooter),
    showOnContactPage: flag(r, "showOnContactPage", "contact", fallback.showOnContactPage),
    showOnProductPages: flag(r, "showOnProductPages", "products", fallback.showOnProductPages),
  }
}

export function normalizeSocialLinks(raw: unknown): SocialLinks {
  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const result = {} as SocialLinks
  for (const key of SOCIAL_PLATFORM_KEYS) {
    result[key] = normalizeSocialPlatform(rawObj[key], DEFAULT_SOCIAL_LINKS[key])
  }
  return result
}

export interface VisibleSocialLink extends SocialPlatformConfig {
  key: SocialPlatformKey
  label: string
}

/** Platforms with a non-empty URL that are flagged visible in the given placement, in canonical order. */
export function pickVisibleSocialLinks(
  links: SocialLinks,
  placement: "showInHeader" | "showInFooter" | "showOnContactPage" | "showOnProductPages",
): VisibleSocialLink[] {
  return SOCIAL_PLATFORM_KEYS.filter((key) => links[key]?.url && links[key][placement]).map((key) => ({
    key,
    label: SOCIAL_PLATFORM_LABELS[key],
    ...links[key],
  }))
}

/** sameAs URLs for Organization JSON-LD — canonical social profile links only (excludes messaging platforms). */
export function socialLinksToSameAs(links: SocialLinks): string[] {
  const profileKeys: SocialPlatformKey[] = ["youtube", "facebook", "instagram", "linkedin", "twitter"]
  return profileKeys.map((key) => links[key]?.url).filter((url): url is string => !!url)
}
