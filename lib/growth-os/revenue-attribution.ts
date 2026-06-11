/**
 * Revenue Attribution Engine
 * Maps keyword → campaign → ad group → landing page → UTM → GCLID
 * to lead → qualified lead → dealer → OEM request → proposal → revenue.
 * Last-click model using rfq_popup_leads.utm joined with ads_keyword_rows for cost.
 */
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type FunnelStage =
  | "lead" | "qualified_lead" | "dealer_application"
  | "oem_request" | "tender_request" | "proposal_sent" | "won" | "lost"

export interface LeadAttribution {
  leadId:    string
  name?:     string
  email?:    string
  phone?:    string
  product?:  string
  state?:    string
  source?:   string
  stage:     FunnelStage
  revenue:   number  // INR, set when stage = won

  // Attribution data (from UTM / GCLID)
  keyword?:     string
  campaign?:    string
  adGroup?:     string
  landingPage?: string
  utm: {
    source?:   string
    medium?:   string
    campaign?: string
    term?:     string
    content?:  string
  }
  gclid?: string

  notes?:     string
  createdAt:  string
  updatedAt:  string
  wonAt?:     string
}

export interface FunnelCounts {
  lead:                number
  qualified_lead:      number
  dealer_application:  number
  oem_request:         number
  tender_request:      number
  proposal_sent:       number
  won:                 number
  lost:                number
}

export interface AttributionRow {
  dimension:      string
  leads:          number
  qualifiedLeads: number
  deals:          number
  revenue:        number
  cost:           number
  roi:            number   // (revenue - cost) / cost * 100
  roas:           number   // revenue / cost
  cpl:            number   // cost per lead
  cpd:            number   // cost per deal
  paybackDays:    number   // rough payback period estimate
}

