// Sitemap rows for published case-study detail pages (B6).
// lastmod comes from the record's own updatedAt (else createdAt); a row with
// neither gets no lastModified at all rather than a made-up "now".
import clientPromise from "@/lib/mongodb"
import { toCaseStudySitemapRows, type CaseStudySitemapRow } from "@/lib/caseStudySitemapRows"

export type { CaseStudySitemapRow }

export async function getCaseStudiesForSitemap(): Promise<CaseStudySitemapRow[]> {
  try {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection("case_studies")
      .find(
        { published: true },
        { projection: { _id: 0, slug: 1, published: 1, isSample: 1, updatedAt: 1, createdAt: 1 } },
      )
      .toArray()
    return toCaseStudySitemapRows(docs as Array<Record<string, unknown>>)
  } catch {
    return []
  }
}
