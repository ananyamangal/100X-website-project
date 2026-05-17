"use client"

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

        <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group p-5 md:p-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4 text-left font-semibold text-gray-900 marker:hidden">
                <span className="text-base md:text-lg">{f.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-green-700 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-gray-700 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  )
}
