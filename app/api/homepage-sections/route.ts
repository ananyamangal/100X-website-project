import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const revalidate = 60

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db
      .collection("homepage_sections")
      .find({ enabled: true })
      .sort({ order: 1 })
      .toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json([])
  }
}
