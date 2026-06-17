import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_backlinks"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const source_type = searchParams.get("source_type")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (status) filter.status = status
  if (source_type) filter.source_type = source_type

  const db = (await clientPromise).db()
  const items = await db.collection(COLL).find(filter).sort({ created_at: -1 }).limit(200).toArray()
  return NextResponse.json(items.map(i => ({ ...i, _id: String(i._id) })))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    url:              String(body.url || ""),
    domain:           String(body.domain || ""),
    anchor_text:      String(body.anchor_text || ""),
    target_page:      String(body.target_page || "/"),
    status:           body.status || "detected",
    source_type:      body.source_type || "organic",
    domain_authority: Number(body.domain_authority || 0),
    spam_score:       Number(body.spam_score || 0),
    is_dofollow:      Boolean(body.is_dofollow ?? true),
    backlink_count:   Number(body.backlink_count || 0),
    referring_domains: Number(body.referring_domains || 0),
    notes:            String(body.notes || ""),
    tags:             Array.isArray(body.tags) ? body.tags : [],
    traffic_impact:   null,
    ranking_impact:   null,
    lead_impact:      null,
    revenue_impact:   null,
    outreach_id:      null,
    detected_at:      now,
    verified_at:      null,
    acquired_at:      null,
    created_at:       now,
    updated_at:       now,
  }

  const result = await db.collection(COLL).insertOne(doc)
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "created", doc_id: String(result.insertedId),
    detail: `Backlink detected: ${doc.domain}`, created_at: now,
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

  if (updates.status === "acquired") updates.acquired_at = now
  if (updates.status === "verified") updates.verified_at = now

  const db = (await clientPromise).db()
  await db.collection(COLL).updateOne({ _id: new ObjectId(String(_id)) }, { $set: updates })
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "updated", doc_id: String(_id),
    detail: updates.status ? `Status → ${updates.status}` : "Fields updated", created_at: now,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = (await clientPromise).db()
  await db.collection(COLL).deleteOne({ _id: new ObjectId(id) })
  return NextResponse.json({ ok: true })
}
