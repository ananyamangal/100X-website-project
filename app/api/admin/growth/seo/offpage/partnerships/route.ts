import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_partnerships"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const partner_type = searchParams.get("partner_type")
  const status = searchParams.get("status")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (partner_type) filter.partner_type = partner_type
  if (status) filter.status = status

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
    company_name:         String(body.company_name || ""),
    website:              String(body.website || ""),
    contact_name:         String(body.contact_name || ""),
    contact_email:        String(body.contact_email || ""),
    partner_type:         body.partner_type || "dealer",
    status:               body.status || "identified",
    has_existing_link:    Boolean(body.has_existing_link ?? false),
    existing_link_url:    String(body.existing_link_url || ""),
    backlink_opportunity: Boolean(body.backlink_opportunity ?? true),
    notes:                String(body.notes || ""),
    created_at:           now,
    updated_at:           now,
  }

  const result = await db.collection(COLL).insertOne(doc)
  await db.collection("seo_offpage_audit_log").insertOne({
    collection: COLL, action: "created", doc_id: String(result.insertedId),
    detail: `Partnership identified: ${doc.company_name}`, created_at: now,
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
