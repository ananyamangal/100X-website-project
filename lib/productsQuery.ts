import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

function normalizeImageUrls(product: Record<string, unknown>): string[] {
  let imageUrls: string[] = []
  const raw = product.imageUrls
  if (Array.isArray(raw)) {
    imageUrls = raw.filter((u) => typeof u === "string") as string[]
  } else if (typeof raw === "string") {
    imageUrls = raw
      .split(/\r?\n/)
      .map((url: string) => url.trim())
      .filter(Boolean)
  } else if (typeof product.imageUrl === "string") {
    imageUrls = [product.imageUrl]
  } else if (typeof product.image === "string") {
    imageUrls = [product.image]
  }
  return imageUrls
}

export async function getProductById(id: string): Promise<Record<string, unknown> | null> {
  try {
    if (!ObjectId.isValid(id)) return null
    const client = await clientPromise
    const db = client.db()
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) })
    if (!product) return null
    const p = product as Record<string, unknown>
    p.imageUrls = normalizeImageUrls(p)
    return p
  } catch {
    return null
  }
}

export async function getAllProductIds(): Promise<string[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("products")
      .find({}, { projection: { _id: 1 } })
      .toArray()
    return docs.map((d) => String(d._id))
  } catch {
    return []
  }
}

export type ProductSitemapRow = {
  id: string
  updatedAt?: string
  name?: string
  category?: string
}

/**
 * Lightweight projection for the sitemap (and other SEO surfaces) — pulls
 * just enough metadata to set a real `lastModified` per product URL.
 */
export async function getAllProductsForSitemap(): Promise<ProductSitemapRow[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("products")
      .find(
        {},
        { projection: { _id: 1, updatedAt: 1, createdAt: 1, name: 1, category: 1 } },
      )
      .toArray()
    return docs.map((d) => {
      const updatedAt =
        (typeof d.updatedAt === "string" && d.updatedAt) ||
        (d.updatedAt instanceof Date && d.updatedAt.toISOString()) ||
        (typeof d.createdAt === "string" && d.createdAt) ||
        (d.createdAt instanceof Date && d.createdAt.toISOString()) ||
        undefined
      return {
        id: String(d._id),
        updatedAt: updatedAt || undefined,
        name: typeof d.name === "string" ? d.name : undefined,
        category: typeof d.category === "string" ? d.category : undefined,
      }
    })
  } catch {
    return []
  }
}

export type RelatedProductRow = {
  id: string
  name: string
  category?: string
  shortDescription?: string
  imageUrls: string[]
  priceRange?: string
  rating?: number
  reviewsCount?: number
}

/**
 * Fetch up to `limit` products that match the given category. Used by
 * landing pages that recommend a slice of the catalogue without a
 * "current product" to exclude. Falls back to "first N products" when
 * no category is provided.
 */
export async function getProductsByCategory(
  category: string | undefined,
  limit = 4,
): Promise<RelatedProductRow[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    const query: Record<string, unknown> = category ? { category } : {}
    const docs = await db
      .collection("products")
      .find(query, {
        projection: {
          _id: 1,
          name: 1,
          category: 1,
          shortDescription: 1,
          imageUrls: 1,
          imageUrl: 1,
          image: 1,
          priceRange: 1,
          rating: 1,
          reviewsCount: 1,
        },
      })
      .limit(limit)
      .toArray()
    return docs.map((d) => {
      const raw = d as Record<string, unknown>
      raw.imageUrls = normalizeImageUrls(raw)
      return {
        id: String(d._id),
        name: String(d.name ?? ""),
        category: typeof d.category === "string" ? d.category : undefined,
        shortDescription:
          typeof d.shortDescription === "string" ? d.shortDescription : undefined,
        imageUrls: (raw.imageUrls as string[]) || [],
        priceRange: typeof d.priceRange === "string" ? d.priceRange : undefined,
        rating: typeof d.rating === "number" ? d.rating : undefined,
        reviewsCount:
          typeof d.reviewsCount === "number" ? d.reviewsCount : undefined,
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetch up to `limit` other products that share the same category as the
 * given product id — used by the related-products surface on detail pages.
 */
export async function getRelatedProducts(
  category: string | undefined,
  excludeId: string,
  limit = 4,
): Promise<RelatedProductRow[]> {
  if (!category) return []
  try {
    if (!ObjectId.isValid(excludeId)) return []
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("products")
      .find(
        {
          category,
          _id: { $ne: new ObjectId(excludeId) },
        },
        {
          projection: {
            _id: 1,
            name: 1,
            category: 1,
            shortDescription: 1,
            imageUrls: 1,
            imageUrl: 1,
            image: 1,
            priceRange: 1,
            rating: 1,
            reviewsCount: 1,
          },
        },
      )
      .limit(limit)
      .toArray()
    return docs.map((d) => {
      const raw = d as Record<string, unknown>
      raw.imageUrls = normalizeImageUrls(raw)
      return {
        id: String(d._id),
        name: String(d.name ?? ""),
        category: typeof d.category === "string" ? d.category : undefined,
        shortDescription:
          typeof d.shortDescription === "string" ? d.shortDescription : undefined,
        imageUrls: (raw.imageUrls as string[]) || [],
        priceRange: typeof d.priceRange === "string" ? d.priceRange : undefined,
        rating: typeof d.rating === "number" ? d.rating : undefined,
        reviewsCount:
          typeof d.reviewsCount === "number" ? d.reviewsCount : undefined,
      }
    })
  } catch {
    return []
  }
}
