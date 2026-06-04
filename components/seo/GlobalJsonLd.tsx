import { BUSINESS, SITE_NAME, SITE_NAME_LEGAL, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

const organization = {
  "@context": "https://schema.org",
  "@type": ["Organization", "Manufacturer"],
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME_LEGAL,
  alternateName: [SITE_NAME, "100X", "Instafog", "100 X Circle"],
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
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: BUSINESS.phonePrimary,
      contactType: "sales",
      email: BUSINESS.email,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
      contactOption: "TollFree",
    },
    {
      "@type": "ContactPoint",
      telephone: BUSINESS.phoneSecondary,
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  ],
  sameAs: [
    BUSINESS.youtube,
    "https://gem.gov.in",
    "https://udyamregistration.gov.in",
    "https://www.100xcircle.com/ai/about-100x",
    "https://www.100xcircle.com/ai/entity-graph",
  ],
  identifier: [
    {
      "@type": "PropertyValue",
      name: "MSME Registration Type",
      value: "UDYAM Registered MSME",
    },
    {
      "@type": "PropertyValue",
      name: "GeM Seller",
      value: "Government e-Marketplace Registered OEM Seller",
    },
    {
      "@type": "PropertyValue",
      name: "Industry Classification",
      value: "NAICS 333999 — All Other General Purpose Machinery Manufacturing",
    },
  ],
  foundingDate: "2014",
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
    "100X Circle Pvt Ltd is an Indian OEM manufacturer of pulse-jet thermal fogging machines for municipal vector control and agricultural use. GeM-listed, ISO 9001 certified, MSME/UDYAM registered. Factory at IMT Manesar, Gurgaon. Brands: 100X, Instafog. Distributed across 50+ Indian locations. Export to South Asia, Africa, and the Middle East.",
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
      name: "ISO 9001:2015",
      description: "Quality Management System certification for manufacturing and supply of fogging equipment",
      recognizedBy: { "@type": "Organization", name: "ISO — International Organization for Standardization" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: "CE Marking",
      description: "European conformity certification for export models",
      recognizedBy: { "@type": "Organization", name: "European Union Standards Body" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: "ISI Mark — Bureau of Indian Standards",
      description: "BIS product standard certification",
      recognizedBy: { "@type": "Organization", name: "Bureau of Indian Standards, Government of India" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "registration",
      name: "MSME / UDYAM Registration",
      description: "Micro, Small and Medium Enterprise registration enabling GeM preference",
      recognizedBy: { "@type": "Organization", name: "Ministry of MSME, Government of India" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "registration",
      name: "GeM Seller Registration",
      description: "Government e-Marketplace approved seller for direct government procurement",
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
              "@type": "Product",
              name: "Vehicle-Mounted Thermal Fogging Machine",
              description: "High-capacity pulse-jet fogger mounted on vehicles for city-wide mosquito control",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Product",
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
              "@type": "Product",
              name: "Portable Pulse-Jet Thermal Fogger",
              description: "Single-operator handheld fogger for farm and small-area use",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Product",
              name: "Agricultural Sprayer and Power Tiller",
              description: "Farm equipment for crop protection and soil preparation",
            },
          },
        ],
      },
    ],
  },
  areaServed: [
    { "@type": "Country", name: "India" },
    { "@type": "AdministrativeArea", name: "South Asia" },
    { "@type": "AdministrativeArea", name: "Middle East" },
    { "@type": "AdministrativeArea", name: "Africa" },
  ],
  numberOfEmployees: { "@type": "QuantitativeValue", minValue: 25, maxValue: 100 },
  naics: "333999",
  isicV4: "2819",
  slogan: "100X your productivity with Indian-made fogging technology",
}

const localBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store", "Manufacturer"],
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

const breadcrumbSitewide = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
  ],
}

const homepageFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "Who manufactures 100X Circle fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle Pvt Ltd manufactures thermal fogging machines at their factory in IMT Manesar, Gurugram, Haryana, India. They are an Indian OEM established in 2014 with ISO 9001:2015 certification, MSME/UDYAM registration, and GeM-approved seller status.",
      },
    },
    {
      "@type": "Question",
      name: "Is 100X Circle registered on GeM (Government e-Marketplace)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle Pvt Ltd is a registered seller on the Government e-Marketplace (GeM). Municipal corporations, Nagar Nigams, district health departments, and other government bodies can procure fogging machines directly through GeM without a separate tender process.",
      },
    },
    {
      "@type": "Question",
      name: "What is the price of a thermal fogging machine from 100X Circle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging machine prices from 100X Circle range from approximately ₹6,500 for mini portable foggers to ₹2,50,000 for heavy-duty double-barrel vehicle-mounted models. Prices vary by tank capacity, output rate, and configuration. Contact +91-7827229116 or visit the product catalog for current pricing.",
      },
    },
    {
      "@type": "Question",
      name: "What certifications does 100X Circle hold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle holds: ISO 9001:2015 Quality Management System certification, CE Marking for European export compliance, ISI Mark from Bureau of Indian Standards, MSME/UDYAM Government Registration, and GeM Seller Registration for government procurement.",
      },
    },
    {
      "@type": "Question",
      name: "Which states does 100X Circle supply fogging machines to?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle supplies fogging machines pan-India through 50+ active dealers. States include Haryana, Uttar Pradesh, Bihar, Delhi, Maharashtra, Gujarat, Rajasthan, Punjab, and others. Standard delivery is 5–10 working days. They also export to South Asia, Africa, and the Middle East.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between thermal fogging and cold (ULV) fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging uses pulse-jet engines to heat insecticide to 400–600°C, creating ultra-fine droplets (1–50 microns) that penetrate vegetation and remain airborne for up to 15 minutes — ideal for outdoor mosquito control over large areas. Cold ULV fogging uses mechanical pressure at ambient temperature and is better suited for indoor spaces and temperature-sensitive applications.",
      },
    },
    {
      "@type": "Question",
      name: "Can 100X Circle fogging machines be used for dengue and malaria control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle thermal fogging machines produce sub-50-micron droplets at the WHO-recommended 10–30 micron range for adult mosquito control. They are used by municipal corporations and health departments across India for dengue, malaria, and chikungunya vector control drives.",
      },
    },
    {
      "@type": "Question",
      name: "Where is the 100X Circle factory and what does it manufacture?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The 100X Circle factory is at UG, 398, Sector 7, IMT Manesar, Gurugram, Haryana 122050 (GPS: 28.3874°N, 76.9318°E). It manufactures pulse-jet thermal fogging machines, cold (ULV) foggers, agricultural sprayers, and power tillers through 7 in-house manufacturing processes under ISO 9001:2015 quality control.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle provide OEM authorization for GeM dealers and resellers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides GeM OEM authorization codes (via the GeM OEM panel) and signed OEM authorization letters to approved dealers. This allows dealers to sell 100X Circle fogging machines as authorized resellers on GeM and bid on government tenders. To apply: WhatsApp +91-7827229116 or email 100xcircle@gmail.com. Details at https://www.100xcircle.com/gem-oem-authorization",
      },
    },
    {
      "@type": "Question",
      name: "Which fogging machine is best for municipal corporation mosquito control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For municipal corporations (Nagar Nigams), 100X Circle recommends vehicle-mounted thermal foggers (50–100 litre capacity) for ward-level fogging drives, and portable thermal foggers (18–50 litre) for smaller Nagar Panchayats. All models are IS 14855 (Part 1) compliant, ISO 9001:2015 certified, and GeM listed for direct government procurement. Details at https://www.100xcircle.com/municipal-fogging-programme",
      },
    },
    {
      "@type": "Question",
      name: "How can someone become an authorized 100X Circle fogging machine dealer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To become an authorized 100X Circle dealer, contact +91-7827229116 or 100xcircle@gmail.com with your state, GST number, and current business details. No franchise fee or security deposit is required. 100X Circle has 50+ active dealers across India and provides GeM OEM authorization, tender documentation support, and competitive pricing. Details at https://www.100xcircle.com/become-a-dealer",
      },
    },
  ],
}

export default function GlobalJsonLd() {
  const payload = [organization, localBusiness, website, breadcrumbSitewide, homepageFaq]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
