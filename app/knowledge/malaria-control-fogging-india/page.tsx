import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Malaria Control Using Thermal Fogging in India — Municipal & Health Dept Guide | 100X Circle",
  description:
    "How district health departments and municipal bodies use thermal fogging for malaria control in India. Anopheles mosquito biology, WHO-compliant protocols, insecticide selection, timing, and equipment for Indian conditions.",
  alternates: { canonical: `${SITE_URL}/knowledge/malaria-control-fogging-india` },
  openGraph: {
    title: "Malaria Control Using Thermal Fogging in India — Government & District Health Guide",
    description:
      "WHO-compliant thermal fogging protocols for malaria control. Anopheles biology, night-time operations, insecticide selection, and equipment for Indian district health departments.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Malaria Control Using Thermal Fogging in India — Municipal & Health Department Guide",
  description:
    "Technical and operational guide to malaria vector control using thermal fogging — Anopheles biology, WHO protocols, night-time operations, and equipment for Indian conditions.",
  url: `${SITE_URL}/knowledge/malaria-control-fogging-india`,
  datePublished: "2024-06-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Malaria control" },
    { "@type": "Thing", name: "Thermal fogging" },
    { "@type": "Thing", name: "Anopheles mosquito control" },
    { "@type": "Thing", name: "Vector control India" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/malaria-control-fogging-india` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does thermal fogging kill malaria mosquitoes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Thermal fogging kills adult Anopheles mosquitoes — the malaria vectors in India (primarily Anopheles culicifacies in rural areas and Anopheles stephensi in urban areas). The sub-50-micron aerosol penetrates resting sites in indoor walls, ceilings, vegetation, and drainage channels where Anopheles rest after blood feeding. Thermal fogging kills adult mosquitoes on contact but does not affect eggs, larvae, or pupae. It must be combined with larval source management for sustained malaria control.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best time to fog for malaria control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unlike Aedes (dengue), Anopheles mosquitoes are primarily night-biting (dusk to dawn). The optimal times for Anopheles control fogging are: early evening (6:00–8:00 PM) — as mosquitoes begin to emerge and seek blood meals, and early morning (4:00–6:00 AM) — after peak biting activity as mosquitoes return to resting sites. Night-time fogging (10 PM–2 AM) is also used for indoor residual spraying and space spraying in high-transmission areas. Daytime fogging is generally ineffective for Anopheles control.",
      },
    },
    {
      "@type": "Question",
      name: "Which insecticide is used for malaria fogging in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The National Vector Borne Disease Control Programme (NVBDCP) recommends: deltamethrin 2.5% EC (most widely used), malathion 5% (older standard, some resistance), alpha-cypermethrin EC, and permethrin EC. All must be in oil-based formulations for thermal application. Deltamethrin in mineral oil carrier is the current standard for government malaria fogging drives in India.",
      },
    },
    {
      "@type": "Question",
      name: "How is malaria fogging different from dengue fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Key differences: (1) Timing — Anopheles (malaria) are night-biters; fogging is done at dusk/dawn or at night. Aedes (dengue) are day-biters; fogging is done in early morning or evening. (2) Target species — different Anopheles species in different regions of India. (3) Indoor component — malaria control often combines outdoor space spraying with indoor residual spraying (IRS) on walls. (4) Breeding sites — Anopheles breed in slow-moving or stagnant clean water; larval management focuses on different sites than dengue.",
      },
    },
  ],
}

const ANOPHELES_TABLE = [
  { species: "An. culicifacies", distribution: "Rural plains — most of India", habitat: "Irrigated fields, rice paddies, slow streams", biting: "Indoors, night (10 PM–2 AM)", resistance: "Pyrethroid resistance developing in some areas" },
  { species: "An. stephensi", distribution: "Urban India — major cities", habitat: "Overhead tanks, construction sites, wells", biting: "Indoors and outdoors, dusk–dawn", resistance: "DDT resistant; pyrethroid susceptible in most areas" },
  { species: "An. minimus", distribution: "Northeast India, hilly areas", habitat: "Slow hill streams, forest fringes", biting: "Indoors, early night", resistance: "Limited data for Northeast populations" },
  { species: "An. fluviatilis", distribution: "Central and Eastern India, Orissa", habitat: "Stream margins, rice fields", biting: "Indoors, night", resistance: "Generally susceptible to pyrethroids" },
  { species: "An. sundaicus", distribution: "Andaman & Nicobar Islands, coastal Kerala", habitat: "Brackish water, mangroves", biting: "Outdoors, dusk–dawn", resistance: "Limited resistance data" },
]

export default function MalariaControlFoggingPage() {
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
            <span className="text-cinema-300">Malaria Control</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Public Health Guide · 8 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Malaria Control Using Thermal Fogging in India
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              A technical and operational guide for district health departments, Nagar Panchayats, and vector control officers. Covers Anopheles biology, WHO-compliant fogging protocols, insecticide selection, night-time operations, and equipment for Indian malaria conditions.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-brand-800 mb-1">Key Facts for Malaria Vector Control</p>
          <ul className="text-sm text-brand-700 space-y-1">
            <li>• Anopheles mosquitoes (malaria vectors) are night-biting — fog at dusk/dawn or night, not daytime</li>
            <li>• Primary malaria vector in rural India: <em>An. culicifacies</em> (breeds in rice paddies, irrigation channels)</li>
            <li>• Urban India vector: <em>An. stephensi</em> (breeds in overhead tanks, construction sites)</li>
            <li>• Recommended insecticide: deltamethrin 2.5% EC in mineral oil (NVBDCP standard)</li>
            <li>• Fogging kills adult mosquitoes — combine with larval source management for sustained control</li>
            <li>• Indoor residual spraying (IRS) is complementary to outdoor thermal fogging for malaria</li>
          </ul>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Why Thermal Fogging Targets Malaria Mosquitoes</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Malaria in India is transmitted by <em>Anopheles</em> mosquitoes — primarily <em>An. culicifacies</em> in rural areas and <em>An. stephensi</em> in urban areas. Unlike <em>Aedes aegypti</em> (dengue), which bites during the day, <em>Anopheles</em> are primarily night-biting (dusk to dawn), resting indoors during the day on dark walls, ceilings, and behind furniture.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Thermal fogging generates sub-50-micron aerosol droplets that remain airborne for 5–15 minutes and penetrate indoor spaces, vegetation edges, drainage channels, and water body margins where Anopheles rest and breed. Space spraying with thermal foggers at dusk and dawn intercepts mosquitoes as they become active — reducing adult population density before peak biting hours.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Limitation:</strong> Space spraying kills adults only. Malaria control requires a multi-pronged approach: thermal fogging for adult knockdown, indoor residual spraying (IRS) for long-term indoor protection, insecticide-treated nets (ITNs), and larval source management (draining, oiling, or larviciding breeding sites).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Primary Anopheles Vectors in India</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-3 py-3 font-600">Species</th>
                  <th className="text-left px-3 py-3 font-600">Distribution</th>
                  <th className="text-left px-3 py-3 font-600">Breeding Habitat</th>
                  <th className="text-left px-3 py-3 font-600">Biting Behaviour</th>
                  <th className="text-left px-3 py-3 font-600">Insecticide Notes</th>
                </tr>
              </thead>
              <tbody>
                {ANOPHELES_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-3 font-500 text-gray-900 border-b border-gray-100 align-top italic">{row.species}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.distribution}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.habitat}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.biting}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs border-b border-gray-100 align-top">{row.resistance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">NVBDCP-Aligned Protocol for Malaria Fogging</h2>
          <div className="space-y-4">
            {[
              {
                title: "1. Timing — When to Fog for Anopheles",
                content: "Optimal windows: early evening (6:00–8:00 PM) as mosquitoes emerge from resting sites to seek blood meals; early morning (4:00–6:00 AM) as they return to resting sites after feeding. High-transmission zones: night-time fogging operations (10 PM–2 AM) may be run. Key difference from dengue: Anopheles fogging is a dusk/dawn/night operation — daytime fogging has minimal impact on adult Anopheles populations.",
              },
              {
                title: "2. Insecticide Selection (NVBDCP Approved)",
                content: "Deltamethrin 2.5% EC in mineral oil — current NVBDCP standard for space spraying. Working concentration: 0.025% AI. Application rate: 1 g AI per hectare. Alpha-cypermethrin EC is an alternative where available. Malathion 5% (older protocol) — some resistance developing, confirm local susceptibility before use. All formulations must be oil-based for thermal application.",
              },
              {
                title: "3. Coverage Strategy",
                content: "Outdoors: target drainage channels, vegetation edges, standing water margins, rice field boundaries. Indoors: fog through open doors and windows for 5–10 seconds per room during evening hours. Vehicle-mounted operations: 8–15 km/h along streets with residential areas. Plan coverage by API (Annual Parasite Incidence) — high-API areas warrant weekly fogging during transmission season (July–November in most of India).",
              },
              {
                title: "4. Indoor Residual Spraying (IRS) — Complementary",
                content: "IRS (spraying insecticide on indoor walls and surfaces) provides 3–6 months of residual protection. It is complementary to — not a replacement for — thermal fogging space spraying. IRS targets Anopheles that rest indoors after feeding; space spraying targets actively flying mosquitoes. Both interventions together provide substantially higher impact than either alone.",
              },
              {
                title: "5. Malaria Season and Transmission Periods",
                content: "Peak malaria transmission in India: post-monsoon (August–November) in most states. Northeast India: April–June and September–November (two peaks). Urban An. stephensi: year-round transmission possible in large cities (Mumbai, Surat, Delhi, Chennai). Intensify fogging operations 2–3 weeks before and during transmission peak — not just during outbreak response.",
              },
              {
                title: "6. Documentation and Reporting",
                content: "NVBDCP requires: area covered per ward, insecticide type and batch number, date/time of operation, operator details, weather conditions. API monitoring before and after operations quantifies impact. Report all operations to Block Medical Officer and District Malaria Officer for programme tracking and GeM audit compliance.",
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
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Malaria vs Dengue Fogging — Key Differences</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-600">Parameter</th>
                  <th className="text-left px-4 py-3 font-600">Malaria (Anopheles)</th>
                  <th className="text-left px-4 py-3 font-600">Dengue (Aedes aegypti)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Biting time", "Dusk to dawn (night-biting)", "Daytime (early morning and late afternoon)"],
                  ["Fogging timing", "Evening, early morning, or night", "5–8 AM and 6–8 PM"],
                  ["Resting sites", "Indoor walls, ceilings, vegetation", "Indoor shaded spaces, under furniture"],
                  ["Breeding sites", "Slow water, rice fields, streams", "Small stagnant water containers"],
                  ["Complementary control", "IRS + ITN + larval management", "Larval source reduction (container management)"],
                  ["Transmission season", "Post-monsoon (Aug–Nov) mostly", "Post-monsoon (Sep–Nov) mostly"],
                  ["Urban vector", "An. stephensi (tanks, construction)", "Ae. aegypti (containers, domestic water)"],
                ].map(([param, malaria, dengue], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-500 text-gray-800 border-b border-gray-100">{param}</td>
                    <td className="px-4 py-3 text-gray-600 border-b border-gray-100">{malaria}</td>
                    <td className="px-4 py-3 text-gray-600 border-b border-gray-100">{dengue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">FAQ: Malaria Fogging for Government Health Departments</h2>
          <div className="space-y-4">
            {[
              { q: "Does thermal fogging kill malaria mosquitoes?", a: "Yes — thermal fogging kills adult Anopheles mosquitoes. It does not kill eggs, larvae, or pupae. Must be combined with larval source management and IRS for sustained malaria control." },
              { q: "Best time for malaria fogging?", a: "Dusk (6–8 PM) and early morning (4–6 AM) for Anopheles. Night-time operations also effective. Daytime fogging has minimal impact — unlike dengue drives." },
              { q: "Which insecticide for malaria fogging?", a: "Deltamethrin 2.5% EC in mineral oil (NVBDCP standard). Alpha-cypermethrin is an alternative. All must be oil-based for thermal application." },
              { q: "How is malaria fogging different from dengue fogging?", a: "Timing is the critical difference: malaria is dusk/night, dengue is morning/evening. Target vectors and breeding sites also differ. Both use similar equipment and oil-based deltamethrin formulations." },
              { q: "How to procure fogging machines for malaria drives?", a: "Government health departments can procure via GeM directly from MSME OEM sellers like 100X Circle. NVBDCP centrally procures for some state programmes; districts can also procure directly." },
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
              { href: "/knowledge/dengue-prevention-thermal-fogging", label: "Dengue Prevention Using Thermal Fogging" },
              { href: "/knowledge/mosquito-control-india", label: "Mosquito Control in India — Municipal Guide" },
              { href: "/knowledge/government-procurement-guide", label: "GeM Procurement Guide for Government Bodies" },
              { href: "/compare/fogging-machine-for-malaria-control-india", label: "Best Foggers for Malaria Control" },
              { href: "/municipal-fogging-programme", label: "Municipal Fogging Programme Guide" },
              { href: "/is-14855-fogging-machine", label: "IS 14855 Machines for Government Tenders" },
              { href: "/products", label: "View All 100X Circle Fogging Machines" },
              { href: "/contact-us", label: "Government / Health Dept Enquiry" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">District Health & Municipal Enquiries</p>
            <p className="text-gray-400 text-sm mb-4">100X Circle supplies thermal fogging machines to NVBDCP operations, district malaria programmes, and municipal health departments via GeM. Technical demonstrations and operator training available.</p>
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
