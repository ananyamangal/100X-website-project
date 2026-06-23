import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import ShareButtons from "@/components/cinematic/ShareButtons"
import { Download, MessageCircle, CheckCircle2, Wrench, ArrowRight } from "lucide-react"

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ product: string; part: string }>
}): Promise<Metadata> {
  const { product: productSlug, part: partSlug } = await params
  const client = await clientPromise
  const part = await client.db().collection("spare_parts").findOne({ slug: partSlug, isPublished: true })
  if (!part) return { title: "Spare Part | 100X Circle" }

  const partName = String(part.name)
  const productName = productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const desc = String(part.description || `Genuine OEM ${partName} spare part for ${productName} fogging machine.`).slice(0, 155)

  return {
    title: `${partName} for ${productName} | 100X Circle Spare Parts`,
    description: desc,
    alternates: { canonical: `/spare-parts/${productSlug}/${partSlug}` },
    openGraph: {
      title: `${partName} | 100X Circle`,
      description: desc,
      images: part.images?.[0] ? [{ url: part.images[0] }] : [],
    },
  }
}

export default async function SparePartDetailPage({
  params,
}: {
  params: Promise<{ product: string; part: string }>
}) {
  const { product: productSlug, part: partSlug } = await params
  const client = await clientPromise
  const db = client.db()

  const partRaw = await db.collection("spare_parts").findOne({ slug: partSlug, isPublished: true })
  if (!partRaw) notFound()

  const part: any = JSON.parse(JSON.stringify(partRaw))
  const productName = productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  // Fetch related and frequently-bought-together parts
  const relatedSlugs: string[] = Array.isArray(part.relatedParts) ? part.relatedParts.filter(Boolean).slice(0, 6) : []
  const fbtSlugs: string[] = Array.isArray(part.frequentlyBoughtTogether) ? part.frequentlyBoughtTogether.filter(Boolean).slice(0, 4) : []
  const allReferencedSlugs = [...new Set([...relatedSlugs, ...fbtSlugs])]

  const referencedPartsRaw = allReferencedSlugs.length > 0
    ? await db.collection("spare_parts").find({ slug: { $in: allReferencedSlugs }, isPublished: true }).toArray()
    : []
  const referencedParts = JSON.parse(JSON.stringify(referencedPartsRaw))

  // Trust graph: find related products and case studies
  const compatibleNames: string[] = Array.isArray(part.compatibleProductNames) ? part.compatibleProductNames : []
  const [relatedProductsRaw, relatedCaseStudiesRaw] = await Promise.all([
    compatibleNames.length > 0
      ? db.collection("products").find({
          isPublished: { $ne: false },
          name: { $regex: compatibleNames[0].split(" ").slice(0, 2).join("|"), $options: "i" },
        }).limit(3).toArray()
      : Promise.resolve([]),
    db.collection("case_studies").find({
      published: true,
      $or: [
        ...(compatibleNames.length > 0 ? [{ productUsed: { $regex: compatibleNames[0].split(" ").slice(0, 2).join("|"), $options: "i" } }] : []),
        ...(part.name ? [{ productUsed: { $regex: part.name.split(" ").slice(0, 1).join(""), $options: "i" } }] : []),
      ],
    }).limit(3).toArray(),
  ])
  const relatedProducts = JSON.parse(JSON.stringify(relatedProductsRaw))
  const relatedCaseStudies = JSON.parse(JSON.stringify(relatedCaseStudiesRaw))
  const partBySlug: Record<string, any> = {}
  for (const p of referencedParts) partBySlug[p.slug] = p

  function buildUrl(p: any): string {
    const pn = p.compatibleProductNames?.[0]
    if (pn) {
      const ps = pn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      return `/spare-parts/${ps}/${p.slug}`
    }
    return `/spare-parts/${productSlug}/${p.slug}`
  }

  const relatedPartsData = relatedSlugs.map((s) => partBySlug[s]).filter(Boolean)
  const fbtPartsData = fbtSlugs.map((s) => partBySlug[s]).filter(Boolean)

  const waText = `Hi, I need the spare part "${part.name}" for my ${productName}. Please share pricing.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  // Product schema for this spare part
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    description: part.description || `Genuine OEM spare part for ${productName} by 100X Circle`,
    sku: part.sku || partSlug,
    brand: { "@type": "Brand", name: "100X Circle" },
    image: part.images?.[0] ? [part.images[0]] : [],
    offers: part.priceRange
      ? { "@type": "Offer", priceCurrency: "INR", priceSpecification: { "@type": "UnitPriceSpecification", price: part.priceRange } }
      : undefined,
    isRelatedTo: part.compatibleProductNames?.map((n: string) => ({ "@type": "Product", name: n })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Spare Parts", url: "/spare-parts" },
          { name: productName, url: `/spare-parts/${productSlug}` },
          { name: part.name, url: `/spare-parts/${productSlug}/${partSlug}` },
        ]}
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-gray-950 pt-24 pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8 flex-wrap">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/spare-parts" className="hover:text-cinema-300 transition-colors">Spare Parts</Link>
            <span>/</span>
            <Link href={`/spare-parts/${productSlug}`} className="hover:text-cinema-300 transition-colors">{productName}</Link>
            <span>/</span>
            <span className="text-cinema-300">{part.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Images */}
            <div>
              {part.images?.length > 0 ? (
                <div className="rounded-2xl overflow-hidden bg-white aspect-[4/3] flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={part.images[0]} alt={part.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl bg-cinema-800 aspect-[4/3] flex items-center justify-center">
                  <Wrench size={48} className="text-cinema-600" />
                </div>
              )}
              {part.images?.length > 1 && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  {part.images.slice(1, 5).map((img: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt={`${part.name} ${i + 2}`} className="w-16 h-16 rounded-lg object-contain bg-white p-2 border border-cinema-700" loading="lazy" />
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {part.category && <p className="eyebrow text-brand-400 mb-3">{part.category}</p>}
              <div className="flex items-center gap-3 flex-wrap mb-2">
                {part.sku && <p className="text-cinema-500 text-xs font-600 uppercase tracking-widest">SKU: {part.sku}</p>}
                {part.oemPartNumber && <p className="text-cinema-500 text-xs font-600 uppercase tracking-widest">OEM: {part.oemPartNumber}</p>}
                {part.inventoryStatus && part.inventoryStatus !== "in_stock" && (
                  <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${part.inventoryStatus === "out_of_stock" ? "bg-red-900/40 text-red-400" : part.inventoryStatus === "discontinued" ? "bg-gray-800 text-cinema-500" : "bg-amber-900/40 text-amber-400"}`}>
                    {part.inventoryStatus === "out_of_stock" ? "Out of Stock" : part.inventoryStatus === "on_order" ? "On Order" : "Discontinued"}
                  </span>
                )}
                {(!part.inventoryStatus || part.inventoryStatus === "in_stock") && (
                  <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">In Stock</span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">{part.name}</h1>

              {part.priceRange && <p className="text-2xl font-800 text-brand-400 mb-5">{part.priceRange}</p>}

              {part.description && (
                <p className="text-cinema-300 text-base leading-relaxed mb-6">{part.description}</p>
              )}

              {/* Compatible Products */}
              {part.compatibleProductNames?.length > 0 && (
                <div className="mb-6 bg-cinema-800/60 rounded-xl p-4">
                  <p className="text-cinema-400 text-xs font-600 uppercase tracking-wide mb-2">Compatible With</p>
                  <div className="flex flex-wrap gap-2">
                    {part.compatibleProductNames.map((name: string, i: number) => (
                      <span key={i} className="text-xs font-500 text-white bg-cinema-700 px-3 py-1 rounded-full">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full transition-all text-sm shadow-lg shadow-brand-900/30">
                  <MessageCircle size={15} /> Order via WhatsApp
                </a>
                <Link href="/contact-us" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-white/20 hover:border-white/40 text-white font-500 rounded-full transition-all text-sm hover:bg-white/5">
                  Enquire Now
                </Link>
              </div>

              {/* Downloads */}
              {part.downloads?.length > 0 && (
                <div className="space-y-2 mb-6">
                  {part.downloads.map((d: any, i: number) => (
                    <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cinema-400 hover:text-brand-400 transition-colors text-sm">
                      <Download size={14} /> {d.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Share */}
              <div className="pt-5 border-t border-white/8">
                <ShareButtons
                  url={`${SITE_URL}/spare-parts/${productSlug}/${partSlug}`}
                  title={`${part.name} spare part for ${productName} — 100X Circle`}
                  variant="dark"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPECIFICATIONS ───────────────────────────────────────── */}
      {part.specifications?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <ScrollReveal animation="fade-up">
              <h2 className="text-2xl font-700 text-gray-900 mb-6">Specifications</h2>
              <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                {part.specifications.map((spec: string, i: number) => {
                  const [label, ...rest] = spec.split(":")
                  const value = rest.join(":").trim()
                  return (
                    <div key={i} className={`flex items-center justify-between px-5 py-3.5 gap-4 ${i !== part.specifications.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <span className="text-gray-500 text-sm">{label.trim()}</span>
                      <span className="text-gray-900 font-600 text-sm">{value || spec}</span>
                    </div>
                  )
                })}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── FREQUENTLY BOUGHT TOGETHER ───────────────────────────── */}
      {fbtPartsData.length > 0 && (
        <section className="py-14 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up">
              <p className="eyebrow text-brand-400 mb-2">Often ordered together</p>
              <h2 className="text-xl font-700 text-white mb-6">Frequently Bought Together</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {fbtPartsData.map((p: any) => (
                  <a key={p._id} href={buildUrl(p)} className="group flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-brand-500/40 hover:bg-white/8 transition-all">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-14 h-14 object-contain bg-white rounded-lg p-1 flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-14 h-14 bg-cinema-800 rounded-lg flex items-center justify-center flex-shrink-0"><Wrench size={18} className="text-cinema-600" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-cinema-500 mb-0.5">{p.category || "Spare Part"}</p>
                      <p className="text-sm font-600 text-white leading-snug group-hover:text-brand-400 transition-colors line-clamp-2">{p.name}</p>
                      {p.priceRange && <p className="text-xs text-brand-400 font-600 mt-1">{p.priceRange}</p>}
                    </div>
                  </a>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── RELATED SPARE PARTS ──────────────────────────────────── */}
      {relatedPartsData.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal animation="fade-up">
              <p className="eyebrow text-brand-600 mb-2">Same assembly group</p>
              <h2 className="text-xl font-700 text-gray-900 mb-6">Related Spare Parts</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedPartsData.map((p: any) => (
                  <a key={p._id} href={buildUrl(p)} className="group flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:border-brand-200 hover:shadow-sm transition-all">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-14 h-14 object-contain bg-gray-50 rounded-lg p-1 flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Wrench size={18} className="text-gray-400" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{p.category || "Spare Part"}</p>
                      <p className="text-sm font-600 text-gray-900 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">{p.name}</p>
                      {p.priceRange && <p className="text-xs text-brand-600 font-600 mt-1">{p.priceRange}</p>}
                    </div>
                    <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── TRUST GRAPH: Compatible Products ─────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="py-14 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow text-brand-600 mb-2">Compatible Machines</p>
            <h2 className="text-xl font-700 text-gray-900 mb-6">Machines this part fits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((p: any) => {
                const pSlug = p.slug || String(p._id)
                const img = (Array.isArray(p.imageUrls) ? p.imageUrls[0] : null) || p.imageUrl
                return (
                  <Link key={p._id} href={`/products/${pSlug}`}
                    className="group flex items-center gap-4 border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:shadow-sm transition-all">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.name} className="w-16 h-16 object-contain bg-gray-50 rounded-lg p-1 flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">🔧</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{p.category || "Fogging Machine"}</p>
                      <p className="text-sm font-700 text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-2">{p.name}</p>
                      <p className="text-xs text-brand-600 mt-1 font-600">View product →</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST GRAPH: Related Case Studies ──────────────────────── */}
      {relatedCaseStudies.length > 0 && (
        <section className="py-14 bg-gray-50 border-t border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow text-brand-600 mb-2">Government Deployments</p>
            <h2 className="text-xl font-700 text-gray-900 mb-6">Government case studies using compatible machines</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedCaseStudies.map((s: any) => (
                <Link key={s._id} href={`/case-studies/${s.slug}`}
                  className="group border border-gray-200 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all bg-white">
                  {s.images?.[0] && (
                    <div className="h-32 overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-xs text-brand-600 font-600 mb-1">{s.state || s.department || "India"}</p>
                    <p className="text-sm font-700 text-gray-900 line-clamp-2 group-hover:text-brand-700 transition-colors">{s.customer || s.title}</p>
                    <p className="text-xs text-gray-400 mt-2">Read deployment story →</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/case-studies" className="text-sm font-600 text-brand-600 hover:text-brand-700">
                View all case studies →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── BACK NAV ─────────────────────────────────────────────── */}
      <div className="py-6 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
          <Link href={`/spare-parts/${productSlug}`} className="text-brand-600 hover:text-brand-700 text-sm font-500 flex items-center gap-1.5">
            ← All {productName} parts
          </Link>
          <Link href="/products" className="text-gray-500 hover:text-gray-700 text-sm font-500">
            View all products
          </Link>
          <Link href="/case-studies" className="text-gray-500 hover:text-gray-700 text-sm font-500">
            Government case studies
          </Link>
        </div>
      </div>
    </>
  )
}
