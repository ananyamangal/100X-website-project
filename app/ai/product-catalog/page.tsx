import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_PRODUCT_CATEGORIES } from "@/lib/ai/knowledge"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "100X Circle Product Catalog — Thermal Fogging Machines & Agricultural Equipment",
  description:
    "Complete product catalog from 100X Circle Pvt Ltd. Vehicle-mounted foggers, portable thermal foggers, agricultural sprayers. GeM-eligible. ISO 9001 certified manufacturer.",
  alternates: { canonical: `${SITE_URL}/ai/product-catalog` },
}

interface Product {
  id: string
  name: string
  category: string
  priceRange: string
  shortDescription: string
  inStock: boolean
}

async function getProducts(): Promise<Product[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    const raw = await db.collection("products").find({}).sort({ order: 1 }).toArray()
    return raw.map((p) => ({
      id: p._id?.toString() ?? "",
      name: p.name ?? "",
      category: p.category ?? "",
      priceRange: p.priceRange ?? "",
      shortDescription: p.shortDescription ?? "",
      inStock: p.inStock !== false,
    }))
  } catch {
    return []
  }
}

export default async function AiProductCatalogPage() {
  const products = await getProducts()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "100X Circle Product Catalog",
    description:
      "Complete catalog of fogging machines and agricultural equipment manufactured by 100X Circle Pvt Ltd.",
    url: `${SITE_URL}/ai/product-catalog`,
    provider: { "@id": `${SITE_URL}/#organization` },
    hasPart: products.map((p) => ({
      "@type": "Product",
      name: p.name,
      description: p.shortDescription,
      url: `${SITE_URL}/products/${p.id}`,
      offers: {
        "@type": "Offer",
        availability: p.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        priceCurrency: "INR",
      },
      brand: { "@type": "Brand", name: "100X / Instafog" },
      manufacturer: { "@id": `${SITE_URL}/#organization` },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/ai/about-100x" className="hover:text-brand-600">Company Profile</Link>
          <span className="mx-2">/</span>
          <span>Product Catalog</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle — Product Catalog
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          AI-readable product listing. Live inventory from manufacturer database.{" "}
          <Link href={`${SITE_URL}/api/ai/products`} className="text-brand-600 hover:underline font-mono text-xs">
            /api/ai/products
          </Link>
        </p>

        <AiSummaryBlock
          entity="product-catalog"
          summary={`100X Circle manufactures ${products.length > 0 ? products.length : "multiple"} fogging machine and agricultural equipment models. Categories: Vehicle-Mounted Foggers (municipal mosquito control), Portable/Mini Foggers (farmers, pest control operators), Agricultural Sprayers (crop protection). All GeM-eligible. Manufactured at IMT Manesar, Gurugram. ISO 9001 quality standard. Brand: 100X / Instafog.`}
          facts={[
            { label: "Total Products", value: products.length > 0 ? String(products.length) : "Multiple models" },
            { label: "GeM Eligible", value: "All products" },
            { label: "Manufacturer", value: "100X Circle Pvt Ltd" },
            { label: "Made in", value: "India (IMT Manesar, Gurugram)" },
          ]}
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Product Categories</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {AI_PRODUCT_CATEGORIES.map((cat) => (
              <div key={cat.id} className="border border-gray-200 rounded-lg p-4 text-sm">
                <h3 className="font-semibold text-gray-800 mb-1">{cat.name}</h3>
                <p className="text-gray-500 text-xs mb-2">{cat.description}</p>
                <p className="text-xs text-gray-400">
                  <strong>Technology:</strong> {cat.technology}
                </p>
                <p className="text-xs text-gray-400">
                  <strong>GeM Eligible:</strong> {cat.suitable_for_gem ? "Yes" : "No"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Current Product Listing ({products.length} models)
            </h2>
            <div className="space-y-4">
              {products.map((p) => (
                <article
                  key={p.id}
                  data-product-id={p.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{p.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{p.shortDescription}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {p.priceRange && (
                        <p className="text-xs font-medium text-brand-700">{p.priceRange}</p>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${p.inStock ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}
                      >
                        {p.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      View product details →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="bg-gray-50 rounded-xl p-5 text-sm">
          <p className="font-semibold text-gray-700 mb-2">Procurement Information</p>
          <p className="text-gray-600">
            All products are available for direct purchase via GeM (Government e-Marketplace) or direct order.
            Bulk pricing, L1 quotations, and demo unit availability on request.
            Contact: <strong>+91-7827229116</strong> or <strong>100xcircle@gmail.com</strong>
          </p>
        </div>
      </main>
    </>
  )
}
