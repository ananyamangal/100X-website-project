import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Mosquito Control and Thermal Fogging in India | 100X Circle",
  description:
    "How India's municipal corporations and health departments use thermal fogging for dengue, malaria, and chikungunya prevention. Operations, equipment, and scale.",
  alternates: { canonical: `${SITE_URL}/knowledge/mosquito-control-india` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Mosquito Control and Thermal Fogging in India",
  description:
    "India's vector control programme: how municipal corporations deploy thermal fogging machines for dengue, malaria, and chikungunya prevention drives.",
  url: `${SITE_URL}/knowledge/mosquito-control-india`,
  datePublished: "2024-03-01",
  dateModified: "2026-05-29",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Vector control" },
    { "@type": "Thing", name: "Mosquito control India" },
    { "@type": "Thing", name: "Dengue prevention" },
    { "@type": "Thing", name: "Malaria control" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/mosquito-control-india` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do municipal corporations in India control mosquitoes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Indian municipal corporations use a combination of methods: (1) thermal fogging — vehicle-mounted foggers driven through residential areas at dawn/dusk to kill adult mosquitoes; (2) anti-larval operations — applying larvicide to stagnant water sources; (3) source reduction — clearing drains and garbage. Thermal fogging is used for emergency outbreak response and scheduled monsoon drives.",
      },
    },
    {
      "@type": "Question",
      name: "What fogging machines do Indian municipalities use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Indian municipalities predominantly use vehicle-mounted pulse-jet thermal fogging machines. The vehicle is driven through residential streets while the fogger discharges insecticide fog on both sides. Common Indian suppliers include 100X Circle (domestic OEM) and imported Korean/German brands. GeM procurement has made domestic MSME suppliers like 100X Circle more accessible.",
      },
    },
    {
      "@type": "Question",
      name: "When is thermal fogging done for mosquito control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging for mosquito control is most effective at dawn (6–8 AM) or dusk (6–8 PM) when mosquitoes are active and air movement is minimal. Fogging during midday or in strong winds is less effective as fog disperses before mosquitoes are contacted. Indian municipal fogging drives are typically conducted daily during monsoon season and during dengue/malaria outbreaks.",
      },
    },
    {
      "@type": "Question",
      name: "Which insecticide is used for mosquito fogging in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Common insecticides used in India for municipal mosquito fogging: deltamethrin (1.25% in oil), malathion (96% technical in carrier oil), cypermethrin (10%), and permethrin (50%). The WHO recommends pyrethroids for adult mosquito control. All must be in oil-based formulation for thermal foggers. Health departments specify the active ingredient and concentration in their procurement documents.",
      },
    },
  ],
}

export default function MosquitoControlIndiaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-brand-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>Mosquito Control India</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Vector Control", "India", "Municipal"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Mosquito Control and Thermal Fogging in India
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · 6 min read · Updated May 2026
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Key fact:</strong> India records 100,000+ dengue cases annually. Municipal
          corporations conduct fogging drives during monsoon season (July–October) as the
          primary intervention against adult Aedes aegypti mosquitoes. Vehicle-mounted thermal
          foggers are the primary equipment.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>India&apos;s Vector-Borne Disease Burden</h2>
          <p>
            India is endemic for multiple vector-borne diseases transmitted by mosquitoes:
          </p>
          <ul>
            <li>
              <strong>Dengue:</strong> Aedes aegypti and Aedes albopictus mosquitoes. Urban and
              peri-urban. 100,000–300,000 confirmed cases annually; significant underreporting.
              Peak season: monsoon and post-monsoon (July–November).
            </li>
            <li>
              <strong>Malaria:</strong> Anopheles mosquitoes. Rural and forested areas primarily.
              ~200,000 cases annually. Significant in Odisha, Chhattisgarh, Jharkhand,
              Madhya Pradesh, and northeastern states.
            </li>
            <li>
              <strong>Chikungunya:</strong> Aedes mosquitoes. Periodic outbreaks in urban areas.
              Shares Aedes vector with dengue — same control measures apply.
            </li>
            <li>
              <strong>Japanese Encephalitis (JE):</strong> Culex mosquitoes. Rural areas near
              pig farming. Primarily in UP, Bihar, West Bengal.
            </li>
          </ul>

          <h2>India&apos;s National Vector Control Programme</h2>
          <p>
            The National Centre for Vector Borne Diseases Control (NCVBDC), under the Ministry
            of Health and Family Welfare, coordinates vector control across states. The programme
            mandates integrated vector management (IVM) combining:
          </p>
          <ol>
            <li>
              <strong>Source reduction:</strong> Eliminating breeding sites — clearing stagnant
              water, covering tanks, cleaning drains.
            </li>
            <li>
              <strong>Anti-larval operations:</strong> Applying biological (Bacillus thuringiensis
              israelensis, Bti) or chemical (temephos) larvicide to water bodies.
            </li>
            <li>
              <strong>Adult control:</strong> Thermal fogging and indoor residual spraying (IRS)
              to kill adult mosquitoes.
            </li>
          </ol>

          <h2>How Municipal Fogging Operations Work</h2>
          <p>
            Municipal corporations conduct scheduled fogging drives, especially during monsoon season.
            The operation involves:
          </p>

          <h3>Timing and Frequency</h3>
          <ul>
            <li>
              <strong>Peak season:</strong> July to October (post-monsoon through Diwali).
              Daily or every-other-day in high-risk wards.
            </li>
            <li>
              <strong>Off-season:</strong> Weekly or monthly scheduled drives.
            </li>
            <li>
              <strong>Emergency response:</strong> Daily fogging when dengue/malaria cases spike
              in a ward.
            </li>
            <li>
              <strong>Best time:</strong> Dawn (6–8 AM) or dusk (6–8 PM) when Aedes mosquitoes
              are active and wind is minimal.
            </li>
          </ul>

          <h3>Vehicle-Mounted Fogger Operations</h3>
          <p>
            The standard municipal fogging operation uses a vehicle-mounted thermal fogger:
          </p>
          <ol>
            <li>
              A vehicle (pickup truck or smaller utility vehicle) with a mounted fogger drives
              slowly through residential streets.
            </li>
            <li>
              The fogger&apos;s swivel nozzle directs fog on both sides of the vehicle,
              covering a 10–15 meter swath.
            </li>
            <li>
              A 20–50 liter insecticide tank allows continuous operation for 1–2 hours.
            </li>
            <li>
              Ward supervisors map routes to ensure complete coverage of at-risk zones.
            </li>
          </ol>

          <h2>Insecticides Used for Fogging in India</h2>
          <table className="text-sm w-full border-collapse mt-2">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 border border-gray-200">Active Ingredient</th>
                <th className="text-left py-2 px-3 border border-gray-200">Concentration</th>
                <th className="text-left py-2 px-3 border border-gray-200">Target</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Deltamethrin (pyrethroid)", "1.25% in oil", "Aedes, Culex, Anopheles"],
                ["Malathion (organophosphate)", "96% technical in carrier oil", "All adult mosquitoes"],
                ["Cypermethrin (pyrethroid)", "10% in oil", "Aedes, Culex"],
                ["Permethrin (pyrethroid)", "50% in oil", "Broad-spectrum"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-b border-gray-200">
                  <td className="py-2 px-3 text-gray-800">{a}</td>
                  <td className="py-2 px-3 text-gray-700 font-mono text-xs">{b}</td>
                  <td className="py-2 px-3 text-gray-600">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            The WHO recommends pyrethroid-based formulations for dengue vector control due to
            lower mammalian toxicity. Health departments specify the active ingredient and
            concentration in procurement tender documents.
          </p>

          <h2>Procurement: How Municipal Corporations Buy Fogging Machines</h2>
          <p>
            Municipal corporations procure fogging machines through:
          </p>
          <ul>
            <li>
              <strong>GeM (Government e-Marketplace):</strong> Direct purchase from MSME OEM
              sellers without separate tender. Fast, transparent, competitive pricing.
            </li>
            <li>
              <strong>Open tenders / L1 procurement:</strong> For larger quantities, tenders
              specify technical requirements (output capacity, tank size, fog distance) and
              required certifications (ISO 9001, ISI, CE).
            </li>
            <li>
              <strong>State government framework contracts:</strong> Some states have rate
              contracts for fogging equipment that districts/municipalities draw from.
            </li>
          </ul>
          <p>
            100X Circle is a GeM-listed MSME OEM, meaning municipal corporations can procure
            directly without the full tender process for eligible amounts.
          </p>

          <h2>Frequently Asked Questions</h2>

          <h3>How do municipal corporations in India control mosquitoes?</h3>
          <p>
            Three-pronged approach: (1) thermal fogging — vehicle-mounted foggers driven through
            residential streets at dawn/dusk; (2) anti-larval operations — larvicide in stagnant
            water; (3) source reduction — drain clearing and garbage management. Fogging is used
            for emergency outbreak response and scheduled monsoon drives.
          </p>

          <h3>What fogging machines do Indian municipalities use?</h3>
          <p>
            Vehicle-mounted pulse-jet thermal fogging machines are standard. The vehicle is driven
            slowly through streets while the fogger discharges insecticide fog. Domestic Indian
            OEM suppliers like 100X Circle (GeM-listed) and imported Korean/German brands are used.
          </p>

          <h3>When is thermal fogging done for mosquito control?</h3>
          <p>
            Dawn (6–8 AM) or dusk (6–8 PM) when Aedes mosquitoes are active and air movement is
            minimal. Daily during monsoon season in high-risk wards. Fogging in midday heat or
            strong wind is less effective.
          </p>

          <h3>Which insecticide is used for mosquito fogging in India?</h3>
          <p>
            Deltamethrin 1.25% in carrier oil is most common for dengue/chikungunya (Aedes
            control). Malathion in carrier oil is used for broader programmes. All must be
            oil-based formulations for thermal foggers.
          </p>
        </article>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/knowledge/how-thermal-fogging-works"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">How Thermal Fogging Works</p>
              <p className="text-xs text-gray-500 mt-1">Pulse-jet technology explained</p>
            </Link>
            <Link
              href="/knowledge/government-procurement-guide"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Procurement via GeM</p>
              <p className="text-xs text-gray-500 mt-1">Step-by-step buying guide</p>
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl p-5 text-sm">
          <p className="font-semibold text-gray-700 mb-2">About the Author</p>
          <p className="text-gray-600">
            100X Circle Pvt Ltd supplies thermal fogging machines to municipal corporations across
            India for vector control programmes. ISO 9001 certified manufacturer. GeM-listed MSME.
            10+ years supplying to Nagar Nigams, health departments, and pest control operators.
            Contact: 100xcircle@gmail.com · +91-7827229116
          </p>
        </div>
      </main>
    </>
  )
}
