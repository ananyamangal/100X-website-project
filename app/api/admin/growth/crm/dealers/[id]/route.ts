import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db  = (await clientPromise).db()
    const doc = await db.collection("crm_dealers").findOne({ _id: new ObjectId(params.id) })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ...doc, _id: String(doc._id) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body   = await req.json()
    const db     = (await clientPromise).db()
    const now    = new Date().toISOString()
    const update: Record<string, unknown> = { updated_at: now }
    const fields = [
      "name", "company", "state", "phone", "email", "stage",
      "gem_status", "oem_status", "expected_revenue", "notes",
      "last_contact_at", "next_followup_at", "source_recommendation_id", "source_type",
    ]
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f]
    }
    const result = await db.collection("crm_dealers").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: update }
    )
    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = (await clientPromise).db()
    await db.collection("crm_dealers").deleteOne({ _id: new ObjectId(params.id) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
