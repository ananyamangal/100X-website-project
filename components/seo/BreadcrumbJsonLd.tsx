import { SITE_URL } from "@/lib/seo/site-config"

export type BreadcrumbItem = {
  name: string
  /** Absolute URL or site-relative path (auto-absolutized). */
  url: string
}

function absolutize(url: string): string {
  if (!url) return SITE_URL
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

/**
 * Emits a BreadcrumbList JSON-LD block. Pass an ordered array starting
 * with the home crumb, e.g.:
 *   <BreadcrumbJsonLd items={[
 *     { name: "Home", url: "/" },
 *     { name: "Products", url: "/products" },
 *     { name: product.name, url: `/products/${id}` },
 *   ]} />
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolutize(item.url),
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
