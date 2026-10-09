import type { ReactNode } from "react"
import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"
import { buildContactBreadcrumbJsonLd, buildContactPageJsonLd } from "@/lib/seo/businessSchema"

export const metadata: Metadata = {
  title: "Contact Us | 100x Circle",
  description:
    "Contact 100x Circle for thermal fogging machines, dealer enquiries, and technical support. Phone, email, and WhatsApp — Sector 7, IMT Manesar, Gurugram.",
  alternates: { canonical: "/contact-us" },
  openGraph: {
    title: `Contact Us | ${SITE_NAME}`,
    description: "Reach our sales and support team for fogging equipment across India.",
    url: `${SITE_URL}/contact-us`,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact | ${SITE_NAME}`,
    description: "Industrial fogging machines — contact 100x Circle.",
  },
}

// B3: ContactPage + BreadcrumbList for /contact-us (the page itself is a client component).
const contactPageJsonLd = buildContactPageJsonLd()
const breadcrumbJsonLd = buildContactBreadcrumbJsonLd()

export default function ContactUsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  )
}
