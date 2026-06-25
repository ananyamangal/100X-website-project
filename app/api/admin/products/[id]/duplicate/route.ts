import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { generateProductSlug } from "@/lib/productSlug"
import { normalizeProduct } from "@/lib/normalizeProduct"

// POST /api/admin/products/:id/duplicate
// Creates a draft copy of the product with a new ObjectId and slug.
// Strips identity/audit fields; preserves all content/media/SEO data.
export async function POST(_req: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const original = await db.collection("products").findOne({ _id: new ObjectId(id) })
    if (!original) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Strip identity and audit fields; every content/media field is preserved
    const {
      _id: _origId,
      slug: _origSlug,
      createdAt: _origCreated,
      updatedAt: _origUpdated,
      ...copyFields
    } = original

    const newId = new ObjectId()
    const newName = `${String(copyFields.name || "Product")} (Copy)`
    const newSlug = generateProductSlug(newName, String(newId))
    const now = new Date().toISOString()

    // Place the duplicate immediately after the original in display order
    const duplicateOrder =
      typeof original.order === "number" ? original.order + 0.5 : undefined

    const duplicate = {
      ...copyFields,
      _id: newId,
      name: newName,
      slug: newSlug,
      isPublished: false,
      ...(duplicateOrder !== undefined && { order: duplicateOrder }),
      createdAt: now,
      updatedAt: now,
    }

    await db.collection("products").insertOne(duplicate as any)

    const inserted = await db.collection("products").findOne({ _id: newId })
    return NextResponse.json(
      normalizeProduct(JSON.parse(JSON.stringify(inserted))),
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ Error in POST /api/admin/products/[id]/duplicate:", error)
    return NextResponse.json(
      { error: "Failed to duplicate product", details: String(error) },
      { status: 500 }
    )
  }
}
