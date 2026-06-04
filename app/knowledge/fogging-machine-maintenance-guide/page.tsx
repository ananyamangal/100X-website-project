import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Thermal Fogging Machine Maintenance Guide — Cleaning, Storage, Troubleshooting | 100X Circle",
  description:
    "Complete maintenance guide for thermal fogging machines: daily cleaning, fuel system care, nozzle maintenance, off-season storage, and troubleshooting common faults. Extend machine life to 10+ years.",
  alternates: { canonical: `${SITE_URL}/knowledge/fogging-machine-maintenance-guide` },
  openGraph: {
    title: "Thermal Fogging Machine Maintenance Guide",
    description:
      "Step-by-step maintenance procedures for pulse-jet thermal foggers: daily cleaning, fuel system care, nozzle maintenance, storage, and troubleshooting common faults.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["Article", "HowTo"],
  headline: "Thermal Fogging Machine Maintenance Guide",
  description:
    "Complete maintenance procedures for thermal fogging machines — daily cleaning, fuel care, nozzle maintenance, storage, and fault diagnosis.",
  url: `${SITE_URL}/knowledge/fogging-machine-maintenance-guide`,
  datePublished: "2024-04-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/fogging-machine-maintenance-guide` },
  step: [
    { "@type": "HowToStep", name: "Post-use flushing", text: "After every fogging session, flush the chemical tank and delivery tube with clean mineral oil or flushing oil to prevent residue build-up." },
    { "@type": "HowToStep", name: "Nozzle cleaning", text: "Remove and clean the fog nozzle tip weekly. Blocked nozzles reduce droplet quality and increase back-pressure on the engine." },
    { "@type": "HowToStep", name: "Fuel system check", text: "Check fuel tank, fuel line, and fuel filter monthly. Replace the fuel filter every 50 operating hours or when flow resistance is felt." },
    { "@type": "HowToStep", name: "Spark plug maintenance", text: "Inspect the spark plug every 25 operating hours. Clean with a wire brush or replace if electrode gap exceeds 0.8 mm." },
    { "@type": "HowToStep", name: "Off-season storage", text: "Before storage: run the machine dry of chemicals, flush with mineral oil, drain the fuel tank, clean all surfaces. Store in a dry, ventilated space at room temperature." },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How often should I clean a thermal fogging machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Flush the chemical tank and delivery tube with mineral oil after every use. Clean the nozzle tip weekly. Inspect the spark plug every 25 operating hours. Full service including fuel filter replacement and engine inspection every 100 operating hours or annually.",
      },
    },
    {
      "@type": "Question",
      name: "Why is my thermal fogger not producing fog?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Common causes: (1) blocked nozzle — disassemble and clean with a thin wire; (2) clogged fuel filter — replace the in-line filter; (3) fouled spark plug — clean or replace; (4) incorrect chemical — ensure oil-based formulation only; (5) low fuel — refill with clean petrol; (6) resonance tube carbon build-up — run with cleaning solvent for 5 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use water-based chemicals in a thermal fogger?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Water-based chemicals should never be used in thermal foggers. At fogging temperatures (400–600°C), water flash-vaporises explosively and can damage the machine. Water also corrodes metal components. Always use oil-based formulations specifically designed for thermal fogging.",
      },
    },
    {
      "@type": "Question",
      name: "How do I store a fogging machine during monsoon season?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Before storing: run the machine empty of chemicals, flush with mineral oil, drain the petrol tank, and run the engine briefly to burn off residual fuel. Clean all external surfaces with a dry cloth. Store in a dry, ventilated space. Apply a light coat of machine oil to exposed metal parts. Check and recharge the battery on electric-start models monthly.",
      },
    },
    {
      "@type": "Question",
      name: "What spare parts should I keep in stock?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Essential spares to maintain: (1) 2–3 spark plugs (correct gap spec for your model); (2) fuel filter set; (3) nozzle tip and O-rings; (4) fuel line sections; (5) ignition coil (for older machines); (6) chemical delivery valve. 100X Circle ships all genuine spare parts from the Gurugram factory within 3–5 working days.",
      },
    },
  ],
}

