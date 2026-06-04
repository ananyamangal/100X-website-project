import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type Lead = Record<string, unknown> & { _id: unknown; _collection: string }

export async function GET() {
  const db = (await clientPromise).db()

  const [popup, subs, gemInq] = await Promise.all([
    db.collection("rfq_popup_leads").find({ dealerScore: { $exists: true } }).sort({ dealerScore: -1, createdAt: -1 }).limit(200).toArray(),
    db.collection("submissions").find({ dealerScore: { $exists: true } }).sort({ dealerScore: -1, createdAt: -1 }).limit(200).toArray(),
    db.collection("gem_inquiries").find({ dealerScore: { $exists: true } }).sort({ dealerScore: -1, createdAt: -1 }).limit(100).toArray(),
  ])

  const allClassified: Lead[] = ([
    ...popup.map(l => ({ ...(l as Record<string, unknown>), _collection: "rfq_popup_leads" })),
    ...subs.map(l => ({ ...(l as Record<string, unknown>), _collection: "submissions" })),
    ...gemInq.map(l => ({ ...(l as Record<string, unknown>), _collection: "gem_inquiries" })),
  ] as Lead[]).sort((a, b) => ((b.dealerScore as number) ?? 0) - ((a.dealerScore as number) ?? 0))

  const byValue = { high: 0, medium: 0, low: 0 }
  const byType: Record<string, number> = {}
  for (const l of allClassified) {
    const v = (l.leadValue as keyof typeof byValue) || "low"
    if (v in byValue) byValue[v]++
    const t = (l.leadType as string) || "general"
    byType[t] = (byType[t] || 0) + 1
  }

  const topLeads = allClassified
    .filter(l => ((l.dealerScore as number) ?? 0) >= 7)
    .slice(0, 20)
    .map(l => {
      const answers = (l.answers as Record<string, string>) || {}
      return {
        _id: String(l._id),
        name: String(l.name || answers["Your Name"] || ""),
        phone: String(l.phone || answers["Phone Number"] || ""),
        email: String(l.email || ""),
        leadType: l.leadType as string,
        leadValue: l.leadValue as string,
        dealerScore: l.dealerScore as number,
        leadSignals: l.leadSignals as string[],
        createdAt: l.createdAt as string,
        source: l._collection,
      }
    })

  return NextResponse.json(JSON.parse(JSON.stringify({
    totalClassified: allClassified.length,
    byValue,
    byType,
    topLeads,
    lastClassifiedAt: (allClassified[0]?.classifiedAt as string) || null,
  })))
}
