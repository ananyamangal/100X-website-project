import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import { getComparison, getAllComparisonSlugs, COMPARISONS } from "@/lib/comparisons/data"

export async function generateStaticParams() {
  return getAllComparisonSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) return { title: "Not Found" }
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${SITE_URL}/compare/${slug}` },
    openGraph: { title: c.title, description: c.metaDescription },
  }
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) notFound()

  const url = `${SITE_URL}/compare/${slug}`

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: c.metaDescription,
    url,
    datePublished: "2026-01-01",
    dateModified: "2026-05-30",
    author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  }

  const faqJsonLd = c.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null

  const related = COMPARISONS.filter(
    (r) => r.slug !== slug && r.tags.some((t) => c.tags.includes(t))
  ).slice(0, 3)

  const winnerA = c.verdictWinner === "a"
  const winnerB = c.verdictWinner === "b"

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-green-600">Compare</Link>
          <span className="mx-2">/</span>
          <span className="truncate max-w-xs inline-block align-bottom">{c.h1}</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {c.tags.map((tag) => (
            <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">{c.h1}</h1>
        <p className="text-gray-500 text-sm mb-6">
          By 100X Circle Pvt Ltd · {c.readTime} read · Updated May 2026
        </p>

        <p className="text-gray-700 leading-relaxed mb-8">{c.intro}</p>

        {/* Verdict Banner */}
        <div className={`rounded-xl p-5 mb-8 border ${c.verdictWinner === "depends" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${c.verdictWinner === "depends" ? "text-blue-700" : "text-green-700"}`}>
            {c.verdictWinner === "depends" ? "Verdict: Depends on Your Use Case" : `Verdict: ${c.verdictWinner === "a" ? c.aLabel : c.bLabel} Wins`}
          </p>
          <p className="text-gray-800 text-sm leading-relaxed">{c.verdict}</p>
        </div>

        {/* Comparison Table */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Side-by-Side Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="py-3 px-4 text-left font-medium w-40">Attribute</th>
                  <th className={`py-3 px-4 text-left font-medium ${winnerA ? "bg-green-800" : ""}`}>
                    {c.aLabel}
                    {winnerA && <span className="ml-2 text-xs">★ Recommended</span>}
                  </th>
                  <th className={`py-3 px-4 text-left font-medium ${winnerB ? "bg-green-800" : ""}`}>
                    {c.bLabel}
                    {winnerB && <span className="ml-2 text-xs">★ Recommended</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row, i) => (
                  <tr key={row.attribute} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2.5 px-4 font-medium text-gray-700 border-b border-gray-100 align-top">
                      {row.attribute}
                    </td>
                    <td className={`py-2.5 px-4 text-gray-700 border-b border-gray-100 align-top ${winnerA ? "text-green-800 font-medium" : ""}`}>
                      {row.a}
                    </td>
                    <td className={`py-2.5 px-4 text-gray-700 border-b border-gray-100 align-top ${winnerB ? "text-green-800 font-medium" : ""}`}>
                      {row.b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Strengths */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {c.aLabel} — Key Strengths
            </h2>
            <ul className="space-y-1.5">
              {c.aStrengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-gray-700">
                  <span className={winnerA ? "text-green-500" : "text-gray-400"}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {c.bLabel} — Key Strengths
            </h2>
            <ul className="space-y-1.5">
              {c.bStrengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-gray-700">
                  <span className={winnerB ? "text-green-500" : "text-gray-400"}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Who Should Buy */}
        <section className="mb-10 bg-gray-50 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-2">Who Should Buy What</h2>
          <p className="text-sm text-gray-700">{c.buyerProfile}</p>
        </section>

        {/* FAQs */}
        {c.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-5">
              {c.faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{faq.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10 text-sm">
          <p className="font-semibold text-green-800 mb-2">Ready to Buy? Get a Quote from 100X Circle</p>
          <p className="text-green-700 mb-3">
            100X Circle is India&apos;s leading OEM manufacturer of thermal fogging machines — ISO
            9001 certified, GeM-listed MSME, supplying to municipalities and farmers since 2014.
          </p>
          <div className="flex flex-wrap gap-4 text-green-800 font-medium">
            <span>📞 +91-7827229116</span>
            <span>✉ 100xcircle@gmail.com</span>
            <Link href="/products" className="underline hover:no-underline">Browse Products →</Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Comparisons</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/compare/${r.slug}`}
                  className="border border-gray-200 rounded-lg p-3 hover:border-green-400 transition-colors"
                >
                  <p className="font-medium text-gray-800 text-xs leading-snug">{r.h1}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.readTime}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
