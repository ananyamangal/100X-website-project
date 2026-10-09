// Shared schema.org fragments for the business identity (B3): one name,
// address, phone and founding date everywhere the site describes 100X Circle.
import { BUSINESS, SITE_NAME_LEGAL, SITE_URL } from "@/lib/seo/site-config"
import { FOUNDED_YEAR } from "@/lib/facts"

export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const LOCAL_BUSINESS_ID = `${SITE_URL}/#localbusiness`
export const FOUNDING_DATE = String(FOUNDED_YEAR)

export function businessPostalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  }
}

const CONTACT_URL = `${SITE_URL}/contact-us`

/** ContactPage node for /contact-us; the business itself is referenced by @id. */
export function buildContactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${CONTACT_URL}#webpage`,
    url: CONTACT_URL,
    name: `Contact ${SITE_NAME_LEGAL}`,
    inLanguage: "en-IN",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": ORGANIZATION_ID },
    mainEntity: { "@id": LOCAL_BUSINESS_ID },
    breadcrumb: { "@id": `${CONTACT_URL}#breadcrumb` },
  }
}

export function buildContactBreadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${CONTACT_URL}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Contact", item: CONTACT_URL },
    ],
  }
}
