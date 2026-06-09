import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { ObjectId } from "mongodb"
import {
  HOMEPAGE_SECTIONS,
  PRODUCT_SECTIONS,
  PageSectionRecord,
  resolveSections,
} from "@/lib/pageSections"

// GET /api/admin/page-sections?pageKey=homepage
// Returns all sections for a page, resolved against DB records
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "products.view")
  if (auth instanceof NextResponse) return auth

  const pageKey = req.nextUrl.searchParams.get("pageKey") ?? "homepage"

  const client = await clientPromise
  const db = client.db()
  const records = await db
    .collection<PageSectionRecord>("page_sections")
    .find({ pageKey })
    .toArray()

  const serialised = records.map(r => ({
    ...r,
    _id: r._id?.toString(),
  }))

  const defs = pageKey === "homepage" ? HOMEPAGE_SECTIONS : PRODUCT_SECTIONS
  const resolved = resolveSections(defs, serialised as PageSectionRecord[])

  return NextResponse.json({ resolved, raw: serialised })
}

// POST /api/admin/page-sections — upsert one section record
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "products.edit")
  if (auth instanceof NextResponse) return auth

  const body: Partial<PageSectionRecord> = await req.json()
  if (!body.pageKey || !body.sectionKey) {
    return NextResponse.json({ error: "pageKey and sectionKey required" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db()
  const now = new Date()

  const { _id, ...rest } = body
  const update = { ...rest, updatedAt: now }

  const result = await db.collection("page_sections").updateOne(
    { pageKey: body.pageKey, sectionKey: body.sectionKey },
    { $set: update, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )

  return NextResponse.json({ ok: true, upsertedId: result.upsertedId?.toString() ?? null })
}

// PUT /api/admin/page-sections — bulk reorder
// Body: { pageKey: string, order: { sectionKey: string, order: number }[] }
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "products.edit")
  if (auth instanceof NextResponse) return auth

  const { pageKey, order } = await req.json() as {
    pageKey: string
    order: { sectionKey: string; order: number }[]
  }

  if (!pageKey || !Array.isArray(order)) {
    return NextResponse.json({ error: "pageKey and order[] required" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db()
  const now = new Date()

  const ops = order.map(({ sectionKey, order: o }) =>
    db.collection("page_sections").updateOne(
      { pageKey, sectionKey },
      { $set: { order: o, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )
  )

  await Promise.all(ops)
  return NextResponse.json({ ok: true, updated: order.length })
}
