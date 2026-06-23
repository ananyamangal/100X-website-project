import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("deployments")
      .find({ images: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })), {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
