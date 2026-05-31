import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const leads = await db
      .collection("brochure_leads")
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()
    return NextResponse.json(leads.map((l) => ({ ...l, _id: String(l._id) })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, organization, state, source, brochureType, pageUrl } = body

    // Honeypot
    if (body.company_website?.trim()) {
      return NextResponse.json({ ok: true }) // silent reject
    }

    if (!name?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name, phone, and email are required." }, { status: 400 })
    }

    const digits = phone.replace(/\D/g, "")
    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email.trim())) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const lead = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      organization: organization?.trim() || "",
      state: state?.trim() || "",
      source: source || "unknown",
      brochureType: brochureType || "main",
      pageUrl: pageUrl || "",
      createdAt: new Date().toISOString(),
    }

    await db.collection("brochure_leads").insertOne(lead)

    // Email notification
    if (isEmailConfigured()) {
      await sendAdminEmail({
        subject: `Brochure Download — ${name.trim()} (${source || "unknown"})`,
        text: `New brochure download lead:\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email}\nOrganization: ${lead.organization || "-"}\nState: ${lead.state || "-"}\nSource: ${lead.source}\nPage: ${lead.pageUrl}`,
        html: `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#16a34a">Brochure Download Lead</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px">
            ${[["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email], ["Organization", lead.organization || "—"], ["State", lead.state || "—"], ["Source", lead.source], ["Page", lead.pageUrl]].map(([k, v]) => `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:140px">${k}</td><td style="padding:6px 12px">${v}</td></tr>`).join("")}
          </table>
        </div>`,
        replyTo: lead.email,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Brochure lead save error:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
