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
 *
 * `dynamicParams` is on so a slug added by the Knowledge Base sync resolves
 * without a redeploy: an unknown or unpublished slug still 404s, because
 * getKnowledgeArticleBySlug only sees published articles.
 */
export const dynamicParams = true

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
    // Synced pages are derived views of an existing page and canonical to it; hand-written ones are self-canonical.
    alternates: { canonical: a.canonicalUrl ?? `${SITE_URL}/knowledge/${a.slug}` },
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
