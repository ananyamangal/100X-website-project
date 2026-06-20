import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFAULTS = {
  totalOrders: 500,
  statesServed: 15,
  departmentsServed: 80,
  unitsSupplied: 2000,
  yearsExperience: 12,
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection("gov_kpis").findOne({ key: "main" })
    return NextResponse.json(doc ? { ...doc, _id: String(doc._id) } : DEFAULTS)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}
