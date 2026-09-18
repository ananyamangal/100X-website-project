import type { Metadata } from "next"
import { notFound } from "next/navigation"
import KnowledgeRenderer from "@/components/knowledge/KnowledgeRenderer"
import { getKnowledgeArticleBySlug, getAllKnowledgeSlugs } from "@/lib/knowledgeQuery"
import { SITE_URL } from "@/lib/seo/site-config"

/**
 * Serves the knowledge articles that have been migrated into the
 * `knowledge_articles` collection. Articles still living in their own
 * `app/knowledge/<slug>/page.tsx` folder keep serving from there — a static
 * route segment wins over this dynamic one, so the two coexist during the
 * phased migration and only the migrated slugs reach this file.
 */
export const dynamicParams = false

export async function generateStaticParams() {
  return getAllKnowledgeSlugs()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const a = await getKnowledgeArticleBySlug(slug)
  if (!a) return {}
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    alternates: { canonical: `${SITE_URL}/knowledge/${a.slug}` },
    openGraph: {
      title: a.ogTitle ?? a.title,
      description: a.ogDescription ?? a.metaDescription,
    },
  }
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getKnowledgeArticleBySlug(slug)
  if (!article) notFound()
  return <KnowledgeRenderer article={article} />
}
