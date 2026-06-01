import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import ShareButtons from "@/components/cinematic/ShareButtons"
import { Download, MessageCircle, CheckCircle2, Wrench, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

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
              {part.sku && <p className="text-cinema-500 text-xs font-600 mb-2 uppercase tracking-widest">SKU: {part.sku}</p>}
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

      {/* ── BACK NAV ─────────────────────────────────────────────── */}
      <div className="py-6 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
          <Link href={`/spare-parts/${productSlug}`} className="text-brand-600 hover:text-brand-700 text-sm font-500 flex items-center gap-1.5">
            ← All {productName} parts
          </Link>
        </div>
      </div>
    </>
  )
}
