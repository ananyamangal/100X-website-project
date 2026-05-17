import { ChevronDown } from "lucide-react"
import type { FaqEntry } from "@/lib/seo/landing-types"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title?: string
  faqs: FaqEntry[]
  /** When true, suppress the FAQPage JSON-LD (e.g. another FAQ block on the same page already emits it). */
  suppressSchema?: boolean
}

/**
 * Parameterised FAQ. Visible markup uses native <details>/<summary> for
 * accessibility (works without JS). When `suppressSchema` is not set,
 * the block emits a FAQPage JSON-LD that mirrors the visible content
 * verbatim — Google penalises FAQPage schema that drifts from rendered
 * Q&A.
 */
export default function FaqBlock({
  eyebrow = "Frequently asked questions",
  title = "Answers for buyers, dealers, and procurement teams.",
  faqs,
  suppressSchema = false,
}: Props) {
  if (!faqs?.length) return null

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  }

  return (
    <section className="py-14 md:py-20" aria-labelledby="faq-block-heading">
      <div className="container mx-auto px-4 max-w-3xl">
        <SectionHeader eyebrow={eyebrow} title={title} idOverride="faq-block-heading" />
        <div className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:divide-white/10">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group p-5 md:p-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4 text-left font-semibold text-gray-900 marker:hidden [[data-theme=dark-industrial]_&]:text-white">
                <span className="text-base md:text-lg">{f.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-green-700 transition-transform duration-200 group-open:rotate-180 [[data-theme=dark-industrial]_&]:text-green-400"
                />
              </summary>
              <p className="mt-3 leading-relaxed text-gray-700 [[data-theme=dark-industrial]_&]:text-slate-300">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {suppressSchema ? null : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </section>
  )
}
