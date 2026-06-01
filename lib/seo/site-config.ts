/** Canonical site origin — override in production via NEXT_PUBLIC_SITE_URL */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.100xcircle.com"
).replace(/\/$/, "")

export const SITE_NAME = "100x Circle"
export const SITE_NAME_LEGAL = "100X Circle Pvt Ltd"

export const BUSINESS = {
  /** WhatsApp (and wa.me) — E.164 digits without + */
  whatsappE164: "917827229116",
  phonePrimary: "+91-7827229116",
  phoneSecondary: "+91-8178567520",
  email: "100xcircle@gmail.com",
  streetAddress: "UG, 398, Sector 7, Industrial Model Township",
  addressLocality: "Gurugram",
  addressRegion: "Haryana",
  postalCode: "122050",
  addressCountry: "IN",
  geo: {
    latitude: 28.3874,
    longitude: 76.9318,
  },
  youtube: "https://www.youtube.com/@100Xcircle",
  facebook: "https://www.facebook.com/100xcircle",
  instagram: "https://www.instagram.com/100xcircle",
  linkedin: "https://www.linkedin.com/company/100xcircle",
  twitter: "https://x.com/100xcircle",
} as const

export const defaultOgImage = `${SITE_URL}/logo-main.png`
