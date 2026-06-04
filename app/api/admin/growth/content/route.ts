import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { ContentDraft } from "@/lib/growth-os/types"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""

  const db = (await clientPromise).db()
  const filter: Record<string, string> = {}
  if (status) filter.status = status

  const items = await db.collection("growth_os_drafts").find(filter).sort({ createdAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(items)))
}

export async function POST(req: NextRequest) {
  const body: Partial<ContentDraft> = await req.json()
  const db = (await clientPromise).db()
  const doc = {
    title: body.title || "",
    targetIntent: body.targetIntent || "",
    opportunitySource: body.opportunitySource || "manual",
    confidenceScore: body.confidenceScore || 70,
    expectedImpact: body.expectedImpact || "",
    slug: body.slug || "",
    content: body.content || "",
    status: "draft",
    riskLevel: body.riskLevel || "medium",
    targetUrl: body.targetUrl || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const result = await db.collection("growth_os_drafts").insertOne(doc)

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "manual",
    action: `Draft created: ${doc.title}`,
    reason: `Content brief — ${doc.targetIntent}`,
    expectedImpact: doc.expectedImpact,
    level: "info",
    module: "content",
  })

  return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, content, title, notes } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = (await clientPromise).db()
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (status) update.status = status
  if (content !== undefined) update.content = content
  if (title) update.title = title

  await db.collection("growth_os_drafts").updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "manual",
    action: `Draft ${status || "updated"}: ${id}`,
    reason: notes || `Status changed to ${status}`,
    expectedImpact: "",
    level: status === "published" ? "success" : status === "rejected" ? "warning" : "info",
    module: "content",
  })

  return NextResponse.json({ ok: true })
}
