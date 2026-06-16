/**
 * DELETE /api/admin/growth/director/contacts/[id]  — remove a contact
 * PATCH  /api/admin/growth/director/contacts/[id]  — update a contact
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const result = await db.collection("contact_intelligence").deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const allowed = ["contact_name", "designation", "department", "email", "phone", "source", "confidence"]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  const db = (await clientPromise).db()
  const result = await db.collection("contact_intelligence").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id })
}