export interface AttributionReport {
  byKeyword:     AttributionRow[]
  byCampaign:    AttributionRow[]
  byProduct:     AttributionRow[]
  byState:       AttributionRow[]
  byLandingPage: AttributionRow[]
  bySource:      AttributionRow[]
  funnel:        FunnelCounts & { totalRevenue: number; totalCost: number; blendedROI: number }
  updatedAt:     string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWon(stage: FunnelStage) { return stage === "won" }
function isQualified(stage: FunnelStage) {
  return ["qualified_lead","dealer_application","oem_request","tender_request","proposal_sent","won"].includes(stage)
}
function isDealt(stage: FunnelStage) {
  return ["dealer_application","oem_request","tender_request","proposal_sent","won"].includes(stage)
}

function buildRows(
  leads:    LeadAttribution[],
  costMap:  Record<string, number>,  // dimension → total cost from Ads
  keyFn:    (l: LeadAttribution) => string | undefined | null,
): AttributionRow[] {
  const buckets: Record<string, { leads: number; qualified: number; dealt: number; revenue: number }> = {}

  for (const l of leads) {
    const key = keyFn(l) || "(unknown)"
    if (!buckets[key]) buckets[key] = { leads: 0, qualified: 0, dealt: 0, revenue: 0 }
    buckets[key].leads++
    if (isQualified(l.stage)) buckets[key].qualified++
    if (isDealt(l.stage)) buckets[key].dealt++
    if (isWon(l.stage)) buckets[key].revenue += l.revenue
  }

  return Object.entries(buckets)
    .map(([dim, b]) => {
      const cost    = costMap[dim.toLowerCase()] ?? 0
      const roi     = cost > 0 ? ((b.revenue - cost) / cost) * 100 : 0
      const roas    = cost > 0 ? b.revenue / cost : 0
      const cpl     = b.leads > 0 && cost > 0 ? cost / b.leads : 0
      const cpd     = b.dealt > 0 && cost > 0 ? cost / b.dealt : 0
      // Rough payback: assume ₹5L/month average machine revenue; daily rate ₹16,667
      const paybackDays = cost > 0 && b.revenue > 0 ? Math.round((cost / (b.revenue / 365))) : 0
      return {
        dimension:      dim,
        leads:          b.leads,
        qualifiedLeads: b.qualified,
        deals:          b.dealt,
        revenue:        b.revenue,
        cost,
        roi:            Math.round(roi),
        roas:           Math.round(roas * 100) / 100,
        cpl:            Math.round(cpl),
        cpd:            Math.round(cpd),
        paybackDays,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads)
}

// ── Main: build report ────────────────────────────────────────────────────────

export async function buildAttributionReport(): Promise<AttributionReport> {
  const db = (await clientPromise).db()

  // Load all attribution leads
  const rawLeads = await db.collection<LeadAttribution>("revenue_attribution").find({}).toArray()
  const leads = rawLeads as unknown as LeadAttribution[]

  // Pull keyword cost data from ads_keyword_rows (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const kwRows = await db.collection("ads_keyword_rows")
    .find({ date: { $gte: thirtyDaysAgo } })
    .toArray()

  // Build cost maps
  const kwCostMap: Record<string, number> = {}
  const campCostMap: Record<string, number> = {}
  for (const row of kwRows) {
    const kw   = String(row.keyword ?? "").toLowerCase()
    const camp = String(row.campaign ?? "").toLowerCase()
    const cost = Number(row.costMicros ?? 0) / 1_000_000
    if (kw)   kwCostMap[kw]     = (kwCostMap[kw] ?? 0) + cost
    if (camp) campCostMap[camp] = (campCostMap[camp] ?? 0) + cost
  }

  // Funnel counts
  const funnel: FunnelCounts = {
    lead: 0, qualified_lead: 0, dealer_application: 0,
    oem_request: 0, tender_request: 0, proposal_sent: 0, won: 0, lost: 0,
  }
  let totalRevenue = 0
  for (const l of leads) {
    funnel[l.stage] = (funnel[l.stage] ?? 0) + 1
    if (isWon(l.stage)) totalRevenue += l.revenue
  }

  const totalCost  = Object.values(kwCostMap).reduce((s, v) => s + v, 0)
  const blendedROI = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0

  return {
    byKeyword:     buildRows(leads, kwCostMap,  l => l.keyword ?? l.utm?.term),
    byCampaign:    buildRows(leads, campCostMap, l => l.campaign ?? l.utm?.campaign),
    byProduct:     buildRows(leads, {}, l => l.product),
    byState:       buildRows(leads, {}, l => l.state),
    byLandingPage: buildRows(leads, {}, l => l.landingPage),
    bySource:      buildRows(leads, {}, l => l.utm?.source ?? l.source),
    funnel: { ...funnel, totalRevenue, totalCost, blendedROI },
    updatedAt: new Date().toISOString(),
  }
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export async function createAttributionLead(data: Partial<LeadAttribution>): Promise<string> {
  const db = (await clientPromise).db()
  const doc: LeadAttribution = {
    leadId:     `lead_${Date.now()}`,
    stage:      "lead",
    revenue:    0,
    utm:        {},
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    ...data,
  }
  await db.collection("revenue_attribution").insertOne({ ...doc })
  return doc.leadId
}

export async function updateLeadStage(leadId: string, stage: FunnelStage, opts?: { revenue?: number; notes?: string }) {
  const db = (await clientPromise).db()
  const update: Partial<LeadAttribution> = {
    stage,
    updatedAt: new Date().toISOString(),
  }
  if (stage === "won") update.wonAt = new Date().toISOString()
  if (opts?.revenue !== undefined) update.revenue = opts.revenue
  if (opts?.notes !== undefined) update.notes = opts.notes

  await db.collection("revenue_attribution").updateOne({ leadId }, { $set: update })
}

// ── Ingest from rfq_popup_leads ───────────────────────────────────────────────

export async function syncFromRFQLeads() {
  const db = (await clientPromise).db()

  // Get all RFQ leads that haven't been synced
  const synced = new Set(
    (await db.collection("revenue_attribution").find({}, { projection: { leadId: 1 } }).toArray())
      .map(l => String(l.leadId))
  )

  const rfqLeads = await db.collection("rfq_popup_leads")
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray()

  let imported = 0
  for (const l of rfqLeads) {
    const id = String(l._id)
    if (synced.has(id)) continue

    const utm = (l.utm ?? {}) as Record<string, string>

    await createAttributionLead({
      leadId:      id,
      name:        l.name ?? undefined,
      email:       l.email ?? undefined,
      phone:       l.phone ?? undefined,
      product:     l.product ?? utm.campaign ?? undefined,
      state:       l.state ?? undefined,
      source:      utm.source ?? "organic",
      stage:       "lead",
      keyword:     utm.term ?? undefined,
      campaign:    utm.campaign ?? undefined,
      landingPage: l.page ?? undefined,
      utm: {
        source:   utm.source,
        medium:   utm.medium,
        campaign: utm.campaign,
        term:     utm.term,
        content:  utm.content,
      },
      gclid:     l.gclid ?? undefined,
      createdAt: l.createdAt ?? new Date().toISOString(),
    })
    imported++
  }

  return { imported, total: rfqLeads.length }
}
