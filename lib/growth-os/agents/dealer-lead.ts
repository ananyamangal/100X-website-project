import clientPromise from "@/lib/mongodb"

// Pages that signal high dealer/OEM intent
const DEALER_PAGES = ["/become-a-dealer", "/dealer-application", "/gem-oem-authorization", "/gem-reverse-auction-fogging", "/dealers-and-government"]
const TENDER_PAGES = ["/gem-tender-support", "/is-14855-fogging-machine"]
const GOV_PAGES = ["/nhm-fogging-machine", "/nvbdcp-fogging-machine", "/municipal-fogging-programme", "/fogging-machine-for-nagar-panchayat", "/public-health-equipment", "/vector-control-equipment"]
const OEM_KEYWORDS = ["oem", "authorization", "authorisation", "dealer", "reseller", "distributor", "gem seller", "vendor"]
const TENDER_KEYWORDS = ["tender", "bid", "l1", "reverse auction", "gem ra", "documentation", "is 14855", "bids"]
const GOV_KEYWORDS = ["municipality", "nagar", "municipal", "nhm", "nvbdcp", "health department", "government", "panchayat", "corporation"]

export interface LeadClassification {
  leadId: string
  leadType: "dealer_application" | "oem_authorization" | "tender_support" | "gem_inquiry" | "government_procurement" | "general"
  leadValue: "high" | "medium" | "low"
  score: number
  signals: string[]
}

function classify(lead: Record<string, unknown>): LeadClassification {
  const page = String(lead.page || lead.form_page_path || lead.pagePath || "").toLowerCase()
  const product = String(lead.product || lead.productName || "").toLowerCase()
  const message = String(lead.message || lead.notes || lead.description || "").toLowerCase()
  const answers = (lead.answers || {}) as Record<string, string>
  const answersText = Object.values(answers).join(" ").toLowerCase()
  const allText = `${product} ${message} ${answersText}`
  const source = String(lead.source || lead.type || "")
  const signals: string[] = []

  let score = 4
  let leadType: LeadClassification["leadType"] = "general"

  // Source page scoring
  if (DEALER_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 8); leadType = "dealer_application"; signals.push(`Dealer page: ${page.match(/\/[^/?]+/)?.[0]}`)
  } else if (TENDER_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 8); leadType = "tender_support"; signals.push(`Tender page: ${page.match(/\/[^/?]+/)?.[0]}`)
  } else if (GOV_PAGES.some(p => page.includes(p))) {
    score = Math.max(score, 7); leadType = "government_procurement"; signals.push(`Govt page: ${page.match(/\/[^/?]+/)?.[0]}`)
  }

  // Source collection scoring
  if (source === "gem_inquiry") {
    score = Math.max(score, 8); leadType = leadType === "general" ? "gem_inquiry" : leadType; signals.push("GeM inquiry form")
  }

  // Keyword scoring
  const oemHits = OEM_KEYWORDS.filter(k => allText.includes(k))
  if (oemHits.length > 0) {
    score = Math.max(score, 7); if (leadType === "general") leadType = "oem_authorization"
    signals.push(`OEM keywords: ${oemHits.slice(0, 2).join(", ")}`)
  }
  const tenderHits = TENDER_KEYWORDS.filter(k => allText.includes(k))
  if (tenderHits.length > 0) {
    score = Math.max(score, 7); if (leadType === "general") leadType = "tender_support"
    signals.push(`Tender keywords: ${tenderHits.slice(0, 2).join(", ")}`)
  }
  const govHits = GOV_KEYWORDS.filter(k => allText.includes(k))
  if (govHits.length > 0) {
    score = Math.max(score, 6); if (leadType === "general") leadType = "government_procurement"
    signals.push(`Govt keywords: ${govHits.slice(0, 2).join(", ")}`)
  }

  return {
    leadId: String(lead._id),
    leadType,
    leadValue: score >= 7 ? "high" : score >= 5 ? "medium" : "low",
    score,
    signals,
  }
}

export interface DealerLeadResult {
  summary: string
  totalProcessed: number
  highValue: number
  mediumValue: number
  lowValue: number
  byType: Record<string, number>
  topLeads: Array<{ name: string; phone: string; type: string; score: number; signals: string[]; createdAt: string }>
  newHighValueCount: number
}

