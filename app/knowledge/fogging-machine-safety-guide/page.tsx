import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Thermal Fogging Machine Safety Guide — Operator & Public Safety | 100X Circle",
  description:
    "Complete safety guide for thermal fogging machines: operator PPE, chemical handling, public notification, fire safety, and WHO safety protocols for municipal and agricultural use.",
  alternates: { canonical: `${SITE_URL}/knowledge/fogging-machine-safety-guide` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Thermal Fogging Machine Safety Guide",
  url: `${SITE_URL}/knowledge/fogging-machine-safety-guide`,
  datePublished: "2024-07-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/fogging-machine-safety-guide` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is thermal fogging safe for humans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "At approved concentrations, thermal fogging with WHO-recommended insecticides (deltamethrin, cypermethrin at label rates) is considered safe for brief human exposure. Direct fog exposure should be avoided. Residents should close windows during fogging and ventilate spaces for 30 minutes after. Children, pregnant women, and those with respiratory conditions should stay indoors.",
      },
    },
    {
      "@type": "Question",
      name: "What PPE does a thermal fogger operator need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogger operators should use: (1) respirator mask or N95 at minimum; (2) chemical-resistant gloves; (3) long-sleeved shirt and full trousers; (4) protective eyewear; (5) closed toe shoes. Avoid synthetic fabrics that can absorb insecticide. Change and wash clothing after every fogging session.",
      },
    },
    {
      "@type": "Question",
      name: "Are thermal foggers a fire risk?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal foggers operate at 400–600°C at the jet tube and use petroleum fuel. Fire risk is real and must be managed: keep a 2-metre clearance from flammable materials, never fog near LPG cylinders or fuel storage, use approved petroleum-based carriers, and never fog dry vegetation in high fire-risk conditions. Always carry a small fire extinguisher on fogging vehicles.",
      },
    },
  ],
}

