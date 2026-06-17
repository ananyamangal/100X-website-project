import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_gem_authority"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const status = searchParams.get("status")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (type) filter.type = type
  if (status) filter.status = status

  const db = (await clientPromise).db()
  const items = await db.collection(COLL).find(filter).sort({ created_at: -1 }).limit(200).toArray()

  const stats = await db.collection(COLL).aggregate([
    { $group: { _id: "$type", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
  ]).toArray()

  return NextResponse.json({
    items: items.map(i => ({ ...i, _id: String(i._id) })),
    stats,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    type:                 body.type || "gem_listing",
    title:                String(body.title || ""),
    url:                  String(body.url || ""),
    organization:         String(body.organization || ""),
    authority_value:      body.authority_value || "medium",
    status:               body.status || "identified",
    backlink_opportunity: Boolean(body.backlink_opportunity ?? true),
    opportunity_notes:    String(body.opportunity_notes || ""),
    notes:                String(body.notes || ""),
    created_at:           now,
    updated_at:           now,
  }

  const result = await db.collection(COLL).insertOne(doc)
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "created", doc_id: String(result.insertedId),
    detail: `GeM authority item: ${doc.type} — ${doc.title}`, created_at: now,
  })

  return NextResponse.json({ ok: true, _id: String(result.insertedId) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const { _id, ...updates } = body
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 })

  const db = (await clientPromise).db()
  await db.collection(COLL).updateOne(
    { _id: new ObjectId(String(_id)) },
    { $set: { ...updates, updated_at: new Date().toISOString() } }
  )
  return NextResponse.json({ ok: true })
}
