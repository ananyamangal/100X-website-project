import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db.collection("deployments").find({}).sort({ createdAt: -1 }).toArray()
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
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = await db.collection("deployments").insertOne(doc)
    return NextResponse.json({ ...doc, _id: String(result.insertedId) })
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
