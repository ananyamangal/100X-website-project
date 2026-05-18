import Link from "next/link"

/**
 * Block types for legal-page sections. Constrained on purpose: legal
 * pages only need paragraphs + bullet lists. Adding more block kinds
 * later (definitions, tables, etc.) is cheap.
 */
type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }

export type LegalSection = {
  /** h2 heading text. */
  heading: string
  /** Optional numbering prefix shown before the heading (e.g. "1."). */
  number?: string
  blocks: Block[]
}

export type LegalContact = {
  /** Lead line — usually the legal entity name. */
  entity: string
  lines: string[]
}

type Props = {
  title: string
  /** One or more lead paragraphs rendered above the numbered sections. */
  intro: string[]
  sections: LegalSection[]
  /** Optional Contact-Us block rendered at the bottom (typically section 10/11). */
  contact?: LegalContact
  /** Render under the title in muted text — e.g. "Last updated: 17 May 2026". */
  lastUpdated?: string
}

function renderBlock(block: Block, key: number) {
  if (block.kind === "p") {
    return (
      <p key={key} className="text-gray-700 leading-relaxed">
        {block.text}
      </p>
    )
  }
  return (
    <ul key={key} className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
      {block.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * Long-form legal page renderer. Used by /privacy-policy and
 * /terms-and-conditions. Single column, generous line-height, reading
 * width capped to ~720px so legal copy stays scannable.
 *
 * No CTAs in the body. One "Back to Home" link at the bottom for
 * navigational recovery only — keep it un-pushy.
 */
export default function LegalPage({
  title,
  intro,
  sections,
  contact,
  lastUpdated,
}: Props) {
  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h1>
          {lastUpdated ? (
            <p className="mt-2 text-sm text-gray-500">{lastUpdated}</p>
          ) : null}
        </header>

        <div className="space-y-5 mb-12">
          {intro.map((p, i) => (
            <p key={i} className="text-gray-700 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={i} aria-labelledby={`legal-section-${i}`} className="scroll-mt-32">
              <h2
                id={`legal-section-${i}`}
                className="text-xl md:text-2xl font-bold text-gray-900 mb-4"
              >
                {section.number ? (
                  <span className="text-gray-400 mr-2 font-semibold">{section.number}</span>
                ) : null}
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((b, bi) => renderBlock(b, bi))}
              </div>
            </section>
          ))}

          {contact ? (
            <section
              aria-labelledby="legal-contact"
              className="rounded-2xl border border-gray-200 bg-white p-6 md:p-7"
            >
              <h2
                id="legal-contact"
                className="text-xl md:text-2xl font-bold text-gray-900 mb-3"
              >
                Contact
              </h2>
              <p className="font-semibold text-gray-900">{contact.entity}</p>
              <ul className="mt-2 space-y-1 text-gray-700 leading-relaxed list-none">
                {contact.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <p className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-green-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}
