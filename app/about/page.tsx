// About page content rarely changes — cache for 5 minutes
export const revalidate = 300

import type { Metadata } from "next"
import { SITE_URL, SITE_NAME_LEGAL, defaultOgImage } from "@/lib/seo/site-config"
import AboutPageContent from "@/components/AboutPageContent"
import clientPromise from "@/lib/mongodb"

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

const DEFAULT_CONTENT = {
  heroBadge: 'About Us',
  heroTitle: 'About 100X Circle Pvt Ltd',
  journeyHeading: 'Our Journey',
  journeyParagraph1: `100X Circle Pvt Ltd is India's fast-growing OEM of advanced fogging machines, agri implements, and airport ground equipment. Located at Sector 7, IMT Manesar, Gurgaon, we proudly uphold the 'Make in India' mission by delivering CE-certified, ISO 9001-compliant, and W.H.O-compliant solutions for both public and private sectors.`,
  journeyList: 'Thermal Fogging Machines (Portable & Vehicle-Mounted)\nBio-Foggers for sensitive applications\nMini Fogging Machines for compact operations\nComplete Agricultural Machinery line\nHeavy-duty Airport Baggage Trolleys',
  journeyParagraph2: 'Tested in approved labs, our machines are available and listed on the Government e-Marketplace (GeM) and widely used by defense forces, municipal bodies, and agriculture departments.',
  journeyStat1Value: '2015',
  journeyStat1Label: 'Founded',
  journeyStat2Value: '10K+',
  journeyStat2Label: 'Happy customers',
  journeyImage: '/new.png',
  foundationHeading: 'Our Foundation',
  foundationSubtext: 'The principles that guide our work and define our commitment to excellence.',
  missionTitle: 'Mission',
  missionDescription: 'To empower customers with innovative, reliable, and affordable agricultural equipment that enhances productivity, reduces labor intensity, and contributes to sustainable farming practices.',
  visionTitle: 'Vision',
  visionDescription: 'To be the leading provider of agricultural equipment solutions, driving the transformation of farming practices through technology, innovation, and unwavering commitment to farmer success.',
  valuesTitle: 'Values',
  valuesDescription: 'Quality, integrity, innovation, and customer-centricity form the foundation of everything we do.',
  manufacturingHeading: 'Manufacturing Excellence',
  manufacturingParagraph: 'Our state-of-the-art manufacturing facility combines traditional craftsmanship with modern technology to produce equipment of the highest quality.',
  manufacturingStat1Value: 'ISO',
  manufacturingStat1Label: 'Certified',
  manufacturingStat2Value: '99.5%',
  manufacturingStat2Label: 'Quality Rate',
  manufacturingStat3Value: '24/7',
  manufacturingStat3Label: 'Production',
  manufacturingStat4Value: '50+',
  manufacturingStat4Label: 'Products',
  manufacturingImage: '/production.png',
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

export default async function AboutPage() {
  let content = DEFAULT_CONTENT
  try {
    const client = await clientPromise
    const doc = await client.db().collection('about_page').findOne({ key: 'about_page' })
    if (doc) {
      const { _id, key, ...rest } = doc as any
      content = { ...DEFAULT_CONTENT, ...rest }
    }
  } catch { /* fall back to defaults */ }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <AboutPageContent content={content} />
    </>
  )
}
