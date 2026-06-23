export const revalidate = 300

import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { SITE_URL } from "@/lib/seo/site-config"
import { getProductCanonicalUrl } from "@/lib/seo/product-landing-map"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ArrowRight } from "lucide-react"

async function getCaseStudy(slug: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    return await db.collection("case_studies").findOne({ slug, published: true })
  } catch {
    return null
  }
}

async function getLinkedProducts(ids: string[], productUsed?: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    let products: any[] = []
    if (ids?.length) {
      const objectIds = ids.map(id => { try { return new ObjectId(id) } catch { return null } }).filter((x): x is import("mongodb").ObjectId => x !== null)
      if (objectIds.length) {
        products = await db.collection("products").find({ _id: { $in: objectIds } } as any).toArray()
      }
    }
    // Auto-match by product name if no explicit links
    if (!products.length && productUsed) {
      products = await db.collection("products")
        .find({ name: { $regex: productUsed.split(" ").slice(0, 3).join("|"), $options: "i" }, isPublished: { $ne: false } } as any)
        .limit(3).toArray()
    }
    // Fallback: return fogging machines (exclude trolleys/airport baggage)
    if (!products.length) {
      products = await db.collection("products")
        .find({ isPublished: { $ne: false }, name: { $not: /trolley|baggage|airport/i } } as any)
        .sort({ order: 1 }).limit(3).toArray()
    }
    return JSON.parse(JSON.stringify(products))
  } catch {
    return []
  }
}

async function getRelatedSpareParts(productUsed?: string) {
  if (!productUsed) return []
  try {
    const client = await clientPromise
    const db = client.db()
    const parts = await db.collection("spare_parts")
      .find({ compatibleProductNames: { $regex: productUsed.split(" ").slice(0, 2).join("|"), $options: "i" } } as any)
      .limit(4).toArray()
    if (parts.length) return JSON.parse(JSON.stringify(parts))
    // Generic fallback — any fogging-related parts
    const fallback = await db.collection("spare_parts")
      .find({} as any).sort({ order: 1 }).limit(4).toArray()
    return JSON.parse(JSON.stringify(fallback))
  } catch {
    return []
  }
}

async function getRelatedGovSupplies(state?: string, product?: string) {
  if (!state && !product) return []
  try {
    const client = await clientPromise
    const db = client.db()
    const filter: any = { isPublic: true }
    if (state) filter.state = state
    const docs = await db.collection("gov_past_performance")
      .find(filter).sort({ orderYear: -1 }).limit(4).toArray()
    return JSON.parse(JSON.stringify(docs))
  } catch {
    return []
  }
}

