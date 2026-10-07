import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Fogging Machine Operator's Guide — Pre-Operation, Operation & Post-Operation | 100X Circle",
  description:
    "Complete practical guide for thermal fogging machine operators: pre-operation checks, starting procedure, safe operation, chemical handling, post-operation shutdown, maintenance, and record-keeping.",
  alternates: { canonical: `${SITE_URL}/knowledge/fogging-machine-operators-guide` },
  openGraph: {
    title: "Fogging Machine Operator's Guide — Complete Step-by-Step Procedure",
    description:
      "Step-by-step operating guide for thermal pulse-jet foggers. Pre-start checks, operation procedure, chemical handling, safety, shutdown, and maintenance for new and experienced operators.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Fogging Machine Operator's Guide — Pre-Operation, Operation & Post-Operation",
  description:
    "Comprehensive operator's guide for thermal fogging machines — pre-start checks, safe operation, chemical handling, shutdown procedure, and post-operation maintenance.",
  url: `${SITE_URL}/knowledge/fogging-machine-operators-guide`,
  datePublished: "2024-06-01",
  dateModified: "2026-06-01",
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Fogging machine operation" },
    { "@type": "Thing", name: "Thermal fogger" },
    { "@type": "Thing", name: "Pest control equipment" },
    { "@type": "Thing", name: "Operator safety" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/fogging-machine-operators-guide` },
  howTo: {
    "@type": "HowTo",
    name: "How to Operate a Thermal Fogging Machine",
    step: [
      { "@type": "HowToStep", name: "Pre-operation checks", text: "Inspect fuel level, chemical tank, all connections, and PPE before starting." },
      { "@type": "HowToStep", name: "Warm up the machine", text: "Run on clean carrier oil for 2–3 minutes to heat the exhaust tube before adding chemical." },
      { "@type": "HowToStep", name: "Begin fogging operation", text: "Open the chemical valve and direct the fog toward target areas, moving at a steady walking pace." },
      { "@type": "HowToStep", name: "Shut down", text: "Close the chemical valve and run on clean oil for 2 minutes to purge the system before stopping." },
      { "@type": "HowToStep", name: "Post-operation flush", text: "Flush the chemical line with carrier oil, drain, and store machine cleaned and dry." },
    ],
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do you start a thermal fogging machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To start a thermal fogger: (1) Check fuel level, chemical tank, and all connections. (2) Ensure PPE is on (respirator, gloves, eye protection, coveralls). (3) Hold machine level, depress ignition trigger or pull starter cord per your model. (4) Allow 2–3 minutes warm-up on pure carrier oil before opening the chemical valve — the exhaust tube must reach operating temperature for correct vaporisation. (5) Once fog is consistent and white (not black or yellow), open the chemical valve gradually. Never run chemical through a cold machine.",
      },
    },
    {
      "@type": "Question",
      name: "How long can you run a thermal fogger continuously?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most thermal pulse-jet foggers are designed for continuous operation of 2–6 hours per session. For machines with 50-litre tanks, one full tank is typically exhausted in 1.5–3 hours depending on application rate. After each tank, allow the machine to cool for 10–15 minutes before refilling fuel and chemical tanks. For very long operations (full-day municipal drives), plan tank refills as breaks and inspect the machine — check fuel lines, chemical line, and muffler for carbon build-up.",
      },
    },
    {
      "@type": "Question",
      name: "How do you clean a fogging machine after use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Post-operation cleaning: (1) Close the chemical valve. Run pure carrier oil through the chemical line for 2–3 minutes while the machine is still running — this purges chemical residue from the line and vaporiser. (2) Stop the machine and allow it to cool (15–20 minutes). (3) Drain the chemical tank completely. (4) Remove the chemical tank and rinse with clean carrier oil. (5) Wipe down the outside of the machine with a dry cloth. (6) Remove the muffler and clean carbon deposits with a wire brush weekly (more often for heavy use). (7) Store in a clean, dry, ventilated space.",
      },
    },
    {
      "@type": "Question",
      name: "What PPE must a fogging machine operator wear?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mandatory PPE for thermal fogging operators: (1) Respirator — half-face respirator with OV/P100 combination cartridges (not a dust mask). (2) Chemical-resistant gloves — nitrile, elbow-length. (3) Coveralls — full-body coverage; Tyvek disposable or reusable cotton treated with DWR. (4) Eye protection — safety goggles (not spectacles). (5) Closed-toe footwear — chemical-resistant boots or shoe covers. Operators should shower and change clothes after a fogging session. Do not eat, drink, or smoke during operation.",
      },
    },
    {
      "@type": "Question",
      name: "Why is my fogger producing black or yellow smoke?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Black smoke usually indicates: insufficient fuel pressure, blocked/dirty jet nozzle, or wrong fuel type (diesel/heavy oil instead of kerosene/petrol). Yellow or brown smoke often indicates the machine is too cold — the chemical tank was opened before the exhaust tube reached operating temperature. Correct operation: always warm up on clean carrier oil for 2–3 minutes before introducing chemical. If black smoke persists after warm-up, inspect the jet nozzle for blockage and clean with a jet reamer tool.",
      },
    },
  ],
}

export default function FoggingMachineOperatorsGuidePage() {
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
            <span className="text-cinema-300">Operator's Guide</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Operations Guide · 10 min read</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Fogging Machine Operator's Guide
            </h1>
            <p className="text-cinema-300 leading-relaxed max-w-2xl">
              A complete step-by-step operational guide for thermal pulse-jet fogging machine operators — from pre-operation safety checks to correct start-up, fogging technique, shutdown, and post-operation maintenance. Suitable for new and experienced operators.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-brand-800 mb-1">Before Every Operation — Non-Negotiables</p>
          <ul className="text-sm text-brand-700 space-y-1">
            <li>• Full PPE on before handling chemicals or starting the machine</li>
            <li>• Never add chemical to a cold machine — always warm up on carrier oil first (2–3 min)</li>
            <li>• Check fuel, chemical tank, all hose connections, and nozzle before starting</li>
            <li>• Inform residents/bystanders in the area before beginning fogging</li>
            <li>• Never operate in a closed, unventilated space without exhaust management</li>
          </ul>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Phase 1 — Pre-Operation Checks</h2>
          <div className="space-y-3">
            {[
              { check: "PPE check", detail: "Confirm all PPE is available and correctly fitted: half-face respirator with OV/P100 cartridges, nitrile gloves (elbow length), chemical-resistant coveralls, safety goggles, and closed-toe footwear. Do not begin operation without full PPE." },
              { check: "Fuel check", detail: "Check the fuel tank level. Fuel type depends on your model — most 100X Circle thermal foggers run on petroleum (kerosene or petrol mix as specified in your model manual). Never use diesel. Top up if below one-quarter level to avoid running dry mid-operation." },
              { check: "Chemical tank", detail: "Verify the chemical-oil mixture is correctly prepared and at the right concentration. Check that the chemical valve is closed before starting the machine. Inspect the chemical line and connection for leaks or cracks." },
              { check: "Machine exterior", detail: "Inspect the exhaust tube and muffler for physical damage, cracks, or blockage. Check the shoulder straps/carry handle for integrity. Ensure the jet nozzle is clear — use a nozzle reamer if in doubt. Wipe down the machine if chemical residue is present from previous use." },
              { check: "Area assessment", detail: "Walk the area to be fogged. Identify obstacles, confined spaces, open water bodies, beehives, and wind direction. Post advance notice to residents (required by most municipal guidelines). Note wind speed — if above 10 km/h, fog dispersal will be significantly reduced." },
            ].map((item) => (
              <div key={item.check} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-600 text-gray-900 mb-1 text-sm">{item.check}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Phase 2 — Starting the Machine</h2>
          <div className="space-y-3">
            {[
              { num: "1", title: "Position the machine", detail: "Hold the machine level or at the slight upward angle specified in your model manual. For shoulder/backpack models, secure all straps before attempting to start. Point the nozzle away from yourself and bystanders." },
              { num: "2", title: "Check chemical valve is closed", detail: "Confirm the chemical valve (usually a thumb lever or rotary knob near the chemical line) is fully closed. The machine must warm up on pure carrier oil before chemical is introduced." },
              { num: "3", title: "Start the engine", detail: "For electric start models: hold the ignition trigger for 3–5 seconds until the pulse-jet ignites. For pull-start models: prime the fuel pump (3–5 strokes), open fuel valve, pull starter cord firmly. The machine will produce visible smoke/fog on clean oil initially. This is normal." },
              { num: "4", title: "Warm-up period (2–3 minutes)", detail: "Allow the machine to run on pure carrier oil for at least 2 minutes. The exhaust tube must reach operating temperature (300–400°C internally) before chemical is added — this ensures correct vaporisation and white fog output. If the machine is producing dark or inconsistent fog after 3 minutes, investigate before adding chemical." },
              { num: "5", title: "Open chemical valve gradually", detail: "Once fog is white and consistent, slowly open the chemical valve. Start at one-quarter open for 30 seconds, then increase to operating position. This prevents sudden dilution of the hot oil with cold chemical. The fog output may briefly change colour — this is normal. Within 30 seconds, fog should stabilise to the correct output." },
            ].map((step) => (
              <div key={step.num} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                <div className="flex-shrink-0 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-700 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="font-600 text-gray-900 mb-1 text-sm">{step.title}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Phase 3 — Fogging Operation</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { title: "Walking speed", detail: "3–5 km/h for handheld/shoulder foggers for effective coverage. Moving too fast leaves gaps; moving too slow wastes chemical without additional benefit. For vehicle-mounted: 8–15 km/h." },
              { title: "Nozzle direction", detail: "Point nozzle slightly upward (10–15°) and sweep from side to side. For dengue (Aedes): direct fog into vegetation edges and drains. For malaria (Anopheles) evening operations: direct fog into building openings, vegetation, and along drainage channels." },
              { title: "Coverage pattern", detail: "Walk in a grid or back-and-forth pattern to avoid gaps and overlaps. For municipal operations: 25–30 metre parallel passes. For narrow lanes: walk down the centre, fog width covers both sides naturally." },
              { title: "Wind awareness", detail: "Always move with the fog cloud in front of you or to the side — never walk through your own fog cloud. Position yourself upwind of the fogging area. In cross-wind, adjust walking angle so the fog drifts over target areas." },
              { title: "Re-entry interval", detail: "Treated area should not be re-entered for 30–60 minutes after fogging. Post brief warnings in residential areas. For indoor fogging: windows closed during application; re-enter after 30 minutes with ventilation." },
              { title: "Chemical consumption", detail: "Monitor chemical tank level. When approximately one-quarter remains, plan to complete the current run before refilling. Do not run the chemical line dry — air in the system requires re-priming." },
            ].map((item) => (
              <div key={item.title} className="border border-gray-200 rounded-xl p-4">
                <p className="font-600 text-gray-900 mb-1 text-sm">{item.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Phase 4 — Shutdown Procedure</h2>
          <div className="space-y-3">
            {[
              { num: "1", title: "Close the chemical valve", detail: "When you have completed the operation or are stopping for a break, close the chemical valve fully. This is the first step — always stop chemical flow before stopping the machine." },
              { num: "2", title: "Purge with carrier oil (2 minutes)", detail: "With the chemical valve closed, allow the machine to run on pure carrier oil for 2 minutes. This purges chemical residue from the vaporiser tube and chemical line — preventing build-up, blockage, and corrosion during storage. This step is non-optional." },
              { num: "3", title: "Stop the machine", detail: "Close the fuel valve or release the ignition trigger (model-dependent). Allow the machine to come to a natural stop — do not attempt to cool it by adding water or placing it in water." },
              { num: "4", title: "Cool down period", detail: "Allow the machine to cool for 15–20 minutes before handling, refilling, or storing. The exhaust tube reaches 300–600°C during operation and retains heat for several minutes after stopping. Do not place the machine on flammable surfaces during cooling." },
              { num: "5", title: "Drain and store chemical", detail: "Remove and drain the chemical tank. Surplus mixed solution should be stored in a sealed, labelled container. Do not leave mixed chemical in the fogger tank between sessions — oil-based insecticide can degrade rubber seals over time and reduce machine life." },
            ].map((step) => (
              <div key={step.num} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                <div className="flex-shrink-0 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-700 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="font-600 text-gray-900 mb-1 text-sm">{step.title}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-4">Troubleshooting — Common Problems</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-600">Problem</th>
                  <th className="text-left px-4 py-3 font-600">Likely Cause</th>
                  <th className="text-left px-4 py-3 font-600">Solution</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Machine won't start", "Low fuel, blocked jet nozzle, wet igniter", "Check fuel level; clean jet nozzle with reamer; dry igniter; check fuel valve is open"],
                  ["Black or dark smoke", "Wrong fuel (diesel), blocked nozzle, machine too cold", "Use correct fuel type; clean nozzle; allow longer warm-up on carrier oil"],
                  ["No fog / thin fog output", "Chemical valve closed, empty chemical tank, kinked chemical line", "Open chemical valve; check tank level; inspect chemical line for kinks or blockage"],
                  ["Machine vibrates excessively", "Loose muffler, damaged resonance cone, worn pulsejet tube", "Check and tighten muffler; inspect tube for cracks; contact service centre"],
                  ["Chemical dripping from nozzle", "Chemical valve leaking, pressure issues in chemical line", "Close valve, inspect valve seat for debris; clean with carrier oil flush"],
                  ["Fog smells different than usual", "Chemical change, contaminated carrier oil, wrong oil type", "Check chemical batch; verify carrier oil is mineral oil/paraffin, not diesel"],
                  ["Machine stops mid-operation", "Fuel exhausted, fuel line blockage, igniter failure", "Check fuel; bleed fuel line; allow 5-minute rest and restart attempt"],
                ].map(([problem, cause, solution], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-500 text-gray-900 border-b border-gray-100 align-top">{problem}</td>
                    <td className="px-4 py-3 text-gray-600 border-b border-gray-100 align-top">{cause}</td>
                    <td className="px-4 py-3 text-brand-700 border-b border-gray-100 align-top">{solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Post-Operation Record-Keeping</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Maintain an operations log for every fogging session. This is required for GeM procurement audits, NVBDCP reporting, Insecticides Act compliance for commercial operators, and internal performance tracking.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-600 text-gray-900 mb-3">Minimum log fields per session:</p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
              {[
                "Date and time (start/end)",
                "Area covered (ward name, street, coordinates if available)",
                "Area in hectares / km²",
                "Chemical name and batch number",
                "Chemical concentration (% AI in final solution)",
                "Volume of chemical used (litres)",
                "Carrier oil type and volume",
                "Machine model and serial number",
                "Operator name and licence number",
                "Weather conditions (temperature, wind speed, humidity)",
                "Observations (fog quality, coverage gaps, resident responses)",
                "Supervisor sign-off",
              ].map((field) => (
                <p key={field} className="text-sm text-gray-600">• {field}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-700 text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How do I start a thermal fogger?", a: "Check fuel and chemical levels, put PPE on, start on pure carrier oil with chemical valve closed, warm up 2–3 minutes, then gradually open chemical valve. Never add chemical to a cold machine." },
              { q: "How long can a fogger run continuously?", a: "Most models support 2–6 hours per session. Allow 10–15 minutes rest between tanks. Inspect the machine on each tank change." },
              { q: "Why is my fogger producing black smoke?", a: "Black smoke indicates wrong fuel type (diesel vs kerosene/petrol), blocked nozzle, or insufficient warm-up. Check fuel type first, then clean the jet nozzle." },
              { q: "How do I clean the fogger after use?", a: "Close chemical valve; flush with carrier oil for 2 minutes while running; stop and cool; drain chemical tank; clean muffler weekly with wire brush; store dry." },
              { q: "What PPE is required for fogger operators?", a: "Half-face respirator (OV/P100 cartridges), nitrile elbow gloves, full-body coveralls, safety goggles, and closed-toe footwear. No shortcuts." },
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
              { href: "/knowledge/fogging-machine-safety-guide", label: "Fogging Machine Safety Guide" },
              { href: "/knowledge/fogging-machine-maintenance-guide", label: "Fogging Machine Maintenance Guide" },
              { href: "/knowledge/thermal-fogging-chemicals-guide", label: "Thermal Fogging Chemicals Guide" },
              { href: "/knowledge/how-thermal-fogging-works", label: "How Thermal Fogging Works" },
              { href: "/spare-parts", label: "Genuine Spare Parts for 100X Circle Machines" },
              { href: "/contact-us", label: "Technical Support & Training" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <span>→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <p className="text-white font-700 text-lg mb-2">Operator Training Available</p>
            <p className="text-gray-400 text-sm mb-4">100X Circle provides hands-on operator training for municipal and government teams at our facility or on-site. Training covers safe operation, chemical handling, maintenance, and record-keeping.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact-us" className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm">
                Request Operator Training
              </Link>
              <Link href="/spare-parts" className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-white hover:bg-white/10 font-600 rounded-full text-sm">
                Genuine Spare Parts
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
