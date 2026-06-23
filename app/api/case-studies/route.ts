import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("case_studies")
      .find({ published: true })
      .sort({ createdAt: -1 })
      .toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
