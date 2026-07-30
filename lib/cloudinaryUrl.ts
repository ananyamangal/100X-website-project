/**
 * Inject Cloudinary delivery transforms into a secure_url so the CDN serves
 * the best format (WebP/AVIF) and an automatically-tuned quality. No-ops for
 * non-Cloudinary URLs (e.g. /banner-desktop.jpg fallbacks).
 *
 * Examples:
 *   optimizeCloudinary(url, 1920)  → f_auto,q_auto:good,w_1920,dpr_auto,c_limit
 *   optimizeCloudinary(url, 400)   → f_auto,q_auto,w_400,dpr_auto,c_limit
 */
export function optimizeCloudinary(
  url: string | undefined | null,
  width?: number,
  quality: 'auto' | 'auto:good' | 'auto:best' | 'auto:eco' = 'auto',
): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com")) return url
  // Already transformed — don't double-apply
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return url
  const parts = ["f_auto", `q_${quality}`]
  if (width && width > 0) {
    parts.push(`w_${Math.round(width)}`, "c_limit", "dpr_auto")
  }
  return url.replace("/upload/", `/upload/${parts.join(",")}/`)
}

/**
 * Face-cropped square avatar transform, for small circular headshots (e.g.
 * testimonial/trust-badge photos) cut from a full-body or portrait source
 * image. `size` is the CSS display size in px — requested at 2x for
 * retina/dpr_auto. No-ops for non-Cloudinary URLs.
 */
export function cloudinaryAvatarUrl(url: string | undefined | null, size = 64): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com")) return url
  const px = Math.round(size) * 2
  const parts = ["f_auto", "q_auto", `w_${px}`, `h_${px}`, "c_fill", "g_face", "dpr_auto"]
  return url.replace("/upload/", `/upload/${parts.join(",")}/`)
}

/**
 * Generate a tiny LQIP (Low Quality Image Placeholder) Cloudinary URL.
 * Used as blur placeholders while the full image loads.
 */
export function cloudinaryLqip(url: string | undefined | null): string {
  if (!url || !url.includes("res.cloudinary.com")) return HERO_BLUR_DATA_URL
  if (url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/w_32,q_1,f_jpg,e_blur:400/")
  }
  return HERO_BLUR_DATA_URL
}

// Tiny base64 blur placeholder — used as fallback when LQIP isn't available.
export const HERO_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSI5IiB2aWV3Qm94PSIwIDAgMTYgOSI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjkiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4="
