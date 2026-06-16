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
    if (stage) filter.stage          = stage
    if (type)  filter.campaign_type  = type
    const docs = await db.collection("ads_workflow_items")
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
      campaign_type:            body.campaign_type || "search",
      stage:                    body.stage || "recommendation",
      source_recommendation_id: body.source_recommendation_id || null,
      brief:                    String(body.brief || "").trim(),
      notes:                    String(body.notes || "").trim(),
      owner:                    String(body.owner || "").trim(),
      budget:                   Number(body.budget) || 0,
      actual_spend:             0,
      actual_clicks:            0,
      actual_conversions:       0,
      created_at:               now,
      updated_at:               now,
      deployed_at:              null as string | null,
    }
    if (!doc.name) return NextResponse.json({ error: "name required" }, { status: 400 })
    const db     = (await clientPromise).db()
    const result = await db.collection("ads_workflow_items").insertOne(doc)
    return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body   = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const db  = (await clientPromise).db()
    const now = new Date().toISOString()
    const update: Record<string, unknown> = { updated_at: now }
    const fields = [
      "name", "campaign_type", "stage", "source_recommendation_id",
      "brief", "notes", "owner", "budget",
      "actual_spend", "actual_clicks", "actual_conversions",
    ]
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f]
    }
    if (body.stage === "deployed" && !body.deployed_at) update.deployed_at = now
    await db.collection("ads_workflow_items").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
