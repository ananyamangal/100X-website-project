// Run: node --import ./tests/support/register.mjs --test tests/unit/hero-banner.test.mjs
// Pins lib/heroBanner.ts: the homepage hero preload tags must point at exactly
// the URL HeroBlock paints for the first slide at each breakpoint (B10 perf).
import test from "node:test"
import assert from "node:assert/strict"
import {
  selectHeroSlides,
  heroSources,
  heroPreloads,
  HERO_MEDIA,
  DESKTOP_FALLBACK,
  TABLET_FALLBACK,
  MOBILE_FALLBACK,
} from "../../lib/heroBanner.ts"

const CLD = (id) => `https://res.cloudinary.com/demo/image/upload/v1/${id}.jpg`

test("slides: only active banners with an image, in admin order", () => {
  const slides = selectHeroSlides([
    { id: "b", isActive: true, order: 2, desktopBannerImage: CLD("b") },
    { id: "off", isActive: false, order: 0, desktopBannerImage: CLD("off") },
    { id: "noimg", isActive: true, order: 0 },
    { id: "a", isActive: true, order: 1, image: CLD("a") },
  ])
  assert.deepEqual(slides.map((s) => s.id), ["a", "b"])
  assert.deepEqual(selectHeroSlides(undefined), [])
})

test("sources: per-breakpoint picks with Cloudinary delivery widths", () => {
  const s = heroSources({ desktopBannerImage: CLD("d"), mobileBannerImage: CLD("m") })
  assert.equal(s.desktop, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1920,c_limit,dpr_auto/v1/d.jpg")
  assert.equal(s.tablet, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1200,c_limit,dpr_auto/v1/d.jpg")
  assert.equal(s.mobile, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800,c_limit,dpr_auto/v1/m.jpg")
})

test("sources: disabled breakpoints and no slide fall back to the static banners", () => {
  const s = heroSources({ desktopBannerImage: CLD("d"), mobileBannerEnabled: false, tabletBannerEnabled: false })
  assert.equal(s.mobile, MOBILE_FALLBACK)
  assert.equal(s.tablet, TABLET_FALLBACK)
  assert.deepEqual(heroSources(null), { desktop: DESKTOP_FALLBACK, tablet: TABLET_FALLBACK, mobile: MOBILE_FALLBACK })
})

test("preloads: first *rendered* slide (not raw DB order), media-scoped, same URLs as the hero", () => {
  const banners = [
    { isActive: false, order: 0, desktopBannerImage: CLD("inactive") },
    { isActive: true, order: 5, desktopBannerImage: CLD("second") },
    { isActive: true, order: 1, desktopBannerImage: CLD("first"), mobileBannerImage: CLD("first-m") },
  ]
  const pre = heroPreloads(banners)
  const src = heroSources(selectHeroSlides(banners)[0])
  assert.deepEqual(pre, [
    { href: src.mobile, media: HERO_MEDIA.mobile },
    { href: src.tablet, media: HERO_MEDIA.tablet },
    { href: src.desktop, media: HERO_MEDIA.desktop },
  ])
  assert.match(pre[0].href, /first-m\.jpg$/)
})

test("preloads: no banners -> the static fallbacks the hero paints", () => {
  assert.deepEqual(heroPreloads([]).map((p) => p.href), [MOBILE_FALLBACK, TABLET_FALLBACK, DESKTOP_FALLBACK])
})

test("media queries do not overlap and match Tailwind md/lg", () => {
  assert.equal(HERO_MEDIA.mobile, "(max-width: 767.98px)")
  assert.equal(HERO_MEDIA.tablet, "(min-width: 768px) and (max-width: 1023.98px)")
  assert.equal(HERO_MEDIA.desktop, "(min-width: 1024px)")
})
