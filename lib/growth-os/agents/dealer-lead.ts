import clientPromise from "@/lib/mongodb"

const DEALER_PAGES = ["/become-a-dealer", "/dealer-application", "/gem-oem-authorization", "/gem-reverse-auction-fogging", "/dealers-and-government"]
const TENDER_PAGES = ["/gem-tender-support", "/is-14855-fogging-machine"]
const GOV_PAGES = ["/nhm-fogging-machine", "/nvbdcp-fogging-machine", "/municipal-fogging-programme", "/fogging-machine-for-nagar-panchayat", "/public-health-equipment", "/vector-control-equipment"]
const OEM_KEYWORDS = ["oem", "authorization", "authorisation", "dealer", "reseller", "distributor", "gem seller", "vendor"]
const TENDER_KEYWORDS = ["tender", "bid", "l1", "reverse auction", "gem ra", "documentation", "is 14855"]
const GOV_KEYWORDS = ["municipality", "nagar", "municipal", "nhm", "nvbdcp", "health department", "government", "panchayat", "corporation"]

type LeadType = "dealer_application" | "oem_authorization" | "tender_support" | "gem_inquiry" | "government_procurement" | "general"
type LeadValue = "high" | "medium" | "low"
type CollectionName = "rfq_popup_leads" | "submissions" | "gem_inquiries"

interface LeadWithSource extends Record<string, unknown> {
  _id: unknown
  _collection: CollectionName
}

function classify(lead: Record<string, unknown>): { leadType: LeadType; leadValue: LeadValue; score: number; signals: string[] } {
  const page = String(lead.page || lead.form_page_path || lead.pagePath || "").toLowerCase()
  const product = String(lead.product || lead.productName || "").toLowerCase()
  const message = String(lead.message || lead.notes || lead.description || "").toLowerCase()
  const answers = (lead.answers || {}) as Record<string, string>
  const answersText = Object.values(answers).join(" ").toLowerCase()
  const allText = `${product} ${message} ${answersText}`
  const source = String(lead.source || lead.type || "")
  const signals: string[] = []

  let score = 3
  let leadType: LeadType = "general"

  if (DEALER_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 8)
    leadType = page.includes("oem") ? "oem_authorization" : "dealer_application"
    signals.push(`Dealer page: ${page.split("/")[1] || "/"}`)
  } else if (TENDER_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 8)
    leadType = "tender_support"
    signals.push(`Tender page: ${page.split("/")[1] || "/"}`)
  } else if (GOV_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 7)
    leadType = "government_procurement"
    signals.push(`Gov page: ${page.split("/")[1] || "/"}`)
  }

  if (source === "gem_inquiry") {
    score = Math.max(score, 8)
    if (leadType === "general") leadType = "gem_inquiry"
    signals.push("GeM inquiry form")
  }

  const oemHits = OEM_KEYWORDS.filter(k => allText.includes(k))
  if (oemHits.length > 0) {
    score = Math.max(score, 7)
    if (leadType === "general") leadType = "oem_authorization"
    signals.push(`OEM keywords: ${oemHits.slice(0, 2).join(", ")}`)
  }

  const tenderHits = TENDER_KEYWORDS.filter(k => allText.includes(k))
  if (tenderHits.length > 0) {
    score = Math.max(score, 7)
    if (leadType === "general") leadType = "tender_support"
    signals.push(`Tender keywords: ${tenderHits.slice(0, 2).join(", ")}`)
  }

  const govHits = GOV_KEYWORDS.filter(k => allText.includes(k))
  if (govHits.length > 0) {
    score = Math.max(score, 6)
    if (leadType === "general") leadType = "government_procurement"
    signals.push(`Gov keywords: ${govHits.slice(0, 2).join(", ")}`)
  }

  const leadValue: LeadValue = score >= 7 ? "high" : score >= 5 ? "medium" : "low"
  return { leadType, leadValue, score, signals }
}

export interface DealerLeadResult {
  summary: string
  totalLeads: number
  classified: number
  newlyClassified: number
  byValue: { high: number; medium: number; low: number }
  byType: Record<string, number>
  topLeads: Array<{ name: string; phone: string; email: string; leadType: string; leadValue: string; score: number; signals: string[]; createdAt: string; source: string }>
  opportunitiesCreated: number
}

