import Link from "next/link"
import InlineText from "./InlineText"

type Props = {
  h2: string
  paragraphs: string[]
  /** Optional bullet list rendered after paragraph number `after` (1-based; 0 = before the first). */
  list?: { after: number; items: string[] }
  /** Optional closing call-to-action link. */
  cta?: { label: string; href: string }
}

/**
 * Plain heading + paragraph block. Used by the back-compat path for the
 * existing product landings (content1/2/3) and by any new landing that
 * just wants a narrative section. Paragraphs accept the inline
 * `[label](/path)` / `**bold**` markup handled by InlineText.
 */
export default function RichTextBlock({ h2, paragraphs, list, cta }: Props) {
  if (!paragraphs.length) return null
  const paragraphClass = "text-gray-700 leading-relaxed [[data-theme=dark-industrial]_&]:text-slate-300"
  const bullets = list?.items.length ? (
    <ul key="list" className={`list-disc pl-6 space-y-1.5 ${paragraphClass}`}>
      {list.items.map((item, i) => (
        <li key={i}>
          <InlineText text={item} />
        </li>
      ))}
    </ul>
  ) : null
  return (
    <section className="py-12 md:py-16 [[data-theme=dark-industrial]_&]:py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 [[data-theme=dark-industrial]_&]:text-white">
          {h2}
        </h2>
        <div className="space-y-4">
          {bullets && list!.after <= 0 ? bullets : null}
          {paragraphs.flatMap((p, i) => [
            <p key={i} className={paragraphClass}>
              <InlineText text={p} />
            </p>,
            bullets && list!.after === i + 1 ? bullets : null,
          ])}
          {bullets && list!.after > paragraphs.length ? bullets : null}
        </div>
        {cta ? (
          <Link
            href={cta.href}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
