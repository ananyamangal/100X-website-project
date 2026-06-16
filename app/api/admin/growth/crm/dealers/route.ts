import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stage = searchParams.get("stage") || ""
    const db    = (await clientPromise).db()
    const filter: Record<string, unknown> = {}
    if (stage) filter.stage = stage
    const docs = await db.collection("crm_dealers")
      .find(filter)
      .sort({ updated_at: -1 })
      .toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: String(d._id) })))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const now   = new Date().toISOString()
    const doc = {
      name:                     String(body.name || "").trim(),
      company:                  String(body.company || "").trim(),
      state:                    String(body.state || "").trim(),
      phone:                    String(body.phone || "").trim(),
      email:                    String(body.email || "").trim(),
      stage:                    body.stage || "lead",
      gem_status:               body.gem_status || "unknown",
      oem_status:               body.oem_status || "unknown",
      expected_revenue:         Number(body.expected_revenue) || 0,
      notes:                    String(body.notes || "").trim(),
      last_contact_at:          body.last_contact_at || null,
      next_followup_at:         body.next_followup_at || null,
      source_recommendation_id: body.source_recommendation_id || null,
      source_type:              body.source_type || "manual",
      created_at:               now,
      updated_at:               now,
    }
    if (!doc.name) return NextResponse.json({ error: "name required" }, { status: 400 })
    const db     = (await clientPromise).db()
    const result = await db.collection("crm_dealers").insertOne(doc)
    return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
