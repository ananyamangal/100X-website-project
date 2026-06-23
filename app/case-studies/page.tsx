import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { SITE_URL } from "@/lib/seo/site-config"
import clientPromise from "@/lib/mongodb"

export const revalidate = 300

export const metadata: Metadata = {
  title: "100X Circle Case Studies — Government & Municipal Supply Track Record",
  description:
    "Real-world government supply case studies: 100X Circle thermal fogging machines deployed by municipal corporations, health departments, and agricultural cooperatives across India.",
  alternates: { canonical: `${SITE_URL}/case-studies` },
}

const CASE_STUDIES = [
  {
    id: "municipal-nagar-nigam-haryana-up-bihar",
    title: "Vehicle-Mounted Foggers for Nagar Nigams — Haryana, UP, Bihar",
    type: "Municipal Vector Control",
    scale: "Multiple Nagar Nigams and municipal corporations across Haryana, Uttar Pradesh, and Bihar",
    product: "100XDB400 Double Barrel Vehicle-Mounted Thermal Fogging Machine (50–100L tank)",
    problem:
      "Nagar Nigams in Haryana, Uttar Pradesh, and Bihar needed to upgrade ageing fogging equipment for monsoon-season dengue and malaria control drives. Previous imported machines had long spare parts lead times and high maintenance costs.",
    solution:
      "100X Circle supplied vehicle-mounted pulse-jet thermal foggers with 50-litre chemical tanks, swivel nozzles, and Hindi-language operator manuals. GeM direct purchase was used — no tender process required, saving 4–8 weeks of procurement time.",
    outcome:
      "Municipalities covered entire wards in single morning drives. Domestic spare parts availability meant zero operational downtime from parts delays. Total procurement cost was 3–4× lower than comparable imported models.",
    certifications: ["ISO 9001:2015", "MSME/UDYAM", "GeM Seller"],
    procurement: "GeM direct purchase",
    timeline: "2022–2025",
  },
  {
    id: "district-health-gem-dengue-outbreak",
    title: "Emergency GeM Procurement — District Health Departments for Dengue Outbreaks",
    type: "Emergency Vector Control",
    scale: "District health departments across multiple states via GeM direct procurement",
    product: "100XTFS50 Portable Thermal Fogging Machine and ISI-marked HDPE tank models",
    problem:
      "District health departments needed rapid procurement of portable thermal foggers for emergency dengue outbreak response. Standard tender processes took 6–12 weeks — too slow for epidemic response.",
    solution:
      "100X Circle's GeM listing enabled direct purchase orders within GeM direct purchase limits — bypassing the full tender process. Orders were fulfilled and dispatched within 5–10 working days from placement.",
    outcome:
      "Emergency fogging operations commenced within 2 weeks of outbreak declaration. GeM e-invoice and delivery documentation provided for government records. MSME procurement preference counted toward departmental MSME target.",
    certifications: ["ISO 9001:2015", "GeM Seller", "MSME/UDYAM"],
    procurement: "GeM direct purchase (emergency)",
    timeline: "2023–2025",
  },
  {
    id: "agricultural-cooperatives-punjab-haryana",
    title: "Agricultural Fogger Deployment — Punjab and Haryana Cooperatives",
    type: "Agricultural Sector",
    scale: "Farm cooperative societies in Punjab and Haryana (shared-use procurement model)",
    product: "100XKB200 Mini Portable Thermal Fogging Machine (5–10L tank, single-operator)",
    problem:
      "Paddy and vegetable farmers in Punjab and Haryana faced increasing crop loss from whitefly, aphid, and fungal infestations. Conventional compression sprayers failed to penetrate dense paddy canopy, leaving undersides of leaves unprotected.",
    solution:
      "100X Circle portable pulse-jet thermal foggers were adopted by farmer cooperative societies on a shared-use model. Oil-based insecticide and fungicide formulations were applied during early morning operations when pest activity was highest.",
    outcome:
      "Participating farmers reported significantly better pesticide penetration and canopy coverage compared to conventional sprayers. Chemical consumption per acre was comparable despite higher coverage. After-sales support from Gurugram factory was accessible across North India.",
    certifications: ["ISO 9001:2015", "MSME/UDYAM"],
    procurement: "Cooperative direct purchase",
    timeline: "2021–2025",
  },
  {
    id: "pest-control-operators-pan-india",
    title: "PCO Fleet Expansion — Pest Control Operators Across India",
    type: "Commercial Pest Control",
    scale: "50+ pest control operators, pan-India",
    product: "Portable thermal fogging machines",
    problem:
      "Pest control operators expanding into mosquito control contracts (housing societies, industries, municipalities) needed reliable, maintainable fogging machines at commercial pricing. Imported machines had long spare parts lead times that could mean missing contracted service schedules.",
    solution:
      "100X Circle portable thermal foggers were adopted as the primary outdoor fogging equipment. Direct manufacturer support, domestic spare parts, and competitive pricing enabled PCOs to take on more contracts while maintaining margins.",
    outcome:
      "PCOs reported consistent machine performance, quick spare parts availability from Gurugram, and Hindi-language technical support. Multiple PCOs have expanded from 1–2 machines to 5–10 machine fleets.",
    certifications: ["ISO 9001:2015"],
    procurement: "Direct purchase (commercial)",
    timeline: "2019–2025",
  },
  {
    id: "export-south-asia-africa",
    title: "International Export — South Asia, Africa, Middle East",
    type: "Export",
    scale: "Multiple countries across 3 regions",
    product: "Portable and vehicle-mounted thermal fogging machines",
    problem:
      "International buyers in South Asia (Bangladesh, Sri Lanka, Nepal), Africa, and the Middle East sought cost-effective alternatives to expensive European fogging machines for their national vector control programmes.",
    solution:
      "100X Circle supplied CE-marked export models with full export documentation: Certificate of Origin, packing list, test certificates, CE certificate. OEM branding was provided for some distributor customers.",
    outcome:
      "Export buyers received equivalent pulse-jet technology at 40–60% lower cost than comparable European alternatives. CE marking satisfied regulatory requirements in CE-compliant markets. Ongoing supply relationships established with distributors in multiple countries.",
    certifications: ["ISO 9001:2015", "CE Marking"],
    procurement: "Export direct / distributor",
    timeline: "2018–2025",
  },
]

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "100X Circle Case Studies — Government & Commercial Supply Track Record",
  description:
    "Government supply and commercial deployment case studies for 100X Circle thermal fogging machines. Covers Nagar Nigams in Haryana/UP/Bihar, district health department emergency GeM procurement, Punjab/Haryana agricultural cooperatives, pan-India PCO fleet expansion, and international export.",
  url: `${SITE_URL}/case-studies`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: { "@id": `${SITE_URL}/#organization` },
  mentions: [
    { "@type": "Organization", name: "Government e-Marketplace (GeM)", url: "https://gem.gov.in" },
    { "@type": "AdministrativeArea", name: "Haryana, India" },
    { "@type": "AdministrativeArea", name: "Uttar Pradesh, India" },
    { "@type": "AdministrativeArea", name: "Bihar, India" },
    { "@type": "AdministrativeArea", name: "Punjab, India" },
    { "@type": "Product", name: "100XDB400 Double Barrel Thermal Fogging Machine", manufacturer: { "@id": `${SITE_URL}/#organization` } },
    { "@type": "Product", name: "100XTFS50 Thermal and Cold Fogging Machine", manufacturer: { "@id": `${SITE_URL}/#organization` } },
    { "@type": "Product", name: "100XKB200 Mini Portable Fogging Machine", manufacturer: { "@id": `${SITE_URL}/#organization` } },
  ],
  hasPart: CASE_STUDIES.map((cs) => ({
    "@type": "Article",
    name: cs.title,
    description: `${cs.problem} ${cs.outcome}`,
    url: `${SITE_URL}/case-studies#${cs.id}`,
    about: { "@type": "Thing", name: cs.type },
    mentions: [{ "@id": `${SITE_URL}/#organization` }],
    keywords: [cs.type, "thermal fogging machine", "100X Circle", cs.procurement].join(", "),
    datePublished: cs.timeline.split("–")[0].trim() + "-01-01",
  })),
}

