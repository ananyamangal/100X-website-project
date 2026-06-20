import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("gov_past_performance")
      .find({})
      .sort({ orderYear: -1, createdAt: -1 })
      .toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const doc = {
      department: body.department || "",
      organization: body.organization || "",
      state: body.state || "",
      product: body.product || "",
      quantity: body.quantity ? Number(body.quantity) : null,
      orderValue: body.orderValue ? Number(body.orderValue) : null,
      orderYear: body.orderYear ? Number(body.orderYear) : new Date().getFullYear(),
      status: body.status || "Completed",
      category: body.category || "Municipal",
      images: body.images || [],
      documents: body.documents || [],
      notes: body.notes || "",
      isPublic: body.isPublic ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = await db.collection("gov_past_performance").insertOne(doc)
    return NextResponse.json({ ...doc, _id: String(result.insertedId) })
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
