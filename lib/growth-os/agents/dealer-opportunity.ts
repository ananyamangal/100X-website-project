import clientPromise from "@/lib/mongodb"
import type { Db } from "mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

/**
 * Dealer Opportunity Engine
 * --------------------------
 * Primary output: "Top 20 Dealers to Contact This Week" — optimized for
 * "which dealers are most likely to become SUCCESSFUL 100X dealers?",
 * NOT "which dealers are largest overall".
 *
 * Blended Dealer Score (0–100):
 *   Product Fit         40%   overlap of dealer's GeM products with 100X catalogue
 *   GeM Contract Volume 25%   log-scaled GMV moved on GeM
 *   Recent Activity     15%   recency of last GeM contract
 *   Geography Gap       10%   demand in a state where strong dealers are scarce
 *   Contactability      10%   phone / GSTIN / MSME present
 *
 * OEM Authorization Probability (0–100) is a BONUS signal layered on top:
 *   how likely a dealer is to want/accept 100X OEM authorization.
 *
 * Dealer Action Status workflow:
 *   New → Contacted → Interested → OEM Sent → Follow-up → Won / Lost / Ignore
 * Won / Lost / Ignore are SUPPRESSED (removed from the weekly list).
 * In-progress statuses are DOWNGRADED so fresh "New" dealers surface first.
 *
 * Data sources (already in the DB from the GeM knowledge graph):
 *   gem_kg_dealer_scores   { dealer, total_gmv, total_contracts, dept_count, state_count, product_count, seller_state? }
 *   gem_kg_dealer_product  { dealer, product, total_gmv? }
 *   gem_contracts          contact + last-activity per seller_name_canonical
 *   dealer_action_status   { dealer, status, notes, updatedAt }  (human workflow state)
 */

export const DEALER_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "OEM Sent",
  "Follow-up",
  "Won",
  "Lost",
  "Ignore",
] as const
export type DealerStatus = (typeof DEALER_STATUSES)[number]

const SUPPRESSED: DealerStatus[] = ["Won", "Lost", "Ignore"]
const IN_PROGRESS: DealerStatus[] = ["Contacted", "Interested", "OEM Sent", "Follow-up"]
const IN_PROGRESS_DOWNGRADE = 0.4 // multiply blended score so fresh "New" dealers rank first

// Product-fit tiers vs. the 100X catalogue (fogging, agri, sprayers, tillers, brush cutters)
const PF_EXACT = /\b(thermal\s*fog|fogger|fogging|ulv|cold\s*fog)\b/i
const PF_STRONG = /\b(mist|sprayer|spray|pest|mosquito|vector|sanitation|disinfect)\b/i
const PF_AGRI = /\b(agri|agricultur|tiller|power\s*weeder|brush\s*cutter|chaff|reaper|knapsack)\b/i

function productFitRaw(products: string[]): { fit: number; tier: string; matched: string[] } {
  let fit = 0.1
  let tier = "weak"
  const matched: string[] = []
  for (const p of products) {
    if (PF_EXACT.test(p)) {
      if (fit < 1) { fit = 1; tier = "exact" }
      matched.push(p)
    } else if (PF_STRONG.test(p)) {
      if (fit < 0.7) { fit = 0.7; tier = "strong" }
      matched.push(p)
    } else if (PF_AGRI.test(p)) {
      if (fit < 0.5) { fit = 0.5; tier = "agri" }
      matched.push(p)
    }
  }
  return { fit, tier, matched: matched.slice(0, 4) }
}

function recencyRaw(lastIso: string | null): { ra: number; days: number | null } {
  if (!lastIso) return { ra: 0.1, days: null }
  const days = Math.floor((Date.now() - new Date(lastIso).getTime()) / 86_400_000)
  if (Number.isNaN(days)) return { ra: 0.1, days: null }
  const ra = days <= 90 ? 1 : days <= 180 ? 0.8 : days <= 365 ? 0.6 : days <= 730 ? 0.3 : 0.1
  return { ra, days }
}

export function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

interface DealerRow {
  dealer: string
  state: string | null
  blended_score: number
  oem_auth_probability: number
  components: { product_fit: number; gem_volume: number; recent_activity: number; geo_gap: number; contactability: number }
  product_fit_tier: string
  product_fit_examples: string[]
  total_gmv: number
  total_contracts: number
  last_activity_days: number | null
  contact: { phone: string | null; gst: string | null; msme: string | null }
  action_status: DealerStatus
  reason: string
  product_fit_explanation: string
  gem_activity_summary: string
  next_action: string
}

function fmtCr(n: number): string {
  return `₹${(n / 1e7).toFixed(2)} Cr`
}

