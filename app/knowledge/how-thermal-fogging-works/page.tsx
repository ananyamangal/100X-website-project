import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "How Thermal Fogging Works: Pulse-Jet Technology Explained | 100X Circle",
  description:
    "Technical explanation of thermal fogging: pulse-jet combustion cycle, heat vaporization, sub-50-micron droplet formation, and why thermal fog reaches where sprays cannot.",
  alternates: { canonical: `${SITE_URL}/knowledge/how-thermal-fogging-works` },
  openGraph: {
    title: "How Thermal Fogging Works: Pulse-Jet Technology Explained",
    description:
      "Pulse-jet engine ignites fuel-air mix at high frequency; heat vaporizes chemical solution; vapor cools at nozzle forming sub-50-micron droplets that penetrate vegetation and voids.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How Thermal Fogging Works: Pulse-Jet Technology Explained",
  description:
    "Technical explanation of how pulse-jet thermal fogging machines generate sub-50-micron insecticide droplets for vector control and agricultural applications.",
  url: `${SITE_URL}/knowledge/how-thermal-fogging-works`,
  datePublished: "2024-01-15",
  dateModified: "2026-05-29",
  author: {
    "@type": "Organization",
    name: "100X Circle Pvt Ltd",
    url: SITE_URL,
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
  about: [
    { "@type": "Thing", name: "Thermal fogging" },
    { "@type": "Thing", name: "Pulse-jet engine" },
    { "@type": "Thing", name: "Vector control" },
  ],
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/knowledge/how-thermal-fogging-works` },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is thermal fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging is a pest control technique that uses a pulse-jet engine to heat a mixture of insecticide and carrier oil to high temperature, vaporizing it into a dense visible fog of sub-50-micron droplets. These tiny particles remain airborne, penetrate vegetation, and reach insects in voids and dense foliage where conventional sprays cannot reach.",
      },
    },
    {
      "@type": "Question",
      name: "How does a pulse-jet engine work in a thermal fogger?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A pulse-jet engine operates without a conventional rotary compressor. It uses a resonance chamber where fuel-air mixture ignites repeatedly at 40–100 times per second. Each combustion pulse expels exhaust gases at high velocity through a jet tube. The heat from continuous combustion (400–600°C at the jet tube) vaporizes the insecticide-oil solution injected near the nozzle.",
      },
    },
    {
      "@type": "Question",
      name: "What droplet size does thermal fogging produce?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal fogging produces droplets in the 1–50 micron range (median volume diameter). For comparison, a raindrop is 2000 microns. Droplets below 50 microns remain airborne for extended periods and penetrate dense vegetation. WHO recommends 10–30 micron droplets for adult mosquito control.",
      },
    },
    {
      "@type": "Question",
      name: "What chemicals can be used in a thermal fogger?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal foggers use oil-based insecticide formulations specifically designed for thermal application. Common active ingredients include: pyrethroids (deltamethrin, cypermethrin, permethrin), organophosphates (malathion, temephos), and synthetic pyrethrins. Aqueous (water-based) formulations should not be used in pulse-jet thermal foggers as water vaporizes differently and can damage the equipment.",
      },
    },
    {
      "@type": "Question",
      name: "How is thermal fogging different from cold fogging (ULV)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Thermal foggers use heat to vaporize the chemical solution into visible fog; ULV (Ultra-Low Volume) cold foggers use mechanical pressure (electric motor + spinning disk or high-pressure pump) to create fine droplets at ambient temperature. Thermal fog is denser and more visible outdoors; ULV produces less visible fog with more precise droplet control indoors.",
      },
    },
  ],
}

export default function HowThermalFoggingWorksPage() {
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
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-green-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>How Thermal Fogging Works</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Technology", "Pulse-Jet", "Physics"].map((tag) => (
            <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          How Thermal Fogging Works: Pulse-Jet Technology Explained
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · 6 min read · Updated May 2026
        </p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Key fact:</strong> Thermal fogging produces droplets of 1–50 microns — so small
          they stay airborne for minutes and penetrate dense vegetation, reaching mosquitoes hiding
          in foliage where sprayers cannot.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>What Is Thermal Fogging?</h2>
          <p>
            Thermal fogging is a pest control technique that uses intense heat to vaporize a
            mixture of insecticide and carrier oil, producing a dense cloud of ultra-fine droplets.
            The fog carries pesticide deep into vegetation, voids, drains, and dense vegetation
            canopies — environments where conventional compression sprayers fail to penetrate.
          </p>

          <p>
            Used globally since the 1940s for mosquito vector control, thermal fogging remains the
            primary tool for municipal mosquito control drives in India, Southeast Asia, Africa, and
            Latin America. The WHO endorses thermal ULV and thermal fogging as two of three
            recommended adult mosquito control methods.
          </p>

          <h2>The Pulse-Jet Engine: Core Technology</h2>
          <p>
            Unlike rotary compressors, a pulse-jet engine has no moving parts. It operates on the
            principle of resonant combustion — fuel ignites and pressure waves propagate through a
            resonance chamber and tailpipe at high frequency (40–100 Hz).
          </p>
          <p>
            The cycle in a thermal fogger pulse-jet engine:
          </p>
          <ol>
            <li>
              <strong>Intake:</strong> Fuel-air mixture is drawn into the combustion chamber through
              a reed valve or venturi intake.
            </li>
            <li>
              <strong>Combustion:</strong> A spark plug ignites the mixture. Combustion pressure
              closes the intake valve, forcing hot gases out the jet tube.
            </li>
            <li>
              <strong>Resonance:</strong> The pressure wave reflects off the closed end of the
              tailpipe and returns as a rarefaction wave, drawing in fresh air-fuel mixture.
              The cycle repeats — self-sustaining after ignition.
            </li>
            <li>
              <strong>Heat generation:</strong> Continuous combustion raises the jet tube temperature
              to 400–600°C. A stainless steel heat exchanger surrounds the jet tube.
            </li>
          </ol>

          <h2>From Liquid to Fog: Vaporization and Condensation</h2>
          <p>
            The insecticide-oil solution is metered by a pump and injected into the hot zone around
            the jet tube. At 400–600°C, the carrier oil and insecticide vaporize instantly.
          </p>
          <p>
            The vapor then travels through a nozzle and exits the fogger at high velocity into
            ambient air. As the vapor contacts cooler outdoor air, it condenses into extremely
            fine droplets — typically 1–50 microns median volume diameter (MVD).
          </p>

          <h2>Droplet Physics: Why Size Matters</h2>
          <table className="text-sm w-full border-collapse mt-2 mb-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 border border-gray-200">Particle Type</th>
                <th className="text-right py-2 px-3 border border-gray-200">Size (microns)</th>
                <th className="text-left py-2 px-3 border border-gray-200">Behavior</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Raindrop", "2,000", "Falls immediately"],
                ["Conventional spray", "200–500", "Settles in seconds"],
                ["Fine mist spray", "50–200", "Settles in 1–2 min"],
                ["Thermal fog (100X)", "1–50", "Airborne 5–15 min, penetrates foliage"],
                ["WHO recommendation", "10–30", "Optimal for adult mosquito contact"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-b border-gray-200">
                  <td className="py-2 px-3 text-gray-800">{a}</td>
                  <td className="py-2 px-3 text-right text-gray-800 font-mono">{b}</td>
                  <td className="py-2 px-3 text-gray-600">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Particles below 50 microns follow air currents, entering spaces that spray droplets
            cannot. This is the key advantage of thermal fogging for adult mosquito control: the
            fog reaches mosquitoes resting in dense grass, shrubs, drains, and tree canopy.
          </p>

          <h2>Chemical Requirements</h2>
          <p>
            Thermal foggers require <strong>oil-based formulations</strong> designed for thermal
            application. The carrier oil (typically mineral oil or vegetable oil) must have the
            right viscosity and vaporization temperature. Water-based formulations should not be
            used — water boils at 100°C (far below the jet tube temperature) and does not
            condense the same way, producing uneven droplets and potentially damaging components.
          </p>
          <p>
            Common active ingredients for thermal fogging:
          </p>
          <ul>
            <li>Pyrethroids: deltamethrin (1.25%), cypermethrin (10%), permethrin (50%)</li>
            <li>Organophosphates: malathion (96%), temephos (50%)</li>
            <li>Synergists: piperonyl butoxide (PBO) added to enhance pyrethroid activity</li>
          </ul>

          <h2>Vehicle-Mounted vs Portable Foggers</h2>
          <p>
            <strong>Vehicle-mounted foggers</strong> (like 100X Circle&apos;s municipal models) run
            the same pulse-jet principle but on a larger scale. The engine mounts on a vehicle
            frame, the chemical tank is 20–100 liters, and the fog is directed by a swivel nozzle
            for directional coverage as the vehicle moves through wards.
          </p>
          <p>
            <strong>Portable pulse-jet foggers</strong> are carried by a single operator. The engine
            is smaller, the chemical tank is 5–10 liters, and the operator walks through the area
            to be treated. Used for farms, housing societies, hospitals, and small municipal wards.
          </p>

          <h2>Frequently Asked Questions</h2>

          <h3>What is thermal fogging?</h3>
          <p>
            Thermal fogging uses a pulse-jet engine to heat insecticide-oil solution to 400–600°C,
            vaporizing it into dense fog of sub-50-micron droplets that penetrate vegetation and
            remain airborne for minutes — reaching adult mosquitoes where sprays cannot.
          </p>

          <h3>How does a pulse-jet engine work in a thermal fogger?</h3>
          <p>
            A pulse-jet operates without moving parts — fuel-air combustion creates pressure waves
            in a resonance chamber at 40–100 Hz. Continuous combustion heats the jet tube to
            400–600°C. The insecticide solution injected around the jet tube vaporizes instantly,
            then condenses into ultra-fine droplets as it exits the nozzle into ambient air.
          </p>

          <h3>What droplet size does thermal fogging produce?</h3>
          <p>
            1–50 microns MVD (median volume diameter). The WHO recommends 10–30 microns for adult
            mosquito control. For comparison, a raindrop is 2,000 microns; conventional sprayers
            produce 200–500 microns.
          </p>

          <h3>What chemicals can be used in a thermal fogger?</h3>
          <p>
            Oil-based insecticide formulations only. Common: deltamethrin, cypermethrin, malathion,
            permethrin in mineral or vegetable oil carrier. Water-based (aqueous) formulations must
            not be used in pulse-jet thermal foggers.
          </p>

          <h3>How is thermal fogging different from cold fogging (ULV)?</h3>
          <p>
            Thermal foggers use heat; ULV cold foggers use mechanical pressure (electric motor or
            high-pressure pump) to atomize liquid at ambient temperature. Thermal fog is denser and
            more effective outdoors in wind. ULV produces less visible fog with better droplet
            control indoors and for temperature-sensitive chemicals.
          </p>
        </article>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/knowledge/thermal-vs-ulv-fogging"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Thermal Fogging vs ULV Cold Fogging</p>
              <p className="text-xs text-gray-500 mt-1">Side-by-side comparison for buyers</p>
            </Link>
            <Link
              href="/knowledge/mosquito-control-india"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Mosquito Control and Thermal Fogging in India</p>
              <p className="text-xs text-gray-500 mt-1">Municipal operations and outbreak response</p>
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl p-5 text-sm">
          <p className="font-semibold text-gray-700 mb-2">About the Author</p>
          <p className="text-gray-600">
            100X Circle Pvt Ltd — Indian OEM manufacturer of pulse-jet thermal fogging machines
            since 2014. ISO 9001:2015 certified. Factory at IMT Manesar, Gurugram.
            GeM-listed MSME seller. Contact: 100xcircle@gmail.com
          </p>
        </div>
      </main>
    </>
  )
}
