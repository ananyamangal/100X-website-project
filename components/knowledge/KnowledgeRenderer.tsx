import { Fragment } from "react"
import Link from "next/link"
import InlineText, { inlineToPlainText } from "@/components/landing/InlineText"
import { SITE_URL } from "@/lib/seo/site-config"
import type {
  KnowledgeArticle,
  KnowledgeBlock,
  KnowledgeFaq,
  CalloutBlock,
} from "@/lib/knowledge/types"

const MAX_WIDTH: Record<KnowledgeArticle["maxWidth"], string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
}

const CALLOUT_CLASS: Record<CalloutBlock["variant"], string> = {
  keyfact: "bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700",
  info: "bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 text-sm text-gray-700",
  note: "bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 text-sm text-gray-700",
  warning: "bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-sm text-gray-800",
  success: "bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-sm text-gray-800",
}

/** Build the FAQPage JSON-LD from the single faqs array (schema side). */
export function buildFaqJsonLd(faqs: KnowledgeFaq[]) {
  const entries = faqs.filter((f) => f.schemaAnswer != null && f.schemaAnswer !== "")
  if (entries.length === 0) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: inlineToPlainText(f.schemaAnswer as string),
      },
    })),
  }
}

function Callout({ block }: { block: CalloutBlock }) {
  return (
    <div className={CALLOUT_CLASS[block.variant]}>
      {block.label ? <strong>{block.label}:</strong> : null}
      {block.label ? " " : null}
      <InlineText text={block.text} linkClassName="text-brand-700 underline underline-offset-2 hover:text-brand-600" />
    </div>
  )
}

function Block({ block }: { block: KnowledgeBlock }) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>
    case "paragraph":
      return (
        <p>
          <InlineText text={block.text} linkClassName="" />
        </p>
      )
    case "list": {
      const items = block.items.map((it, i) => (
        <li key={i}>
          <InlineText text={it} linkClassName="" />
        </li>
      ))
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>
    }
    case "table":
      return (
        <table className="text-sm w-full border-collapse mt-2 mb-4">
          <thead>
            <tr className="bg-gray-50">
              {block.columns.map((c, i) => (
                <th
                  key={i}
                  className={`py-2 px-3 border border-gray-200 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                >
                  {c.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-200">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-2 px-3 text-gray-800 ${block.columns[ci]?.align === "right" ? "text-right" : block.columns[ci]?.align === "center" ? "text-center" : ""}`}
                  >
                    <InlineText text={cell} linkClassName="" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case "callout":
      return <Callout block={block} />
    default:
      return null
  }
}

export default function KnowledgeRenderer({ article }: { article: KnowledgeArticle }) {
  const faqJsonLd = buildFaqJsonLd(article.faqs)
  const visibleFaqs = article.faqs.filter((f) => f.visibleAnswer != null && f.visibleAnswer !== "")
  const hasFaqMarker = article.blocks.some((b) => b.type === "faq")
  const faqSection =
    visibleFaqs.length > 0 ? (
      <>
        <h2>{article.faqHeading ?? "Frequently Asked Questions"}</h2>
        {visibleFaqs.map((f, i) => (
          <Fragment key={i}>
            <h3>{f.visibleQuestion ?? f.question}</h3>
            <p>
              <InlineText text={f.visibleAnswer as string} linkClassName="" />
            </p>
          </Fragment>
        ))}
      </>
    ) : null
  const graphs = Array.isArray(article.structuredData)
    ? article.structuredData
    : article.structuredData
      ? [article.structuredData]
      : []

  return (
    <>
      {graphs.map((g, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(g) }}
        />
      ))}
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <main className={`${MAX_WIDTH[article.maxWidth]} mx-auto px-4 py-16 pt-32`}>
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-brand-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>{article.breadcrumbLabel ?? article.title}</span>
        </nav>

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((tag) => (
              <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.h1}</h1>
        <p className="text-gray-500 text-sm mb-8">
          By {article.byline.author} · {article.byline.readTime} · {article.byline.updatedLabel}
        </p>

        {article.heroCallout ? <Callout block={article.heroCallout} /> : null}

        <article className="prose prose-gray max-w-none">
          {article.blocks.map((b, i) => (
            <Fragment key={i}>{b.type === "faq" ? faqSection : <Block block={b} />}</Fragment>
          ))}

          {hasFaqMarker ? null : faqSection}
        </article>

        {article.relatedArticles && article.relatedArticles.length > 0 ? (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {article.relatedArticles.map((r) => {
                const href = r.href ?? `/knowledge/${r.slug}`
                return (
                  <Link
                    key={href}
                    href={href}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
                  >
                    <p className="font-medium text-gray-800 text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.blurb}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        {article.aboutAuthor ? (
          <div className="mt-8 bg-gray-50 rounded-xl p-5 text-sm">
            <p className="font-semibold text-gray-700 mb-2">About the Author</p>
            <p className="text-gray-600">{article.aboutAuthor}</p>
          </div>
        ) : null}
      </main>
    </>
  )
}

export { SITE_URL }
