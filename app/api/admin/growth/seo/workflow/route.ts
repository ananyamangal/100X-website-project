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
    const docs = await db.collection("seo_workflow_items")
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
      title:                  String(body.title || "").trim(),
      target_keyword:         String(body.target_keyword || "").trim(),
      target_url:             String(body.target_url || "").trim(),
      content_type:           body.content_type || "blog",
      stage:                  body.stage || "identified",
      source_opportunity_id:  body.source_opportunity_id || null,
      draft_content:          body.draft_content || "",
      publish_url:            body.publish_url || "",
      notes:                  String(body.notes || "").trim(),
      owner:                  String(body.owner || "").trim(),
      created_at:             now,
      updated_at:             now,
      published_at:           null as string | null,
    }
    if (!doc.title) return NextResponse.json({ error: "title required" }, { status: 400 })
    const db     = (await clientPromise).db()
    const result = await db.collection("seo_workflow_items").insertOne(doc)
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
      "title", "target_keyword", "target_url", "content_type", "stage",
      "source_opportunity_id", "draft_content", "publish_url", "notes", "owner",
    ]
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f]
    }
    if (body.stage === "published" && !body.published_at) update.published_at = now
    await db.collection("seo_workflow_items").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
