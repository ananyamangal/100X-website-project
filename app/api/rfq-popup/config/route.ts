import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const revalidate = 600

const DEFAULT_CONFIG = {
  enabled: false,
  delayMs: 8000,
  sessionOnce: true,
  neverAfterSubmission: true,
  showOnMobile: true,
  showOnDesktop: true,
  exitIntent: false,
  autoCloseMs: 0,
  triggerPages: [] as string[],
  hiddenPages: ["/admin", "/thank-you", "/brochure-thank-you"],
  allowFileUpload: false,
  maxFileSizeMb: 5,
  allowedFileTypes: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"],
  questions: [
    { id: "name", type: "text", label: "Your Name", required: true, placeholder: "Enter your name", options: [] },
    { id: "phone", type: "phone", label: "Phone Number", required: true, placeholder: "+91 9999999999", options: [] },
    { id: "email", type: "email", label: "Email Address", required: false, placeholder: "your@email.com", options: [] },
    { id: "requirement", type: "textarea", label: "Your Requirement", required: false, placeholder: "Tell us what you need...", options: [] },
  ],
}

export async function GET() {
  // TEST_MODE: bypass MongoDB for local popup behavior testing
  if (process.env.POPUP_TEST_MODE === "1") {
    return NextResponse.json({ ...DEFAULT_CONFIG, enabled: true, delayMs: 300, sessionOnce: false, neverAfterSubmission: false })
  }
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
