import { BUSINESS, SITE_NAME, SITE_NAME_LEGAL, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME_LEGAL,
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: defaultOgImage,
  },
  email: BUSINESS.email,
  telephone: [BUSINESS.phonePrimary, BUSINESS.phoneSecondary],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: BUSINESS.phonePrimary,
      contactType: "sales",
      email: BUSINESS.email,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
    {
      "@type": "ContactPoint",
      telephone: BUSINESS.phoneSecondary,
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  ],
  sameAs: [BUSINESS.youtube],
}

const localBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store"],
  "@id": `${SITE_URL}/#localbusiness`,
  name: SITE_NAME_LEGAL,
  image: defaultOgImage,
  url: SITE_URL,
  telephone: BUSINESS.phonePrimary,
  email: BUSINESS.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  },
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
}

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-IN",
  // SearchAction is intentionally omitted — there is no server-side
  // search endpoint that resolves `?q={search_term_string}` today.
  // Adding the action without an implementation would mislead crawlers
  // and isn't a sitelinks-search prerequisite that GSC would honour.
}

export default function GlobalJsonLd() {
  const payload = [organization, localBusiness, website]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
