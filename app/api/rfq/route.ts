import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, organization, department, mobile, email, state, quantity, product, source } = body

    if (!name || !mobile) {
      return NextResponse.json({ error: "Name and mobile are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const lead = {
      name: String(name).trim(),
      organization: String(organization || "").trim(),
      department: String(department || "").trim(),
      mobile: String(mobile).trim(),
      email: String(email || "").trim(),
      state: String(state || "").trim(),
      quantity: String(quantity || "").trim(),
      product: String(product || "").trim(),
      source: String(source || "website").trim(),
      status: "new",
      createdAt: new Date(),
    }

    await db.collection("rfq_leads").insertOne(lead)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
