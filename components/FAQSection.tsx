"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

type Faq = {
  q: string
  /** Plain text answer — also used verbatim in the FAQPage JSON-LD. */
  a: string
}

const FAQS: Faq[] = [
  {
    q: "Which 100x Circle fogging machine should I buy for municipal mosquito control?",
    a:
      "For city-wide and ward-level mosquito control drives, the Double Barrel Vehicle-Mounted Thermal Fogging Machine (100XDB400) is the most common choice — its high fog output and vehicle-mounted design covers large outdoor areas quickly. For smaller wards, hospitals, or housing societies, the Thermal & Cold Fogging Machine (100XTFS50) or the Stainless Steel Tank Thermal Fogger (100XSSMA20) are typically a better fit.",
  },
  {
    q: "What is the difference between thermal fogging and cold (ULV) fogging?",
    a:
      "Thermal fogging uses heat to vapourise the fogging solution into a dense visible cloud — ideal for outdoor mosquito and vector control where coverage matters. Cold (ULV) fogging uses mechanical pressure to create fine droplets without heat — preferred for indoor disinfection or temperature-sensitive chemicals. Our 100XTFS50 supports both modes.",
  },
  {
    q: "Are 100x Circle fogging machines suitable for GeM and government tenders?",
    a:
      "Yes. We supply municipal corporations, panchayats, and government health departments across India. Share your tender or GeM requirement (model, quantity, delivery state, compliance certificates) on WhatsApp or via our contact form and our team will respond with a tender-ready quote and supporting documents.",
  },
  {
    q: "Do you ship across India, and what is the typical delivery time?",
    a:
      "Yes — we dispatch nationwide from Gurugram, Haryana. Standard delivery is 5–10 working days for in-stock models, longer for custom configurations or bulk orders. Bulk and institutional buyers should request a delivery commitment as part of the quote.",
  },
  {
    q: "What warranty and after-sales support do you provide?",
    a:
      "All 100x Circle fogging machines ship with a manufacturer's warranty against material and manufacturing defects. We provide on-call technical support, spares supply, and service documentation in English and Hindi. Specific warranty terms are confirmed at the time of quotation.",
  },
  {
    q: "Can I become a 100x Circle dealer or distributor?",
    a:
      "Yes — we partner with dealers, distributors, and channel partners across Indian states. Reach out via the contact form or WhatsApp with your location and channel experience, and we'll share margins, territory availability, and onboarding details.",
  },
  {
    q: "How does a pulse-jet thermal fogger differ from a knapsack or boom sprayer?",
    a:
      "A pulse-jet thermal fogger uses a high-frequency combustion chamber to vapourise the chemical solution into sub-50-micron droplets that drift on air currents into voids, foliage, and drains. Knapsack and boom sprayers produce larger droplets that fall to ground level — better for direct foliar application but limited in reach and coverage. Thermal foggers are the standard for outdoor vector control and area-wide disinfection.",
  },
  {
    q: "What droplet size do 100x Circle thermal foggers produce, and why does it matter?",
    a:
      "Our pulse-jet foggers produce droplets in the sub-50-micron range (typically 0.5–40 μm depending on chemical and engine setting). Droplets below 50 μm stay airborne long enough to penetrate vegetation, drains, and voids that conventional spraying cannot reach. Larger droplets fall too quickly; smaller droplets evaporate before deposition. This range is the sweet spot for vector control efficacy.",
  },
  {
    q: "Can 100x Circle fogging machines be used in agriculture for fungicide and pesticide application?",
    a:
      "Yes. Our agricultural thermal foggers apply fungicides, pesticides, and plant growth regulators across orchards, paddy fields, polyhouses, and vegetable farms. The machines handle both oil-based and water-based formulations. Single-operator portable models are commonly used by individual farmers and cooperatives; larger vehicle-mounted units serve estate-scale operations.",
  },
  {
    q: "How does the GeM listing process work for municipal procurement of 100x Circle equipment?",
    a:
      "100x Circle is a registered OEM on the Government e-Marketplace (GeM). Government departments, Nagar Nigams, Nagar Palikas, Panchayats, and PSUs can search our catalogue on gem.gov.in and place direct purchase orders without separate tendering for catalogue items. For volume contracts and rate contracts, share your indent on WhatsApp or contact form — we respond with GeM-ready documentation, GST invoices, and compliance certificates.",
  },
  {
    q: "What margins and territory exclusivity do you offer to dealers and distributors?",
    a:
      "Dealer and distributor margins depend on category, volume commitment, and territory. We work with both exclusive and non-exclusive arrangements across Indian states. Active distributors get marketing collateral, training, demo-machine support, and lead routing for their territory. Send your location, current channel experience, and target volume to start the onboarding conversation.",
  },
  {
    q: "Do you export 100x Circle fogging machines outside India, and what are the international shipping options?",
    a:
      "Yes. We ship to buyers in South Asia, Africa, and the Middle East — including municipal corporations, NGO health programs, and private pest-control operators. Standard incoterms are FOB Mumbai/Nhava Sheva and EXW Gurugram; CIF and DDP can be arranged for larger orders. Compliance documents (commercial invoice, packing list, certificate of origin, BIS where applicable) are issued by our export desk.",
  },
]

export default function FAQSection() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  }

  return (
    <section className="py-16 md:py-24 bg-white" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-block mb-3 text-sm font-semibold uppercase tracking-wider text-green-700">
            Frequently Asked Questions
          </span>
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-gray-900">
            Fogging machines, tenders, and after-sales — answered.
          </h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Quick answers for buyers, municipal teams, and dealers exploring
            100x Circle equipment.
          </p>
        </div>

        <Accordion.Root
          type="single"
          collapsible
          className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          {FAQS.map((f, i) => (
            <Accordion.Item key={i} value={`faq-${i}`}>
              <Accordion.Header className="flex">
                <Accordion.Trigger className="group flex w-full items-start justify-between gap-4 p-5 md:p-6 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-inset rounded-2xl [&[data-state=open]]:text-green-700">
                  <span className="text-base md:text-lg leading-snug">{f.q}</span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-green-700 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-gray-700 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="px-5 md:px-6 pb-5 md:pb-6 leading-relaxed">{f.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  )
}
