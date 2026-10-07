import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Agricultural Fogging Guide — Crop Protection Using Thermal Foggers | 100X Circle",
  description:
    "How farmers and agricultural cooperatives use thermal fogging for crop protection: compatible chemicals, timing, dosage, crops covered, and equipment recommendations for Indian farms.",
  alternates: { canonical: `${SITE_URL}/knowledge/agricultural-fogging-guide` },
  openGraph: {
    title: "Agricultural Fogging Guide — Crop Protection Using Thermal Foggers",
    description:
      "Thermal fogging for crop protection: fungicide and pesticide application, timing, dosage, compatible chemicals, and equipment for Indian farming conditions.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Agricultural Fogging Guide — Crop Protection Using Thermal Foggers",
  description:
    "Comprehensive guide to using thermal fogging machines for crop protection in India — chemicals, timing, dosage, crops, and equipment recommendations.",
  url: `${SITE_URL}/knowledge/agricultural-fogging-guide`,
  datePublished: "2024-06-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Agricultural fogging" },
    { "@type": "Thing", name: "Crop protection" },
    { "@type": "Thing", name: "Pest management" },
    { "@type": "Thing", name: "Fungicide application" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/agricultural-fogging-guide` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can thermal fogging machines be used for agriculture?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Thermal foggers are highly effective for agricultural pest control and fungicide application. The sub-50-micron droplets penetrate dense crop canopy and reach pests on under-leaf surfaces and in stem crevices that conventional sprayers miss. Thermal fogging is especially valuable for large-scale operations across paddy fields, sugarcane, orchards, and vegetable crops.",
      },
    },
    {
      "@type": "Question",
      name: "What chemicals can be used in thermal foggers for agriculture?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For agriculture, compatible chemicals include: oil-based pesticides (deltamethrin, chlorpyrifos, imidacloprid in oil carrier), fungicides (tebuconazole, propiconazole in oil base), and systemic insecticides formulated for thermal application. Water-based formulations are NOT compatible with thermal foggers. Always verify the formulation is oil-based before use.",
      },
    },
    {
      "@type": "Question",
      name: "How many acres can a thermal fogger cover per hour?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A 50-litre thermal fogger covers approximately 8–15 acres per hour for open field crops, depending on wind conditions, walking/driving speed, and chemical application rate. In orchards or dense crops requiring heavier coverage, expect 5–8 acres per hour. Vehicle-mounted machines at 10–15 km/h can cover 20–30 acres per hour for field crops.",
      },
    },
    {
      "@type": "Question",
      name: "Is thermal fogging suitable for greenhouse use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No — thermal fogging should not be used inside greenhouses or polyhouses due to smoke, heat, and fire risk. Inside enclosed growing spaces, cold (ULV) fogging is the correct method. Thermal fogging is highly effective outside greenhouses at the perimeter for insect barrier applications.",
      },
    },
  ],
}

const CROP_TABLE = [
  { crop: "Paddy / Rice", pests: "Stem borer, brown planthopper, leaf folder", method: "Thermal fog at dusk across field edges and water channels", timing: "Pest threshold detection or weekly during high-pressure season" },
  { crop: "Sugarcane", pests: "Early shoot borer, whitefly, scale insects", method: "Thermal fog along row edges and canopy", timing: "Pre-monsoon and post-monsoon treatment cycles" },
  { crop: "Orchards (mango, citrus)", pests: "Fruit fly, thrips, mealybug, citrus psylla", method: "Thermal fog penetrates canopy from ground level", timing: "Pre-flowering and fruit-set stages" },
  { crop: "Cotton", pests: "Whitefly, bollworm, aphid, thrips", method: "Thermal fog at dusk (peak insect activity)", timing: "At pest threshold; avoid spraying near pollination" },
  { crop: "Vegetables (tomato, chilli)", pests: "Aphids, thrips, mites, leaf miners", method: "Thermal fog at low wind speed early morning", timing: "Weekly during high-pressure; rotate chemicals for resistance" },
  { crop: "Wheat", pests: "Aphids, rust (fungal — cold fog only)", method: "Thermal fog for aphid control; cold fog for fungal", timing: "Crop stage dependent — tillering through grain fill" },
]

export default function AgriculturalFoggingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-gray-950 pt-24 pb-12 md:pt-28 md:pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6">
            <Link href="/" className="hover:text-cinema-300">Home</Link>
            <span>/</span>
            <Link href="/knowledge" className="hover:text-cinema-300">Knowledge Hub</Link>
            <span>/</span>
            <span className="text-cinema-300">Agricultural Fogging</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Agriculture Guide · 7 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Agricultural Fogging Guide — Crop Protection Using Thermal Foggers
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              How farmers, FPOs, and agricultural cooperatives use thermal fogging for crop protection at scale — chemicals, timing, coverage, and equipment selection for Indian field conditions.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-brand-800 mb-1">Quick Summary</p>
          <p className="text-sm text-brand-700">
            Thermal fogging machines are highly effective for large-scale crop pest control in India. Sub-50-micron droplets penetrate dense canopy and reach pests on under-leaf surfaces. Compatible with oil-based pesticide and fungicide formulations. A 50-litre machine covers 8–15 acres per hour for field crops. Not suitable for use inside greenhouses — use cold (ULV) fogging inside enclosed spaces.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Why Thermal Fogging Works for Crop Protection</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Conventional knapsack sprayers apply chemical as a coarse spray (150–400 microns) that wets leaf surfaces but does not penetrate the underside of leaves, stem crevices, or the interior of dense crop canopies where many pests feed and shelter. Labour-intensive and slow — a single sprayer operator covers 1–2 acres per day.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Thermal fogging generates sub-50-micron particles that float through the crop canopy, reaching under-leaf surfaces and enclosed spaces in a way conventional spraying cannot. A single operator with a 50-litre thermal fogger can treat 8–15 acres per hour — effectively what five to ten conventional sprayers would require.
          </p>
          <p className="text-gray-700 leading-relaxed">
            For large farmers, FPOs, and agricultural cooperatives, thermal fogging reduces labour cost per acre by 60–80% for pest control operations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Crops and Target Pests</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-3 py-3 font-600">Crop</th>
                  <th className="text-left px-3 py-3 font-600">Target Pests</th>
                  <th className="text-left px-3 py-3 font-600">Application Method</th>
                  <th className="text-left px-3 py-3 font-600">Timing</th>
                </tr>
              </thead>
              <tbody>
                {CROP_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-3 font-500 text-gray-900 border-b border-gray-100 align-top">{row.crop}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.pests}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.method}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 align-top">{row.timing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Compatible Chemicals for Agricultural Thermal Fogging</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
            <strong>Critical:</strong> Only oil-based formulations are compatible with thermal foggers. Water-based emulsifiable concentrates (EC) can be used IF reformulated in oil carrier. Never use water-based formulations directly in a thermal fogger.
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { category: "Insecticides (Oil-Based)", chemicals: ["Deltamethrin EC in mineral oil", "Chlorpyrifos EC in oil carrier", "Cypermethrin EC", "Lambda-cyhalothrin in oil", "Imidacloprid (oil formulation)"] },
              { category: "Fungicides (Oil-Based)", chemicals: ["Tebuconazole EC in mineral oil", "Propiconazole EC", "Hexaconazole in oil carrier", "Mancozeb (check formulation type)"] },
            ].map((group) => (
              <div key={group.category} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-2 text-sm">{group.category}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {group.chemicals.map((c) => <li key={c}>• {c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Equipment Recommendation for Agriculture</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { size: "Small farm (under 10 acres)", machine: "5–15L portable fogger", model: "100XKB200", note: "Single operator, backpack carry, good for garden, nursery, small field" },
              { size: "Medium farm (10–50 acres)", machine: "35–50L trolley/portable", model: "100XTFS50", note: "Combo thermal + cold, covers one large field per fill" },
              { size: "Large farm / cooperative (50+ acres)", machine: "50L+ vehicle-mounted", model: "100XDB400", note: "Vehicle mount covers 20–30 acres/hour for open field crops" },
            ].map((rec) => (
              <div key={rec.size} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-600 text-brand-600 uppercase tracking-wider mb-1">{rec.size}</p>
                <p className="font-700 text-gray-900 mb-1">{rec.machine}</p>
                <p className="text-xs text-gray-500 mb-2">Example: {rec.model}</p>
                <p className="text-xs text-gray-600">{rec.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can thermal fogging be used for agriculture?", a: "Yes — sub-50-micron droplets penetrate crop canopy and under-leaf surfaces for highly effective pest control. A 50-litre machine covers 8–15 acres/hour." },
              { q: "What chemicals for agricultural fogging?", a: "Oil-based pesticides and fungicides. Deltamethrin, chlorpyrifos, cypermethrin, lambda-cyhalothrin. Never use water-based formulations." },
              { q: "Is thermal fogging safe for crops?", a: "At recommended concentrations and timing (early morning/evening), approved oil-based formulations do not damage crops. Follow label re-entry intervals. Avoid during pollination for bee-sensitive crops." },
              { q: "Can I use a thermal fogger inside a greenhouse?", a: "No — use cold (ULV) fogging inside greenhouses. Thermal fogging creates smoke, heat, and fire risk in enclosed structures." },
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
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              { href: "/knowledge/how-to-choose-fogging-machine", label: "How to Choose a Fogging Machine" },
              { href: "/knowledge/thermal-vs-ulv-fogging", label: "Thermal vs Cold Fogging Comparison" },
              { href: "/compare/best-thermal-fogger-for-agriculture-india", label: "Best Foggers for Agriculture India" },
              { href: "/products", label: "View All 100X Circle Machines" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Agricultural Equipment Enquiry</p>
            <p className="text-gray-400 text-sm mb-4">Talk to our team about the right machine for your farm size and crop type. Demonstrations available.</p>
            <Link href="/contact-us" className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
              Contact for Farm Advice
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
