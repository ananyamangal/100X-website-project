import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { ObjectId } from "mongodb"
import { PageSectionRecord } from "@/lib/pageSections"

// PATCH /api/admin/page-sections/[id] — partial update of one record
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(req, "products.edit")
  if (auth instanceof NextResponse) return auth

  const { id } = params

  // Support update by _id OR by pageKey+sectionKey composite
  const body: Partial<PageSectionRecord> & { pageKey?: string; sectionKey?: string } = await req.json()
  const { _id, createdAt, ...fields } = body as Record<string, unknown>

  const client = await clientPromise
  const db = client.db()
  const now = new Date()

  let filter: Record<string, unknown>

  if (id === "by-key") {
    // PATCH /api/admin/page-sections/by-key  body: { pageKey, sectionKey, ...fields }
    if (!body.pageKey || !body.sectionKey) {
      return NextResponse.json({ error: "pageKey and sectionKey required" }, { status: 400 })
    }
    filter = { pageKey: body.pageKey, sectionKey: body.sectionKey }
  } else {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }
    filter = { _id: new ObjectId(id) }
  }

  const result = await db.collection("page_sections").updateOne(
    filter,
    { $set: { ...fields, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: id === "by-key" }
  )

  if (result.matchedCount === 0 && result.upsertedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/page-sections/[id] — remove a DB override (section reverts to defaults)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(req, "products.edit")
  if (auth instanceof NextResponse) return auth

  const { id } = params

  const client = await clientPromise
  const db = client.db()

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const result = await db
    .collection("page_sections")
    .deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
