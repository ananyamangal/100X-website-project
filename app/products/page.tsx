export const revalidate = 60

import Link from "next/link"
import { unstable_cache } from "next/cache"
import clientPromise from "@/lib/mongodb"
import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import ProductsPageClient from "./ProductsPageClient"

export const metadata: Metadata = {
  title: "Thermal Fogging Machines — Complete Product Range | 100X Circle",
  description:
    "Explore the complete range of thermal fogging machines, vehicle-mounted foggers, cold foggers, and agricultural equipment from 100X Circle — India's leading OEM manufacturer.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Fogging Machines & Agricultural Equipment | 100X Circle",
    description: "OEM-manufactured fogging machines and agricultural equipment. Government-approved. Pan-India delivery.",
    url: `${SITE_URL}/products`,
  },
}

// The page renders on demand, so this read ran on every view; it is now
// served from the Data Cache for the same 60 s window `revalidate` promises.
// A DB error throws and is therefore never cached.
const getListedProducts = unstable_cache(
  async () => {
    const client = await clientPromise
    const productsRaw = await client
      .db()
      .collection("products")
      .find({ isPublished: { $ne: false } })
      .toArray()
    return JSON.parse(JSON.stringify(productsRaw))
      .map((p: any) => ({
        ...p,
        imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
      }))
      .sort((a: any, b: any) => {
        const oa = a.order ?? Infinity
        const ob = b.order ?? Infinity
        if (oa !== ob) return oa - ob
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
  },
  ["products-listing-v1"],
  { revalidate: 60, tags: ["products-listing"] },
)

export default async function AllProductsPage() {
  const products = await getListedProducts()

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Products", url: "/products" }]} />
      <ProductsPageClient products={products} />
    </>
  )
}