export async function runDealerLeadAgent(): Promise<DealerLeadResult> {
  const db = (await clientPromise).db()

  // Read all unclassified leads from all collections
  const [popup, subs, gemInq] = await Promise.all([
    db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("submissions").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("gem_inquiries").find({}).sort({ createdAt: -1 }).limit(200).toArray(),
  ])

  const allLeads = [
    ...popup.map(l => ({ ...l, source: "rfq_popup", page: l.pagePath })),
    ...subs.map(l => ({ ...l })),
    ...gemInq.map(l => ({ ...l, source: "gem_inquiry" })),
  ]

  const counts = { high: 0, medium: 0, low: 0 }
  const byType: Record<string, number> = {}
  const newHighValueLeads: LeadClassification[] = []
  const topLeads: DealerLeadResult["topLeads"] = []

  // Write classifications back to MongoDB in bulk
  const bulkOps: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown> } }> = []

  for (const lead of allLeads) {
    const classification = classify(lead)
    counts[classification.leadValue]++
    byType[classification.leadType] = (byType[classification.leadType] || 0) + 1

    // Only write if not already classified or score changed
    const alreadyClassified = lead.dealerScore === classification.score
    if (!alreadyClassified) {
      const collectionName = lead.source === "rfq_popup" ? "rfq_popup_leads"
        : lead.source === "gem_inquiry" ? "gem_inquiries"
        : "submissions"
      bulkOps.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              dealerScore: classification.score,
              leadType: classification.leadType,
              leadValue: classification.leadValue,
              leadSignals: classification.signals,
              classifiedAt: new Date().toISOString(),
            }
          }
        }
      })
      if (classification.leadValue === "high" && !lead.dealerScore) {
        newHighValueLeads.push(classification)
      }
    }

    if (classification.score >= 7 && topLeads.length < 10) {
      topLeads.push({
        name: String(lead.name || lead.answers?.["Your Name"] || ""),
        phone: String(lead.phone || lead.answers?.["Phone Number"] || ""),
        type: classification.leadType,
        score: classification.score,
        signals: classification.signals,
        createdAt: String(lead.createdAt || ""),
      })
    }
  }

  // Write bulk updates to each collection
  if (bulkOps.length > 0) {
    // Group by collection (we stored the collection info differently, do per-collection)
    // Simple approach: update by _id directly in each collection
    const updates = bulkOps.slice(0, 100) // cap at 100 per run to avoid timeout
    for (const op of updates) {
      const filter = op.updateOne.filter
      const update = op.updateOne.update
      // Try all three collections
      await Promise.allSettled([
        db.collection("rfq_popup_leads").updateOne(filter, update),
        db.collection("submissions").updateOne(filter, update),
        db.collection("gem_inquiries").updateOne(filter, update),
      ])
    }
  }

  // Create opportunities for new high-value leads
  for (const lead of newHighValueLeads.slice(0, 3)) {
    const existing = await db.collection("growth_os_opportunities").findOne({
      title: { $regex: `Follow up.*${lead.leadType}`, $options: "i" }
    })
    if (!existing) {
      await db.collection("growth_os_opportunities").insertOne({
        title: `Follow up: ${newHighValueLeads.length} new high-value ${lead.leadType.replace("_", " ")} leads`,
        description: `New high-value leads detected from ${lead.signals.join(", ")}. Score ${lead.score}/10. Check Dealer Intelligence for details.`,
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
    }
  }

  const summary = `Classified ${allLeads.length} leads — HIGH: ${counts.high}, MEDIUM: ${counts.medium}, LOW: ${counts.low}. ${newHighValueLeads.length} new high-value leads found. Top type: ${Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "none"}.`

  // Log the run
  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "Dealer Lead Agent",
    action: `Classified ${allLeads.length} leads`,
    reason: "Automated lead scoring and classification",
    expectedImpact: "Prioritize follow-up on high-value dealer leads",
    actualImpact: `${counts.high} high-value, ${counts.medium} medium, ${counts.low} low`,
    level: counts.high > 0 ? "success" : "info",
    module: "dealers",
    after: JSON.stringify({ counts, byType }),
  })

  return { summary, totalProcessed: allLeads.length, ...counts, byType, topLeads, newHighValueCount: newHighValueLeads.length }
}
