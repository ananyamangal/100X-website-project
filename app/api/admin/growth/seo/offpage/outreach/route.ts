import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_outreach"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (status) filter.status = status
  if (type) filter.type = type

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
    type:          body.type || "email",
    target_url:    String(body.target_url || ""),
    target_domain: String(body.target_domain || ""),
    contact_email: String(body.contact_email || ""),
    contact_name:  String(body.contact_name || ""),
    subject:       String(body.subject || ""),
    body:          String(body.body || ""),
    // FOUNDER SAFETY: all outreach starts as draft — requires explicit approval before sending
    status:        "draft",
    backlink_id:   body.backlink_id ? String(body.backlink_id) : null,
    sent_at:       null,
    opened_at:     null,
    replied_at:    null,
    approved_by:   null,
    approved_at:   null,
    notes:         String(body.notes || ""),
    created_at:    now,
    updated_at:    now,
  }

  const result = await db.collection(COLL).insertOne(doc)
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "created", doc_id: String(result.insertedId),
    detail: `Outreach draft created: ${doc.target_domain}`, created_at: now,
  })

  return NextResponse.json({ ok: true, _id: String(result.insertedId) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const { _id, action, ...updates } = body
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 })

  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  // Action-based state transitions
  if (action === "approve") {
    updates.status = "approved"
    updates.approved_at = now
    updates.approved_by = "founder"
  } else if (action === "mark_sent") {
    // SAFETY: only allowed after approved
    const current = await db.collection(COLL).findOne({ _id: new ObjectId(String(_id)) })
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (current.status !== "approved") {
      return NextResponse.json({ error: "Outreach must be approved before marking sent" }, { status: 403 })
    }
    updates.status = "sent"
    updates.sent_at = now
  } else if (action === "mark_opened") {
    updates.status = "opened"
    updates.opened_at = now
  } else if (action === "mark_replied") {
    updates.status = "replied"
    updates.replied_at = now
  } else if (action === "mark_won") {
    updates.status = "won"
  } else if (action === "mark_lost") {
    updates.status = "lost"
  }

  updates.updated_at = now
  await db.collection(COLL).updateOne({ _id: new ObjectId(String(_id)) }, { $set: updates })
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: action || "updated", doc_id: String(_id),
    detail: updates.status ? `Outreach → ${updates.status}` : "Fields updated", created_at: now,
  })

  return NextResponse.json({ ok: true })
}
