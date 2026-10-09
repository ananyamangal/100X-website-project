import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"
import { buildLeadEmail } from "@/lib/lead-email"
import { sanitizeAttribution } from "@/lib/attribution-sanitize"
import { isHoneypotFilled, logHoneypotDiscard } from "@/lib/honeypot"

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
      pageUrl, referrer, attribution,
    } = body

    // Honeypot filled (lib/honeypot.ts): answer like a saved first-time lead so the
    // client proceeds normally, but nothing is saved or e-mailed. One log line, no lead data.
    if (isHoneypotFilled(body)) {
      logHoneypotDiscard("/api/brochure-leads", body, request.headers.get("referer"))
      return NextResponse.json({
        ok: true,
        score: computeLeadScore({ brochureType: brochureType || "main", downloadCount: 1, isConverted: false }),
      })
    }

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
      ...(sanitizeAttribution(attribution) ? { attribution: sanitizeAttribution(attribution) } : {}),
      device,
      score,
      isConverted,
      createdAt: new Date().toISOString(),
    }

    const inserted = await db.collection("brochure_leads").insertOne(lead)
    const id = String(inserted.insertedId)

    // E-mail built from every saved field (escaped); a failure is logged, never thrown.
    if (isEmailConfigured()) {
      try {
        const { text, html } = buildLeadEmail({
          title: "Brochure download lead",
          intro: `Lead score ${lead.score}/100${isConverted ? " · converted lead (has an RFQ on file)" : ""}.`,
          record: lead,
          id,
        })
        const result = await sendAdminEmail({
          subject: `Brochure Download — ${lead.name} · Score ${lead.score}${isConverted ? " · CONVERTED" : ""}`,
          text,
          html,
          replyTo: lead.email,
        })
        if (!result.ok) {
          console.error(`[api/brochure-leads] admin e-mail not sent for lead ${id}: ${result.reason}`)
        }
      } catch (err) {
        console.error(`[api/brochure-leads] admin e-mail failed for lead ${id}:`, err instanceof Error ? err.message.split("\n")[0] : String(err))
      }
    } else {
      console.error(`[api/brochure-leads] admin e-mail not sent for lead ${id}: EMAIL_USER / EMAIL_APP_PASSWORD not configured`)
    }

    return NextResponse.json({ ok: true, score })
  } catch (err) {
    console.error("Brochure lead error:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
