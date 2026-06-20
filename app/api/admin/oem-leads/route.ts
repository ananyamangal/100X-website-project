import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const source = searchParams.get("source")

    const query: Record<string, string> = {}
    if (status) query.status = status
    if (source) query.source = source

    const client = await clientPromise
    const db = client.db()
    const leads = await db.collection("oem_leads")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()

    return NextResponse.json(leads.map((l) => ({ ...l, _id: String(l._id) })))
  } catch (err) {
    console.error("OEM leads fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}
