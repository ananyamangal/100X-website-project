import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection("case_studies").findOne({ slug: params.slug, published: true })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ...doc, _id: String(doc._id) })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
