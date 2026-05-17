import { SITE_URL } from "@/lib/seo/site-config"

export type ItemListEntry = {
  name: string
  /** Site-relative path or absolute URL. */
  url: string
  image?: string
}

function absolutize(url: string): string {
  if (!url) return SITE_URL
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

/**
 * Emits an ItemList JSON-LD block — useful on catalogue / blog index
 * pages so search engines can render carousels of constituent items.
 *
 * Keep `items` capped (~20) so the serialised payload stays small.
 */
export function ItemListJsonLd({
  name,
  url,
  items,
}: {
  name: string
  url: string
  items: ItemListEntry[]
}) {
  if (!items || items.length === 0) return null
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absolutize(url),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolutize(item.url),
      name: item.name,
      image: item.image ? absolutize(item.image) : undefined,
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
