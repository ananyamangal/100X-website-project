import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

function top(map: Record<string, number>, n = 10) {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([label, count]) => ({ label, count }))
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    const [leads, rfqPhones] = await Promise.all([
      db.collection("brochure_leads").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("submissions").distinct("phone"),
    ])

    const rfqSet = new Set(rfqPhones.map(String))

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Per-phone count for "multiple downloads" scoring
    const phoneCount: Record<string, number> = {}
    leads.forEach((l) => { phoneCount[l.phone] = (phoneCount[l.phone] || 0) + 1 })

    // Recalculate fresh scores (in case DB has stale scores)
    const scoredLeads = leads.map((l) => {
      const isConverted = rfqSet.has(String(l.phone))
      const dlCount = phoneCount[l.phone] || 1
      let score = l.brochureType === "product" ? 25 : 10
      if (dlCount > 1) score += 25
      if (isConverted) score += 50
      score = Math.min(score, 100)
      return { ...l, _id: String(l._id), score, isConverted }
    })

    const total = scoredLeads.length
    const todayCount = scoredLeads.filter((l) => new Date(l.createdAt) >= startOfToday).length
    const weekCount = scoredLeads.filter((l) => new Date(l.createdAt) >= startOfWeek).length
    const monthCount = scoredLeads.filter((l) => new Date(l.createdAt) >= startOfMonth).length
    const convertedCount = scoredLeads.filter((l) => l.isConverted).length
    const highScoreCount = scoredLeads.filter((l) => l.score >= 50).length

    // Aggregations
    const bySource: Record<string, number> = {}
    const byState: Record<string, number> = {}
    const byProduct: Record<string, number> = {}
    const byDevice: Record<string, number> = {}
    const byPage: Record<string, number> = {}
    const byDate: Record<string, number> = {}

    for (const l of scoredLeads) {
      const src = l.source || "unknown"
      bySource[src] = (bySource[src] || 0) + 1

      if (l.state) byState[l.state] = (byState[l.state] || 0) + 1

      const prod = l.productName || l.brochureName || (l.brochureType === "product" ? "Product Brochure" : "General Catalog")
      byProduct[prod] = (byProduct[prod] || 0) + 1

      const dev = l.device || "desktop"
      byDevice[dev] = (byDevice[dev] || 0) + 1

      if (l.pageUrl) {
        try {
          const path = new URL(l.pageUrl).pathname
          byPage[path] = (byPage[path] || 0) + 1
        } catch { /* ignore */ }
      }

      const day = l.createdAt ? l.createdAt.slice(0, 10) : "unknown"
      byDate[day] = (byDate[day] || 0) + 1
    }

    const byDateSorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // Score distribution
    const scoreDistribution = {
      low: scoredLeads.filter((l) => l.score < 25).length,       // 10
      medium: scoredLeads.filter((l) => l.score >= 25 && l.score < 50).length, // 25
      high: scoredLeads.filter((l) => l.score >= 50 && l.score < 75).length,   // 50
      converted: scoredLeads.filter((l) => l.score >= 75).length, // 75-100
    }

    return NextResponse.json({
      summary: { total, todayCount, weekCount, monthCount, convertedCount, highScoreCount },
      bySource: top(bySource, 15),
      byState: top(byState, 15),
      byProduct: top(byProduct, 10),
      byDevice: top(byDevice, 5),
      byPage: top(byPage, 10),
      byDate: byDateSorted,
      scoreDistribution,
      conversionRate: total > 0 ? Math.round((convertedCount / total) * 100) : 0,
      recentLeads: scoredLeads.slice(0, 100),
    })
  } catch (err) {
    console.error("Brochure analytics error:", err)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}
