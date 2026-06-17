import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_link_recovery"

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
  const items = await db.collection(COLL).find(filter).sort({ detected_at: -1 }).limit(200).toArray()

  const counts = await db.collection(COLL).aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).toArray()

  return NextResponse.json({
    items: items.map(i => ({ ...i, _id: String(i._id) })),
    counts,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    type:             body.type || "lost",
    lost_url:         String(body.lost_url || ""),
    our_page:         String(body.our_page || "/"),
    domain:           String(body.domain || ""),
    domain_authority: Number(body.domain_authority || 0),
    anchor_text:      String(body.anchor_text || ""),
    status:           "detected",
    recovery_action:  body.recovery_action || "outreach",
    outreach_id:      null,
    detected_at:      now,
    recovered_at:     null,
    notes:            String(body.notes || ""),
    created_at:       now,
    updated_at:       now,
  }

  const result = await db.collection(COLL).insertOne(doc)
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "created", doc_id: String(result.insertedId),
    detail: `Link recovery item: ${doc.type} — ${doc.domain}`, created_at: now,
  })

  return NextResponse.json({ ok: true, _id: String(result.insertedId) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const { _id, ...updates } = body
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 })

  const now = new Date().toISOString()
  updates.updated_at = now
  if (updates.status === "recovered") updates.recovered_at = now

  const db = (await clientPromise).db()
  await db.collection(COLL).updateOne({ _id: new ObjectId(String(_id)) }, { $set: updates })
  return NextResponse.json({ ok: true })
}
