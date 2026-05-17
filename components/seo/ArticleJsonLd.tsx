import { SITE_URL, SITE_NAME } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

type Props = {
  title: string
  description: string
  url: string
  image?: string
  datePublished?: string
  dateModified?: string
  authorName?: string
}

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
}: Props) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: plainTextFromHtml(description).slice(0, 500),
    image: image ? [image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? "" : "/"}${image}`] : undefined,
    datePublished: datePublished || undefined,
    dateModified: dateModified || datePublished || undefined,
    author: {
      "@type": "Person",
      name: authorName || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-main.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

// BreadcrumbList helper now lives in its own component to fix the broken
// JSX call signature (it was defined as a positional-arg function but
// invoked with `<BreadcrumbJsonLd items={[...]} />` everywhere).
export { BreadcrumbJsonLd } from "./BreadcrumbJsonLd"
export type { BreadcrumbItem } from "./BreadcrumbJsonLd"
