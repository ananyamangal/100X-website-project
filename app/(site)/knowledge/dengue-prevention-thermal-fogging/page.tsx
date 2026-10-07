import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Dengue Prevention Using Thermal Fogging — Municipal & Government Guide | 100X Circle",
  description:
    "How municipal corporations and health departments use thermal fogging to prevent dengue outbreaks. WHO-compliant protocols, insecticide types, timing, dosage, and equipment specifications for Indian conditions.",
  alternates: { canonical: `${SITE_URL}/knowledge/dengue-prevention-thermal-fogging` },
  openGraph: {
    title: "Dengue Prevention Using Thermal Fogging — Government & Municipal Guide",
    description:
      "WHO-compliant thermal fogging protocols for dengue prevention. Covers timing, insecticide selection, droplet size requirements, and equipment specifications for Indian municipal operations.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Dengue Prevention Using Thermal Fogging — Municipal & Government Guide",
  description:
    "Comprehensive guide to dengue prevention thermal fogging: WHO protocols, insecticide selection, timing, dosage, and equipment for Indian municipal operations.",
  url: `${SITE_URL}/knowledge/dengue-prevention-thermal-fogging`,
  datePublished: "2024-05-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Dengue fever prevention" },
    { "@type": "Thing", name: "Thermal fogging" },
    { "@type": "Thing", name: "Vector control" },
    { "@type": "Thing", name: "Aedes aegypti mosquito control" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/dengue-prevention-thermal-fogging` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does thermal fogging kill dengue mosquitoes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Thermal fogging produces sub-50-micron droplets in the WHO-recommended 10–30 micron range for adult Aedes aegypti mosquito control. The fine aerosol particles penetrate dense vegetation, narrow lanes, and standing structures where dengue-carrying mosquitoes rest. Contact kill is immediate for adult mosquitoes. Thermal fogging does NOT kill mosquito eggs or larvae — it must be combined with larval source reduction.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best time for dengue fogging drives?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Early morning (5:00–8:00 AM) and evening (6:00–8:00 PM) are the most effective times for dengue fogging. These are peak Aedes aegypti activity periods and conditions (lower temperature, lower wind speed, higher humidity) allow fog particles to remain airborne longer. Midday fogging in high wind or heat is significantly less effective.",
      },
    },
    {
      "@type": "Question",
      name: "Which insecticide is recommended for dengue thermal fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "WHO-recommended insecticides for adult mosquito thermal fogging include: deltamethrin (most common in India), cypermethrin, malathion, and permethrin. All must be in oil-based (not water-based) formulations for thermal foggers. Deltamethrin at 0.5–1% active ingredient in mineral oil carrier is the most widely used formulation in Indian municipal operations.",
      },
    },
    {
      "@type": "Question",
      name: "How far does thermal fog travel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A standard 50-litre thermal fogger produces fog that travels 30–50 metres in still conditions. In light breeze (2–5 km/h), fog drifts 50–100 metres from the nozzle. Municipal operations plan coverage at 25–30 metre spacing between fogging passes. Vehicle-mounted machines at 10–15 km/h with cross-wind provide near-complete coverage across standard ward widths of 10–20 metres.",
      },
    },
    {
      "@type": "Question",
      name: "Is thermal fogging safe for residents during dengue drives?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Approved deltamethrin and cypermethrin formulations at recommended concentrations are considered safe for human exposure at the short durations involved in a fogging pass. Residents should close windows during fogging and for 30 minutes after. Children, pregnant women, and those with respiratory conditions should avoid direct fog exposure. Pets should be kept indoors. The insecticide dissipates within 15–30 minutes.",
      },
    },
  ],
}

export default function DengueFoggingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-gray-950 pt-24 pb-12 md:pt-28 md:pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/knowledge" className="hover:text-cinema-300 transition-colors">Knowledge Hub</Link>
            <span>/</span>
            <span className="text-cinema-300">Dengue Prevention</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Public Health Guide · 8 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Dengue Prevention Using Thermal Fogging
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              A technical and operational guide for municipal corporations, district health departments, and Nagar Nigams. Covers WHO protocols, insecticide selection, timing, dosage, and equipment specifications for Indian conditions.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        {/* Quick answer */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-brand-800 mb-1">Key Facts for Municipal Operations</p>
          <ul className="text-sm text-brand-700 space-y-1">
            <li>• Thermal fogging kills adult dengue mosquitoes (Aedes aegypti) — does NOT kill eggs/larvae</li>
            <li>• Best time: 5–8 AM and 6–8 PM (Aedes peak activity, low wind)</li>
            <li>• Recommended insecticide: deltamethrin 0.5–1% in mineral oil (WHO-approved)</li>
            <li>• Droplet size required: 10–30 microns MVD (thermal fogging achieves this)</li>
            <li>• Coverage: 50-litre machine covers one municipal ward per session</li>
            <li>• Must be combined with larval source reduction for sustained effect</li>
          </ul>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Why Thermal Fogging Targets Dengue Mosquitoes</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Dengue is transmitted by <em>Aedes aegypti</em> — a daytime-biting mosquito that rests in shaded indoor and semi-indoor spaces: under furniture, inside drains, behind curtains, and in dense vegetation. Its resting behaviour makes contact-insecticide sprays less effective because the chemical must reach the resting site.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Thermal fogging generates sub-50-micron droplets that remain airborne for 5–15 minutes and penetrate narrow spaces, vegetation gaps, and shaded zones where mosquitoes rest. The WHO recommends 10–30 micron droplets for adult mosquito control — a specification that thermal pulse-jet foggers consistently achieve.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Critical limitation:</strong> Thermal fogging kills adult mosquitoes only. It has no effect on eggs or pupae. Sustainable dengue control requires thermal fogging for adult knockdown combined with larval source reduction (eliminating standing water) to interrupt the breeding cycle.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">WHO-Recommended Protocol for Dengue Fogging</h2>
          <div className="space-y-4">
            {[
              {
                title: "1. Timing — When to Fog",
                content: "Early morning (5:00–8:00 AM) and evening (6:00–8:00 PM) correspond to peak Aedes aegypti activity periods. Atmospheric conditions at these times — lower temperature, lower wind speed (under 5 km/h), higher relative humidity — keep fog droplets airborne longer. Midday fogging in India's heat and wind is significantly less effective. Fogging during rain is ineffective.",
              },
              {
                title: "2. Insecticide Selection",
                content: "WHO-recommended options for adult mosquito thermal fogging: (a) Deltamethrin EC — 0.5–1% active ingredient in mineral oil. Most widely used in India. WHO Class II (moderately hazardous). (b) Cypermethrin EC — 0.5–1% AI in oil carrier. Alternative to deltamethrin. (c) Malathion — 5% AI (older standard, some resistance in urban Aedes populations). (d) Permethrin — 0.5% AI. All formulations must be oil-based for thermal application.",
              },
              {
                title: "3. Concentration and Dosage",
                content: "Deltamethrin at 1 g AI per hectare (WHO recommendation for space spraying). At 10% concentrate: 10 ml per litre of carrier oil, applied at 1 litre per hectare. A standard 50-litre tank (5% chemical in carrier oil) covers approximately 10–12 hectares per fill depending on formulation and application rate.",
              },
              {
                title: "4. Coverage Planning",
                content: "Walk at 3–5 km/h for handheld/shoulder foggers; 8–15 km/h for vehicle-mounted systems. Target buildings, drains, vegetation edges, and shaded areas. Ensure fog enters narrow lanes and building approaches. Plan grid-pattern coverage of the ward to avoid gaps. Post signage 30 minutes before fogging.",
              },
              {
                title: "5. Safety Measures",
                content: "Operator: respirator mask, gloves, long sleeves/trousers, eye protection. Residents: advance notice, windows closed during fogging and for 30 minutes after. Remove food, water containers, fish tanks. Avoid fogging near open water bodies used for drinking. Do not fog near beehives. Children, pregnant women, and those with respiratory conditions should stay indoors.",
              },
              {
                title: "6. Documentation",
                content: "Record: date, time, area covered, insecticide type and batch, concentration, operator name, weather conditions. This documentation is mandatory for GeM-purchased equipment audits and is required by state health departments for programme reporting.",
              },
            ].map((step) => (
              <div key={step.title} className="border border-gray-200 rounded-xl p-5">
                <p className="font-600 text-gray-900 mb-2">{step.title}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{step.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Equipment Specification for Dengue Fogging Drives</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-600">Parameter</th>
                  <th className="text-left px-4 py-3 font-600">WHO Requirement</th>
                  <th className="text-left px-4 py-3 font-600">100X Circle Foggers</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Droplet size", "10–30 microns VMD", "1–50 microns (peak at 15–25 microns)"],
                  ["Output rate", "Sufficient for planned area", "Up to 80 litres/hour"],
                  ["Penetration", "Reaches resting sites in vegetation", "Sub-25 micron fog penetrates dense cover"],
                  ["Fuel type", "Safe, reliable operation", "Petroleum (kerosene/petrol depending on model)"],
                  ["Certification", "ISO quality standard preferred", "ISO 9001:2015; ISI Mark on select models"],
                  ["GeM eligibility", "Required for government purchase", "All models GeM-listed, MSME OEM"],
                ].map(([param, who, product], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-500 text-gray-800 border-b border-gray-100">{param}</td>
                    <td className="px-4 py-3 text-gray-600 border-b border-gray-100">{who}</td>
                    <td className="px-4 py-3 text-brand-700 font-500 border-b border-gray-100">{product}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">FAQ: Dengue Fogging for Municipalities</h2>
          <div className="space-y-4">
            {[
              { q: "Does thermal fogging kill dengue mosquitoes?", a: "Yes — thermal fogging kills adult Aedes aegypti mosquitoes. It does not kill eggs or larvae. Must be combined with larval source reduction for sustained control." },
              { q: "Best time for dengue fogging?", a: "5–8 AM and 6–8 PM. These are Aedes peak activity times and atmospheric conditions (lower wind, higher humidity) keep fog airborne longer." },
              { q: "Which insecticide for dengue?", a: "Deltamethrin EC at 0.5–1% active ingredient in mineral oil — most widely used in India and WHO-recommended. Must be oil-based for thermal application." },
              { q: "Is fogging safe for residents?", a: "At recommended concentrations, approved formulations are safe for brief human exposure. Residents should close windows during fogging, avoid direct exposure, and re-enter after 30 minutes." },
              { q: "How to procure fogging machines for a dengue drive?", a: "Government bodies can procure directly via GeM from MSME-registered OEM sellers like 100X Circle. No tender required below value thresholds. MSME preference applies." },
            ].map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-1 text-sm">{faq.q}</p>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-lg font-600 text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {[
              { href: "/knowledge/mosquito-control-india", label: "Mosquito Control in India — Municipal Guide" },
              { href: "/knowledge/how-thermal-fogging-works", label: "How Thermal Fogging Works" },
              { href: "/knowledge/government-procurement-guide", label: "GeM Procurement Guide" },
              { href: "/compare/fogging-machine-for-dengue-control-india", label: "Best Foggers for Dengue Control" },
              { href: "/municipal-fogging-programme", label: "Municipal Vector Control Programme" },
              { href: "/is-14855-fogging-machine", label: "IS 14855 Compliant Machines for Government Tenders" },
              { href: "/products", label: "View All Fogging Machines" },
              { href: "/contact-us", label: "Government Enquiry / GeM Quote" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Municipal & Government Enquiries Welcome</p>
            <p className="text-gray-400 text-sm mb-4">100X Circle supplies directly to municipal corporations, health departments, and Nagar Nigams via GeM and direct tender. Technical support and demonstration available.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact-us" className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
                Request Government Quote
              </Link>
              <Link href="/knowledge/government-procurement-guide" className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-white hover:bg-white/10 font-600 rounded-full text-sm">
                GeM Procurement Guide
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
