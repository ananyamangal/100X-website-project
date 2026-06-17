/**
 * Dealer Prospects — list + stats
 * GET  /api/admin/growth/dealers/prospects  — paginated list + aggregate stats
 * POST /api/admin/growth/dealers/prospects  — create single prospect
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
const COLL = "dealer_prospects"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const page     = Math.max(1, Number(searchParams.get("page")   || 1))
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 50))
  const search   = (searchParams.get("q")       || "").trim()
  const state    = (searchParams.get("state")   || "").trim()
  const source   = (searchParams.get("source")  || "").trim()
  const status   = (searchParams.get("status")  || "").trim()
  const queue    = searchParams.get("queue") === "1"  // enrichment queue

  try {
    const db = (await clientPromise).db()

    const baseFilter: Record<string, unknown> = { status: { $ne: "rejected" } }
    if (search)  baseFilter.$or = [
      { dealer_name:    { $regex: search, $options: "i" } },
      { contact_person: { $regex: search, $options: "i" } },
      { email:          { $regex: search, $options: "i" } },
      { mobile:         { $regex: search, $options: "i" } },
      { city:           { $regex: search, $options: "i" } },
    ]
    if (state)  baseFilter.state  = state
    if (source) baseFilter.source = source
    if (status) baseFilter.status = status
    if (queue)  baseFilter.$or = [
      { email:  { $in: [null, ""] } },
      { mobile: { $in: [null, ""] } },
    ]

    const [docs, total, aggStats] = await Promise.all([
      db.collection(COLL)
        .find(baseFilter)
        .sort({ dealer_score: -1, created_at: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),

      db.collection(COLL).countDocuments(baseFilter),

      // Aggregate stats (always over non-rejected)
      db.collection(COLL).aggregate([
        { $match: { status: { $ne: "rejected" } } },
        { $facet: {
          overview: [{ $group: {
            _id: null,
            total:      { $sum: 1 },
            withEmail:  { $sum: { $cond: [{ $and: [{ $ne: ["$email", null] }, { $ne: ["$email", ""] }] }, 1, 0] } },
            withPhone:  { $sum: { $cond: [{ $and: [{ $ne: ["$mobile", null] }, { $ne: ["$mobile", ""] }] }, 1, 0] } },
            withBoth:   { $sum: { $cond: [
              { $and: [
                { $ne: ["$email",  null] }, { $ne: ["$email",  ""] },
                { $ne: ["$mobile", null] }, { $ne: ["$mobile", ""] },
              ]}, 1, 0,
            ] } },
            withGst:    { $sum: { $cond: [{ $and: [{ $ne: ["$gst", null] }, { $ne: ["$gst", ""] }] }, 1, 0] } },
            avgScore:   { $avg: "$dealer_score" },
          }}],
          byState: [
            { $group: {
              _id:       "$state",
              count:     { $sum: 1 },
              withEmail: { $sum: { $cond: [{ $and: [{ $ne: ["$email", null] }, { $ne: ["$email", ""] }] }, 1, 0] } },
              withPhone: { $sum: { $cond: [{ $and: [{ $ne: ["$mobile", null] }, { $ne: ["$mobile", ""] }] }, 1, 0] } },
              withBoth:  { $sum: { $cond: [
                { $and: [
                  { $ne: ["$email",  null] }, { $ne: ["$email",  ""] },
                  { $ne: ["$mobile", null] }, { $ne: ["$mobile", ""] },
                ]}, 1, 0,
              ] } },
            }},
            { $sort: { count: -1 } },
            { $limit: 15 },
          ],
          bySource: [
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        }},
      ]).toArray(),
    ])

    const ov = (aggStats[0]?.overview?.[0] as Record<string, number> | undefined) ?? {}
    const withEmail = ov.withEmail ?? 0
    const withPhone = ov.withPhone ?? 0
    const withBoth  = ov.withBoth  ?? 0
    const totalDocs = ov.total ?? 0

    const emailMatch = withEmail * 0.50
    const phoneMatch = withPhone * 0.35
    const unionMatch = emailMatch + phoneMatch - (withBoth * 0.40)
    const customerMatchRate = totalDocs > 0
      ? Math.min(95, Math.max(0, Math.round((unionMatch / totalDocs) * 100)))
      : 0

    const byState = ((aggStats[0]?.byState ?? []) as Array<Record<string, number>>).map(s => {
      const em = s.withEmail * 0.50
      const pm = s.withPhone * 0.35
      const bm = s.withBoth  * 0.40
      const rate = s.count > 0
        ? Math.min(95, Math.max(0, Math.round(((em + pm - bm) / s.count) * 100)))
        : 0
      return { state: s._id, count: s.count, withEmail: s.withEmail, withPhone: s.withPhone, withBoth: s.withBoth, matchRate: rate }
    })

    return NextResponse.json({
      prospects: docs.map(d => { const { _id, ...r } = d; return { id: String(_id), ...r } }),
      total,
      page,
      pageSize,
      stats: {
        total:             totalDocs,
        withEmail,
        withPhone,
        withBoth,
        missingBoth:       totalDocs - (withEmail + withPhone - withBoth),
        withGst:           ov.withGst ?? 0,
        avgScore:          Math.round(ov.avgScore ?? 0),
        customerMatchRate,
        byState,
        bySource:          (aggStats[0]?.bySource ?? []) as Array<Record<string, unknown>>,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json() as Record<string, string>
    const db   = (await clientPromise).db()
    const now  = new Date().toISOString()

    const email  = (body.email  || "").toLowerCase().trim()
    const mobile = (body.mobile || "").replace(/\D/g, "")
    const gst    = (body.gst    || "").trim().toUpperCase()

    const dealer_score =
      (email  ? 30 : 0) +
      (mobile ? 30 : 0) +
      (gst    ? 20 : 0) +
      (body.city           ? 10 : 0) +
      (body.contact_person ? 10 : 0)

    const dedup_key = email
      ? `email:${email}`
      : mobile ? `phone:${mobile}`
      : gst    ? `gst:${gst}`
      : `name:${(body.dealer_name || "").toLowerCase()}::${(body.city || "").toLowerCase()}`

    const doc = {
      dealer_name:    body.dealer_name    || "",
      contact_person: body.contact_person || "",
      mobile,
      email,
      city:           body.city    || "",
      state:          body.state   || "",
      gst,
      source:         body.source  || "manual",
      dealer_score,
      status:         "new" as const,
      needs_enrichment: !email || !mobile,
      dedup_key,
      notes:          body.notes || "",
      created_at:     now,
      updated_at:     now,
    }

    const result = await db.collection(COLL).updateOne(
      { dedup_key },
      { $setOnInsert: { ...doc }, $set: { updated_at: now } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, upserted: result.upsertedCount > 0, dedup_key })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
