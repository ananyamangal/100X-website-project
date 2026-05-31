import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    // Fetch both lead sources
    const [popupLeads, submissions] = await Promise.all([
      db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
      db.collection("submissions").find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
    ])

    // Normalize into a unified shape
    const allLeads = [
      ...popupLeads.map((l) => ({
        _id: String(l._id),
        source: "rfq_popup",
        name: l.answers?.["Your Name"] || l.answers?.["Name"] || "",
        phone: l.answers?.["Phone Number"] || l.answers?.["Phone"] || "",
        email: l.answers?.["Email Address"] || l.answers?.["Email"] || "",
        product: l.answers?.["Product"] || l.answers?.["Product Interested"] || "",
        page: l.pagePath || "",
        utm_source: l.utm?.utm_source || "",
        utm_campaign: l.utm?.utm_campaign || "",
        hasAttachment: !!l.attachmentUrl,
        createdAt: l.createdAt,
      })),
      ...submissions.map((s) => ({
        _id: String(s._id),
        source: s.type || "submission",
        name: s.name || "",
        phone: s.phone || "",
        email: s.email || "",
        product: s.product || s.productName || "",
        page: s.form_page_path || "",
        utm_source: s.attribution?.utm_source || "",
        utm_campaign: s.attribution?.utm_campaign || "",
        hasAttachment: !!(s.uploadUrl),
        createdAt: s.createdAt,
      })),
    ]

    // Sort combined by date desc
    allLeads.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    // Aggregate: by source
    const bySource: Record<string, number> = {}
    const byPage: Record<string, number> = {}
    const byProduct: Record<string, number> = {}
    const byUtmSource: Record<string, number> = {}
    const byDate: Record<string, number> = {}

    for (const lead of allLeads) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1
      if (lead.page) byPage[lead.page] = (byPage[lead.page] || 0) + 1
      if (lead.product) byProduct[lead.product] = (byProduct[lead.product] || 0) + 1
      const src = lead.utm_source || "direct"
      byUtmSource[src] = (byUtmSource[src] || 0) + 1
      const day = lead.createdAt ? lead.createdAt.slice(0, 10) : "unknown"
      byDate[day] = (byDate[day] || 0) + 1
    }

    // Top-N helpers
    const top = (map: Record<string, number>, n = 10) =>
      Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([label, count]) => ({ label, count }))

    return NextResponse.json({
      total: allLeads.length,
      popupLeadsCount: popupLeads.length,
      submissionsCount: submissions.length,
      rfqConversions: submissions.filter((s) => s.type === "rfq").length,
      bySource: top(bySource, 20),
      byPage: top(byPage, 15),
      byProduct: top(byProduct, 10),
      byUtmSource: top(byUtmSource, 10),
      byDate: Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      recentLeads: allLeads.slice(0, 50),
    })
  } catch (err) {
    console.error("Lead analytics error:", err)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}
