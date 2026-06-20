import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection("gov_kpis").findOne({ key: "main" })
    return NextResponse.json(
      doc
        ? { ...doc, _id: String(doc._id) }
        : { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const update = {
      key: "main",
      totalOrders: Number(body.totalOrders) || 0,
      statesServed: Number(body.statesServed) || 0,
      departmentsServed: Number(body.departmentsServed) || 0,
      unitsSupplied: Number(body.unitsSupplied) || 0,
      yearsExperience: Number(body.yearsExperience) || 0,
      lastUpdated: new Date().toISOString(),
    }
    await db.collection("gov_kpis").updateOne({ key: "main" }, { $set: update }, { upsert: true })
    return NextResponse.json({ ok: true, ...update })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
