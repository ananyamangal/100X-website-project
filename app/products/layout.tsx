import type { ReactNode } from "react"
import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Industrial & Agricultural Equipment Catalog | 100x Circle",
  description:
    "Browse thermal fogging machines, sprayers, tillers, and industrial equipment from 100x Circle — manufacturer and supplier across India.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: `Products | ${SITE_NAME}`,
    description:
      "Browse verified industrial fogging machines and agricultural equipment with brochures and specifications.",
    url: `${SITE_URL}/products`,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Products | ${SITE_NAME}`,
    description: "Thermal fogging machines and agricultural equipment from 100x Circle.",
  },
}

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return children
}
