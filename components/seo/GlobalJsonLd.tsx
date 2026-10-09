import { BUSINESS, SITE_NAME, SITE_NAME_LEGAL, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"
import { businessPostalAddress, FOUNDING_DATE } from "@/lib/seo/businessSchema"
import type { SocialLinks } from "@/lib/socialLinksShared"
// E4 (2026-10): the Organization node is built in ONE place, shared by every page.
import { buildOrganizationNode } from "@/lib/seo/organization"

const localBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store", "Manufacturer"],
  "@id": `${SITE_URL}/#localbusiness`,
  name: SITE_NAME_LEGAL,
  image: defaultOgImage,
  url: SITE_URL,
  telephone: BUSINESS.phonePrimary,
  email: BUSINESS.email,
  address: businessPostalAddress(),
  // B3: same founding date as the Organization node.
  foundingDate: FOUNDING_DATE,
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.geo.latitude,
    longitude: BUSINESS.geo.longitude,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  priceRange: "$$",
  currenciesAccepted: "INR",
  paymentAccepted: "Bank Transfer, UPI, Cheque, GeM",
  hasMap: `https://maps.google.com/?q=${BUSINESS.geo.latitude},${BUSINESS.geo.longitude}`,
}

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  alternateName: "100X Circle — Thermal Fogging Machine Manufacturer India",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-IN",
  description:
    "Official website of 100X Circle Pvt Ltd — Indian OEM manufacturer of thermal fogging machines for municipal vector control, agricultural use, and government procurement.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
}

// NOTE: there used to be a sitewide 1-item "Home" BreadcrumbList here,
// emitted on every page via this component in app/layout.tsx. It provided
// no real signal on its own (a single-item breadcrumb doesn't express a
// hierarchy) and duplicated the @type "BreadcrumbList" on every page that
// already renders a real, page-specific one via <BreadcrumbJsonLd> — which
// schemaHealthAuditor.ts flags as a duplicateTypes warning. Removed rather
// than made conditional: pages with their own BreadcrumbJsonLd keep it
// (now un-duplicated), and pages that had neither (e.g. /compare/*) need a
// real page-specific breadcrumb added directly, not this stub restored.

export default function GlobalJsonLd({ socialLinks }: { socialLinks?: SocialLinks }) {
  const payload = [buildOrganizationNode(socialLinks), localBusiness, website]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
