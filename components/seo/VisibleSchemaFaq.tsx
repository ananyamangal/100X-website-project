import type { FaqPair } from "@/lib/seo/faqVisible"

type Props = {
  items: FaqPair[]
  heading?: string
  id?: string
  className?: string
}

/**
 * Server-rendered, open-by-default Q&A list for FAQPage schema entries that
 * the page did not otherwise show (B1). Native <details open>: the answer is
 * in the HTML and visible without a click; readers can still collapse it.
 * Text is rendered verbatim from the schema pairs.
 */
export default function VisibleSchemaFaq({
  items,
  heading = "Frequently asked questions",
  id = "faq-schema-answers",
  className = "",
}: Props) {
  if (!items.length) return null
  return (
    <section aria-labelledby={id} className={`mx-auto mt-10 mb-10 max-w-3xl ${className}`.trim()}>
      <h2 id={id} className="text-xl font-semibold text-gray-800 mb-4">
        {heading}
      </h2>
      <div className="space-y-3">
        {items.map((f) => (
          <details key={f.q} open className="rounded-xl border border-gray-200 bg-white">
            <summary className="cursor-pointer p-4 text-sm font-medium text-gray-800">{f.q}</summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
