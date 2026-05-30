import type { Metadata } from "next"
import { SITE_URL, SITE_NAME_LEGAL, defaultOgImage } from "@/lib/seo/site-config"
import AboutClient from "./AboutClient"

export const metadata: Metadata = {
  title: "About 100X Circle — Indian Thermal Fogging Machine Manufacturer",
  description:
    "100X Circle Pvt Ltd is an Indian OEM manufacturer of pulse-jet thermal fogging machines. Founded 2014. ISO 9001:2015 certified. GeM-listed, MSME/UDYAM registered. Factory at IMT Manesar, Gurugram, Haryana.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "About 100X Circle — Indian Thermal Fogging Machine Manufacturer",
    description:
      "Indian OEM manufacturer of thermal fogging machines. ISO 9001:2015, CE, ISI, GeM listed. Factory at IMT Manesar, Gurugram. Supplies to 50+ dealers and government bodies pan-India.",
    url: `${SITE_URL}/about`,
    siteName: "100X Circle",
    locale: "en_IN",
    type: "website",
  },
}

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${SITE_URL}/about`,
  name: "About 100X Circle Pvt Ltd",
  url: `${SITE_URL}/about`,
  mainEntity: {
    "@id": `${SITE_URL}/#organization`,
    "@type": ["Organization", "Manufacturer"],
    name: SITE_NAME_LEGAL,
    legalName: "100X Circle Private Limited",
    alternateName: ["100X", "Instafog", "100X Circle"],
    url: SITE_URL,
    logo: `${defaultOgImage}`,
    foundingDate: "2014",
    description:
      "100X Circle Pvt Ltd is an Indian OEM manufacturer of pulse-jet thermal fogging machines. Established 2014. ISO 9001:2015 certified, CE marked, ISI marked, MSME/UDYAM registered, and GeM-approved seller for direct government procurement. Factory at IMT Manesar, Gurugram, Haryana. Brands: 100X, Instafog.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "UG, 398, Sector 7, Industrial Model Township",
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      postalCode: "122050",
      addressCountry: "IN",
    },
    telephone: ["+91-7827229116", "+91-8178567520"],
    email: "100xcircle@gmail.com",
    numberOfEmployees: { "@type": "QuantitativeValue", minValue: 25, maxValue: 100 },
    naics: "333999",
    isicV4: "2819",
    hasCredential: [
      { "@type": "EducationalOccupationalCredential", name: "ISO 9001:2015", credentialCategory: "Quality Management System" },
      { "@type": "EducationalOccupationalCredential", name: "CE Marking", credentialCategory: "European Product Conformity" },
      { "@type": "EducationalOccupationalCredential", name: "ISI Mark — Bureau of Indian Standards", credentialCategory: "Indian Product Standard" },
      { "@type": "EducationalOccupationalCredential", name: "MSME / UDYAM Registration", credentialCategory: "Government Enterprise Registration" },
      { "@type": "EducationalOccupationalCredential", name: "GeM Seller Registration", credentialCategory: "Government e-Marketplace" },
    ],
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "AdministrativeArea", name: "South Asia" },
      { "@type": "AdministrativeArea", name: "Africa" },
      { "@type": "AdministrativeArea", name: "Middle East" },
    ],
    knowsAbout: [
      "Pulse-jet thermal fogging technology",
      "Vector-borne disease control — dengue, malaria, chikungunya",
      "Municipal mosquito control operations",
      "Government e-Marketplace (GeM) procurement",
      "Agricultural crop protection fogging",
    ],
    sameAs: ["https://www.youtube.com/@100Xcircle", "https://gem.gov.in"],
  },
}

const aboutFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "When was 100X Circle Pvt Ltd founded?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle Pvt Ltd was founded in 2014. It is incorporated as a Private Limited Company in India and operates a manufacturing facility at IMT Manesar, Gurugram, Haryana.",
      },
    },
    {
      "@type": "Question",
      name: "What certifications does 100X Circle hold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle Pvt Ltd holds: ISO 9001:2015 (Quality Management System), CE Marking (European conformity for export), ISI Mark from Bureau of Indian Standards, MSME/UDYAM Registration, and GeM Seller Registration for government e-Marketplace procurement.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle supply to government agencies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle is a GeM-registered seller and MSME/UDYAM registered manufacturer. Government agencies — including municipal corporations, Nagar Nigams, district health departments, and state public works departments — can procure directly via the Government e-Marketplace (gem.gov.in) without a tender process.",
      },
    },
    {
      "@type": "Question",
      name: "Where is the 100X Circle factory located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The 100X Circle manufacturing facility is located at UG, 398, Sector 7, Industrial Model Township (IMT), Manesar, Gurugram, Haryana 122050, India. GPS: 28.3874°N, 76.9318°E.",
      },
    },
  ],
}

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutFaqJsonLd) }} />
      <AboutClient />
    </>
  )
}
