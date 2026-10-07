import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ArrowRight, Wrench } from "lucide-react"

function buildPartUrl(part: any): string {
  // Parts live at /spare-parts/[product-slug]/[part-slug]
  // Derive product slug from the first compatible product name
  const productName = part.compatibleProductNames?.[0]
  if (productName) {
    const productSlug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    return `/spare-parts/${productSlug}/${part.slug}`
  }
  // Fallback: try to use the part category as a grouping key
  const cat = (part.category || "parts").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `/spare-parts/${cat}/${part.slug}`
}

export const revalidate = 120

export const metadata: Metadata = {
  title: "Spare Parts for Thermal Fogging Machines | 100X Circle",
  description:
    "Genuine OEM spare parts for 100X Circle thermal fogging machines. Carburetors, nozzles, ignition coils, fuel tanks, gaskets and more — shipped pan-India.",
  alternates: { canonical: "/spare-parts" },
  openGraph: {
    title: "Spare Parts | 100X Circle",
    description: "Genuine OEM spare parts for 100X Circle fogging machines",
    url: `${SITE_URL}/spare-parts`,
  },
}

export default async function SparePartsPage() {
  const client = await clientPromise
  const parts = await client
    .db()
    .collection("spare_parts")
    .find({ isPublished: true })
    .sort({ order: 1, name: 1 })
    .toArray()

  const serialized: any[] = JSON.parse(JSON.stringify(parts))

  // Group by category
  const byCategory = serialized.reduce((acc, part) => {
    const cat = part.category || "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(part)
    return acc
  }, {} as Record<string, any[]>)

  const categories = Object.keys(byCategory).sort()

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Spare Parts", url: "/spare-parts" },
        ]}
      />

      {/* Hero */}
      <section className="bg-gray-950 pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Spare Parts</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">OEM Spare Parts Ecosystem</p>
            <h1 className="text-4xl md:text-5xl font-800 text-white mb-5 text-balance">
              Genuine parts.<br />Guaranteed compatibility.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed max-w-2xl">
              Every 100X Circle machine is backed by a complete spare parts ecosystem. Sourced from the same manufacturing line — shipped across India within 24–48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Parts listing */}
      <section className="py-16 md:py-20 bg-white overflow-x-hidden">
        <div className="container mx-auto px-4 md:px-6">
          {serialized.length === 0 ? (
            <div className="text-center py-24">
              <Wrench size={48} className="text-gray-200 mx-auto mb-4" />
              <h2 className="text-xl font-600 text-gray-800 mb-2">Spare parts catalogue coming soon</h2>
              <p className="text-gray-500 text-sm mb-6">
                Contact us directly for spare parts enquiries.
              </p>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-600 rounded-full hover:bg-brand-700 transition-colors text-sm"
              >
                Contact Us <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-14">
              {categories.map((cat) => (
                <div key={cat}>
                  <h2 className="text-2xl font-700 text-gray-900 mb-6 pb-3 border-b border-gray-100">{cat}</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {byCategory[cat].map((part: any) => (
                      <Link
                        key={part._id}
                        href={buildPartUrl(part)}
                        className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all"
                      >
                        {part.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={part.images[0]}
                            alt={part.name}
                            className="w-full aspect-[4/3] object-contain bg-gray-50 p-4 group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center">
                            <Wrench size={32} className="text-gray-200" />
                          </div>
                        )}
                        <div className="p-4">
                          {part.sku && <p className="text-[10px] font-600 text-brand-600 uppercase tracking-wide mb-1">{part.sku}</p>}
                          <h3 className="font-600 text-gray-900 text-sm leading-snug mb-1 group-hover:text-brand-700 transition-colors">
                            {part.name}
                          </h3>
                          {part.compatibleProductNames?.length > 0 && (
                            <p className="text-xs text-gray-400 line-clamp-1">
                              For: {part.compatibleProductNames.join(", ")}
                            </p>
                          )}
                          {part.priceRange && (
                            <p className="text-sm font-700 text-brand-600 mt-2">{part.priceRange}</p>
                          )}
                          <div className="mt-3 flex items-center gap-1 text-brand-600 text-xs font-500 group-hover:gap-2 transition-all">
                            View Part <ArrowRight size={11} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-700">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl font-700 text-white mb-3">Can't find the part you need?</h2>
          <p className="text-brand-100 mb-7 max-w-md mx-auto">
            Our technical team can source any genuine 100X Circle spare part. Contact us with your machine model and part name.
          </p>
          <Link
            href="/contact-us"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-700 font-700 rounded-full hover:bg-brand-50 transition-all text-sm shadow-lg"
          >
            Request a Part <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  )
}
