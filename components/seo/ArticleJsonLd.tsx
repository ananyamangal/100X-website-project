import { SITE_URL, SITE_NAME, SITE_NAME_LEGAL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

const ORG_NAMES = ["100x circle", "100x circle pvt ltd", "100xcircle", "instafog"]

type Props = {
  title: string
  description: string
  url: string
  image?: string
  datePublished?: string
  dateModified?: string
  authorName?: string
  category?: string
  wordCount?: number
}

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
  category,
  wordCount,
}: Props) {
  const isOrgAuthor =
    !authorName || ORG_NAMES.includes(authorName.toLowerCase().trim())

  const resolvedImage = image
    ? [image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? "" : "/"}${image}`]
    : [`${SITE_URL}/logo-main.png`]

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    headline: title,
    description: plainTextFromHtml(description).slice(0, 500),
    image: resolvedImage,
    url,
    inLanguage: "en-IN",
    datePublished: datePublished || undefined,
    dateModified: dateModified || datePublished || undefined,
    author: isOrgAuthor
      ? { "@id": `${SITE_URL}/#organization` }
      : { "@type": "Person", name: authorName },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@type": "Blog", "@id": `${SITE_URL}/blog`, name: `${SITE_NAME} Blog` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(category ? { articleSection: category, keywords: category } : {}),
    ...(wordCount ? { wordCount } : {}),
    copyrightHolder: { "@id": `${SITE_URL}/#organization` },
    copyrightYear: datePublished ? new Date(datePublished).getFullYear() : new Date().getFullYear(),
    about: {
      "@type": "Thing",
      name: "Thermal fogging machines and vector control — 100X Circle",
    },
    mentions: [
      { "@id": `${SITE_URL}/#organization` },
    ],
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