function nextAction(d: DealerRow): string {
  if (d.product_fit_tier === "exact" && d.oem_auth_probability >= 60)
    return "Send OEM authorization proposal — strong fogging fit, high OEM intent"
  if (d.product_fit_tier === "exact" || d.product_fit_tier === "strong")
    return "Call to introduce 100X dealer programme + share OEM authorization details"
  if (d.product_fit_tier === "agri")
    return "Call to introduce 100X agri range (sprayers/tillers/brush cutters)"
  return "Qualify by phone — confirm product interest before sending dealer pack"
}

export interface DealerOpportunityResult {
  week: string
  summary: string
  consideredDealers: number
  suppressed: number
  top20: DealerRow[]
  reportId: string | null
}

export async function runDealerOpportunityAgent(): Promise<DealerOpportunityResult> {
  const db: Db = (await clientPromise).db()
  const week = isoWeek()

  const scores = await db.collection("gem_kg_dealer_scores").find({}).toArray()
  if (!scores.length) {
    const summary = "Knowledge Graph not built yet (gem_kg_dealer_scores empty). Run KG build first."
    await logAgentRun(db, {
      agent: "Dealer Opportunity Engine",
      action: summary,
      reason: "No dealer scores available",
      expectedImpact: "—",
      actualImpact: "0 dealers ranked",
      level: "warning",
      module: "dealers",
    })
    return { week, summary, consideredDealers: 0, suppressed: 0, top20: [], reportId: null }
  }

  // products per dealer
  const productRows = await db
    .collection("gem_kg_dealer_product")
    .find({}, { projection: { dealer: 1, product: 1 } })
    .toArray()
  const productMap = new Map<string, string[]>()
  for (const r of productRows) {
    if (!r.dealer) continue
    const arr = productMap.get(r.dealer) || []
    if (r.product) arr.push(String(r.product))
    productMap.set(r.dealer, arr)
  }

  // contact + last activity per dealer (most recent contract wins)
  const contactRows = await db
    .collection("gem_contracts")
    .aggregate([
      { $match: { seller_name_canonical: { $ne: null } } },
      { $sort: { contract_date_dt: -1 } },
      {
        $group: {
          _id: "$seller_name_canonical",
          seller_phone: { $first: "$seller_phone" },
          seller_gst: { $first: "$seller_gst" },
          seller_msme_category: { $first: "$seller_msme_category" },
          seller_state: { $first: "$seller_state" },
          last_contract: { $max: "$contract_date_dt" },
        },
      },
    ])
    .toArray()
  const contactMap = new Map(contactRows.map((r) => [r._id as string, r]))

  // human workflow state
  const statusRows = await db.collection("dealer_action_status").find({}).toArray()
  const statusMap = new Map<string, DealerStatus>(
    statusRows.map((r) => [String(r.dealer), (r.status as DealerStatus) || "New"])
  )

  const maxGmv = Math.max(...scores.map((s) => s.total_gmv || 0), 1)
  const logMaxGmv = Math.log1p(maxGmv)

  // ---- Pass 1: per-state demand + strong-dealer supply for the geography-gap component ----
  const stateDemand = new Map<string, number>()
  const stateStrongFit = new Map<string, number>()
  const pre = scores.map((s) => {
    const dealer = String(s.dealer || s._id || "")
    const products = productMap.get(dealer) || []
    const pf = productFitRaw(products)
    const c = contactMap.get(dealer)
    const state = (c?.seller_state || s.seller_state || null) as string | null
    const gmv = s.total_gmv || 0
    if (state) {
      stateDemand.set(state, (stateDemand.get(state) || 0) + gmv)
      if (pf.fit >= 0.5) stateStrongFit.set(state, (stateStrongFit.get(state) || 0) + 1)
    }
    return { s, dealer, products, pf, c, state, gmv }
  })
  const maxStateDemand = Math.max(...Array.from(stateDemand.values()), 1)

  // ---- Pass 2: blended score + OEM probability ----
  const rows: DealerRow[] = pre.map(({ s, dealer, pf, c, state, gmv }) => {
    const totalContracts = s.total_contracts || 0
    const { ra, days } = recencyRaw((c?.last_contract as string) || null)

    const phone = (c?.seller_phone as string) || null
    const gst = (c?.seller_gst as string) || null
    const msme = (c?.seller_msme_category as string) || null
    const contactability = (phone ? 0.5 : 0) + (gst ? 0.3 : 0) + (msme ? 0.2 : 0)

    const gemVolume = Math.log1p(gmv) / logMaxGmv

    // geography gap: real demand in a state where strong-fit dealers are scarce
    const demandN = state ? (stateDemand.get(state) || 0) / maxStateDemand : 0
    const strongCount = state ? stateStrongFit.get(state) || 0 : 0
    const geoGap = demandN * (1 / (1 + strongCount))

    const components = {
      product_fit: pf.fit,
      gem_volume: gemVolume,
      recent_activity: ra,
      geo_gap: geoGap,
      contactability,
    }
    const blendedRaw =
      40 * pf.fit + 25 * gemVolume + 15 * ra + 10 * geoGap + 10 * contactability

    // OEM authorization probability — likelihood the dealer wants 100X OEM authorization.
    // Favours strong fit + recent activity + MSME (smaller, more open to OEM tie-up)
    // + an established-but-not-mega volume sweet spot.
    const msmeBoost = msme && /micro|small|medium/i.test(msme) ? 1 : 0.4
    const volumeSweet = gemVolume > 0.25 && gemVolume < 0.85 ? 1 : 0.5
    const oem =
      40 * pf.fit + 25 * ra + 20 * msmeBoost + 15 * volumeSweet
    const oemProb = Math.round(Math.min(100, oem))

    const status = statusMap.get(dealer) || "New"

    const row: DealerRow = {
      dealer,
      state,
      blended_score: Math.round(blendedRaw * 10) / 10,
      oem_auth_probability: oemProb,
      components,
      product_fit_tier: pf.tier,
      product_fit_examples: pf.matched,
      total_gmv: gmv,
      total_contracts: totalContracts,
      last_activity_days: days,
      contact: { phone, gst, msme },
      action_status: status,
      reason: "",
      product_fit_explanation: "",
      gem_activity_summary: "",
      next_action: "",
    }
    row.product_fit_explanation =
      pf.tier === "exact"
        ? `Direct fogging fit — already sells ${pf.matched.slice(0, 2).join(", ") || "fogging equipment"} on GeM`
        : pf.tier === "strong"
        ? `Adjacent fit — sells ${pf.matched.slice(0, 2).join(", ") || "spray/pest equipment"}, natural fogging cross-sell`
        : pf.tier === "agri"
        ? `Agri fit — sells ${pf.matched.slice(0, 2).join(", ") || "agri machinery"}, fits 100X sprayer/tiller range`
        : "Weak catalogue overlap — qualify product interest before investing"
    row.gem_activity_summary = `${totalContracts} GeM contracts, ${fmtCr(gmv)} GMV${
      days != null ? `, last active ${days}d ago` : ""
    }${state ? `, ${state}` : ""}`
    row.next_action = nextAction(row)
    row.reason = `Score ${row.blended_score}/100 — ${pf.tier} product fit (${Math.round(
      pf.fit * 100
    )}%), ${fmtCr(gmv)} GeM GMV, OEM-intent ${oemProb}%${
      geoGap > 0.3 ? `, under-served ${state} territory` : ""
    }`
    return row
  })

  // ---- Apply status workflow: suppress Won/Lost/Ignore, downgrade in-progress ----
  let suppressed = 0
  const eligible = rows.filter((r) => {
    if (SUPPRESSED.includes(r.action_status)) {
      suppressed++
      return false
    }
    return true
  })
  for (const r of eligible) {
    if (IN_PROGRESS.includes(r.action_status)) {
      r.blended_score = Math.round(r.blended_score * IN_PROGRESS_DOWNGRADE * 10) / 10
    }
  }

  eligible.sort(
    (a, b) =>
      b.blended_score - a.blended_score || b.oem_auth_probability - a.oem_auth_probability
  )
  const top20 = eligible.slice(0, 20).map((r, i) => ({ ...r, rank: i + 1 } as DealerRow & { rank: number }))

  // state-wise opportunity ranking (demand where strong dealers are scarce)
  const stateRanking = Array.from(stateDemand.entries())
    .map(([state, demand]) => ({
      state,
      demand_cr: Math.round((demand / 1e7) * 10) / 10,
      strong_dealers: stateStrongFit.get(state) || 0,
      gap_score: Math.round(((demand / maxStateDemand) * (1 / (1 + (stateStrongFit.get(state) || 0)))) * 1000) / 1000,
    }))
    .sort((a, b) => b.gap_score - a.gap_score)
    .slice(0, 10)

  // ---- Persist: current-week opportunities (replace this week) ----
  const opp = db.collection("dealer_opportunities")
  await opp.deleteMany({ week })
  if (top20.length) {
    await opp.insertMany(
      top20.map((r) => ({
        week,
        rank: (r as DealerRow & { rank: number }).rank,
        dealer: r.dealer,
        state: r.state,
        blended_score: r.blended_score,
        oem_auth_probability: r.oem_auth_probability,
        components: r.components,
        product_fit_tier: r.product_fit_tier,
        reason: r.reason,
        product_fit_explanation: r.product_fit_explanation,
        gem_activity_summary: r.gem_activity_summary,
        contact: r.contact,
        next_action: r.next_action,
        action_status: r.action_status,
        total_gmv: r.total_gmv,
        total_contracts: r.total_contracts,
        last_activity_days: r.last_activity_days,
        generatedAt: new Date().toISOString(),
      }))
    )
  }

  // ---- Persist: weekly report archive (durable; serverless FS is read-only) ----
  const markdown = buildReportMarkdown(week, top20, stateRanking, suppressed)
  const reportRes = await db.collection("dealer_opportunity_reports").findOneAndUpdate(
    { week },
    {
      $set: {
        week,
        generatedAt: new Date().toISOString(),
        count: top20.length,
        suppressed,
        stateRanking,
        markdown,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  const reportId = reportRes?._id ? String(reportRes._id) : null

  // ---- Surface a single summary card in the Growth OS recommendation queue ----
  const title = `Top 20 dealers to contact — week ${week}`
  const topName = top20[0]?.dealer || "—"
  await db.collection("growth_os_opportunities").updateOne(
    { title },
    {
      $set: {
        title,
        description: `${top20.length} ranked dealer opportunities. #1: ${topName} (${top20[0]?.blended_score ?? 0}/100, OEM-intent ${top20[0]?.oem_auth_probability ?? 0}%). ${suppressed} suppressed (Won/Lost/Ignore). Open Dealer Intelligence → "Contact This Week".`,
        module: "dealers",
        source: "agent",
        businessValue: "high",
        seoValue: "low",
        geoValue: "low",
        dealerImpact: "high",
        effort: "low",
        status: "pending",
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true }
  )

  const summary = `Week ${week}: ranked ${eligible.length} eligible dealers (${suppressed} suppressed). Top: ${topName} (${top20[0]?.blended_score ?? 0}/100, OEM ${top20[0]?.oem_auth_probability ?? 0}%).`

  await logAgentRun(db, {
    agent: "Dealer Opportunity Engine",
    action: summary,
    reason: "Weekly Top-20 dealer ranking (blended score + OEM probability)",
    expectedImpact: "Convert highest-fit GeM sellers into successful 100X dealers/OEM partners",
    actualImpact: `${top20.length} opportunities queued, report ${week} archived`,
    level: top20.length > 0 ? "success" : "warning",
    module: "dealers",
    after: JSON.stringify({ week, top: top20.slice(0, 5).map((r) => ({ d: r.dealer, s: r.blended_score })) }),
  })

  return { week, summary, consideredDealers: rows.length, suppressed, top20, reportId }
}

function buildReportMarkdown(
  week: string,
  top20: Array<DealerRow & { rank?: number }>,
  stateRanking: Array<{ state: string; demand_cr: number; strong_dealers: number; gap_score: number }>,
  suppressed: number
): string {
  const lines: string[] = []
  lines.push(`# Top 20 Dealers to Contact — Week ${week}`)
  lines.push("")
  lines.push(`Generated ${new Date().toISOString()} · ${top20.length} dealers · ${suppressed} suppressed (Won/Lost/Ignore)`)
  lines.push(`Optimized for: "which dealers are most likely to become successful 100X dealers?"`)
  lines.push("")
  top20.forEach((r, i) => {
    lines.push(`## ${(r as DealerRow & { rank?: number }).rank ?? i + 1}. ${r.dealer} — ${r.blended_score}/100`)
    lines.push(`- **Status:** ${r.action_status}  ·  **OEM authorization probability:** ${r.oem_auth_probability}%`)
    lines.push(`- **Reason:** ${r.reason}`)
    lines.push(`- **Product fit:** ${r.product_fit_explanation}`)
    lines.push(`- **GeM activity:** ${r.gem_activity_summary}`)
    lines.push(`- **Contact:** ${r.contact.phone || "no phone"}${r.contact.gst ? ` · GST ${r.contact.gst}` : ""}${r.contact.msme ? ` · ${r.contact.msme}` : ""}`)
    lines.push(`- **Next action:** ${r.next_action}`)
    lines.push("")
  })
  lines.push(`---`)
  lines.push(`## State-wise Opportunity Ranking (demand vs. strong-dealer scarcity)`)
  stateRanking.forEach((s, i) => {
    lines.push(`${i + 1}. **${s.state}** — ${s.demand_cr} Cr GeM demand, ${s.strong_dealers} strong-fit dealers (gap ${s.gap_score})`)
  })
  return lines.join("\n")
}
