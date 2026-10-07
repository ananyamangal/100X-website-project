import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Thermal Fogging Chemicals Guide — Insecticides, Fungicides & Formulations | 100X Circle",
  description:
    "Complete guide to chemicals used in thermal fogging machines: oil-based insecticides, fungicides, dilution ratios, mixing instructions, storage, safety, and regulatory compliance for India.",
  alternates: { canonical: `${SITE_URL}/knowledge/thermal-fogging-chemicals-guide` },
  openGraph: {
    title: "Thermal Fogging Chemicals Guide — Insecticides, Fungicides & Formulations",
    description:
      "Which chemicals work in thermal foggers, correct dilution ratios, oil carrier selection, mixing safety, storage, and regulatory compliance for India.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Thermal Fogging Chemicals Guide — Insecticides, Fungicides & Formulations",
  description:
    "Comprehensive guide to chemicals used in thermal fogging machines — insecticides, fungicides, dilution, oil carriers, safety, and compliance for Indian operators.",
  url: `${SITE_URL}/knowledge/thermal-fogging-chemicals-guide`,
  datePublished: "2024-06-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Thermal fogging chemicals" },
    { "@type": "Thing", name: "Insecticide formulations" },
    { "@type": "Thing", name: "Pest control" },
    { "@type": "Thing", name: "Vector control" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/thermal-fogging-chemicals-guide` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What chemicals can be used in a thermal fogger?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal foggers are compatible with oil-based insecticide and fungicide formulations only. Common examples: deltamethrin EC in mineral oil, cypermethrin EC, malathion in oil, pyrethrin in oil, chlorpyrifos EC in oil carrier. Water-based formulations cannot be used in thermal foggers — they do not vaporise correctly and can damage the machine. Always verify the formulation is oil-based before purchasing chemicals for a thermal fogger.",
      },
    },
    {
      "@type": "Question",
      name: "What oil carrier is used for thermal fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The most common carrier oils for thermal fogging are: (1) White mineral oil (highly refined, food-grade equivalent) — cleanest burn, least visible smoke, preferred for urban/residential use. (2) Low-odour paraffin oil — widely available, cost-effective for municipal operations. (3) Kerosene — lower cost, more visible smoke output, suitable for outdoor/agricultural use. Never use diesel or engine oil as carrier — they produce toxic combustion products.",
      },
    },
    {
      "@type": "Question",
      name: "What is the correct dilution ratio for deltamethrin in a thermal fogger?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For adult mosquito control using deltamethrin 2.5% EC concentrate: dilute to 0.025% active ingredient (AI) in final solution. This typically means 10 ml of 2.5% EC per litre of carrier oil (1:100 ratio). WHO recommends 1 g AI per hectare for space spraying — at this dilution and an application rate of 1 litre per hectare, one 50-litre tank treats approximately 50 hectares. Always follow the label and local authority guidelines.",
      },
    },
    {
      "@type": "Question",
      name: "Is a licence required to buy and use fogging chemicals in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In India, insecticides are regulated under the Insecticides Act, 1968. Purchase and use of technical-grade insecticides for commercial pest control requires a licence from the State Agriculture Department. Municipal and government bodies operate under department authorization. Private pest control operators require a licence under the Insecticides Act. Agricultural use by farmers is generally exempt from licensing but subject to label restrictions. Retail EC formulations for small-scale use are widely available at agro-chemical dealers without licence requirements.",
      },
    },
    {
      "@type": "Question",
      name: "How should thermal fogging chemicals be stored?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Store insecticide concentrates in a locked, ventilated, cool, dry store away from food, feed, and water. Containers must be sealed and clearly labelled. Do not store near heat sources or open flames — oil-based formulations are flammable. Maintain a chemical register recording stock received, used, and disposed. Dispose of empty containers as per CPCB hazardous waste guidelines — do not reuse for food or water storage.",
      },
    },
  ],
}

const CHEMICAL_TABLE = [
  { name: "Deltamethrin EC", type: "Pyrethroid insecticide", use: "Mosquito, fly, agricultural pest", concentration: "0.025% AI in oil", notes: "WHO-approved; most common in Indian municipal ops" },
  { name: "Cypermethrin EC", type: "Pyrethroid insecticide", use: "Mosquito, cockroach, agricultural pest", concentration: "0.05–0.1% AI in oil", notes: "Alternative to deltamethrin; good residual" },
  { name: "Malathion EC", type: "Organophosphate insecticide", use: "Mosquito (adult), agricultural pest", concentration: "0.112% AI in oil", notes: "Older standard; some resistance in urban Aedes; WHO Class III" },
  { name: "Pyrethrin + PBO", type: "Botanical pyrethroid + synergist", use: "Flying insects, stored grain pests", concentration: "0.05–0.1% AI + PBO", notes: "Fast knockdown; PBO enhances efficacy" },
  { name: "Chlorpyrifos EC", type: "Organophosphate insecticide", use: "Agricultural pests, termites", concentration: "0.05–0.2% in oil", notes: "Agriculture use; not recommended for residential fogging" },
  { name: "Tebuconazole EC", type: "Triazole fungicide", use: "Wheat rust, powdery mildew, crop fungal", concentration: "0.1% in oil", notes: "Agriculture only; oil-based formulation required" },
  { name: "Propiconazole EC", type: "Triazole fungicide", use: "Cereal diseases, turf fungal", concentration: "0.1% in oil", notes: "Agriculture/turf; not for vector control" },
]

const CARRIER_TABLE = [
  { carrier: "White mineral oil", smoke: "Very low / near clear", odour: "Minimal", best_for: "Residential, urban, indoor-adjacent areas", availability: "Agricultural chemical dealers" },
  { carrier: "Low-odour paraffin", smoke: "Low", odour: "Low (kerosene-like)", best_for: "Municipal drives, government operations", availability: "Fuel dealers, bulk suppliers" },
  { carrier: "Refined kerosene", smoke: "Moderate white smoke", odour: "Moderate", best_for: "Agriculture, rural areas, large open areas", availability: "Widely available" },
  { carrier: "Diesel / engine oil", smoke: "Dense, black/grey", odour: "Strong", best_for: "NOT SUITABLE — toxic combustion products", availability: "—" },
]

export default function ThermalFoggingChemicalsPage() {
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
            <span className="text-cinema-300">Chemicals Guide</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Technical Guide · 9 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Thermal Fogging Chemicals Guide
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              Which insecticides and fungicides are compatible with thermal foggers, how to dilute them correctly, which carrier oil to use, and how to store and handle chemicals safely — for municipal operators, pest control professionals, and farmers.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-amber-800 mb-1">Critical: Oil-Based Formulations Only</p>
          <p className="text-sm text-amber-700">
            Thermal foggers vaporise oil-based chemical solutions using a hot exhaust tube. <strong>Water-based formulations do not vaporise correctly</strong> and will damage the machine and produce no effective aerosol. Always confirm your chemical is oil-based (EC formulation in oil carrier) before adding it to a thermal fogger.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">How Thermal Foggers Work with Chemicals</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            A thermal fogger pumps chemical solution through a heated exhaust tube (300–600°C). The oil-based carrier vaporises instantly, creating sub-50-micron droplets that remain suspended in air as visible fog. These fine particles (10–30 microns) are in the WHO-recommended size range for penetrating vegetation and reaching target insects.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The chemistry requirement is specific: the carrier must be a low-viscosity oil (mineral oil, paraffin, or kerosene) that vaporises at the exhaust temperature. Active ingredients must be dissolved or emulsified in this oil carrier. Water cannot vaporise effectively at fogging temperatures and creates an incorrect (too large) droplet spectrum.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Most insecticide manufacturers offer EC (emulsifiable concentrate) formulations — these are the technical-grade active ingredient dissolved in an organic solvent with emulsifier. To use in a thermal fogger, the EC is diluted in carrier oil rather than water.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Compatible Chemicals — Reference Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-3 py-3 font-600">Chemical</th>
                  <th className="text-left px-3 py-3 font-600">Type</th>
                  <th className="text-left px-3 py-3 font-600">Use Case</th>
                  <th className="text-left px-3 py-3 font-600">Working Concentration</th>
                  <th className="text-left px-3 py-3 font-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {CHEMICAL_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-3 font-500 text-gray-900 border-b border-gray-100 align-top">{row.name}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.type}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.use}</td>
                    <td className="px-3 py-3 text-brand-700 font-500 border-b border-gray-100 align-top">{row.concentration}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs border-b border-gray-100 align-top">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Carrier Oil Selection</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-3 py-3 font-600">Carrier Oil</th>
                  <th className="text-left px-3 py-3 font-600">Smoke Output</th>
                  <th className="text-left px-3 py-3 font-600">Odour</th>
                  <th className="text-left px-3 py-3 font-600">Best For</th>
                  <th className="text-left px-3 py-3 font-600">Availability</th>
                </tr>
              </thead>
              <tbody>
                {CARRIER_TABLE.map((row, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${i === 3 ? "opacity-60" : ""}`}>
                    <td className="px-3 py-3 font-500 text-gray-900 border-b border-gray-100 align-top">{row.carrier}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.smoke}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.odour}</td>
                    <td className={`px-3 py-3 border-b border-gray-100 align-top text-sm ${i === 3 ? "text-red-600 font-600" : "text-gray-600"}`}>{row.best_for}</td>
                    <td className="px-3 py-3 text-gray-500 border-b border-gray-100 align-top">{row.availability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Mixing Instructions — Step by Step</h2>
          <div className="space-y-3">
            {[
              { step: "1. Calculate the required concentration", detail: "Determine the working concentration from the label or WHO recommendation. For deltamethrin 2.5% EC for mosquito fogging: target 0.025% AI. Formula: Volume of EC = (target % ÷ EC%) × total volume. For 10 litres final solution: (0.025 ÷ 2.5) × 10,000 ml = 100 ml EC concentrate." },
              { step: "2. Select and measure carrier oil", detail: "Use white mineral oil (urban/residential) or low-odour paraffin (municipal/agricultural). Measure 9,900 ml of carrier oil for a 10-litre batch. Pour into a clean, dry mixing container." },
              { step: "3. Add the EC concentrate", detail: "Add the measured EC concentrate (100 ml in the example) to the carrier oil. Stir thoroughly for 2–3 minutes. The EC emulsifier ensures even dispersion in the oil. The mixture should be clear to slightly hazy — not cloudy (cloudiness may indicate water contamination)." },
              { step: "4. Label the mixed solution", detail: "Label the container with: chemical name, concentration, date mixed, operator name. Mixed solutions should be used within 24 hours for best efficacy." },
              { step: "5. Fill the fogger tank", detail: "Pour the mixed solution into a clean fogger tank. Do not mix chemicals directly in the fogger tank. Close the tank cap securely before operation." },
            ].map((item) => (
              <div key={item.step} className="border border-gray-200 rounded-xl p-5">
                <p className="font-600 text-gray-900 mb-2">{item.step}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Storage and Regulatory Compliance (India)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Storage Requirements", points: ["Locked, ventilated chemical store", "Separate from food, feed, and water", "Away from heat sources and open flame", "Original labelled containers only", "Chemical register — stock in/out/disposed", "MSDS (Material Safety Data Sheet) on file"] },
              { title: "Regulatory Framework", points: ["Insecticides Act, 1968 — governs purchase and use", "State Agriculture Dept. licence for commercial pest control", "Municipal/government bodies — department authorization", "Private pest control operators — PCO licence required", "Empty container disposal — CPCB hazardous waste rules", "CIBRC registration required for imported formulations"] },
              { title: "Operator Personal Protection", points: ["Respirator (half-face, OV/P100 cartridge)", "Chemical-resistant gloves (nitrile, elbow-length)", "Long-sleeved coveralls (Tyvek or cotton)", "Eye protection (goggles, not glasses)", "Boot covers or chemical-resistant footwear", "No eating, drinking, smoking during mixing/application"] },
              { title: "Disposal", points: ["Triple-rinse empty containers with carrier oil before disposal", "Do not pour chemical waste into drains or water bodies", "Return surplus mixed solution to licensed waste disposal", "Contaminated PPE: wash separately from household laundry", "Chemical spills: contain with sand/sawdust, do not hose away"] },
            ].map((group) => (
              <div key={group.title} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-3 text-sm">{group.title}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {group.points.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What chemicals work in thermal foggers?", a: "Oil-based insecticide and fungicide EC formulations. Deltamethrin EC in mineral oil is the most common. Water-based formulations are incompatible and damage the machine." },
              { q: "Which carrier oil should I use?", a: "White mineral oil for urban/residential, low-odour paraffin for municipal, refined kerosene for agriculture. Never use diesel or engine oil." },
              { q: "How do I dilute deltamethrin for fogging?", a: "For mosquito control: 0.025% AI in final solution. With 2.5% EC concentrate: 10 ml per litre of carrier oil (1:100 ratio)." },
              { q: "Do I need a licence to use fogging chemicals in India?", a: "Commercial pest control operators require an Insecticides Act licence. Municipal and government bodies operate under department authorization. Agricultural use by farmers generally does not require a licence." },
              { q: "Can I mix chemicals together in the fogger?", a: "Do not mix two different active ingredients unless the label specifies compatibility and combined use is registered. Mixing incompatibles can produce toxic reaction products or reduce efficacy." },
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
              { href: "/knowledge/how-thermal-fogging-works", label: "How Thermal Fogging Works" },
              { href: "/knowledge/fogging-machine-safety-guide", label: "Safety Guide for Fogging Operators" },
              { href: "/knowledge/agricultural-fogging-guide", label: "Agricultural Fogging Guide" },
              { href: "/knowledge/dengue-prevention-thermal-fogging", label: "Dengue Prevention Using Thermal Fogging" },
              { href: "/knowledge/fogging-machine-operators-guide", label: "Fogging Machine Operator's Guide" },
              { href: "/products", label: "View All 100X Circle Machines" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Need Help Choosing the Right Chemical?</p>
            <p className="text-gray-400 text-sm mb-4">Our technical team can advise on the correct formulation, dilution, and carrier oil for your specific application and machine.</p>
            <Link href="/contact-us" className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
              Talk to a Technical Expert
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
