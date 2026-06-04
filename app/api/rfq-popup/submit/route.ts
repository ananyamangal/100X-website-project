import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { answers, pagePath, pageUrl, utm, userAgent, referrer, attachmentUrl } = body
    // Extract attribution fields from the utm object (populated by initSessionAttribution + mergePersistedAttributionFromUrl)
    const attr = (utm || {}) as Record<string, string>

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Fetch admin config for notification settings
    let recipientEmail = ""
    let notificationWhatsapp = ""
    let notificationWebhook = ""
    try {
      const cfg = await db.collection("rfq_popup_config").findOne({ key: "config" })
      recipientEmail = (cfg?.recipientEmail as string) || ""
      notificationWhatsapp = (cfg?.notificationWhatsapp as string) || ""
      notificationWebhook = (cfg?.notificationWebhook as string) || ""
    } catch {
      // ignore config fetch failure
    }

    const lead = {
      answers,
      pagePath: pagePath || "",
      pageUrl: pageUrl || "",
      utm: utm || {},
      // Top-level attribution fields for easy MongoDB aggregation
      landingPage: attr.landingPage || pagePath || "",
      firstPageVisited: attr.firstPageVisited || attr.landingPage || pagePath || "",
      sessionPageCount: parseInt(attr.sessionPageCount || "1", 10),
      entryReferrer: attr.entryReferrer || referrer || "",
      utmSource: attr.utm_source || "",
      utmMedium: attr.utm_medium || "",
      utmCampaign: attr.utm_campaign || "",
      utmTerm: attr.utm_term || "",
      userAgent: userAgent || "",
      referrer: referrer || "",
      attachmentUrl: attachmentUrl || null,
      createdAt: new Date().toISOString(),
    }

    // Save to MongoDB — return 500 if this fails so the client knows
    let savedId: string | null = null
    try {
      const result = await db.collection("rfq_popup_leads").insertOne(lead)
      savedId = String(result.insertedId)
    } catch (dbErr) {
      console.error("RFQ popup lead DB save failed:", dbErr)
      return NextResponse.json({ error: "Failed to save lead to database", detail: String(dbErr) }, { status: 500 })
    }

    // Build answer summary for notifications
    const answerLines = Object.entries(answers as Record<string, string | string[]>)
      .map(([q, a]) => `${q}: ${Array.isArray(a) ? a.join(", ") : a}`)
      .join("\n")

    const answersHtml = Object.entries(answers as Record<string, string | string[]>)
      .map(([q, a]) => {
        const val = Array.isArray(a) ? a.join(", ") : String(a)
        return `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:180px">${q}</td><td style="padding:6px 12px">${val}</td></tr>`
      })
      .join("")

    const attachmentHtml = attachmentUrl
      ? `<p style="font-size:13px;margin-top:8px"><strong>Attachment:</strong> <a href="${attachmentUrl}">${attachmentUrl}</a></p>`
      : ""

    const waQuickReply = notificationWhatsapp
      ? `<p style="margin-top:12px"><a href="https://wa.me/${notificationWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('New RFQ lead from website: ' + (pageUrl || pagePath))}" style="background:#25d366;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Quick Reply on WhatsApp</a></p>`
      : ""

    // Send email notification (uses recipientEmail from DB config, fallback to env)
    if (isEmailConfigured()) {
      const emailResult = await sendAdminEmail({
        to: recipientEmail || undefined,
        subject: `New RFQ Lead — ${pagePath || pageUrl}`,
        text: answerLines + (attachmentUrl ? `\nAttachment: ${attachmentUrl}` : ""),
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px">
          <h2 style="color:#16a34a;margin:0 0 16px">New RFQ Lead</h2>
          <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;font-size:14px;color:#111827">
            ${answersHtml}
          </table>
          ${attachmentHtml}
          <p style="font-size:12px;color:#6b7280;margin-top:16px">
            Page: <a href="${pageUrl}">${pageUrl}</a><br/>
            ${utm?.utm_source ? `UTM Source: ${utm.utm_source}<br/>` : ""}
            ${utm?.utm_campaign ? `Campaign: ${utm.utm_campaign}` : ""}
          </p>
          ${waQuickReply}
        </div>`,
      })
      if (!emailResult.ok) {
        console.error("RFQ email send failed:", emailResult)
      }
    }

    // Webhook notification (for n8n / Zapier / WhatsApp Business API integrations)
    if (notificationWebhook) {
      try {
        await fetch(notificationWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "rfq_lead",
            lead: {
              ...answers,
              pagePath,
              pageUrl,
              attachmentUrl: attachmentUrl || null,
              utm: utm || {},
              timestamp: lead.createdAt,
            },
            whatsapp: notificationWhatsapp,
          }),
        })
      } catch (webhookErr) {
        console.error("RFQ webhook delivery failed:", webhookErr)
      }
    }

    return NextResponse.json({ ok: true, savedId })
  } catch (err) {
    console.error("RFQ popup submit error:", err)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}
