/**
 * Inject Cloudinary delivery transforms into a secure_url so the CDN serves
 * the best format (WebP/AVIF) and an automatically-tuned quality. No-ops for
 * non-Cloudinary URLs (e.g. /banner-desktop.jpg fallbacks).
 *
 * Example:
 *   https://res.cloudinary.com/dhbvzugv6/image/upload/v1/banner.jpg
 *   → https://res.cloudinary.com/dhbvzugv6/image/upload/f_auto,q_auto/v1/banner.jpg
 *
 * `width` is optional; passing it lets Cloudinary downscale on the CDN edge
 * before sending bytes, which is the single biggest LCP win for hero images.
 */
export function optimizeCloudinary(url: string | undefined | null, width?: number): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com")) return url
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return url
  const parts = ["f_auto", "q_auto"]
  if (width && width > 0) parts.push(`w_${Math.round(width)}`)
  const transform = parts.join(",")
  return url.replace("/upload/", `/upload/${transform}/`)
}

// Tiny base64 blur placeholder — a 4px monochrome JPEG. Used as Next/Image
// blurDataURL when we don't have a per-image LQIP. Smaller than fetching a
// real low-res variant; still removes the "blank box" flash.
export const HERO_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSI5IiB2aWV3Qm94PSIwIDAgMTYgOSI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjkiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4="
