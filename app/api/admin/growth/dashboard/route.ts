import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

function daysBefore(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoStr(d: Date) { return d.toISOString() }

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const weekStart = daysBefore(7)
    const monthStart = daysBefore(30)

    const [popup, subs, gemInq, brochureLeads, growthLogs, automations, opportunities, drafts] =
      await Promise.all([
        db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(2000).toArray(),
        db.collection("submissions").find({}).sort({ createdAt: -1 }).limit(2000).toArray(),
        db.collection("gem_inquiries").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
        db.collection("brochure_leads").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
        db.collection("growth_os_logs").countDocuments(),
        db.collection("growth_os_automations").find({}).toArray(),
        db.collection("growth_os_opportunities").countDocuments({ status: "pending" }),
        db.collection("growth_os_drafts").find({}).toArray(),
      ])

    const allLeads = [
      ...popup.map(l => ({ source: "rfq_popup", name: l.answers?.["Your Name"] || "", phone: l.answers?.["Phone Number"] || "", email: l.answers?.["Email Address"] || "", product: l.answers?.["Product"] || "", _id: String(l._id), createdAt: l.createdAt || "" })),
      ...subs.map(s => ({ source: s.type || "contact", name: s.name || "", phone: s.phone || "", email: s.email || "", product: s.product || s.productName || "", _id: String(s._id), createdAt: s.createdAt || "" })),
      ...gemInq.map(g => ({ source: "gem_inquiry", name: g.name || "", phone: g.phone || "", email: g.email || "", product: g.product || "", _id: String(g._id), createdAt: g.createdAt || "" })),
      ...brochureLeads.map(b => ({ source: "brochure", name: b.name || "", phone: b.phone || "", email: b.email || "", product: b.product || "", _id: String(b._id), createdAt: b.createdAt || "" })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    const inRange = (lead: { createdAt: string }, from: Date) =>
      lead.createdAt && new Date(lead.createdAt) >= from

    const byType = allLeads.reduce((acc, l) => {
      const s = l.source
      if (s === "rfq_popup" || s === "rfq") acc.rfq++
      else if (s === "gem_inquiry") acc.gem++
      else if (s === "brochure") acc.brochure++
      else if (s === "tender") acc.tender++
      else acc.contact++
      return acc
    }, { rfq: 0, gem: 0, contact: 0, brochure: 0, wa: 0, tender: 0 })

    // 30-day trend
    const trendMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = daysBefore(i)
      trendMap[d.toISOString().slice(0, 10)] = 0
    }
    for (const l of allLeads) {
      if (!l.createdAt) continue
      const day = l.createdAt.slice(0, 10)
      if (day in trendMap) trendMap[day]++
    }
    const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count }))

    const todayLogs = await db.collection("growth_os_logs").countDocuments({ ts: { $gte: isoStr(todayStart) } })

    return NextResponse.json({
      leads: {
        today: allLeads.filter(l => inRange(l, todayStart)).length,
        week: allLeads.filter(l => inRange(l, weekStart)).length,
        month: allLeads.filter(l => inRange(l, monthStart)).length,
        total: allLeads.length,
      },
      byType,
      trend,
      recentLeads: allLeads.slice(0, 20),
      automations: {
        active: automations.filter(a => a.status === "active").length,
        paused: automations.filter(a => a.status === "paused").length,
        total: automations.length,
      },
      logs: { today: todayLogs, total: growthLogs },
      opportunities: { pending: opportunities, total: opportunities },
      content: {
        drafts: drafts.filter(d => d.status === "draft").length,
        published: drafts.filter(d => d.status === "published").length,
      },
    })
  } catch (err) {
    console.error("Growth dashboard error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
