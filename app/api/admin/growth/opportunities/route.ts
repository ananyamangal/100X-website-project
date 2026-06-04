import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Opportunity } from "@/lib/growth-os/types"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const module = searchParams.get("module") || ""

  const db = (await clientPromise).db()
  const filter: Record<string, string> = {}
  if (status) filter.status = status
  if (module) filter.module = module

  const items = await db.collection("growth_os_opportunities").find(filter).sort({ createdAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(items)))
}

export async function POST(req: NextRequest) {
  const body: Partial<Opportunity> = await req.json()
  const db = (await clientPromise).db()
  const doc = {
    title: body.title || "",
    description: body.description || "",
    module: body.module || "seo",
    source: body.source || "manual",
    businessValue: body.businessValue || "medium",
    seoValue: body.seoValue || "medium",
    geoValue: body.geoValue || "medium",
    dealerImpact: body.dealerImpact || "medium",
    effort: body.effort || "medium",
    status: body.status || "pending",
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const result = await db.collection("growth_os_opportunities").insertOne(doc)

  // Log the creation
  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "manual",
    action: `New opportunity: ${doc.title}`,
    reason: `Created via Opportunity Engine — ${doc.source}`,
    expectedImpact: `Business: ${doc.businessValue}, SEO: ${doc.seoValue}`,
    level: "info",
    module: "opportunities",
  })

  return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, notes } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = (await clientPromise).db()
  const update: Record<string, string> = { status, updatedAt: new Date().toISOString() }
  if (notes !== undefined) update.notes = notes

  await db.collection("growth_os_opportunities").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "manual",
    action: `Opportunity ${status}: ${id}`,
    reason: notes || `Status changed to ${status}`,
    expectedImpact: "",
    level: status === "approved" ? "success" : "info",
    module: "opportunities",
  })

  return NextResponse.json({ ok: true })
}
