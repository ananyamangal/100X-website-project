import type { ReactNode } from "react"
import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "About Us | 100x Circle",
  description:
    "Learn about 100x Circle Pvt Ltd — thermal fogging machine manufacturer, mission, manufacturing excellence, and commitment to public health and agriculture across India.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description:
      "Our journey, foundation, and manufacturing standards for industrial fogging and agricultural equipment.",
    url: `${SITE_URL}/about`,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `About | ${SITE_NAME}`,
    description: "Manufacturer of thermal fogging machines and agricultural equipment in India.",
  },
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children
}
