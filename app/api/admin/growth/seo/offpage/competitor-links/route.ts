import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const COLL = "seo_competitor_links"

export const TRACKED_COMPETITORS = [
  { id: "balwaan",       label: "Balwaan",        domain: "balwaan.com" },
  { id: "kisankraft",    label: "Kisankraft",     domain: "kisankraft.com" },
  { id: "neptune",       label: "Neptune",        domain: "neptuneagro.com" },
  { id: "vectorfog",     label: "VectorFog",      domain: "vectorfog.com" },
  { id: "curtisdynafog", label: "Curtis Dyna-Fog", domain: "dynafog.com" },
] as const

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const competitor = searchParams.get("competitor")
  const gap_only = searchParams.get("gap_only") === "true"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (competitor) filter.competitor = competitor
  if (gap_only) filter.gap_status = "gap"

  const db = (await clientPromise).db()
  const items = await db.collection(COLL).find(filter).sort({ domain_authority: -1 }).limit(300).toArray()

  // Gap summary per competitor
  const summary = await db.collection(COLL).aggregate([
    { $group: {
      _id: "$competitor",
      total: { $sum: 1 },
      gaps: { $sum: { $cond: [{ $eq: ["$gap_status", "gap"] }, 1, 0] } },
      shared: { $sum: { $cond: [{ $eq: ["$gap_status", "shared"] }, 1, 0] } },
      avg_da: { $avg: "$domain_authority" },
    }},
  ]).toArray()

  return NextResponse.json({
    items: items.map(i => ({ ...i, _id: String(i._id) })),
    summary,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const doc = {
    competitor:        String(body.competitor || ""),
    competitor_domain: String(body.competitor_domain || ""),
    backlink_url:      String(body.backlink_url || ""),
    domain:            String(body.domain || ""),
    anchor_text:       String(body.anchor_text || ""),
    domain_authority:  Number(body.domain_authority || 0),
    traffic_estimate:  Number(body.traffic_estimate || 0),
    link_type:         String(body.link_type || ""),
    gap_status:        body.gap_status || "gap",
    opportunity:       body.opportunity || "medium",
    notes:             String(body.notes || ""),
    created_at:        now,
    updated_at:        now,
  }

  const existing = await db.collection(COLL).findOne({ competitor: doc.competitor, domain: doc.domain })
  if (existing) {
    await db.collection(COLL).updateOne({ _id: existing._id }, { $set: { ...doc, created_at: existing.created_at } })
    return NextResponse.json({ ok: true, _id: String(existing._id), updated: true })
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
