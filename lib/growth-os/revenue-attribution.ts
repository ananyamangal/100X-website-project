/**
 * Revenue Attribution Engine
 * Maps keyword → campaign → landing page → UTM → lead → deal → revenue.
 * Imports from rfq_popup_leads, brochure_leads, and submissions (legacy rfq).
 * Last-click model, joined with ads_keyword_rows for cost.
 */
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type FunnelStage =
  | "lead" | "qualified_lead" | "dealer_application"
  | "oem_request" | "tender_request" | "proposal_sent" | "won" | "lost"

export type LeadSource = "rfq_popup" | "brochure" | "contact_form" | "manual"

export interface LeadAttribution {
  leadId:      string
  sourceType:  LeadSource
  name?:       string
  email?:      string
  phone?:      string
  product?:    string
  state?:      string
  source?:     string  // utm source or channel
  stage:       FunnelStage
  revenue:     number   // INR

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
  lead:               number
  qualified_lead:     number
  dealer_application: number
  oem_request:        number
  tender_request:     number
  proposal_sent:      number
  won:                number
  lost:               number
}

export interface AttributionRow {
  dimension:      string
  leads:          number
  qualifiedLeads: number
  deals:          number
  revenue:        number
  cost:           number
  roi:            number
  roas:           number
  cpl:            number
  cpd:            number
  paybackDays:    number
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

export interface AttributionDiagnostics {
  totalInAttribution: number
  bySource: Record<LeadSource, number>
  withUTM: number
  withoutUTM: number
  withKeyword: number
  withCampaign: number
  withPaidSource: number  // utm.source = google/cpc
  withState: number
  withoutState: number
  stateBreakdown: Record<string, number>  // top states by lead count
  stageBreakdown: FunnelCounts
  pendingInRFQ: number
  pendingInBrochure: number
  pendingInSubmissions: number
  orphaned: number
  sampleUnmatched: Array<{ leadId: string; name?: string; phone?: string; reason: string }>
}

// ── Answer key extractor ──────────────────────────────────────────────────────
// rfq_popup_leads.answers has question text as keys — extract flexibly

function fromAnswers(answers: Record<string, unknown>, patterns: string[]): string {
  if (!answers || typeof answers !== "object") return ""
  for (const [q, v] of Object.entries(answers)) {
    const ql = q.toLowerCase()
    if (patterns.some(p => ql.includes(p))) {
      const val = Array.isArray(v) ? v[0] : v
      return String(val ?? "").trim()
    }
  }
  return ""
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWon(stage: FunnelStage)       { return stage === "won" }
function isQualified(stage: FunnelStage) {
  return ["qualified_lead","dealer_application","oem_request","tender_request","proposal_sent","won"].includes(stage)
}
function isDealt(stage: FunnelStage) {
  return ["dealer_application","oem_request","tender_request","proposal_sent","won"].includes(stage)
}

function buildRows(
  leads:   LeadAttribution[],
  costMap: Record<string, number>,
  keyFn:   (l: LeadAttribution) => string | undefined | null,
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
      const cost        = costMap[dim.toLowerCase()] ?? 0
      const roi         = cost > 0 ? ((b.revenue - cost) / cost) * 100 : 0
      const roas        = cost > 0 ? b.revenue / cost : 0
      const cpl         = b.leads > 0 && cost > 0 ? cost / b.leads : 0
      const cpd         = b.dealt > 0 && cost > 0 ? cost / b.dealt : 0
      const paybackDays = cost > 0 && b.revenue > 0 ? Math.round(cost / (b.revenue / 365)) : 0
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

// ── Build report ──────────────────────────────────────────────────────────────

export async function buildAttributionReport(): Promise<AttributionReport> {
  const db = (await clientPromise).db()

  const rawLeads = await db.collection<LeadAttribution>("revenue_attribution").find({}).toArray()
  const leads    = rawLeads as unknown as LeadAttribution[]

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const kwRows = await db.collection("ads_keyword_rows")
    .find({ date: { $gte: thirtyDaysAgo } })
    .toArray()

  const kwCostMap: Record<string, number>   = {}
  const campCostMap: Record<string, number> = {}
  for (const row of kwRows) {
    const kw   = String(row.keyword  ?? "").toLowerCase()
    const camp = String(row.campaign ?? "").toLowerCase()
    const cost = Number(row.costMicros ?? 0) / 1_000_000
    if (kw)   kwCostMap[kw]     = (kwCostMap[kw] ?? 0) + cost
    if (camp) campCostMap[camp] = (campCostMap[camp] ?? 0) + cost
  }

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
    byKeyword:     buildRows(leads, kwCostMap,   l => l.keyword  ?? l.utm?.term),
    byCampaign:    buildRows(leads, campCostMap, l => l.campaign ?? l.utm?.campaign),
    byProduct:     buildRows(leads, {},          l => l.product),
    byState:       buildRows(leads, {},          l => l.state),
    byLandingPage: buildRows(leads, {},          l => l.landingPage),
    bySource:      buildRows(leads, {},          l => l.utm?.source ?? l.source),
    funnel: { ...funnel, totalRevenue, totalCost, blendedROI },
    updatedAt: new Date().toISOString(),
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createAttributionLead(data: Partial<LeadAttribution>): Promise<string> {
  const db = (await clientPromise).db()
  const doc: LeadAttribution = {
    leadId:     `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceType: "manual",
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
  const update: Partial<LeadAttribution> = { stage, updatedAt: new Date().toISOString() }
  if (stage === "won") update.wonAt = new Date().toISOString()
  if (opts?.revenue !== undefined) update.revenue = opts.revenue
  if (opts?.notes  !== undefined) update.notes  = opts.notes
  await db.collection("revenue_attribution").updateOne({ leadId }, { $set: update })
}

// ── Sync from rfq_popup_leads ─────────────────────────────────────────────────
// Real structure: { answers: {questionText: value}, utmSource, utmMedium,
// utmCampaign, utmTerm, utm: {utm_source, utm_medium, utm_campaign, utm_term},
// landingPage, pagePath, pageUrl, createdAt }

export async function syncFromRFQLeads(): Promise<{ imported: number; skipped: number; total: number }> {
  const db = (await clientPromise).db()

  const synced = new Set(
    (await db.collection("revenue_attribution").find(
      { sourceType: "rfq_popup" },
      { projection: { leadId: 1 } }
    ).toArray()).map(l => String(l.leadId))
  )

  const rfqLeads = await db.collection("rfq_popup_leads")
    .find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray()

  let imported = 0, skipped = 0
  for (const l of rfqLeads) {
    const id = `rfq_${String(l._id)}`
    if (synced.has(id)) { skipped++; continue }

    // answers is an object with question text as keys
    const answers = (l.answers ?? {}) as Record<string, unknown>

    const name    = fromAnswers(answers, ["name", "your name", "full name", "contact name"])
    const email   = fromAnswers(answers, ["email", "e-mail", "email address"])
    const phone   = fromAnswers(answers, ["phone", "mobile", "contact number", "phone number", "whatsapp"])
    const state   = fromAnswers(answers, ["state", "location", "city", "region", "which state"])
    const product = fromAnswers(answers, ["product", "interest", "requirement", "machine", "model", "which product"])

    // UTM: stored as both flattened (utmSource) and nested (utm.utm_source)
    const utmSrc  = String(l.utmSource  ?? l.utm?.utm_source  ?? "").trim()
    const utmMed  = String(l.utmMedium  ?? l.utm?.utm_medium  ?? "").trim()
    const utmCamp = String(l.utmCampaign ?? l.utm?.utm_campaign ?? "").trim()
    const utmTerm = String(l.utmTerm    ?? l.utm?.utm_term    ?? "").trim()

    // Determine channel
    const channel = utmSrc || l.entryReferrer ? (utmSrc || "referral") : "organic"

    await createAttributionLead({
      leadId:      id,
      sourceType:  "rfq_popup",
      name:        name   || undefined,
      email:       email  || undefined,
      phone:       phone  || undefined,
      product:     product || undefined,
      state:       state  || undefined,
      source:      channel,
      stage:       "lead",
      keyword:     utmTerm  || undefined,
      campaign:    utmCamp  || undefined,
      landingPage: String(l.landingPage ?? l.pagePath ?? ""),
      utm: {
        source:   utmSrc   || undefined,
        medium:   utmMed   || undefined,
        campaign: utmCamp  || undefined,
        term:     utmTerm  || undefined,
      },
      createdAt: String(l.createdAt ?? new Date().toISOString()),
    })
    imported++
  }

  return { imported, skipped, total: rfqLeads.length }
}

// ── Sync from brochure_leads ──────────────────────────────────────────────────
// Structure: { name, phone, email, organization, state, requirement,
// source, brochureType, productName, pageUrl, referrer, device, score, isConverted, createdAt }

export async function syncFromBrochureLeads(): Promise<{ imported: number; skipped: number; total: number }> {
  const db = (await clientPromise).db()

  const synced = new Set(
    (await db.collection("revenue_attribution").find(
      { sourceType: "brochure" },
      { projection: { leadId: 1 } }
    ).toArray()).map(l => String(l.leadId))
  )

  const brochureLeads = await db.collection("brochure_leads")
    .find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray()

  let imported = 0, skipped = 0
  for (const l of brochureLeads) {
    const id = `brochure_${String(l._id)}`
    if (synced.has(id)) { skipped++; continue }

    const source = String(l.source ?? l.referrer ?? "organic")
    const isAds  = ["google", "cpc", "adwords", "paid"].some(s => source.toLowerCase().includes(s))

    await createAttributionLead({
      leadId:      id,
      sourceType:  "brochure",
      name:        String(l.name  ?? "") || undefined,
      email:       String(l.email ?? "") || undefined,
      phone:       String(l.phone ?? "") || undefined,
      product:     String(l.productName ?? l.requirement ?? "") || undefined,
      state:       String(l.state ?? "") || undefined,
      source:      isAds ? "google" : source,
      stage:       l.isConverted ? "qualified_lead" : "lead",
      landingPage: String(l.pageUrl ?? "") || undefined,
      utm: {
        source: isAds ? "google" : undefined,
        medium: isAds ? "cpc" : undefined,
      },
      createdAt: String(l.createdAt ?? new Date().toISOString()),
    })
    imported++
  }

  return { imported, skipped, total: brochureLeads.length }
}

// ── Sync from submissions (legacy rfq-submit form) ────────────────────────────
// Structure: { type: "rfq", ...form fields, createdAt }
// Fields vary — use flexible extraction

export async function syncFromSubmissions(): Promise<{ imported: number; skipped: number; total: number }> {
  const db = (await clientPromise).db()

  const synced = new Set(
    (await db.collection("revenue_attribution").find(
      { sourceType: "contact_form" },
      { projection: { leadId: 1 } }
    ).toArray()).map(l => String(l.leadId))
  )

  const submissions = await db.collection("submissions")
    .find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray()

  let imported = 0, skipped = 0
  for (const l of submissions) {
    const id = `sub_${String(l._id)}`
    if (synced.has(id)) { skipped++; continue }

    // submissions has flat fields (varies by form configuration)
    const name  = String(l.name  ?? l.fullName    ?? "").trim()
    const email = String(l.email ?? l.emailAddress ?? "").trim()
    const phone = String(l.phone ?? l.mobile       ?? l.contact ?? "").trim()
    const state = String(l.state ?? l.city         ?? l.location ?? "").trim()
    const product = String(l.product ?? l.interest ?? l.requirement ?? l.machine ?? "").trim()

    await createAttributionLead({
      leadId:      id,
      sourceType:  "contact_form",
      name:        name    || undefined,
      email:       email   || undefined,
      phone:       phone   || undefined,
      product:     product || undefined,
      state:       state   || undefined,
      source:      "contact_form",
      stage:       "lead",
      createdAt:   String(l.createdAt ?? new Date().toISOString()),
    })
    imported++
  }

  return { imported, skipped, total: submissions.length }
}

// ── Sync all sources ──────────────────────────────────────────────────────────

export async function syncAllLeads(): Promise<{
  rfq:       { imported: number; skipped: number; total: number }
  brochure:  { imported: number; skipped: number; total: number }
  contact:   { imported: number; skipped: number; total: number }
  totalNew:  number
}> {
  const [rfq, brochure, contact] = await Promise.all([
    syncFromRFQLeads(),
    syncFromBrochureLeads(),
    syncFromSubmissions(),
  ])
  return {
    rfq,
    brochure,
    contact,
    totalNew: rfq.imported + brochure.imported + contact.imported,
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function getAttributionDiagnostics(): Promise<AttributionDiagnostics> {
  const db = (await clientPromise).db()

  const [attrLeads, rfqCount, brochureCount, subCount] = await Promise.all([
    db.collection("revenue_attribution").find({}).toArray(),
    db.collection("rfq_popup_leads").countDocuments(),
    db.collection("brochure_leads").countDocuments(),
    db.collection("submissions").countDocuments(),
  ])

  const leads = attrLeads as unknown as (LeadAttribution & { sourceType?: LeadSource })[]

  const bySource: Record<LeadSource, number> = {
    rfq_popup: 0, brochure: 0, contact_form: 0, manual: 0,
  }
  const stageBreakdown: FunnelCounts = {
    lead: 0, qualified_lead: 0, dealer_application: 0,
    oem_request: 0, tender_request: 0, proposal_sent: 0, won: 0, lost: 0,
  }
  let withUTM = 0, withoutUTM = 0, withKeyword = 0, withCampaign = 0, withPaidSource = 0
  let withState = 0, withoutState = 0
  const stateCounts: Record<string, number> = {}

  const sampleUnmatched: AttributionDiagnostics["sampleUnmatched"] = []

  for (const l of leads) {
    const src = l.sourceType ?? "manual"
    bySource[src] = (bySource[src] ?? 0) + 1
    stageBreakdown[l.stage] = (stageBreakdown[l.stage] ?? 0) + 1

    const hasUtm = !!(l.utm?.source || l.utm?.campaign || l.utm?.term)
    if (hasUtm) {
      withUTM++
      if (l.utm?.source?.toLowerCase().includes("google") || l.utm?.medium?.toLowerCase().includes("cpc")) withPaidSource++
    } else {
      withoutUTM++
      if (sampleUnmatched.length < 5) {
        sampleUnmatched.push({
          leadId: l.leadId,
          name:   l.name,
          phone:  l.phone,
          reason: "No UTM data — organic or direct traffic",
        })
      }
    }
    if (l.keyword)  withKeyword++
    if (l.campaign) withCampaign++

    // State coverage
    if (l.state && String(l.state).trim().length > 0) {
      withState++
      const s = String(l.state).trim().toLowerCase()
      stateCounts[s] = (stateCounts[s] ?? 0) + 1
    } else {
      withoutState++
    }
  }

  // Top states (max 15)
  const stateBreakdown = Object.fromEntries(
    Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
  )

  const importedRfqIds   = new Set(leads.filter(l => l.sourceType === "rfq_popup").map(l => l.leadId.replace("rfq_", "")))
  const importedBroIds   = new Set(leads.filter(l => l.sourceType === "brochure").map(l => l.leadId.replace("brochure_", "")))
  const importedSubIds   = new Set(leads.filter(l => l.sourceType === "contact_form").map(l => l.leadId.replace("sub_", "")))

  return {
    totalInAttribution: leads.length,
    bySource,
    withUTM,
    withoutUTM,
    withKeyword,
    withCampaign,
    withPaidSource,
    withState,
    withoutState,
    stateBreakdown,
    stageBreakdown,
    pendingInRFQ:         Math.max(0, rfqCount - importedRfqIds.size),
    pendingInBrochure:    Math.max(0, brochureCount - importedBroIds.size),
    pendingInSubmissions: Math.max(0, subCount - importedSubIds.size),
    orphaned:             0,
    sampleUnmatched,
  }
}
