// DB reads for the B9 related-link blocks (published records only).
import { cache } from "react"
import clientPromise from "@/lib/mongodb"
import type { RelatedCaseStudyRow, RelatedProductRow } from "@/lib/relatedLinks"

function iso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString()
  return typeof v === "string" ? v : undefined
}

export const getRelatedLinkData = cache(async (): Promise<{
  products: RelatedProductRow[]
  caseStudies: RelatedCaseStudyRow[]
}> => {
  try {
    const db = (await clientPromise).db()
    const [products, caseStudies] = await Promise.all([
      db
        .collection("products")
        .find({ isPublished: true }, { projection: { _id: 1, slug: 1, name: 1, category: 1, order: 1 } })
        .toArray(),
      db
        .collection("case_studies")
        .find(
          { published: true, isSample: { $ne: true } },
          { projection: { _id: 0, slug: 1, customer: 1, title: 1, state: 1, productUsed: 1, updatedAt: 1, createdAt: 1 } },
        )
        .toArray(),
    ])
    return {
      products: products
        .filter((p) => typeof p.name === "string" && p.name.trim())
        .map((p) => ({
          id: String(p._id),
          slug: typeof p.slug === "string" ? p.slug : undefined,
          name: String(p.name),
          category: typeof p.category === "string" ? p.category : undefined,
          order: typeof p.order === "number" ? p.order : undefined,
        })),
      caseStudies: caseStudies
        .filter((c) => typeof c.slug === "string" && c.slug.trim())
        .map((c) => ({
          slug: String(c.slug),
          customer: typeof c.customer === "string" ? c.customer : undefined,
          title: typeof c.title === "string" ? c.title : undefined,
          state: typeof c.state === "string" ? c.state : undefined,
          productUsed: typeof c.productUsed === "string" ? c.productUsed : undefined,
          updatedAt: iso(c.updatedAt) ?? iso(c.createdAt),
        })),
    }
  } catch {
    return { products: [], caseStudies: [] }
  }
})