export async function runDealerLeadAgent(): Promise<DealerLeadResult> {
  const db = (await clientPromise).db()

  const [popup, subs, gemInq] = await Promise.all([
    db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("submissions").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("gem_inquiries").find({}).sort({ createdAt: -1 }).limit(200).toArray(),
  ])

  const allLeads: LeadWithSource[] = [
    ...popup.map(l => ({ ...l, _collection: "rfq_popup_leads" as const, page: l.pagePath })),
    ...subs.map(l => ({ ...l, _collection: "submissions" as const })),
    ...gemInq.map(l => ({ ...l, _collection: "gem_inquiries" as const, source: "gem_inquiry" })),
  ]

  const byValue = { high: 0, medium: 0, low: 0 }
  const byType: Record<string, number> = {}
  const topLeads: DealerLeadResult["topLeads"] = []

  // Group bulk updates by collection to write to the correct one
  const bulkByCollection: Record<CollectionName, Array<Record<string, unknown>>> = {
    rfq_popup_leads: [],
    submissions: [],
    gem_inquiries: [],
  }

  let newlyClassified = 0

  for (const lead of allLeads) {
    const { leadType, leadValue, score, signals } = classify(lead)
    byValue[leadValue]++
    byType[leadType] = (byType[leadType] || 0) + 1

    if (score >= 7 && topLeads.length < 20) {
      topLeads.push({
        name: String(lead.name || (lead.answers as Record<string, string>)?.["Your Name"] || ""),
        phone: String(lead.phone || (lead.answers as Record<string, string>)?.["Phone Number"] || ""),
        email: String(lead.email || ""),
        leadType,
        leadValue,
        score,
        signals,
        createdAt: String(lead.createdAt || ""),
        source: String(lead._collection),
      })
    }

    // Only write back if score has changed (avoid unnecessary DB writes on repeat runs)
    if (lead.dealerScore !== score) {
      newlyClassified++
      bulkByCollection[lead._collection].push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              dealerScore: score,
              leadType,
              leadValue,
              leadSignals: signals,
              classifiedAt: new Date().toISOString(),
            },
          },
        },
      })
    }
  }

  // Write to each collection separately using bulkWrite
  for (const [collName, ops] of Object.entries(bulkByCollection)) {
    if (ops.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collection(collName).bulkWrite(ops.slice(0, 150) as any[])
    }
  }

  // Create opportunities for new high-value leads by type
  let opportunitiesCreated = 0
  const newHighByType: Record<string, number> = {}
  for (const lead of allLeads) {
    if ((lead.leadValue as string) === "high" && !lead.classifiedAt) {
      const lt = lead.leadType as string || "general"
      newHighByType[lt] = (newHighByType[lt] || 0) + 1
    }
  }

  for (const [type, count] of Object.entries(newHighByType)) {
    if (count === 0) continue
    const title = `Follow up: ${count} new high-value ${type.replace(/_/g, " ")} lead${count > 1 ? "s" : ""}`
    const existing = await db.collection("growth_os_opportunities").findOne({ title })
    if (!existing) {
      await db.collection("growth_os_opportunities").insertOne({
        title,
        description: `New high-value leads classified as ${type.replace(/_/g, " ")}. Total: ${count}. Check Dealer Intelligence for details and contact information.`,
        module: "dealers",
        source: "agent",
        businessValue: "high",
        seoValue: "low",
        geoValue: "low",
        dealerImpact: "high",
        effort: "low",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      opportunitiesCreated++
    }
  }

  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
  const summary = `Processed ${allLeads.length} leads — HIGH: ${byValue.high}, MEDIUM: ${byValue.medium}, LOW: ${byValue.low}. ${newlyClassified} newly classified. Top type: ${topType ? `${topType[0].replace(/_/g, " ")} (${topType[1]})` : "none"}. ${opportunitiesCreated} opportunities created.`

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "Dealer Lead Agent",
    action: summary,
    reason: "Lead scoring and classification run",
    expectedImpact: "Prioritize follow-up on high-value dealer/OEM leads",
    actualImpact: `${byValue.high} high-value, ${byValue.medium} medium, ${byValue.low} low`,
    level: byValue.high > 0 ? "success" : "info",
    module: "dealers",
    after: JSON.stringify({ byValue, byType, newlyClassified }),
  })

  return {
    summary,
    totalLeads: allLeads.length,
    classified: allLeads.filter(l => l.dealerScore !== undefined).length,
    newlyClassified,
    byValue,
    byType,
    topLeads,
    opportunitiesCreated,
  }
}
