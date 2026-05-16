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
