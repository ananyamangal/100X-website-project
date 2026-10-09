import type { Metadata } from "next"
import Link from "next/link"
import { Fragment, type ReactNode } from "react"
import { SITE_URL } from "@/lib/seo/site-config"
import { ORGANIZATION_ID } from "@/lib/seo/organization"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import AnswerSummary from "@/components/seo/AnswerSummary"
import type { GuidePageDef } from "@/lib/seo/procurement-guides"

/**
 * Renderer for the E5 procurement guides (lib/seo/procurement-guides.ts).
 * The visible FAQ and the FAQPage JSON-LD are built from the same array, so
 * they always match.
 */

export function guideMetadata(g: GuidePageDef): Metadata {
  const url = `${SITE_URL}${g.path}`
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: url },
    openGraph: {
      title: g.title,
      description: g.description,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "article",
      images: [{ url: `${SITE_URL}/logo-main.png` }],
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  }
}

/** Renders "[text](/path)" as internal links; everything else as plain text. */
function withLinks(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <Link key={i++} href={m[2]} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
        {m[1]}
      </Link>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, k) => <Fragment key={k}>{p}</Fragment>)
}

const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

export default function GuidePage({ guide: g }: { guide: GuidePageDef }) {
  const url = `${SITE_URL}${g.path}`
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
    })),
  }
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.h1,
    description: g.description,
    mainEntityOfPage: url,
    url,
    datePublished: g.datePublished,
    dateModified: g.dateModified,
    inLanguage: "en-IN",
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    image: `${SITE_URL}/logo-main.png`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Dealers & Government", url: "/dealers-and-government" },
          { name: g.breadcrumbLabel, url: g.path },
        ]}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/dealers-and-government" className="hover:text-brand-600">Dealers &amp; Government</Link>
          <span className="mx-2">/</span>
          <span>{g.breadcrumbLabel}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{g.h1}</h1>

        <AnswerSummary summary={g.summary} updated={g.dateModified} className="mb-10" />

        {g.sections.map((s) => (
          <section key={s.h2} className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{s.h2}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed mb-3">{withLinks(p)}</p>
            ))}
            {s.list?.length ? (
              s.ordered ? (
                <ol className="list-decimal pl-6 space-y-2 text-gray-700 leading-relaxed mb-3">
                  {s.list.map((li, i) => <li key={i}>{withLinks(li)}</li>)}
                </ol>
              ) : (
                <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed mb-3">
                  {s.list.map((li, i) => <li key={i}>{withLinks(li)}</li>)}
                </ul>
              )
            ) : null}
            {s.after?.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed mb-3">{withLinks(p)}</p>
            ))}
          </section>
        ))}

        <section className="mb-10" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="text-2xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-5">
            {g.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-gray-900 mb-1">{f.q}</h3>
                <p className="text-gray-700 leading-relaxed">{withLinks(f.a)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-xl bg-brand-600 p-6 text-white">
          <h2 className="font-bold text-xl mb-2">Need a quotation or tender documents?</h2>
          <p className="text-brand-100 text-sm mb-4">
            Tell us the models and quantity. We respond within 24 hours on working days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50"
            >
              Request a quote
            </Link>
            <Link
              href="/oem-authorization-letter"
              className="inline-flex items-center justify-center border border-white/60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-white/10"
            >
              OEM authorization letter
            </Link>
          </div>
        </section>

        <nav aria-label="Related pages" className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Related pages</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {g.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="text-brand-700 hover:underline">{r.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  )
}
