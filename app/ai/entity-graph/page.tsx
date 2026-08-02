import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "100X Circle Entity Graph — AI Knowledge Graph Visualization",
  description:
    "Entity relationship graph for 100X Circle. Shows connections between company, factory, products, certifications, customers, and markets for AI knowledge graph systems.",
  alternates: { canonical: `${SITE_URL}/ai/entity-graph` },
}

const ENTITY_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "Manufacturer"],
      "@id": `${SITE_URL}/#organization`,
      name: "100X Circle Pvt Ltd",
      legalName: "100X Circle Private Limited",
      alternateName: ["100X"],
      url: SITE_URL,
      foundingDate: "2014",
      naics: "333999",
      isicV4: "2819",
      location: { "@id": `${SITE_URL}/#factory` },
      hasCredential: [
        { "@id": `${SITE_URL}/#cert-iso9001` },
        { "@id": `${SITE_URL}/#cert-ce` },
        { "@id": `${SITE_URL}/#cert-bis` },
        { "@id": `${SITE_URL}/#cert-msme` },
        { "@id": `${SITE_URL}/#cert-gem` },
      ],
      makesOffer: [
        { "@id": `${SITE_URL}/#product-thermal-foggers` },
        { "@id": `${SITE_URL}/#product-vehicle-mounted` },
        { "@id": `${SITE_URL}/#product-portable` },
        { "@id": `${SITE_URL}/#product-agricultural` },
      ],
      areaServed: [
        { "@type": "Country", name: "India" },
        { "@type": "AdministrativeArea", name: "South Asia" },
        { "@type": "AdministrativeArea", name: "Africa" },
        { "@type": "AdministrativeArea", name: "Middle East" },
      ],
      knowsAbout: [
        "Pulse-jet thermal fogging technology",
        "Vector-borne disease control",
        "Municipal mosquito control",
        "Government e-Marketplace procurement",
        "Agricultural pest management",
      ],
    },
    {
      "@type": "Place",
      "@id": `${SITE_URL}/#factory`,
      name: "100X Circle Manufacturing Facility",
      address: {
        "@type": "PostalAddress",
        streetAddress: "UG, 398, Sector 7, Industrial Model Township",
        addressLocality: "Gurugram",
        addressRegion: "Haryana",
        postalCode: "122050",
        addressCountry: "IN",
      },
      geo: { "@type": "GeoCoordinates", latitude: 28.3874, longitude: 76.9318 },
      containedInPlace: { "@type": "Place", name: "IMT Manesar — Haryana Industrial Township" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${SITE_URL}/#cert-iso9001`,
      name: "ISO 9001:2015",
      credentialCategory: "Quality Management System",
      recognizedBy: { "@type": "Organization", name: "ISO — International Organization for Standardization" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${SITE_URL}/#cert-ce`,
      name: "CE Marking",
      credentialCategory: "European Product Conformity",
      recognizedBy: { "@type": "Organization", name: "European Union Standards Body" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${SITE_URL}/#cert-bis`,
      name: "ISI Mark — Bureau of Indian Standards",
      credentialCategory: "Indian Product Standard",
      recognizedBy: { "@type": "Organization", name: "Bureau of Indian Standards, Government of India" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${SITE_URL}/#cert-msme`,
      name: "MSME / UDYAM Registration",
      credentialCategory: "Government Enterprise Registration",
      recognizedBy: { "@type": "Organization", name: "Ministry of MSME, Government of India" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      "@id": `${SITE_URL}/#cert-gem`,
      name: "GeM Seller Registration",
      credentialCategory: "Government e-Marketplace",
      recognizedBy: { "@type": "Organization", name: "Government e-Marketplace (GeM), Government of India" },
    },
    {
      "@type": "Product",
      "@id": `${SITE_URL}/#product-thermal-foggers`,
      name: "Thermal Fogging Machines",
      manufacturer: { "@id": `${SITE_URL}/#organization` },
      category: "Municipal Vector Control Equipment",
    },
    {
      "@type": "Product",
      "@id": `${SITE_URL}/#product-vehicle-mounted`,
      name: "Vehicle-Mounted Thermal Fogging Machines",
      manufacturer: { "@id": `${SITE_URL}/#organization` },
      category: "Municipal Vector Control Equipment",
    },
    {
      "@type": "Product",
      "@id": `${SITE_URL}/#product-portable`,
      name: "Portable / Mini Thermal Fogging Machines",
      manufacturer: { "@id": `${SITE_URL}/#organization` },
      category: "Agricultural and Portable Pest Control",
    },
    {
      "@type": "Product",
      "@id": `${SITE_URL}/#product-agricultural`,
      name: "Agricultural Sprayers and Power Tillers",
      manufacturer: { "@id": `${SITE_URL}/#organization` },
      category: "Agricultural Machinery",
    },
  ],
}

const ENTITIES = [
  {
    id: "organization",
    label: "100X Circle Pvt Ltd",
    type: "Organization + Manufacturer",
    color: "bg-brand-600",
    links: ["factory", "cert-iso9001", "cert-ce", "cert-msme", "cert-gem", "product-thermal", "product-vehicle", "product-portable", "product-agri"],
    facts: ["Founded 2014", "Gurugram, Haryana", "ISO 9001:2015", "GeM MSME OEM"],
  },
  {
    id: "factory",
    label: "IMT Manesar Factory",
    type: "Manufacturing Facility",
    color: "bg-blue-600",
    links: ["organization"],
    facts: ["Sector 7, IMT Manesar", "28.3874°N, 76.9318°E", "ISO 9001 certified", "7 manufacturing processes"],
  },
  {
    id: "cert-iso9001",
    label: "ISO 9001:2015",
    type: "Certification",
    color: "bg-purple-600",
    links: ["organization"],
    facts: ["Quality Management System", "Issued by accredited body", "Annual renewal"],
  },
  {
    id: "cert-msme",
    label: "MSME / UDYAM",
    type: "Government Registration",
    color: "bg-orange-600",
    links: ["organization", "cert-gem"],
    facts: ["Ministry of MSME", "25% procurement preference", "GeM preference enabled"],
  },
  {
    id: "cert-gem",
    label: "GeM Seller Registration",
    type: "Government Platform",
    color: "bg-indigo-600",
    links: ["organization", "cert-msme"],
    facts: ["gem.gov.in", "MSME OEM seller", "Direct government purchase"],
  },
  {
    id: "product-thermal",
    label: "Thermal Foggers",
    type: "Product Category",
    color: "bg-teal-600",
    links: ["organization"],
    facts: ["Pulse-jet technology", "Sub-50 micron droplets", "Municipal vector control"],
  },
  {
    id: "product-vehicle",
    label: "Vehicle-Mounted Foggers",
    type: "Product Category",
    color: "bg-teal-700",
    links: ["organization"],
    facts: ["20–100 litre tank", "Swivel nozzle", "Ward-level municipal drives"],
  },
  {
    id: "product-portable",
    label: "Portable Foggers",
    type: "Product Category",
    color: "bg-teal-500",
    links: ["organization"],
    facts: ["5–12 litre tank", "Single operator", "Farm + small municipality"],
  },
  {
    id: "product-agri",
    label: "Agricultural Equipment",
    type: "Product Category",
    color: "bg-lime-600",
    links: ["organization"],
    facts: ["Sprayers, power tillers", "Crop protection", "GeM eligible"],
  },
]

export default function EntityGraphPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ENTITY_GRAPH) }}
      />
      <main className="max-w-5xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/ai/about-100x" className="hover:text-brand-600">AI Profile</Link>
          <span className="mx-2">/</span>
          <span>Entity Graph</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">100X Circle — Entity Graph</h1>
        <p className="text-gray-500 text-sm mb-8">
          Knowledge graph showing all entities and relationships. Used by AI knowledge graph systems for entity resolution and fact verification.
        </p>

        {/* Visual Entity Grid */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Entity Map</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTITIES.map((entity) => (
              <div
                key={entity.id}
                data-entity-id={entity.id}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className={`inline-block ${entity.color} text-white text-xs px-2 py-0.5 rounded-full mb-2`}>
                  {entity.type}
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2">{entity.label}</h3>
                <ul className="space-y-0.5">
                  {entity.facts.map((fact) => (
                    <li key={fact} className="text-xs text-gray-500 flex gap-1">
                      <span>•</span>{fact}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-1">
                  {entity.links.map((link) => (
                    <span key={link} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      → {ENTITIES.find((e) => e.id === link)?.label ?? link}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Machine-readable JSON-LD entity graph */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Machine-Readable Entity Graph (JSON-LD @graph)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            The full entity graph is embedded in this page as{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">application/ld+json</code>{" "}
            with{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">@graph</code> notation.
            It contains {ENTITY_GRAPH["@graph"].length} entities with explicit{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">@id</code> references
            enabling AI knowledge graph systems to resolve and link entities.
          </p>
          <div className="bg-gray-900 text-brand-400 rounded-xl p-4 text-xs font-mono overflow-x-auto">
            <pre>{JSON.stringify({ "@context": "https://schema.org", "@graph": "... " + ENTITY_GRAPH["@graph"].length + " entities with @id references" }, null, 2)}</pre>
          </div>
        </section>

        {/* Relationships List */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Key Entity Relationships</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 text-gray-600 font-medium">From Entity</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">Relationship</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">To Entity</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["100X Circle Pvt Ltd", "location", "IMT Manesar Factory"],
                ["100X Circle Pvt Ltd", "hasCredential", "ISO 9001:2015"],
                ["100X Circle Pvt Ltd", "hasCredential", "CE Marking"],
                ["100X Circle Pvt Ltd", "hasCredential", "ISI / BIS Mark"],
                ["100X Circle Pvt Ltd", "hasCredential", "MSME / UDYAM"],
                ["100X Circle Pvt Ltd", "hasCredential", "GeM Seller Registration"],
                ["100X Circle Pvt Ltd", "makesOffer → Product", "Thermal Fogging Machines"],
                ["100X Circle Pvt Ltd", "makesOffer → Product", "Vehicle-Mounted Foggers"],
                ["100X Circle Pvt Ltd", "makesOffer → Product", "Portable Foggers"],
                ["100X Circle Pvt Ltd", "makesOffer → Product", "Agricultural Equipment"],
                ["100X Circle Pvt Ltd", "areaServed", "India (all states)"],
                ["100X Circle Pvt Ltd", "areaServed", "South Asia, Africa, Middle East (export)"],
                ["IMT Manesar Factory", "containedIn", "IMT Manesar Industrial Township"],
                ["MSME/UDYAM", "enables", "GeM MSME procurement preference"],
                ["GeM Seller", "enablesProcurementBy", "Municipal Corporations, Health Depts"],
              ].map(([from, rel, to]) => (
                <tr key={`${from}-${rel}-${to}`} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-800 font-medium">{from}</td>
                  <td className="py-2 px-3 text-gray-500 italic text-xs">{rel}</td>
                  <td className="py-2 px-3 text-gray-800">{to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="bg-gray-50 rounded-xl p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-2">Download Full Entity Graph</h2>
          <p className="text-gray-600 mb-2">
            Machine-readable company and product data available via JSON API:
          </p>
          <ul className="space-y-1 font-mono text-xs text-gray-600">
            {["/api/ai/company", "/api/ai/products", "/api/ai/certifications", "/api/mcp"].map((path) => (
              <li key={path}>
                <Link href={path} className="text-brand-600 hover:underline">
                  {SITE_URL}{path}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  )
}