async function getDbCaseStudies() {
  try {
    const client = await clientPromise
    const db = client.db()
    return await db
      .collection("case_studies")
      .find({ published: true })
      .sort({ createdAt: -1 })
      .toArray()
  } catch {
    return []
  }
}

export default async function CaseStudiesPage() {
  const dbStudies = await getDbCaseStudies()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Case Studies</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">Supply Track Record</p>
            <h1 className="text-4xl md:text-5xl font-800 text-white mb-5 leading-tight text-balance">
              Government & commercial deployments.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed">
              Verified supply history across municipal corporations, health departments, and agricultural cooperatives.
            </p>
          </div>
        </div>
      </section>
      <main className="max-w-4xl mx-auto px-4 py-12">

        {/* Database-managed case studies (added from Admin) */}
        {dbStudies.length > 0 && (
          <div className="mb-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">Verified Deployments</p>
                <h2 className="text-2xl font-bold text-gray-900">Government Success Stories</h2>
              </div>
              <Link href="/past-performance-government" className="text-sm text-brand-600 font-semibold hover:underline shrink-0">
                Full track record →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {dbStudies.map((s: any) => (
                <Link
                  key={String(s._id)}
                  href={`/case-studies/${s.slug}`}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-brand-300 transition-all flex flex-col"
                >
                  {/* Image area */}
                  <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {s.images?.[0] ? (
                      <Image
                        src={s.images[0]}
                        alt={s.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🏛</div>
                    )}
                    {s.state && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-full">
                        {s.state}
                      </span>
                    )}
                    {s.department && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-brand-600/90 text-xs font-semibold text-white rounded-full">
                        {s.department}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {s.industry && (
                      <p className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-1.5">{s.industry}</p>
                    )}
                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand-700 transition-colors">
                      {s.title}
                    </h3>
                    {s.customer && <p className="text-xs text-gray-500 mb-2">{s.customer}</p>}
                    {s.problem && <p className="text-xs text-gray-600 line-clamp-2 mb-3">{s.problem}</p>}
                    <div className="mt-auto pt-3 border-t border-gray-100">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                        Read Case Study
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {CASE_STUDIES.map((cs) => (
            <article
              key={cs.id}
              id={cs.id}
              data-case-study-type={cs.type}
              className="border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    {cs.type}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">{cs.title}</h2>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{cs.timeline}</span>
              </div>

              <table className="w-full text-sm border-collapse mb-4">
                <tbody>
                  {[
                    ["Scale", cs.scale],
                    ["Product", cs.product],
                    ["Procurement", cs.procurement],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-100">
                      <td className="py-1.5 pr-4 text-gray-500 w-28 text-xs">{k}</td>
                      <td className="py-1.5 text-gray-800 text-xs">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Challenge</p>
                  <p className="text-gray-700 text-xs leading-relaxed">{cs.problem}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Solution</p>
                  <p className="text-gray-700 text-xs leading-relaxed">{cs.solution}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Outcome</p>
                  <p className="text-gray-700 text-xs leading-relaxed">{cs.outcome}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {cs.certifications.map((cert) => (
                  <span key={cert} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {cert}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 bg-gray-50 rounded-xl p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-2">Detailed Case Study Documentation</h2>
          <p className="text-gray-600 mb-3">
            Detailed case study documentation, government order references, and product
            performance reports are available on request for procurement officers and
            institutional buyers.
          </p>
          <div className="flex flex-wrap gap-4 text-gray-800 font-medium">
            <span>📞 +91-7827229116</span>
            <span>✉ 100xcircle@gmail.com</span>
          </div>
        </div>
      </main>
    </>
  )
}
