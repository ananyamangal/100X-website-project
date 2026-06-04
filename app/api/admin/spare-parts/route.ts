import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get("admin-token")?.value === "authenticated"
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

// GET /api/admin/spare-parts — list all (admin)
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const client = await clientPromise
  const parts = await client.db().collection("spare_parts").find({}).sort({ order: 1, createdAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(parts)))
}

// POST /api/admin/spare-parts — create
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
