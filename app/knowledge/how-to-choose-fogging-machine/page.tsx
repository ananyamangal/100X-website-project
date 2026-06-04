import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "How to Choose a Thermal Fogging Machine in India (2026 Buyer's Guide) | 100X Circle",
  description:
    "Complete buyer's guide: tank capacity, droplet size, engine type, certifications, GeM eligibility, price vs quality. Choose the right thermal fogging machine for municipal, agricultural, or pest control use.",
  alternates: { canonical: `${SITE_URL}/knowledge/how-to-choose-fogging-machine` },
  openGraph: {
    title: "How to Choose a Thermal Fogging Machine — India Buyer's Guide 2026",
    description:
      "Step-by-step guide to selecting the right thermal fogger. Covers capacity, droplet size, pulse-jet vs ULV, certifications, GeM procurement, and price vs quality trade-offs.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["Article", "HowTo"],
  headline: "How to Choose a Thermal Fogging Machine in India (2026 Buyer's Guide)",
  description:
    "A complete guide to selecting the right thermal fogging machine for municipal, agricultural, or pest control use in India — covering capacity, certifications, GeM procurement, and price.",
  url: `${SITE_URL}/knowledge/how-to-choose-fogging-machine`,
  datePublished: "2024-03-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/how-to-choose-fogging-machine` },
  estimatedCost: { "@type": "MonetaryAmount", currency: "INR", minValue: 6500, maxValue: 250000 },
  supply: [
    { "@type": "HowToSupply", name: "Thermal fogging machine" },
    { "@type": "HowToSupply", name: "Oil-based insecticide" },
    { "@type": "HowToSupply", name: "Operator safety equipment" },
  ],
  step: [
    {
      "@type": "HowToStep",
      name: "Define your application type",
      text: "Determine whether you need the machine for outdoor municipal fogging, indoor pest control, agricultural spraying, or a combination. This determines whether you need thermal, cold (ULV), or combo fogging.",
    },
    {
      "@type": "HowToStep",
      name: "Calculate the area you need to cover per session",
      text: "Thermal foggers cover 5–15 acres per hour depending on wind and terrain. A 50-litre machine handles one large ward in a single session; a 15-litre machine suits smaller areas. Match tank size to your operational area.",
    },
    {
      "@type": "HowToStep",
      name: "Check certification requirements",
      text: "Government tenders typically require ISI mark and ISO 9001. Export-bound operations may require CE marking. GeM procurement benefits from MSME-registered OEM products due to procurement preference rules.",
    },
    {
      "@type": "HowToStep",
      name: "Verify GeM listing for government buyers",
      text: "Government bodies — municipal corporations, health departments, Panchayats — should procure via GeM to skip tendering and gain MSME preference. Verify the machine is listed by an OEM seller, not a reseller.",
    },
    {
      "@type": "HowToStep",
      name: "Evaluate after-sales and spare parts support",
      text: "Indian OEM manufacturers offer 3–7 day spare parts delivery from the factory. Imported machines depend on importer stocks, often 2–6 weeks. Factor this into total cost of ownership.",
    },
    {
      "@type": "HowToStep",
      name: "Request a demonstration before bulk purchase",
      text: "Any reputable manufacturer will provide a live demonstration. Request a field demo showing fog output, droplet range, and chemical consumption rate before finalising orders above ₹1 lakh.",
    },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What tank capacity should I choose for municipal fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For a single municipal ward (approximately 5–10 km of roads), a 35–50 litre tank is standard. It covers one full operational cycle without refilling. For vehicle-mounted operations covering multiple wards per shift, choose 50–100 litre dual-tank systems. Mini foggers (5–15 litre) suit targeted spot-treatment or small-area operations.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between pulse-jet and other engine types in thermal foggers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pulse-jet engines use resonant combustion without moving parts — no compressor, no rotary components. This makes them highly reliable, maintenance-simple, and fuel-efficient. Most Indian and Korean thermal foggers use pulse-jet technology. The key advantage over older engine types is lower maintenance cost and consistent droplet size across the operating session.",
      },
    },
    {
      "@type": "Question",
      name: "Is ISI mark mandatory for government tender fogging machines in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ISI mark (Bureau of Indian Standards) is increasingly required in government tenders, especially from municipal corporations and state health departments. ISO 9001:2015 certification is also commonly required. GeM buyers should specifically filter for OEM sellers with BIS/ISI mark to ensure compliance with tender specifications.",
      },
    },
    {
      "@type": "Question",
      name: "What is the price range for thermal fogging machines in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Indian thermal fogging machine prices range from approximately ₹6,500 for a basic 5-litre handheld portable fogger to ₹2,50,000 for a heavy-duty 100-litre dual-barrel vehicle-mounted system. Mid-range 35–50 litre machines for municipal use cost ₹30,000–₹80,000. Prices from Indian OEM manufacturers like 100X Circle are 3–5× lower than imported equivalents.",
      },
    },
    {
      "@type": "Question",
      name: "Can I procure a fogging machine from GeM without a tender?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Government bodies can procure fogging machines directly from GeM-listed sellers without issuing a public tender, subject to procurement value limits. MSME-registered OEM sellers get procurement preference — this means government buyers are obligated to prefer them if the OEM's offer is within a specified price range of the lowest non-MSME bid. 100X Circle is GeM-listed as an MSME OEM.",
      },
    },
    {
      "@type": "Question",
      name: "What oil-based chemicals work in thermal foggers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging requires oil-based chemical formulations. Compatible active ingredients include deltamethrin, cypermethrin, malathion, and permethrin in petroleum or mineral oil carriers. Water-based formulations are NOT suitable for thermal fogging — they do not vaporise correctly and damage the machine. Always verify the formulation type before use.",
      },
    },
  ],
}

