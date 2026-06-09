import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

// GET /api/admin/spare-parts — list all (admin)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = await clientPromise
  const parts = await client.db().collection("spare_parts").find({}).sort({ order: 1, createdAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(parts)))
}

// POST /api/admin/spare-parts — create
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const now = new Date().toISOString()
  const doc = {
    ...body,
    slug: body.slug || slug(body.name || "part"),
    isPublished: body.isPublished ?? true,
    createdAt: now,
    updatedAt: now,
  }
  const client = await clientPromise
  const result = await client.db().collection("spare_parts").insertOne(doc)
  return NextResponse.json({ _id: result.insertedId.toString(), ...doc }, { status: 201 })
}
