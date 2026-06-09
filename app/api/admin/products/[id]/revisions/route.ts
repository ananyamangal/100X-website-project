import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const MAX_REVISIONS = 20

export async function GET(request: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id
    if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const revId = searchParams.get("rev")
    const full = searchParams.get("full") === "1"

    const client = await clientPromise
    const db = client.db()

    if (revId && full) {
      const rev = await db.collection("product_revisions").findOne({ _id: new ObjectId(revId) })
      if (!rev) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(JSON.parse(JSON.stringify(rev)))
    }

    const revisions = await db
      .collection("product_revisions")
      .find({ productId: id }, { projection: { snapshot: 0 } })
      .sort({ savedAt: -1 })
      .limit(MAX_REVISIONS)
      .toArray()

    return NextResponse.json(JSON.parse(JSON.stringify(revisions)))
  } catch {
    return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id
    if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 })

    const { snapshot } = await request.json()
    if (!snapshot) return NextResponse.json({ error: "snapshot required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db()

    await db.collection("product_revisions").insertOne({ productId: id, savedAt: new Date(), snapshot })

    // Cap at MAX_REVISIONS — delete oldest beyond limit
    const count = await db.collection("product_revisions").countDocuments({ productId: id })
    if (count > MAX_REVISIONS) {
      const oldest = await db
        .collection("product_revisions")
        .find({ productId: id }, { projection: { _id: 1 } })
        .sort({ savedAt: 1 })
        .limit(count - MAX_REVISIONS)
        .toArray()
      const ids = oldest.map(r => r._id)
      await db.collection("product_revisions").deleteMany({ _id: { $in: ids } })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to save revision" }, { status: 500 })
  }
}
