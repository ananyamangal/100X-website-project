export const revalidate = 60

import Link from "next/link"
import { unstable_cache } from "next/cache"
import clientPromise from "@/lib/mongodb"
import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import ProductsPageClient from "./ProductsPageClient"
import FaqBlock from "@/components/landing/FaqBlock"
import type { FaqEntry } from "@/lib/seo/landing-types"

// Agency on-page SEO copy (Sept 2026). Single source for the visible accordion
// AND the FAQPage JSON-LD (FaqBlock renders both from this array).
const PRODUCTS_FAQS: FaqEntry[] = [
  {
    q: "What is the price of a fogger machine in India?",
    a: "Pricing depends on the type — thermal, cold ULV, or vehicle-mounted — along with tank capacity and build material (HDPE vs stainless steel). Most of our fogger machines are listed as \"Price on Request\" since government and bulk orders are quoted separately from retail. Reach out on WhatsApp or call for a quick quote based on your requirement.",
  },
  {
    q: "Which fogger machine is best for government tenders?",
    a: "For GeM tenders and municipal contracts, our ISI-marked thermal fogging machines like the 100XHM20 and 100XHBL22 are the most commonly ordered, since they meet IS 14855 specifications and come with the documentation needed for government procurement.",
  },
  {
    q: "What's the difference between a thermal fogger and a cold fogger?",
    a: "A [thermal fogger](/thermal-fogging-machine-with-stainless-steel-tank-100xssma20) heats the chemical solution to create a dense visible fog, ideal for outdoor mosquito and vector control over large areas. A [cold fogger](/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1) uses mechanical pressure instead of heat, producing a finer mist that's safer for indoor and occupied spaces. If you're deciding between the two, our thermal vs cold fogging guide breaks it down in more detail.",
  },
  {
    q: "Do you provide spare parts and after-sales support for fogger machines?",
    a: "Yes — genuine [OEM spare parts](/spare-parts) for every fogger machine we sell ship pan-India from our Gurugram factory, and our team supports installation and servicing queries directly over call or WhatsApp.",
  },
  {
    q: "Is your fogger machine suitable for both urban and rural pest control programs?",
    a: "Yes. Our range is used across municipal corporations, panchayats, and private facilities alike. [Vehicle-mounted models](/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400) suit large urban coverage, while portable and mini foggers work well for smaller sites, warehouses, and rural spraying programs.",
  },
]

export const metadata: Metadata = {
  title: "Fogger Machine Range | Thermal, Cold & Vehicle-Mounted – 100X Circle",
  description:
    "Buy fogger machine online from India's leading OEM manufacturer. Thermal, cold & vehicle-mounted foggers. GeM registered, pan-India delivery. Get a quote today.",
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
      {/* Near the bottom, above the footer */}
      <FaqBlock title="Fogger Machine FAQs" faqs={PRODUCTS_FAQS} />
    </>
  )
}
