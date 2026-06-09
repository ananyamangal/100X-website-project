import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ArrowRight, Wrench, MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 120

export async function generateMetadata({ params }: { params: Promise<{ product: string }> }): Promise<Metadata> {
  const { product: productSlug } = await params
  const name = productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    title: `Spare Parts for ${name} | 100X Circle`,
    description: `Genuine OEM spare parts compatible with ${name} fogging machine by 100X Circle.`,
    alternates: { canonical: `/spare-parts/${productSlug}` },
  }
}

export default async function ProductSparePartsPage({ params }: { params: Promise<{ product: string }> }) {
  const { product: productSlug } = await params
  const client = await clientPromise
  const db = client.db()

  // Find the product by slug or id
  const product = await db.collection("products").findOne({
    $or: [{ slug: productSlug }, { name: { $regex: productSlug.replace(/-/g, " "), $options: "i" } }],
  })

  // Find spare parts compatible with this product
  const filter: Record<string, any> = { isPublished: true }
  if (product) {
    filter.$or = [
      { compatibleProducts: product._id?.toString() },
      { compatibleProductNames: { $regex: product.name, $options: "i" } },
    ]
  } else {
    // Try matching by slug in names
    filter.compatibleProductNames = { $regex: productSlug.replace(/-/g, " "), $options: "i" }
  }

  const parts = await db.collection("spare_parts").find(filter).sort({ order: 1, name: 1 }).toArray()
  const serializedParts: any[] = JSON.parse(JSON.stringify(parts))
  const serializedProduct = product ? JSON.parse(JSON.stringify(product)) : null
  const productName = serializedProduct?.name || productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(`Hi, I need spare parts for my ${productName}. Please help.`)}`

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Spare Parts", url: "/spare-parts" },
          { name: productName, url: `/spare-parts/${productSlug}` },
        ]}
      />

      {/* Hero */}
      <section className="bg-gray-950 pt-24 pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/spare-parts" className="hover:text-cinema-300 transition-colors">Spare Parts</Link>
            <span>/</span>
            <span className="text-cinema-300">{productName}</span>
          </nav>
          <p className="eyebrow text-brand-400 mb-4">Compatible Spare Parts</p>
          <h1 className="text-3xl md:text-4xl font-800 text-white mb-4">{productName}</h1>
          <p className="text-cinema-300 max-w-xl">
            All genuine OEM spare parts compatible with the {productName}. Order directly or WhatsApp for bulk pricing.
          </p>
        </div>
      </section>

      {/* Parts grid */}
      <section className="py-16 md:py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 md:px-6">
          {serializedParts.length === 0 ? (
            <div className="text-center py-20">
              <Wrench size={48} className="text-gray-200 mx-auto mb-4" />
              <h2 className="text-lg font-600 text-gray-800 mb-2">No spare parts listed yet for {productName}</h2>
              <p className="text-gray-500 text-sm mb-6">Contact us directly and we'll source the part you need.</p>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-600 rounded-full hover:bg-brand-700 transition-colors text-sm">
                <MessageCircle size={14} /> WhatsApp Us
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {serializedParts.map((part: any) => (
                <Link key={part._id} href={`/spare-parts/${productSlug}/${part.slug}`} className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all">
                  {part.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={part.images[0]} alt={part.name} className="w-full aspect-[4/3] object-contain bg-gray-50 p-4 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center"><Wrench size={32} className="text-gray-200" /></div>
                  )}
                  <div className="p-4">
                    {part.sku && <p className="text-[10px] font-600 text-brand-600 uppercase tracking-wide mb-1">{part.sku}</p>}
                    <h3 className="font-600 text-gray-900 text-sm leading-snug mb-1 group-hover:text-brand-700 transition-colors">{part.name}</h3>
                    {part.priceRange && <p className="text-sm font-700 text-brand-600 mt-2">{part.priceRange}</p>}
                    <div className="mt-3 flex items-center gap-1 text-brand-600 text-xs font-500 group-hover:gap-2 transition-all">View Part <ArrowRight size={11} /></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Back nav */}
      <div className="py-6 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between flex-wrap gap-4">
          <Link href="/spare-parts" className="text-brand-600 hover:text-brand-700 text-sm font-500 flex items-center gap-1.5">
            ← All spare parts
          </Link>
          {serializedProduct && (
            <Link href={`/products/${serializedProduct.slug || serializedProduct._id}`} className="inline-flex items-center gap-2 text-sm font-500 text-gray-600 hover:text-brand-600 transition-colors">
              View {productName} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