const DAILY_CHECKLIST = [
  "Check fuel level — refill with clean petrol before starting",
  "Check chemical tank level and formulation type (oil-based only)",
  "Inspect chemical delivery tube for cracks or blockages",
  "Run machine for 30 seconds on mineral oil before adding chemical",
  "After use: flush tank and delivery system with mineral oil",
  "Wipe external surfaces clean of chemical residue",
  "Store in upright position in a ventilated area",
]

const WEEKLY_CHECKLIST = [
  "Disassemble and clean fog nozzle tip with thin wire or compressed air",
  "Inspect fuel line for cracking or leakage",
  "Check spark plug — clean electrode if carbon-fouled",
  "Inspect resonance tube exterior for dents or heat damage",
  "Check all external fasteners and clamps — tighten if loose",
  "Test output fog quality — should be dense white, not thin or grey",
]

const TROUBLESHOOTING = [
  { symptom: "Machine will not start", causes: "No fuel; fouled spark plug; clogged fuel filter; flooded engine", fix: "Check fuel; replace spark plug; replace filter; tilt machine and restart after 2 min" },
  { symptom: "Machine starts but no fog", causes: "Nozzle blocked; chemical delivery valve closed; wrong chemical type", fix: "Clean nozzle; open delivery valve; verify oil-based formulation" },
  { symptom: "Fog output is thin / grey", causes: "Chemical too dilute; low engine temperature; nozzle partially blocked", fix: "Check dilution ratio; allow engine to warm up 60 seconds; clean nozzle" },
  { symptom: "Machine runs rough / sputters", causes: "Stale or contaminated fuel; water in fuel; partially blocked fuel filter", fix: "Drain and replace fuel; replace fuel filter; clean fuel tank" },
  { symptom: "Fuel leaking from tank / line", causes: "Cracked fuel line; loose clamp; damaged tank seal", fix: "Replace fuel line; tighten clamp; replace tank seal — do not operate if leaking" },
  { symptom: "Excessive smoke from engine", causes: "Carbon build-up in resonance tube; oil contamination in fuel", fix: "Run cleaning solvent for 5 min; use only clean petrol without oil additives" },
]