export default function SafetyGuidePage() {
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
            <span className="text-cinema-300">Safety Guide</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Safety Guide · 6 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Thermal Fogging Machine Safety Guide
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              Operator PPE requirements, chemical handling safety, public notification protocols, fire safety, and WHO safety standards for municipal and agricultural thermal fogging operations.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-800">
          <strong>Safety First:</strong> Thermal foggers operate at extremely high temperatures (400–600°C) and use petroleum fuel and chemical insecticides. Always follow manufacturer instructions and local regulatory requirements. This guide covers general best practices — consult your state's health department guidelines for jurisdiction-specific requirements.
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Operator Personal Protective Equipment (PPE)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-600 text-gray-900 mb-3">Mandatory PPE</p>
              <ul className="text-sm text-gray-700 space-y-2">
                {[
                  "Respirator mask (FFP2/N95 minimum) — prevents insecticide inhalation",
                  "Chemical-resistant gloves (nitrile or neoprene)",
                  "Long-sleeved clothing — no synthetic fabrics",
                  "Full-length trousers (not shorts)",
                  "Closed-toe shoes (not sandals or open footwear)",
                  "Protective eyewear (goggles or safety glasses)",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-red-600 shrink-0">✓</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-600 text-gray-900 mb-3">Post-Operation Hygiene</p>
              <ul className="text-sm text-gray-700 space-y-2">
                {[
                  "Remove and wash all clothing after each fogging session",
                  "Shower before eating or drinking",
                  "Do not touch face during fogging",
                  "Wash hands thoroughly with soap after chemical handling",
                  "Never eat, drink, or smoke during fogging operations",
                  "Store PPE separately from clean clothing",
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="text-brand-600 shrink-0">✓</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Fire Safety for Thermal Foggers</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Thermal foggers operate at jet tube temperatures of 400–600°C and use petroleum fuel. Fire risk is real and requires active management during every operation.
          </p>
          <div className="space-y-3">
            {[
              { title: "Maintain 2-metre clearance", desc: "Keep the fog nozzle at least 2 metres from dry vegetation, cardboard, plastic, or any flammable material." },
              { title: "Never fog near LPG or fuel storage", desc: "Petrol stations, LPG cylinder stores, or kerosene depots must be given wide clearance. The hot nozzle and petroleum carrier are both ignition risks." },
              { title: "Carry fire extinguisher on vehicles", desc: "Municipal fogging vehicles should carry a 2 kg CO₂ or dry powder extinguisher. Operators should know how to use it." },
              { title: "No fogging in high fire-risk conditions", desc: "Do not fog dry vegetation during drought conditions or in fire-prone areas without risk assessment. Morning dew on vegetation significantly reduces fire risk." },
              { title: "Allow machine to cool before refuelling", desc: "The jet tube and engine remain extremely hot for 10–15 minutes after shutdown. Never refuel a hot machine." },
              { title: "Use approved petroleum carriers only", desc: "Never use petrol itself as the chemical carrier. Only use approved mineral oil or diesel-based carriers as directed by the chemical manufacturer." },
            ].map((item) => (
              <div key={item.title} className="border-l-4 border-red-400 pl-4">
                <p className="font-600 text-gray-900 text-sm">{item.title}</p>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Public Safety and Notification Requirements</h2>
          <div className="space-y-3 text-sm text-gray-700">
            {[
              { action: "Advance public notice", desc: "Post notices or announce via public address 30–60 minutes before fogging. Residents should be advised to close windows and keep children and pets indoors." },
              { action: "30-minute re-entry interval", desc: "Residents and workers should stay out of the fogged area for at least 30 minutes after fogging to allow aerosol to settle and dissipate." },
              { action: "Special vulnerable populations", desc: "Children under 12, pregnant women, elderly individuals, and those with respiratory conditions (asthma, COPD) should avoid the area for at least 60 minutes." },
              { action: "Food and water protection", desc: "Food items, water containers, fish tanks, and pet food must be covered or removed before fogging. Chemical residue on food is a health risk." },
              { action: "Beehives and beneficial insects", desc: "Do not fog near beehives or flowering crops where pollinators are active. Early morning fogging (before bee activity) reduces pollinator impact." },
              { action: "Water body protection", desc: "Deltamethrin and cypermethrin are highly toxic to aquatic life. Maintain minimum 20 metre buffer from ponds, rivers, irrigation canals, and drinking water sources." },
            ].map((item) => (
              <div key={item.action} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-1">{item.action}</p>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Safety FAQs</h2>
          <div className="space-y-4">
            {[
              { q: "Is thermal fogging safe for humans?", a: "At approved concentrations, thermal fogging with WHO-recommended insecticides is safe for brief exposure. Residents should close windows during fogging and ventilate for 30 minutes after." },
              { q: "What PPE does a thermal fogger operator need?", a: "N95 respirator, chemical-resistant gloves, long-sleeved clothing, closed shoes, and eye protection minimum." },
              { q: "Are thermal foggers a fire risk?", a: "Yes — the jet tube operates at 400–600°C. Maintain clearance from flammable materials, never fog near LPG, and allow machine to cool before refuelling." },
              { q: "Is thermal fogging safe near fish ponds?", a: "No — maintain 20 metre buffer. Pyrethroid insecticides are highly toxic to aquatic life at very low concentrations." },
            ].map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-1 text-sm">{faq.q}</p>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 pt-8 mb-8">
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              { href: "/knowledge/fogging-machine-maintenance-guide", label: "Maintenance Guide" },
              { href: "/knowledge/how-to-choose-fogging-machine", label: "How to Choose a Fogger" },
              { href: "/knowledge/dengue-prevention-thermal-fogging", label: "Dengue Prevention Guide" },
              { href: "/spare-parts", label: "Spare Parts & Safety Equipment" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Questions About Safe Operation?</p>
            <p className="text-gray-400 text-sm mb-4">Our technical team provides complimentary operator training on every machine purchase.</p>
            <Link href="/contact-us" className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
              Contact Technical Support
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