const COMPARISON_TABLE = [
  { use: "Municipal ward mosquito control (outdoor)", recommended: "35–50L thermal fogger", example: "100XTFS50 or 100XDB400" },
  { use: "Agricultural crop protection (outdoor field)", recommended: "15–35L thermal fogger", example: "100XKB200 (compact fields)" },
  { use: "Indoor pest control (enclosed spaces)", recommended: "Cold/ULV fogger", example: "100XMCF42" },
  { use: "Hospital / healthcare sanitation", recommended: "Cold fogger (no heat, no smoke)", example: "100XMCF42" },
  { use: "Multi-purpose (indoor + outdoor)", recommended: "Combo thermal+cold", example: "100XTFS50" },
  { use: "Large municipal operation (vehicle-mounted)", recommended: "50–100L vehicle mount", example: "100XDB400" },
  { use: "Government GeM procurement", recommended: "ISI-marked + OEM GeM seller", example: "100X ISI-marked models" },
  { use: "Export / CE compliance required", recommended: "CE-certified model", example: "100X CE-export models" },
]

export default function HowToChoosePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Dark cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-12 md:pt-28 md:pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/knowledge" className="hover:text-cinema-300 transition-colors">Knowledge Hub</Link>
            <span>/</span>
            <span className="text-cinema-300">Buyer's Guide</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Buyer's Guide · 8 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              How to Choose a Thermal Fogging Machine in India (2026)
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              A complete decision framework for municipal corporations, health departments, pest control operators, and farmers — covering tank capacity, certifications, GeM procurement, and price-vs-quality trade-offs.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        {/* Quick answer for AI overview */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-brand-800 mb-1">Quick Answer</p>
          <p className="text-sm text-brand-700">
            Choose a thermal fogging machine based on: (1) area size — match tank capacity to your coverage requirement; (2) application type — outdoor use needs thermal, indoor needs cold/ULV; (3) certification — ISI mark and ISO 9001 for government buyers; (4) procurement route — GeM-listed OEM products get MSME preference. For municipal use, a 35–50 litre pulse-jet thermal fogger from an Indian OEM costs ₹30,000–₹80,000 versus ₹1,50,000+ for imported equivalents.
          </p>
        </div>

        {/* Use-case table */}
        <section className="mb-10">
          <h2 className="text-xl font-700 text-gray-900 mb-4">Recommended Machines by Use Case</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-600 rounded-tl-lg">Application</th>
                  <th className="text-left px-4 py-3 font-600">Recommended Type</th>
                  <th className="text-left px-4 py-3 font-600 rounded-tr-lg">100X Circle Example</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-800 border-b border-gray-100">{row.use}</td>
                    <td className="px-4 py-3 text-gray-700 border-b border-gray-100">{row.recommended}</td>
                    <td className="px-4 py-3 text-brand-700 font-500 border-b border-gray-100">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Step 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Step 1: Define Your Application Type</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The most critical first question is: <strong>where will the machine operate?</strong> The answer determines whether you need thermal fogging, cold (ULV) fogging, or a combination machine.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-600 text-gray-900 mb-2">🔥 Thermal Fogging — Best For:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Outdoor mosquito and vector control</li>
                <li>• Large open areas — parks, drains, roads</li>
                <li>• Dense vegetation penetration</li>
                <li>• Agricultural field-edge treatment</li>
                <li>• Night-time municipal fogging drives</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-600 text-gray-900 mb-2">❄️ Cold (ULV) Fogging — Best For:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Indoor pest control and sanitisation</li>
                <li>• Hospitals, schools, food facilities</li>
                <li>• Water-based formulations</li>
                <li>• Temperature-sensitive environments</li>
                <li>• Greenhouse / polyhouse treatment</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            <strong>Combo machines</strong> (like the 100XTFS50) switch between thermal and cold mode and are ideal for pest control operators handling varied site types.
          </p>
        </section>

        {/* Step 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Step 2: Match Tank Capacity to Your Coverage Area</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Tank capacity directly determines how much area you can treat before refilling. A standard 50-litre machine at normal fogging concentration covers approximately 10–15 acres of open space, or 5–8 km of urban roads, per fill.
          </p>
          <div className="bg-gray-50 rounded-xl p-5 mb-4">
            <p className="font-600 text-gray-900 mb-3">Capacity Sizing Guide</p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3"><span className="w-28 font-500 text-gray-700 shrink-0">5–15 litres</span><span className="text-gray-600">Spot treatment, household use, small farm plots (under 2 acres). Backpack or handheld. ₹6,500–₹25,000.</span></div>
              <div className="flex gap-3"><span className="w-28 font-500 text-gray-700 shrink-0">15–35 litres</span><span className="text-gray-600">Small municipal ward, agricultural field. Portable shoulder-mount. ₹20,000–₹50,000.</span></div>
              <div className="flex gap-3"><span className="w-28 font-500 text-gray-700 shrink-0">35–50 litres</span><span className="text-gray-600">Standard municipal ward fogging. Trolley or vehicle-carry. Most common government purchase. ₹40,000–₹80,000.</span></div>
              <div className="flex gap-3"><span className="w-28 font-500 text-gray-700 shrink-0">50–100 litres</span><span className="text-gray-600">Vehicle-mounted large-area operations, multi-ward coverage per shift. ₹1,00,000–₹2,50,000.</span></div>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Step 3: Understand Certification Requirements</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            For government procurement, certification is not optional — it is frequently a mandatory tender requirement. Here is what each certification means in the Indian context:
          </p>
          <div className="space-y-3">
            {[
              { cert: "ISI Mark (BIS)", desc: "Bureau of Indian Standards product certification. Increasingly required in municipal and state-level tenders. Signals that the machine meets Indian standards for safety and performance." },
              { cert: "ISO 9001:2015", desc: "Quality management system certification for the manufacturer's factory. Verifies consistent manufacturing processes, not the product itself. Required by most government tenders." },
              { cert: "CE Marking", desc: "European conformity marking for export. Required for machines sold to European buyers. Also present on some Indian models for confidence signalling, though not legally required in India." },
              { cert: "MSME / UDYAM Registration", desc: "Government of India MSME registration enabling procurement preference on GeM. MSME-registered OEM sellers get a 25% procurement preference in GeM direct purchases — government bodies are obligated to prefer them within price thresholds." },
              { cert: "GeM Seller Registration", desc: "Direct listing on Government e-Marketplace enables government bodies to purchase without issuing a public tender. Only OEM sellers (not resellers) carry maximum procurement preference." },
            ].map((item) => (
              <div key={item.cert} className="border-l-4 border-brand-500 pl-4">
                <p className="font-600 text-gray-900 text-sm">{item.cert}</p>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm mt-4">
            Government tenders — especially from municipal corporations and health departments — increasingly specify{" "}
            <Link href="/is-14855-fogging-machine" className="text-brand-600 hover:underline font-500">
              IS 14855 (Part 1)
            </Link>
            {" "}as the Bureau of Indian Standards requirement for fogging machines. Verify IS 14855 compliance documentation is available from your supplier before bidding.
          </p>
        </section>

        {/* Step 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Step 4: GeM Procurement vs Tender — What Government Buyers Need to Know</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Government bodies at all levels — Nagar Panchayat, Nagar Palika, Nagar Nigam, district health department, state health directorate — can procure fogging machines through two routes:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-600 text-green-900 mb-2">GeM Direct Purchase (Recommended)</p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• No tender required below value limits</li>
                <li>• MSME OEM preference applied</li>
                <li>• Faster procurement (days vs months)</li>
                <li>• Full audit trail, GST invoice</li>
                <li>• 100X Circle available on GeM</li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="font-600 text-gray-900 mb-2">Open Tender / RFQ</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Required above certain value thresholds</li>
                <li>• Longer process (weeks to months)</li>
                <li>• Specification writing critical</li>
                <li>• L1 price often determines winner</li>
                <li>• ISI, ISO certifications often mandatory</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <Link href="/knowledge/government-procurement-guide" className="text-brand-600 hover:underline font-500">Read the complete GeM procurement guide →</Link>
            <Link href="/gem-tender-support" className="text-brand-600 hover:underline font-500">Dealers: access OEM authorization letters and IS 14855 documentation →</Link>
          </div>
        </section>

        {/* Step 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Step 5: Evaluate Total Cost of Ownership</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Purchase price is one dimension of cost. For a 5-year ownership lifecycle, also factor:
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            {[
              { item: "Spare parts cost", note: "Domestic OEM spares cost 30–60% less than imported equivalents. Annual maintenance on Indian thermal foggers runs ₹2,000–₹8,000 vs ₹15,000+ for imported machines." },
              { item: "Fuel consumption", note: "Pulse-jet machines consume 1–3 litres/hour of petrol depending on model. Calculate annual fuel spend based on your operating hours." },
              { item: "Chemical cost", note: "Thermal fogging requires oil-based formulations at 1:9 to 1:15 chemical-to-oil ratio. A 50-litre tank uses 3–4 litres of chemical concentrate per fill." },
              { item: "Operator training", note: "Indian OEM manufacturers provide complimentary training on purchase. Imported machine training may require importing a trainer or expensive authorised service." },
              { item: "Downtime cost", note: "If a machine breaks down during a dengue outbreak fogging drive, the cost of delay is operational. Domestic OEMs deliver spare parts in 3–5 days vs 3–6 weeks for imports." },
            ].map((r) => (
              <div key={r.item} className="flex gap-3 py-2 border-b border-gray-100">
                <span className="w-40 font-500 text-gray-800 shrink-0">{r.item}</span>
                <span className="text-gray-600">{r.note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ section */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {[
              {
                q: "What tank capacity should I choose for municipal fogging?",
                a: "For a single municipal ward (approximately 5–10 km of roads), a 35–50 litre tank is standard. It covers one full operational cycle without refilling. For vehicle-mounted operations covering multiple wards per shift, choose 50–100 litre dual-tank systems. Mini foggers (5–15 litre) suit targeted spot-treatment or small-area operations.",
              },
              {
                q: "Is ISI mark mandatory for government tender fogging machines?",
                a: "ISI mark is increasingly required in government tenders, especially from municipal corporations and state health departments. ISO 9001:2015 certification is also commonly required. GeM buyers should filter for OEM sellers with BIS/ISI mark to ensure compliance.",
              },
              {
                q: "What chemicals work in thermal foggers?",
                a: "Oil-based formulations with deltamethrin, cypermethrin, malathion, or permethrin in petroleum/mineral oil carriers. Water-based formulations are not suitable — they damage the machine and do not vaporise correctly.",
              },
              {
                q: "Can I see a demo before purchasing?",
                a: "Yes. 100X Circle provides live demonstrations at the Gurugram factory and at customer sites for orders above ₹1 lakh. Contact +91-7827229116 to arrange.",
              },
            ].map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-5">
                <p className="font-600 text-gray-900 mb-2">{faq.q}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal linking */}
        <section className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-lg font-600 text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: "/knowledge/thermal-vs-ulv-fogging", label: "Thermal vs ULV Cold Fogging: Full Comparison" },
              { href: "/knowledge/government-procurement-guide", label: "GeM Procurement Guide for Government Buyers" },
              { href: "/knowledge/how-thermal-fogging-works", label: "How Thermal Fogging Works (Technical)" },
              { href: "/knowledge/mosquito-control-india", label: "Mosquito Control in India — Municipal Guide" },
              { href: "/is-14855-fogging-machine", label: "IS 14855 Certified Fogging Machines" },
              { href: "/become-a-dealer", label: "Become an Authorized Dealer" },
              { href: "/products", label: "View All 100X Circle Fogging Machines" },
              { href: "/compare/fogging-machine-price-guide-india-2026", label: "Fogging Machine Price Guide India 2026" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 rounded-2xl p-6 md:p-8 text-center">
          <p className="text-white font-700 text-lg mb-2">Ready to Choose Your Machine?</p>
          <p className="text-gray-400 text-sm mb-5">Speak to our technical team. We help municipalities, PCOs, and farms select the right machine for their specific requirements.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm transition-colors">
              View Product Catalog
            </Link>
            <Link href="/contact-us" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white hover:bg-white/10 font-600 rounded-full text-sm transition-colors">
              Request Expert Advice
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
