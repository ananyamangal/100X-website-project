import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"
import { buildLeadEmail } from "@/lib/lead-email"

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
      console.error("[api/rfq-popup/submit] DB save failed:", dbErr instanceof Error ? dbErr.message.split("\n")[0] : String(dbErr))
      return NextResponse.json({ error: "Failed to save lead to database" }, { status: 500 })
    }

    // E-mail built from every saved field: answers, attachment, page, attribution,
    // UTM, device … (previously only the answers, unescaped, plus two UTM values).
    if (isEmailConfigured()) {
      try {
        const waQuickReply = notificationWhatsapp
          ? `<p style="margin-top:12px"><a href="https://wa.me/${notificationWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("New RFQ lead from website: " + (pageUrl || pagePath))}" style="background:#25d366;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Quick Reply on WhatsApp</a></p>`
          : ""
        const { text, html } = buildLeadEmail({
          title: "New RFQ popup lead",
          intro: `Answered the RFQ popup on ${pagePath || pageUrl || "the website"}.`,
          record: lead,
          id: savedId,
          extraHtml: waQuickReply,
        })
        const answerValues = Object.values(answers as Record<string, string | string[]>).map((a) => (Array.isArray(a) ? a.join(", ") : String(a)))
        const nameGuess = answerValues.find((v) => /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(v) && !/^(yes|no)$/i.test(v))
        const emailResult = await sendAdminEmail({
          to: recipientEmail || undefined,
          subject: `New RFQ popup lead — ${nameGuess ?? "website lead"} — ${pagePath || pageUrl || "website"}`,
          text,
          html,
        })
        if (!emailResult.ok) {
          console.error(`[api/rfq-popup/submit] admin e-mail not sent for lead ${savedId}: ${emailResult.reason}`)
        }
      } catch (err) {
        console.error(`[api/rfq-popup/submit] admin e-mail failed for lead ${savedId}:`, err instanceof Error ? err.message.split("\n")[0] : String(err))
      }
    } else {
      console.error(`[api/rfq-popup/submit] admin e-mail not sent for lead ${savedId}: EMAIL_USER / EMAIL_APP_PASSWORD not configured`)
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
        console.error("[api/rfq-popup/submit] webhook delivery failed:", webhookErr instanceof Error ? webhookErr.message.split("\n")[0] : String(webhookErr))
      }
    }

    return NextResponse.json({ ok: true, savedId })
  } catch (err) {
    console.error("[api/rfq-popup/submit] error:", err instanceof Error ? err.message.split("\n")[0] : String(err))
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}