export default function MaintenancePage() {
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
            <span className="text-cinema-300">Maintenance Guide</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Technical Guide · 7 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Thermal Fogging Machine Maintenance Guide
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              Proper maintenance extends machine life to 10+ years. This guide covers daily cleaning, weekly inspection, fuel system care, off-season storage, and troubleshooting common faults — based on 10 years of manufacturing and after-sales experience.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
          <strong>Safety Note:</strong> Always turn off the machine and allow it to cool completely before performing any maintenance. Never service a hot machine. Wear gloves when handling chemicals and fuel.
        </div>

        {/* Daily checklist */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Daily Maintenance Checklist</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            {DAILY_CHECKLIST.map((item, i) => (
              <div key={i} className="flex gap-3 items-start py-2 border-b border-green-100 last:border-0">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-green-900 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly checklist */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Weekly Inspection Checklist</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            {WEEKLY_CHECKLIST.map((item, i) => (
              <div key={i} className="flex gap-3 items-start py-2 border-b border-blue-100 last:border-0">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-blue-900 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Nozzle maintenance */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Nozzle Cleaning (Most Critical Maintenance Task)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The fog nozzle determines droplet size and fog density. A partially blocked nozzle creates larger droplets that settle quickly and reduce effectiveness. A fully blocked nozzle stops fog output entirely. Clean the nozzle weekly or whenever fog output appears thin or inconsistent.
          </p>
          <div className="space-y-3 text-sm">
            {[
              { step: "Turn off and cool", desc: "Allow machine to cool for 20 minutes. Do not disassemble a hot nozzle." },
              { step: "Remove nozzle tip", desc: "Use the correct spanner for your model. Do not force. Keep all O-rings safe." },
              { step: "Clear the orifice", desc: "Use a thin wire (not a drill bit) to clear the orifice hole. Rinse with mineral oil or diesel." },
              { step: "Check O-ring condition", desc: "Worn O-rings cause chemical leaks and pressure loss. Replace if cracked or deformed." },
              { step: "Reinstall and test", desc: "Reinstall with correct torque. Test with mineral oil before adding chemical formulation." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3 border-b border-gray-100 pb-3">
                <span className="font-600 text-gray-800 w-40 shrink-0">{s.step}</span>
                <span className="text-gray-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Troubleshooting Common Faults</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-600 rounded-tl-lg">Symptom</th>
                  <th className="text-left px-4 py-3 font-600">Likely Causes</th>
                  <th className="text-left px-4 py-3 font-600 rounded-tr-lg">Fix</th>
                </tr>
              </thead>
              <tbody>
                {TROUBLESHOOTING.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-500 text-gray-900 border-b border-gray-100 align-top">{row.symptom}</td>
                    <td className="px-4 py-3 text-gray-600 border-b border-gray-100 align-top">{row.causes}</td>
                    <td className="px-4 py-3 text-gray-700 border-b border-gray-100 align-top">{row.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Off-season storage */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Off-Season Storage (Monsoon / Winter)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Fogging machines used seasonally for dengue prevention drives or post-monsoon pest control may sit idle for 3–6 months. Improper storage is the most common cause of premature machine failure.
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            {[
              "Run the chemical tank empty — never store with chemical inside",
              "Flush the tank and delivery tube with mineral oil, then run until empty",
              "Drain the petrol fuel tank completely — stale petrol varnishes carburettor jets",
              "Remove and clean the spark plug; store separately or replace",
              "Clean all chemical residue from external surfaces with a dry cloth",
              "Apply a light machine oil coat to the fog nozzle, fuel fittings, and any exposed metal",
              "Store upright in a dry, ventilated room — never in direct sunlight or damp spaces",
              "For electric-start models: remove the battery and store separately with monthly charge",
              "Tag the machine with the storage date and service notes for the next operator",
            ].map((item, i) => (
              <div key={i} className="flex gap-2 py-1 border-b border-gray-100">
                <span className="text-brand-600 shrink-0">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How often should I clean a thermal fogging machine?", a: "Flush after every use. Clean nozzle weekly. Full service every 100 operating hours." },
              { q: "Why is my fogger not producing fog?", a: "Most common: blocked nozzle (clean with thin wire), clogged fuel filter (replace), wrong chemical type (use oil-based only), or fouled spark plug (clean or replace)." },
              { q: "Can I use water-based chemicals?", a: "No — never. Water flash-vaporises explosively at fogging temperatures and damages the machine. Oil-based formulations only." },
              { q: "Where do I get genuine spare parts for 100X Circle machines?", a: "Call +91-7827229116 or order via our website. We ship from Gurugram within 3–5 working days pan-India." },
            ].map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-1 text-sm">{faq.q}</p>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related + CTA */}
        <section className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-lg font-600 text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {[
              { href: "/spare-parts", label: "Order Genuine Spare Parts" },
              { href: "/knowledge/how-to-choose-fogging-machine", label: "How to Choose a Thermal Fogger" },
              { href: "/knowledge/how-thermal-fogging-works", label: "How Thermal Fogging Works" },
              { href: "/contact-us", label: "Contact Technical Support" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Need a Spare Part or Technical Help?</p>
            <p className="text-gray-400 text-sm mb-4">100X Circle provides manufacturer-direct support. Speak to a technician at +91-7827229116.</p>
            <Link href="/spare-parts" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
              View Spare Parts Catalog
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
