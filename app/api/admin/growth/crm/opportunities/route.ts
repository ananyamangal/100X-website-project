import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stage = searchParams.get("stage") || ""
    const type  = searchParams.get("type")  || ""
    const db    = (await clientPromise).db()
    const filter: Record<string, unknown> = {}
    if (stage) filter.stage = stage
    if (type)  filter.opportunity_type = type
    const docs = await db.collection("crm_opportunities")
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
    const body = await req.json()
    const now  = new Date().toISOString()
    const doc = {
      name:                     String(body.name || "").trim(),
      organization:             String(body.organization || "").trim(),
      state:                    String(body.state || "").trim(),
      opportunity_type:         body.opportunity_type || "other",
      stage:                    body.stage || "identified",
      value:                    Number(body.value) || 0,
      probability:              Number(body.probability) || 0,
      actual_revenue:           Number(body.actual_revenue) || 0,
      owner:                    String(body.owner || "").trim(),
      source_recommendation_id: body.source_recommendation_id || null,
      source_type:              body.source_type || "manual",
      notes:                    String(body.notes || "").trim(),
      next_action:              String(body.next_action || "").trim(),
      created_at:               now,
      updated_at:               now,
      won_at:                   null as string | null,
      lost_at:                  null as string | null,
    }
    if (!doc.name) return NextResponse.json({ error: "name required" }, { status: 400 })
    const db     = (await clientPromise).db()
    const result = await db.collection("crm_opportunities").insertOne(doc)
    return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
