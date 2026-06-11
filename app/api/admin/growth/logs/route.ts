import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { GrowthLog } from "@/lib/growth-os/types"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const moduleName = searchParams.get("module") || ""
  const level = searchParams.get("level") || ""
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")

  const db = (await clientPromise).db()
  const filter: Record<string, string> = {}
  if (moduleName) filter.module = moduleName
  if (level) filter.level = level

  const [logs, total] = await Promise.all([
    db.collection("growth_os_logs").find(filter).sort({ ts: -1 }).skip(offset).limit(limit).toArray(),
    db.collection("growth_os_logs").countDocuments(filter),
  ])

  return NextResponse.json({ logs: JSON.parse(JSON.stringify(logs)), total })
}

export async function POST(req: NextRequest) {
  const body: Partial<GrowthLog> = await req.json()
  const db = (await clientPromise).db()
  const doc = {
    ts: body.ts || new Date().toISOString(),
    agent: body.agent || "manual",
    action: body.action || "",
    reason: body.reason || "",
    expectedImpact: body.expectedImpact || "",
    actualImpact: body.actualImpact || "",
    level: body.level || "info",
    before: body.before || "",
    after: body.after || "",
    rollbackData: body.rollbackData || "",
    module: body.module || "system",
  }
  const result = await db.collection("growth_os_logs").insertOne(doc)
  return NextResponse.json({ _id: String(result.insertedId), ...doc }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const db = (await clientPromise).db()
  await db.collection("growth_os_logs").deleteOne({ _id: new ObjectId(id) })
  return NextResponse.json({ ok: true })
}
