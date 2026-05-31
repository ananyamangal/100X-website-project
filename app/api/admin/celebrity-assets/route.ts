import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db.collection("celebrity_assets").find({}).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const doc = {
      name: body.name || "Untitled",
      category: body.category || "celebrity",
      tags: Array.isArray(body.tags) ? body.tags : [],
      altText: body.altText || "",
      description: body.description || "",
      usageNotes: body.usageNotes || "",
      imageUrl: body.imageUrl || "",
      cloudinaryPublicId: body.cloudinaryPublicId || "",
      width: body.width || null,
      height: body.height || null,
      resourceType: body.resourceType || "image",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = await db.collection("celebrity_assets").insertOne(doc)
    return NextResponse.json({ ...doc, _id: String(result.insertedId) })
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
