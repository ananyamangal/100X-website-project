/**
 * The ONE Organization node for 100X Circle (SEO program item E4, 2026-10).
 *
 * Every page emits it once, through components/seo/GlobalJsonLd.tsx (root
 * layout, via SiteShell). Other schema should reference it by `@id`
 * (ORGANIZATION_ID) instead of re-declaring the company.
 *
 * Facts come from docs/FACTS.md only:
 *  - foundingDate "2020" (owner).
 *  - ISI is owner-confirmed; GeM selling is documented. ISO 9001, CE and the
 *    MSME/Udyam number have no certificate on file (OPEN_FACTS #11-#13), so
 *    they are not asserted as credentials here.
 *  - sameAs lists only the company's own social profiles that the site links
 *    to (admin-managed social links, defaults in lib/socialLinksShared.ts;
 *    OPEN_FACTS #14). Generic sites (gem.gov.in, udyamregistration.gov.in) and
 *    our own pages are not profiles and are not listed.
 *  - areaServed: India. Export markets are not in FACTS (OPEN_FACTS #22).
 */
import { BUSINESS, SITE_NAME, SITE_NAME_LEGAL, SITE_URL, defaultOgImage } from "./site-config"
import { DEFAULT_SOCIAL_LINKS, socialLinksToSameAs, type SocialLinks } from "../socialLinksShared"
import { FOUNDED_YEAR } from "../facts"

export const ORGANIZATION_ID = `${SITE_URL}/#organization`

/** Only http(s) profile URLs on other domains, de-duplicated, in order. */
export function organizationSameAs(socialLinks?: SocialLinks): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of socialLinksToSameAs(socialLinks ?? DEFAULT_SOCIAL_LINKS)) {
    const url = raw.trim()
    if (!/^https?:\/\//i.test(url)) continue
    if (url.startsWith(SITE_URL)) continue
    if (seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

export function buildOrganizationNode(socialLinks?: SocialLinks) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "Manufacturer"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME_LEGAL,
    alternateName: [SITE_NAME, "100X", "100 X Circle"],
    legalName: "100X Circle Private Limited",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE_URL}/#logo`,
      url: defaultOgImage,
      contentUrl: defaultOgImage,
      caption: "100X Circle — Indian Thermal Fogging Machine Manufacturer",
    },
    image: defaultOgImage,
    email: BUSINESS.email,
    telephone: [BUSINESS.phonePrimary, BUSINESS.phoneSecondary],
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
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
    sameAs: organizationSameAs(socialLinks),
    foundingDate: String(FOUNDED_YEAR),
    foundingLocation: {
      "@type": "Place",
      name: "Gurugram, Haryana, India",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Gurugram",
        addressRegion: "Haryana",
        addressCountry: "IN",
      },
    },
    description:
      "100X Circle Pvt Ltd is an Indian OEM manufacturer of pulse-jet thermal and cold fogging machines for municipal vector control, public health and agricultural use, in business since 2020. Machines are sold directly and through the Government e-Marketplace (GeM). Factory at IMT Manesar, Gurugram, Haryana.",
    knowsAbout: [
      "Pulse-jet thermal fogging technology",
      "Vector-borne disease control — dengue, malaria, chikungunya",
      "Municipal mosquito control operations",
      "Agricultural crop protection fogging",
      "Government e-Marketplace (GeM) procurement",
      "WHO mosquito control protocols",
      "Vehicle-mounted fogging systems",
      "Indian agricultural machinery manufacturing",
    ],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "certification",
        name: "ISI Mark — Bureau of Indian Standards",
        description: "BIS product standard certification (select models)",
        recognizedBy: { "@type": "Organization", name: "Bureau of Indian Standards, Government of India" },
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "registration",
        name: "GeM Seller Registration",
        description: "Seller on the Government e-Marketplace for direct government procurement",
        recognizedBy: { "@type": "Organization", name: "Government e-Marketplace (GeM), Government of India" },
      },
    ],
    makesOffer: {
      "@type": "OfferCatalog",
      name: "100X Circle Fogging Equipment Catalog",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Municipal Vector-Control Foggers",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Thing",
                name: "Vehicle-Mounted Thermal Fogging Machine",
                description: "High-capacity pulse-jet fogger mounted on vehicles for city-wide mosquito control",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Thing",
                name: "Double-Barrel Thermal Fogger",
                description: "Dual-output thermal fogger for maximum coverage in municipal operations",
              },
            },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Agricultural and Portable Foggers",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Thing",
                name: "Portable Pulse-Jet Thermal Fogger",
                description: "Single-operator handheld fogger for farm and small-area use",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Thing",
                name: "Agricultural Sprayer and Power Tiller",
                description: "Farm equipment for crop protection and soil preparation",
              },
            },
          ],
        },
      ],
    },
    areaServed: { "@type": "Country", name: "India" },
    naics: "333999",
    isicV4: "2819",
    slogan: "100X your productivity with Indian-made fogging technology",
  }
}
