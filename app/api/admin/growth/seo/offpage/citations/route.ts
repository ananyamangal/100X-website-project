import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_citations"

export const APPROVED_PLATFORMS = [
  "indiamart", "tradeindia", "justdial", "exportersindia",
  "industry_association", "msme_directory", "gem_portal",
] as const

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get("platform")
  const status = searchParams.get("status")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (platform) filter.platform = platform
  if (status) filter.status = status

  const db = (await clientPromise).db()
  const items = await db.collection(COLL).find(filter).sort({ created_at: -1 }).limit(100).toArray()
  return NextResponse.json(items.map(i => ({ ...i, _id: String(i._id) })))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    platform:       String(body.platform || "indiamart"),
    platform_label: String(body.platform_label || ""),
    listing_url:    String(body.listing_url || ""),
    nap_consistent: Boolean(body.nap_consistent ?? false),
    status:         body.status || "recommended",
    submitted_at:   null,
    verified_at:    null,
    notes:          String(body.notes || ""),
    created_at:     now,
    updated_at:     now,
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

  const now = new Date().toISOString()
  updates.updated_at = now
  if (updates.status === "submitted") updates.submitted_at = now
  if (updates.status === "verified") updates.verified_at = now

  const db = (await clientPromise).db()
  await db.collection(COLL).updateOne({ _id: new ObjectId(String(_id)) }, { $set: updates })
  return NextResponse.json({ ok: true })
}
