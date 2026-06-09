export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import ProductDetailV2 from "@/components/product/ProductDetailV2"

export const metadata: Metadata = {
  title: "Product V2 Preview | 100x Circle",
  description: "Preview-only route for the Phase 3 product page redesign. Not deployed to production.",
  robots: { index: false, follow: false },
}

export default async function PreviewProductV2Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; bare?: string }>
}) {
  const { slug, bare } = await searchParams

  const client = await clientPromise
  const db     = client.db()

  // Load product by slug param, or fall back to first published product
  let product: Record<string, unknown> | null = null
  if (slug) {
    product = await db.collection("products").findOne(
      { slug, isPublished: { $ne: false } },
      { projection: { __v: 0 } }
    ) as Record<string, unknown> | null
  }
  if (!product) {
    product = await db.collection("products").findOne(
      { isPublished: { $ne: false } },
      { sort: { createdAt: -1 }, projection: { __v: 0 } }
    ) as Record<string, unknown> | null
  }
  if (!product) notFound()

  // MongoDB ObjectIds are not serializable — stringify then parse
  const productData = JSON.parse(JSON.stringify(product)) as Record<string, unknown>
  const productSlug = typeof product.slug === "string" ? product.slug : String(product._id)
  const isBare = bare === "1"

  return (
    <>
      {/* Review banner — hidden when bare=1 (used by the compare iframe) */}
      {!isBare && (
        <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-2.5 sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-widest">
                PREVIEW
              </span>
              <span className="text-xs text-amber-800 font-medium truncate">
                Phase 3 — Product Page V2 &nbsp;·&nbsp; Local only, not deployed to production
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href={`/products/${productSlug}`}
                target="_blank"
                className="text-xs text-amber-700 hover:text-amber-900 hover:underline font-medium"
              >
                View Current (V1) →
              </Link>
              <Link
                href={`/preview/product-v2/compare?slug=${productSlug}`}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                Compare Both Designs
              </Link>
            </div>
          </div>
        </div>
      )}

      <ProductDetailV2 product={productData} />
    </>
  )
}
