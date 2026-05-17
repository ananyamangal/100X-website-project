type Props = {
  h2: string
  paragraphs: string[]
}

/**
 * Plain heading + paragraph block. Used by the back-compat path for the
 * existing product landings (content1/2/3) and by any new landing that
 * just wants a narrative section.
 */
export default function RichTextBlock({ h2, paragraphs }: Props) {
  if (!paragraphs.length) return null
  return (
    <section className="py-12 md:py-16 [[data-theme=dark-industrial]_&]:py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 [[data-theme=dark-industrial]_&]:text-white">
          {h2}
        </h2>
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-gray-700 leading-relaxed [[data-theme=dark-industrial]_&]:text-slate-300"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
