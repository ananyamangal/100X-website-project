import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_pr_opportunities"

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
  return NextResponse.json(items.map(i => ({ ...i, _id: String(i._id) })))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    type:              body.type || "press_release",
    title:             String(body.title || ""),
    publication:       String(body.publication || ""),
    url:               String(body.url || ""),
    estimated_da:      Number(body.estimated_da || 0),
    estimated_traffic: Number(body.estimated_traffic || 0),
    status:            "identified",
    deadline:          body.deadline ? String(body.deadline) : null,
    outreach_id:       null,
    published_url:     null,
    notes:             String(body.notes || ""),
    created_at:        now,
    updated_at:        now,
  }

  const result = await db.collection(COLL).insertOne(doc)
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
