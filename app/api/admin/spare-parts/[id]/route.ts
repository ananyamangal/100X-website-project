import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-token")?.value === "authenticated"
}

function toObjectId(id: string) {
  try { return new ObjectId(id) } catch { return null }
}

// GET /api/admin/spare-parts/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const oid = toObjectId(id)
  const client = await clientPromise
  const part = await client.db().collection("spare_parts").findOne(oid ? { _id: oid } : { slug: id })
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(JSON.parse(JSON.stringify(part)))
}

// PUT /api/admin/spare-parts/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  const body = await req.json()
  const { _id, createdAt, ...update } = body
  const client = await clientPromise
  const result = await client.db().collection("spare_parts").findOneAndUpdate(
    { _id: oid },
    { $set: { ...update, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  )
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(JSON.parse(JSON.stringify(result)))
}

// DELETE /api/admin/spare-parts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  const client = await clientPromise
  await client.db().collection("spare_parts").deleteOne({ _id: oid })
  return NextResponse.json({ ok: true })
}
