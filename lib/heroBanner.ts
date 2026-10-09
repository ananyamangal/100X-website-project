import { optimizeCloudinary } from "./cloudinaryUrl"

/**
 * Homepage hero banner source selection — shared by the hero component
 * (components/home/HeroBlock.tsx) and the server-side <link rel="preload">
 * tags in app/(site)/(home)/page.tsx, so the preloaded URL is always
 * byte-identical to the URL the hero <img> actually requests (a mismatch
 * downloads the LCP image twice and makes the preload useless).
 */

export interface HeroBannerLike {
  isActive?: boolean
  order?: number
  image?: string
  desktopBannerImage?: string
  tabletBannerImage?: string
  mobileBannerImage?: string
  desktopBannerEnabled?: boolean
  tabletBannerEnabled?: boolean
  mobileBannerEnabled?: boolean
  [key: string]: any
}

export const DESKTOP_FALLBACK = "/banner-desktop.jpg"
export const TABLET_FALLBACK = "/banner-tablet.jpg"
export const MOBILE_FALLBACK = "/banner-mobile.jpg"

/** Delivery widths requested per breakpoint (Cloudinary w_ transform). */
export const HERO_WIDTHS = { desktop: 1920, tablet: 1200, mobile: 800 } as const

/** Active banners with an image, in admin order — the slides the hero renders. */
export function selectHeroSlides<T extends HeroBannerLike>(banners: T[] | null | undefined): T[] {
  return (banners || [])
    .filter((b) => b && b.isActive && (b.desktopBannerImage || b.image))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function pickDesktopSrc(slide: HeroBannerLike | null | undefined): string {
  if (!slide) return DESKTOP_FALLBACK
  if (slide.desktopBannerEnabled === false) return DESKTOP_FALLBACK
  return slide.desktopBannerImage || slide.image || DESKTOP_FALLBACK
}

export function pickTabletSrc(slide: HeroBannerLike | null | undefined): string {
  if (!slide) return TABLET_FALLBACK
  if (slide.tabletBannerEnabled === false) return TABLET_FALLBACK
  return slide.tabletBannerImage || slide.desktopBannerImage || slide.image || TABLET_FALLBACK
}

export function pickMobileSrc(slide: HeroBannerLike | null | undefined): string {
  if (!slide) return MOBILE_FALLBACK
  if (slide.mobileBannerEnabled === false) return MOBILE_FALLBACK
  return slide.mobileBannerImage || slide.desktopBannerImage || slide.image || MOBILE_FALLBACK
}

/** The exact (optimized) URLs the hero paints for a slide, per breakpoint. */
export function heroSources(slide: HeroBannerLike | null | undefined) {
  return {
    desktop: optimizeCloudinary(pickDesktopSrc(slide), HERO_WIDTHS.desktop),
    tablet: optimizeCloudinary(pickTabletSrc(slide), HERO_WIDTHS.tablet),
    mobile: optimizeCloudinary(pickMobileSrc(slide), HERO_WIDTHS.mobile),
  }
}

/** Media queries matching HeroBlock's Tailwind breakpoints (md = 768, lg = 1024). */
export const HERO_MEDIA = {
  desktop: "(min-width: 1024px)",
  tablet: "(min-width: 768px) and (max-width: 1023.98px)",
  mobile: "(max-width: 767.98px)",
} as const

/**
 * Preload descriptors for the first hero slide (the LCP image on load), one
 * per breakpoint, media-scoped so each viewport fetches only its variant.
 */
export function heroPreloads(banners: HeroBannerLike[] | null | undefined) {
  const first = selectHeroSlides(banners)[0] ?? null
  const src = heroSources(first)
  return (["mobile", "tablet", "desktop"] as const).map((k) => ({ href: src[k], media: HERO_MEDIA[k] }))
}
