import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFAULT_CONFIG = {
  enabled: false,
  delayMs: 8000,
  sessionOnce: true,
  showOnMobile: true,
  showOnDesktop: true,
  exitIntent: false,
  autoCloseMs: 0,
  triggerPages: [] as string[],
  hiddenPages: ["/admin", "/thank-you", "/brochure-thank-you"],
  recipientEmail: "",
  questions: [
    { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Enter your name", options: [] },
    { id: "phone", type: "phone", label: "Phone Number", required: true, placeholder: "+91 9999999999", options: [] },
    { id: "email", type: "email", label: "Email Address", required: false, placeholder: "your@email.com", options: [] },
    { id: "requirement", type: "textarea", label: "Your Requirement", required: false, placeholder: "Tell us what you need...", options: [] },
  ],
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection("rfq_popup_config").findOne({ key: "config" })
    if (!doc) return NextResponse.json(DEFAULT_CONFIG)
    const { _id, key, updatedAt, ...config } = doc
    return NextResponse.json({ ...DEFAULT_CONFIG, ...config })
  } catch {
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const config = {
      enabled: Boolean(body.enabled),
      delayMs: typeof body.delayMs === "number" ? Math.max(0, body.delayMs) : 8000,
      sessionOnce: body.sessionOnce !== false,
      showOnMobile: body.showOnMobile !== false,
      showOnDesktop: body.showOnDesktop !== false,
      exitIntent: Boolean(body.exitIntent),
      autoCloseMs: typeof body.autoCloseMs === "number" ? Math.max(0, body.autoCloseMs) : 0,
      triggerPages: Array.isArray(body.triggerPages) ? body.triggerPages : [],
      hiddenPages: Array.isArray(body.hiddenPages) ? body.hiddenPages : ["/admin", "/thank-you", "/brochure-thank-you"],
      recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : "",
      questions: Array.isArray(body.questions) ? body.questions : DEFAULT_CONFIG.questions,
      updatedAt: new Date(),
    }
    const client = await clientPromise
    const db = client.db()
    await db.collection("rfq_popup_config").updateOne(
      { key: "config" },
      { $set: { key: "config", ...config } },
      { upsert: true }
    )
    return NextResponse.json(config)
  } catch (err) {
    console.error("RFQ popup config save error:", err)
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 })
  }
}
