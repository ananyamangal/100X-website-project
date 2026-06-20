import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, company, mobile, email, state,
      gemSellerId, tenderName, tenderClosingDate,
      product, message, source,
    } = body

    if (!name?.trim() || !company?.trim() || !mobile?.trim() || !email?.trim() || !state?.trim() || !product?.trim()) {
      return NextResponse.json({ error: "Required fields missing: name, company, mobile, email, state, product" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const lead = {
      name: name.trim(),
      company: company.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      state: state.trim(),
      gemSellerId: gemSellerId?.trim() || "",
      tenderName: tenderName?.trim() || "",
      tenderClosingDate: tenderClosingDate?.trim() || "",
      product: product.trim(),
      message: message?.trim() || "",
      source: source || "oem_authorization",
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("oem_leads").insertOne(lead)
    return NextResponse.json({ success: true, id: String(result.insertedId) })
  } catch (err) {
    console.error("OEM lead error:", err)
    return NextResponse.json({ error: "Submission failed" }, { status: 500 })
  }
}
