import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { answers, pagePath, pageUrl, utm, userAgent, referrer, attachmentUrl } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Fetch admin config to get recipientEmail and notificationWhatsapp
    let recipientEmail = ""
    let notificationWhatsapp = ""
    try {
      const cfg = await db.collection("rfq_popup_config").findOne({ key: "config" })
      recipientEmail = (cfg?.recipientEmail as string) || ""
      notificationWhatsapp = (cfg?.notificationWhatsapp as string) || ""
    } catch {
      // ignore config fetch failure
    }

    const lead = {
      answers,
      pagePath: pagePath || "",
      pageUrl: pageUrl || "",
      utm: utm || {},
      userAgent: userAgent || "",
      referrer: referrer || "",
      attachmentUrl: attachmentUrl || null,
      createdAt: new Date().toISOString(),
    }

    // Save to MongoDB
    try {
      await db.collection("rfq_popup_leads").insertOne(lead)
    } catch (dbErr) {
      console.error("RFQ popup lead DB save failed:", dbErr)
    }

    // Send email notification
    if (isEmailConfigured()) {
      const to = recipientEmail || process.env.EMAIL_TO || process.env.EMAIL_USER
      const answersHtml = Object.entries(answers as Record<string, string | string[]>)
        .map(([q, a]) => {
          const val = Array.isArray(a) ? a.join(", ") : String(a)
          return `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:180px">${q}</td><td style="padding:6px 12px">${val}</td></tr>`
        })
        .join("")

      const waLink = notificationWhatsapp
        ? `<p style="margin-top:12px"><a href="https://wa.me/${notificationWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('New RFQ lead from website: ' + pageUrl)}" style="background:#25d366;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Reply on WhatsApp</a></p>`
        : ""

      const attachmentHtml = attachmentUrl
        ? `<p style="font-size:13px;margin-top:8px"><strong>Attachment:</strong> <a href="${attachmentUrl}">${attachmentUrl}</a></p>`
        : ""

      await sendAdminEmail({
        subject: `New RFQ Popup Lead — ${pagePath || pageUrl}`,
        text: Object.entries(answers as Record<string, unknown>)
          .map(([q, a]) => `${q}: ${Array.isArray(a) ? a.join(", ") : a}`)
          .join("\n") + (attachmentUrl ? `\nAttachment: ${attachmentUrl}` : ""),
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px">
          <h2 style="color:#16a34a;margin:0 0 16px">New RFQ Popup Lead</h2>
          <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;font-size:14px;color:#111827">
            ${answersHtml}
          </table>
          ${attachmentHtml}
          <p style="font-size:12px;color:#6b7280;margin-top:16px">
            Page: <a href="${pageUrl}">${pageUrl}</a><br/>
            ${utm?.utm_source ? `UTM Source: ${utm.utm_source}<br/>` : ""}
            ${utm?.utm_campaign ? `Campaign: ${utm.utm_campaign}` : ""}
          </p>
          ${waLink}
        </div>`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("RFQ popup submit error:", err)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}
