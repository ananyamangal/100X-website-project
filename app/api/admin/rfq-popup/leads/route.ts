import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const leads = await db
      .collection("rfq_popup_leads")
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()
    return NextResponse.json(
      leads.map((l) => ({ ...l, _id: String(l._id) }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    const { ObjectId } = await import("mongodb")
    const client = await clientPromise
    const db = client.db()
    await db.collection("rfq_popup_leads").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
