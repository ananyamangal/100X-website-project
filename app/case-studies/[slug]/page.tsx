import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"

async function getCaseStudy(slug: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    return await db.collection("case_studies").findOne({ slug, published: true })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cs = await getCaseStudy(params.slug)
  if (!cs) return { title: "Case Study Not Found" }
  return {
    title: `${cs.title} | 100x Circle Case Study`,
    description: cs.problem || cs.solution || "",
    alternates: { canonical: `${SITE_URL}/case-studies/${cs.slug}` },
  }
}

export default async function CaseStudyDetailPage({ params }: { params: { slug: string } }) {
  const cs = await getCaseStudy(params.slug)
  if (!cs) notFound()

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 pt-28">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-green-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/case-studies" className="hover:text-green-600">Case Studies</Link>
        <span className="mx-2">/</span>
        <span className="truncate">{cs.title}</span>
      </nav>

      {cs.isSample && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-medium">
          Sample Case Study – Demonstration Content. This is a representative example, not a verified customer case.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {cs.industry && <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">{cs.industry}</span>}
        {cs.state && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{cs.state}</span>}
        {cs.city && <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{cs.city}</span>}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{cs.title}</h1>
      {cs.customer && (
        <p className="text-green-700 font-medium mb-6">{cs.customer}
          {cs.department ? ` — ${cs.department}` : ""}
        </p>
      )}

      {/* Images */}
      {cs.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {cs.images.slice(0, 4).map((img: string, i: number) => (
            <img key={i} src={img} alt={`${cs.title} image ${i + 1}`} className="rounded-xl w-full h-48 object-cover" />
          ))}
        </div>
      )}

      {/* Key Details */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8 text-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          {cs.productUsed && <div><span className="text-gray-500">Product:</span> <strong>{cs.productUsed}</strong></div>}
          {cs.industry && <div><span className="text-gray-500">Industry:</span> <strong>{cs.industry}</strong></div>}
          {cs.state && <div><span className="text-gray-500">State:</span> <strong>{cs.state}</strong></div>}
          {cs.city && <div><span className="text-gray-500">City:</span> <strong>{cs.city}</strong></div>}
        </div>
      </div>

      {/* Problem */}
      {cs.problem && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">The Challenge</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cs.problem}</p>
        </section>
      )}

      {/* Solution */}
      {cs.solution && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">The Solution</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cs.solution}</p>
        </section>
      )}

      {/* Results */}
      {cs.results && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Results</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cs.results}</p>
        </section>
      )}

      {/* Testimonial */}
      {cs.testimonial && (
        <blockquote className="border-l-4 border-green-500 pl-5 my-8 italic text-gray-700">
          <p className="mb-2">&ldquo;{cs.testimonial}&rdquo;</p>
          {cs.customer && <cite className="not-italic text-sm text-gray-500">— {cs.customer}</cite>}
        </blockquote>
      )}

      {/* Videos */}
      {cs.videos?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Video Coverage</h2>
          <div className="grid gap-4">
            {cs.videos.map((url: string, i: number) => {
              const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
              if (ytMatch) {
                return (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                      title={`Video ${i + 1}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )
              }
              return <a key={i} href={url} className="text-green-600 underline text-sm">Video {i + 1}</a>
            })}
          </div>
        </section>
      )}

      {/* Downloadable PDF */}
      {cs.pdfUrl && (
        <div className="mt-6 p-4 bg-green-50 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 text-sm">Download Case Study</p>
            <p className="text-xs text-gray-500">Full report available as PDF</p>
          </div>
          <a
            href={cs.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Download PDF
          </a>
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-gray-100">
        <Link href="/case-studies" className="text-green-600 hover:underline text-sm font-medium">
          ← Back to all case studies
        </Link>
      </div>
    </main>
  )
}
