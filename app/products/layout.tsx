import type { ReactNode } from "react"
import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd"
import { getAllProductsForSitemap } from "@/lib/productsQuery"

export const metadata: Metadata = {
  title: "Industrial & Agricultural Equipment Catalog | 100x Circle",
  description:
    "Browse thermal fogging machines, sprayers, tillers, and industrial equipment from 100x Circle — manufacturer and supplier across India.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: `Products | ${SITE_NAME}`,
    description:
      "Browse verified industrial fogging machines and agricultural equipment with brochures and specifications.",
    url: `${SITE_URL}/products`,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Products | ${SITE_NAME}`,
    description: "Thermal fogging machines and agricultural equipment from 100x Circle.",
  },
}

export default async function ProductsLayout({ children }: { children: ReactNode }) {
  const products = await getAllProductsForSitemap()
  const top = products.slice(0, 20)
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
        ]}
      />
      <ItemListJsonLd
        name="100x Circle product catalogue"
        url="/products"
        items={top.map((p) => ({
          name: p.name ?? "Product",
          url: `/products/${p.id}`,
        }))}
      />
      {children}
    </>
  )
}
