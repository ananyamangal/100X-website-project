import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad/i.test(ua)) return "tablet"
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile"
  return "desktop"
}

function computeLeadScore(opts: {
  brochureType: string
  downloadCount: number
  isConverted: boolean
}): number {
  let score = 0
  score += opts.brochureType === "product" ? 25 : 10
  if (opts.downloadCount > 1) score += 25
  if (opts.isConverted) score += 50
  return Math.min(score, 100)
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const leads = await db
      .collection("brochure_leads")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()
    return NextResponse.json(leads.map((l) => ({ ...l, _id: String(l._id) })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, phone, email, organization, state, requirement,
      source, brochureType, brochureName, productName,
      pageUrl, referrer, company_website,
    } = body

    if (company_website?.trim()) return NextResponse.json({ ok: true })

    if (!name?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name, phone, and email are required." }, { status: 400 })
    }
    const digits = phone.replace(/\D/g, "")
    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    const ua = request.headers.get("user-agent") || ""
    const device = detectDevice(ua)

    const client = await clientPromise
    const db = client.db()

    // Check download count (same phone) + conversion status
    const [downloadCount, rfqMatch] = await Promise.all([
      db.collection("brochure_leads").countDocuments({ phone: digits }),
      db.collection("submissions").findOne({ phone: { $in: [digits, phone.trim()] } }),
    ])

    const isConverted = !!rfqMatch
    const score = computeLeadScore({
      brochureType: brochureType || "main",
      downloadCount: downloadCount + 1,
      isConverted,
    })

    const lead = {
      name: name.trim(),
      phone: digits,
      email: email.trim(),
      organization: organization?.trim() || "",
      state: state?.trim() || "",
      requirement: requirement?.trim() || "",
      source: source || "unknown",
      brochureType: brochureType || "main",
      brochureName: brochureName?.trim() || "",
      productName: productName?.trim() || "",
      pageUrl: pageUrl || "",
      referrer: referrer || "",
      device,
      score,
      isConverted,
      createdAt: new Date().toISOString(),
    }

    await db.collection("brochure_leads").insertOne(lead)

    // Send email
    if (isEmailConfigured()) {
      const rows = [
        ["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email],
        ["Organization", lead.organization || "—"], ["State", lead.state || "—"],
        ["Requirement", lead.requirement || "—"],
        ["Product", lead.productName || "—"], ["Brochure", lead.brochureName || lead.brochureType],
        ["Source", lead.source], ["Device", lead.device],
        ["Score", String(lead.score)], ["Converted", isConverted ? "Yes ✓" : "No"],
        ["Page", lead.pageUrl], ["Referrer", lead.referrer || "—"],
      ]
      await sendAdminEmail({
        subject: `Brochure Download — ${lead.name} · Score ${lead.score}${isConverted ? " · CONVERTED" : ""}`,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `<div style="font-family:sans-serif;max-width:540px">
          <h2 style="color:#16a34a;margin:0 0 4px">Brochure Download Lead</h2>
          <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Score: <strong>${lead.score}/100</strong>${isConverted ? ' &nbsp;🔁 Converted lead' : ''}</p>
          <table style="border-collapse:collapse;width:100%;font-size:13px">
            ${rows.map(([k, v]) => `<tr><td style="padding:5px 12px;background:#f3f4f6;font-weight:600;width:130px">${k}</td><td style="padding:5px 12px">${v}</td></tr>`).join("")}
          </table>
        </div>`,
        replyTo: lead.email,
      })
    }

    return NextResponse.json({ ok: true, score })
  } catch (err) {
    console.error("Brochure lead error:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