async function getRelatedDeployments(state?: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    const filter: any = {}
    if (state) filter.location = { $regex: state, $options: "i" }
    const docs = await db.collection("deployments")
      .find(filter).sort({ createdAt: -1 }).limit(3).toArray()
    return JSON.parse(JSON.stringify(docs))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cs = await getCaseStudy(slug)
  if (!cs) return { title: "Case Study Not Found" }
  const title = `${cs.customer || cs.title} — ${cs.state || cs.department || "India"} | 100x Circle Case Study`
  const description = (cs.problem || cs.solution || "").slice(0, 155)
  const image = cs.images?.[0]
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/case-studies/${cs.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/case-studies/${cs.slug}`,
      type: "article",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: cs.title }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  }
}

export default async function CaseStudyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cs = await getCaseStudy(slug)
  if (!cs) notFound()
  const [linkedProducts, relatedSpareParts, relatedGovSupplies, relatedDeployments] = await Promise.all([
    getLinkedProducts(cs.linkedProductIds || [], cs.productUsed),
    getRelatedSpareParts(cs.productUsed),
    getRelatedGovSupplies(cs.state, cs.productUsed),
    getRelatedDeployments(cs.state),
  ])

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cs.title,
    description: cs.problem || cs.solution || "",
    image: cs.images?.[0] ? [cs.images[0]] : [],
    datePublished: cs.createdAt ? new Date(cs.createdAt).toISOString() : undefined,
    dateModified: cs.updatedAt ? new Date(cs.updatedAt).toISOString() : undefined,
    author: { "@type": "Organization", name: "100X Circle", url: SITE_URL },
    publisher: { "@type": "Organization", name: "100X Circle", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-main.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/case-studies/${cs.slug}` },
    about: cs.customer ? { "@type": "Organization", name: cs.customer } : undefined,
    locationCreated: cs.state ? { "@type": "Place", name: cs.state, addressCountry: "IN" } : undefined,
    keywords: [cs.industry, cs.state, cs.department, cs.productUsed, "thermal fogging machine", "100X Circle"].filter(Boolean).join(", "),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Case Studies", url: "/case-studies" },
          { name: cs.customer || cs.title, url: `/case-studies/${cs.slug}` },
        ]}
      />
    <main className="max-w-3xl mx-auto px-4 py-16 pt-28">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/case-studies" className="hover:text-brand-600">Case Studies</Link>
        <span className="mx-2">/</span>
        <span className="truncate">{cs.title}</span>
      </nav>

      {cs.isSample && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-medium">
          Sample Case Study – Demonstration Content. This is a representative example, not a verified customer case.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {cs.industry && <span className="text-xs bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-medium">{cs.industry}</span>}
        {cs.state && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{cs.state}</span>}
        {cs.city && <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{cs.city}</span>}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{cs.title}</h1>
      {cs.customer && (
        <p className="text-brand-700 font-medium mb-6">{cs.customer}
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
              return <a key={i} href={url} className="text-brand-600 underline text-sm">Video {i + 1}</a>
            })}
          </div>
        </section>
      )}

      {/* Downloadable PDF */}
      {cs.pdfUrl && (
        <div className="mt-6 p-4 bg-brand-50 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 text-sm">Download Case Study</p>
            <p className="text-xs text-gray-500">Full report available as PDF</p>
          </div>
          <a
            href={cs.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Download PDF
          </a>
        </div>
      )}

      {/* Linked Products */}
      {linkedProducts.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="font-700 text-gray-900 text-lg mb-4">Products Used in This Deployment</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {linkedProducts.map((p: any) => {
              const img = p.imageUrls?.[0] || p.imageUrl
              return (
                <Link
                  key={p._id}
                  href={getProductCanonicalUrl(String(p.slug || p._id))}
                  className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition-all"
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="w-16 h-16 object-contain bg-gray-50 rounded-lg shrink-0 p-1" />
                  )}
                  <div className="min-w-0 flex-1">
                    {p.category && <p className="eyebrow text-brand-600 mb-0.5">{p.category}</p>}
                    <p className="font-600 text-gray-900 text-sm truncate group-hover:text-brand-700 transition-colors">{p.name}</p>
                    <span className="inline-flex items-center gap-1 text-brand-600 text-xs font-500 mt-1 group-hover:gap-1.5 transition-all">
                      View Product <ArrowRight size={11} />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Related Spare Parts */}
      {relatedSpareParts.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="font-700 text-gray-900 text-lg mb-4">Related Spare Parts &amp; Accessories</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedSpareParts.map((p: any) => {
              const img = p.images?.[0]
              const partSlug = p.slug || String(p._id)
              const productName = p.compatibleProductNames?.[0]
              const href = productName
                ? `/spare-parts/${productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${partSlug}`
                : `/spare-parts/${(p.category || "parts").toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${partSlug}`
              return (
                <Link key={p._id} href={href}
                  className="group flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-brand-200 hover:bg-white hover:shadow-sm transition-all">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="w-12 h-12 object-contain bg-white rounded-lg shrink-0 p-1 border border-gray-100" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="text-gray-500 text-lg">⚙️</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{p.category || "Spare Part"}</p>
                    <p className="text-sm font-600 text-gray-900 leading-snug group-hover:text-brand-700">{p.name}</p>
                    {p.priceRange && <p className="text-xs text-brand-600 font-600 mt-0.5">{p.priceRange}</p>}
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-gray-400 group-hover:text-brand-600 transition-colors" />
                </Link>
              )
            })}
          </div>
          <div className="mt-3">
            <Link href="/spare-parts" className="text-xs text-brand-600 hover:text-brand-700 font-500 transition-colors">
              View all spare parts →
            </Link>
          </div>
        </section>
      )}

      {/* Related Government Supplies */}
      {relatedGovSupplies.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="font-700 text-gray-900 text-lg mb-4">Related Government Procurement Records</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedGovSupplies.map((r: any) => (
              <div key={r._id} className={`rounded-xl p-4 border ${r.verified ? "border-brand-200 bg-brand-50" : "border-gray-100 bg-gray-50"}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-700 text-gray-800 leading-snug">{r.organization}</p>
                  {r.verified && <span className="text-[10px] bg-brand-100 text-brand-700 font-700 px-1.5 py-0.5 rounded-full shrink-0">★ Verified</span>}
                </div>
                {r.department && <p className="text-[11px] text-gray-500 mb-1">{r.department}</p>}
                {r.product && <p className="text-[11px] text-brand-600 font-600">{r.product}</p>}
                <div className="flex gap-2 mt-1.5">
                  {r.state && <span className="text-[10px] text-gray-400">{r.state}</span>}
                  {r.orderYear && <span className="text-[10px] text-gray-400">· {r.orderYear}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link href="/past-performance-government" className="text-xs text-brand-600 hover:text-brand-700 font-500 transition-colors">
              View full past performance record →
            </Link>
          </div>
        </section>
      )}

      {/* Related Deployments */}
      {relatedDeployments.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="font-700 text-gray-900 text-lg mb-4">Related Deployments</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {relatedDeployments.map((d: any) => (
              <Link key={d._id} href="/deployments"
                className="group rounded-xl overflow-hidden border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all">
                {d.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.images[0]} alt={d.location || "Deployment"} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                )}
                <div className="p-3">
                  {d.location && <p className="text-xs font-700 text-gray-700">{d.location}</p>}
                  {d.department && <p className="text-[11px] text-brand-600 font-600 mt-0.5">{d.department}</p>}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-3">
            <Link href="/deployments" className="text-xs text-brand-600 hover:text-brand-700 font-500 transition-colors">
              View all deployments →
            </Link>
          </div>
        </section>
      )}

      {/* CTAs */}
      <div className="mt-10 pt-8 border-t border-gray-100 bg-brand-50 rounded-xl p-5">
        <h3 className="font-700 text-gray-900 text-base mb-3">Ready for similar results?</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/fogging-machine-government-procurement"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm transition-colors">
            Government Procurement Guide
          </Link>
          <Link href="/gem-approved-fogging-machine-oem"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-brand-300 text-brand-700 hover:bg-brand-100 rounded-full text-sm font-600 transition-colors">
            Dealer Partnership Program
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/case-studies" className="text-brand-600 hover:text-brand-700 text-sm font-500 transition-colors">
          ← Back to all case studies
        </Link>
      </div>
    </main>
    </>
  )
}
