import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { isEmailConfigured } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function GET() {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    email: {
      configured: isEmailConfigured(),
      EMAIL_USER: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 6)}…` : "MISSING",
      EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD
        ? `${process.env.EMAIL_APP_PASSWORD.slice(0, 4)}… (${process.env.EMAIL_APP_PASSWORD.length} chars)`
        : "MISSING",
      EMAIL_TO: process.env.EMAIL_TO || "(falls back to EMAIL_USER)",
    },
    mongodb: { connected: false, collections: {} as Record<string, any> },
  }

  try {
    const client = await clientPromise
    const db = client.db()
    report.mongodb.connected = true

    const [popupLeads, submissions, rfqConfig, brochure] = await Promise.all([
      db.collection("rfq_popup_leads").countDocuments(),
      db.collection("submissions").countDocuments(),
      db.collection("rfq_popup_config").findOne({ key: "config" }),
      db.collection("brochure").findOne({ key: "main" }),
    ])

    const lastPopupLead = await db
      .collection("rfq_popup_leads")
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    const lastSubmission = await db
      .collection("submissions")
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    report.mongodb.collections = {
      rfq_popup_leads: {
        count: popupLeads,
        last3: lastPopupLead.map((l) => ({
          _id: String(l._id),
          createdAt: l.createdAt,
          pagePath: l.pagePath,
          hasAttachment: !!l.attachmentUrl,
          answerKeys: Object.keys(l.answers || {}),
        })),
      },
      submissions: {
        count: submissions,
        last3: lastSubmission.map((s) => ({
          _id: String(s._id),
          createdAt: s.createdAt,
          type: s.type,
          name: s.name,
          product: s.product,
        })),
      },
    }

    report.rfq_popup_config = {
      found: !!rfqConfig,
      enabled: rfqConfig?.enabled ?? false,
      recipientEmail: rfqConfig?.recipientEmail || "(empty)",
      notificationWhatsapp: rfqConfig?.notificationWhatsapp || "(empty)",
      notificationWebhook: rfqConfig?.notificationWebhook ? "set" : "(empty)",
      allowFileUpload: rfqConfig?.allowFileUpload ?? false,
    }

    report.brochure = {
      found: !!brochure,
      mainBrochureUrl: brochure?.mainBrochureUrl || "(not set)",
    }
  } catch (err) {
    report.mongodb.error = String(err)
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  })
}
