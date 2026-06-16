/**
 * Revenue Director — daily autonomous revenue orchestrator.
 * Runs at 07:00 AM IST (01:30 UTC) via Vercel Cron.
 * Reads existing synced data — never calls external APIs directly.
 * Never modifies fogging_* collections (frozen). Never executes ads changes.
 */
import clientPromise from "@/lib/mongodb"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"
import { logAgentRun } from "@/lib/growth-os/log-agent"
import type { Db } from "mongodb"
import type {
  DirectorRec, DirectorDailyRun, DirectorSource, DirectorRecType, DirectorPriority,
} from "@/lib/growth-os/director-types"

const AGENT = "Revenue Director"
const COLL_RUNS = "director_daily_runs"
const COLL_RECS = "director_recommendations"

const inr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  `₹${Math.round(n).toLocaleString("en-IN")}`

function today(): string {
  const d = new Date(Date.now() + 5.5 * 3600_000) // IST offset
  return d.toISOString().slice(0, 10)
}

function expiresAt(days = 3): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

// ─── Signal generators ────────────────────────────────────────────────────────

async function fogAttackAccounts(db: Db): Promise<DirectorRec[]> {
  const recs: DirectorRec[] = []
  const date = today()

  // Top non-100X orgs by competitor GMV — direct displacement opportunities
  const orgs = await db.collection("fogging_organizations")
    .find({
      $or: [{ "oem_spend.is_100x": false }, { "oem_spend": { $not: { $elemMatch: { is_100x: true } } } }],
      total_gmv: { $gte: 100_000 },
    })
    .sort({ incumbent_oem_gmv: -1 })
    .limit(8)
    .toArray()

  for (const org of orgs) {
    const incumbentGmv = Number(org.incumbent_oem_gmv || org.total_gmv) || 0
    if (incumbentGmv < 50_000) continue
    const revenueEstimate = Math.round(incumbentGmv * 0.25) // capture 25%
    const priority: DirectorPriority = incumbentGmv >= 500_000 ? "critical" : incumbentGmv >= 200_000 ? "high" : "medium"

    recs.push({
      run_date: date,
      type: "oem_displacement",
      priority,
      title: `Displace ${org.incumbent_oem_brand || "competitor"} at ${org.organization_name}`,
      why_now: `${org.organization_name} (${org.organization_state}) spent ${inr(incumbentGmv)} with ${org.incumbent_oem_brand || "a competitor"} — next GeM cycle opens acquisition window.`,
      evidence: `${org.total_contracts || 0} total contracts, ${inr(org.total_gmv || 0)} total GMV. Incumbent: ${org.incumbent_oem_brand || "—"} (${inr(incumbentGmv)}). Dept: ${org.dept_category || "—"}.`,
      expected_action: `Identify the 100X dealer nearest ${org.organization_state}, brief them on ${org.organization_name}, and ensure 100X is registered on GeM for this buyer.`,
      expected_revenue_impact: revenueEstimate,
      confidence: 70,
      effort: "1_hour",
      sources: ["fogging"],
      payload: {
        organization_canonical: org.organization_canonical,
        organization_name: org.organization_name,
        organization_state: org.organization_state,
        organization_type: org.organization_type,
        dept_category: org.dept_category,
        incumbent_oem: org.incumbent_oem,
        incumbent_oem_brand: org.incumbent_oem_brand,
        incumbent_oem_gmv: incumbentGmv,
        total_gmv: org.total_gmv,
        total_contracts: org.total_contracts,
        dominant_mount_type: org.dominant_mount_type,
      },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(7),
      // v1.1 help system
      help_what: `An OEM Displacement recommendation identifies a specific government buyer who is currently purchasing from a competitor — and recommends a targeted outreach to win them over to 100X Circle.`,
      help_why: `${org.organization_name} has spent ${inr(incumbentGmv)} with ${org.incumbent_oem_brand || "a competitor OEM"} in GeM procurement data. They are an active, proven buyer of fogging machines — 100X has never won this account.`,
      help_if_approved: `An Execution Pack will be generated with: full market intelligence for ${org.organization_name}, a dealer briefing note, outreach email draft, WhatsApp message, call script, and meeting agenda. You or your nearest dealer can reach out immediately.`,
      help_if_ignored: `${org.incumbent_oem_brand || "The competitor"} will continue winning ${org.organization_name}'s procurement cycles. The estimated ${inr(revenueEstimate)} annual opportunity remains uncaptured. Every GeM cycle that passes makes the incumbent relationship stronger.`,
    })
  }

  return recs
}

async function fogDealerGaps(db: Db): Promise<DirectorRec[]> {
  const recs: DirectorRec[] = []
  const date = today()

  // States with significant non-100X GMV but no 100X sellers
  const [allOrgs, sellers100x] = await Promise.all([
    db.collection("fogging_organizations")
      .find({ total_gmv: { $gte: 10_000 } })
      .toArray(),
    db.collection("fogging_sellers")
      .find({ is_100x: true })
      .toArray(),
  ])

  const statesWith100x = new Set(sellers100x.map((s) => String(s.seller_state || "")))

  // Aggregate non-100X GMV by state
  const stateGmv = new Map<string, { gmv: number; contracts: number; orgCount: number }>()
  for (const org of allOrgs) {
    const state = String(org.organization_state || "")
    if (!state || state === "Central Government") continue
    const entry = stateGmv.get(state) || { gmv: 0, contracts: 0, orgCount: 0 }
    entry.gmv += Number(org.total_gmv || 0)
    entry.contracts += Number(org.total_contracts || 0)
    entry.orgCount++
    stateGmv.set(state, entry)
  }

  const gaps = Array.from(stateGmv.entries())
    .filter(([state, d]) => !statesWith100x.has(state) && d.gmv >= 200_000)
    .sort((a, b) => b[1].gmv - a[1].gmv)
    .slice(0, 4)

  for (const [state, data] of gaps) {
    const revenueEstimate = Math.round(data.gmv * 0.12) // 12% capture with a dealer
    recs.push({
      run_date: date,
      type: "dealer_recruit",
      priority: data.gmv >= 1_000_000 ? "critical" : "high",
      title: `Recruit 100X dealer in ${state}`,
      why_now: `${state} has ${inr(data.gmv)} in competitor fogging contracts across ${data.orgCount} orgs — 100X has zero dealer presence here.`,
      evidence: `${data.contracts} total fogging contracts in ${state}. No 100X seller. Competitors are already winning these tenders. A local dealer can bid immediately.`,
      expected_action: `Identify distributor/dealer leads in ${state} via GeM Seller Portal. Reach out for OEM authorization. Aim for first bid within 30 days.`,
      expected_revenue_impact: revenueEstimate,
      confidence: 60,
      effort: "project",
      sources: ["fogging"],
      payload: { state, total_gmv: data.gmv, total_contracts: data.contracts, org_count: data.orgCount },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(14),
      // v1.1 help system
      help_what: `A Dealer Recruitment recommendation identifies a state where government buyers are actively spending on fogging machines — but 100X has no authorized dealer who can bid on those tenders.`,
      help_why: `${state} has ${inr(data.gmv)} in active fogging procurement across ${data.orgCount} government organizations. 100X Circle has zero seller presence in this state — meaning all these contracts go to competitors by default.`,
      help_if_approved: `An Execution Pack will be generated with: state market intelligence, top buying organizations, outreach email draft, WhatsApp message, a detailed call script, and a dealer authorization meeting agenda — ready to send to a prospective dealer today.`,
      help_if_ignored: `Competitors continue winning every tender in ${state}. Estimated annual revenue forfeited: ${inr(revenueEstimate)}. Each additional competitor contract strengthens their GeM track record, making future displacement harder.`,
    })
  }

  return recs
}

async function adsWaste(db: Db): Promise<{ recs: DirectorRec[]; connected: boolean }> {
  const date = today()
  const lastSync = await db.collection("ads_syncs").findOne(
    { status: { $ne: "error" } }, { sort: { syncedAt: -1 } }
  )
  if (!lastSync) return { recs: [], connected: false }

  const syncDate = lastSync.syncDate as string
  const searchTerms = await db.collection("ads_searchterm_rows").find({ syncDate }).toArray()

  const recs: DirectorRec[] = []
  const wasteTerms = searchTerms
    .filter((t) => Number(t.clicks) >= 5 && Number(t.conversions) === 0)
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 5)

  for (const t of wasteTerms) {
    const spend = Number(t.spend) || 0
    recs.push({
      run_date: date,
      type: "negative_keyword",
      priority: spend >= 1000 ? "high" : "medium",
      title: `Block wasted spend on "${t.searchTerm}"`,
      why_now: `"${t.searchTerm}" burned ${inr(spend)} with ${t.clicks} clicks and zero conversions — every rupee is waste.`,
      evidence: `Campaign: "${t.campaign}". ${t.clicks} clicks, ${inr(spend)} spent, 0 conversions in sync window ${syncDate}.`,
      expected_action: `Add "${t.searchTerm}" as exact-match negative keyword to campaign "${t.campaign}".`,
      expected_revenue_impact: spend * 4,
      confidence: 85,
      effort: "5_min",
      sources: ["ads"],
      payload: { searchTerm: t.searchTerm, campaign: t.campaign, clicks: t.clicks, spend: t.spend, syncDate },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(3),
      // v1.1 help system
      help_what: `A Negative Keyword recommendation identifies a search term that is consuming ad budget without generating any leads or conversions — and recommends blocking it immediately.`,
      help_why: `"${t.searchTerm}" triggered ${t.clicks} clicks costing ${inr(spend)} with zero conversions. This is pure waste — people searching this term are not buying fogging machines.`,
      help_if_approved: `An Execution Pack with step-by-step Google Ads instructions will be generated. Adding the negative keyword takes approximately 2 minutes. Wasted spend on this term stops immediately.`,
      help_if_ignored: `Budget continues bleeding on irrelevant traffic. At the current rate, this search term alone will waste an additional ${inr(spend)} every few weeks — money that could be funding profitable clicks.`,
    })
  }

  return { recs, connected: true }
}

async function gscDemandGaps(db: Db): Promise<{ recs: DirectorRec[]; connected: boolean }> {
  const date = today()
  const latestSync = await db.collection("gsc_syncs").findOne(
    { status: { $ne: "error" } }, { sort: { syncedAt: -1 } }
  )
  if (!latestSync) return { recs: [], connected: false }

  const syncDate = latestSync.syncDate as string
  const queries = await db.collection("gsc_query_rows")
    .find({ syncDate, period: "current" })
    .toArray()

  const recs: DirectorRec[] = []

  // High impressions, low CTR, mid-ranking position = LP or campaign gap
  const gaps = queries
    .filter((q) => {
      const impressions = Number(q.impressions)
      const ctr = Number(q.ctr)
      const position = Number(q.position)
      const query = String(q.query || "")
      if (impressions < 50) return false
      if (ctr > 0.03) return false // CTR already decent
      if (position < 4 || position > 25) return false // too high or too deep
      if (query.includes('"') || /\baerosoldi?y\b/i.test(query)) return false // junk
      return true
    })
    .sort((a, b) => Number(b.impressions) - Number(a.impressions))
    .slice(0, 3)

  for (const q of gaps) {
    const impressions = Number(q.impressions)
    const position = Number(q.position || 10)
    const recType: DirectorRecType = position > 10 ? "content_create" : "landing_page_create"
    const revenueEstimate = Math.round(impressions * 0.05 * 0.03 * 75_000) // 5% CTR improvement × 3% conv × ₹75K deal

    recs.push({
      run_date: date,
      type: recType,
      priority: impressions >= 500 ? "high" : "medium",
      title: `Capture demand for "${q.query}"`,
      why_now: `"${q.query}" shows ${impressions} monthly impressions at position ${Math.round(position)} but only ${(Number(q.ctr) * 100).toFixed(1)}% CTR — demand exists, our content/ad isn't converting.`,
      evidence: `GSC data (${syncDate}): ${impressions} impressions, ${Math.round(Number(q.clicks))} clicks, position ${Math.round(position)}, CTR ${(Number(q.ctr) * 100).toFixed(1)}%.`,
      expected_action: recType === "landing_page_create"
        ? `Create a dedicated landing page optimized for "${q.query}" with a clear CTA. Then launch a search campaign targeting this exact query.`
        : `Write an authoritative blog/guide targeting "${q.query}" — position as the answer, not just a product page.`,
      expected_revenue_impact: revenueEstimate,
      confidence: 55,
      effort: "half_day",
      sources: ["gsc"],
      payload: { query: q.query, impressions, clicks: q.clicks, position, ctr: q.ctr, syncDate },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(7),
      // v1.1 help system
      help_what: recType === "landing_page_create"
        ? `A Landing Page recommendation identifies a search query with proven demand where 100X appears in Google search results — but the current page isn't compelling enough to generate clicks.`
        : `A Content recommendation identifies a search query where 100X appears in Google but at a position too deep (>10) to get meaningful traffic — requiring a full content piece to rank higher.`,
      help_why: `"${q.query}" is searched ${impressions.toLocaleString("en-IN")} times per month. 100X appears at position ${Math.round(position)} with only ${(Number(q.ctr) * 100).toFixed(1)}% CTR. Google is already showing us — the gap is in our page quality, not our domain authority.`,
      help_if_approved: `An Execution Pack will be generated with: SEO brief, recommended page structure, content outline, meta title and description, CTA recommendations, and related keywords to target — ready to hand directly to a content writer or developer.`,
      help_if_ignored: `${impressions.toLocaleString("en-IN")} monthly searches continue with 100X capturing only ${(Number(q.ctr) * 100).toFixed(1)}% of them. Competitors with better content or dedicated landing pages capture the remaining ${(100 - Number(q.ctr) * 100).toFixed(0)}%.`,
    })
  }

  return { recs, connected: true }
}

// ─── Signal: Customer Match Intelligence (Part 4) ─────────────────────────────

async function customerMatchAudiences(db: Db): Promise<DirectorRec[]> {
  const recs: DirectorRec[] = []
  const date = today()

  const totalOrgs = await db.collection("fogging_organizations").countDocuments()
  if (totalOrgs < 50) return recs // not enough data

  // Count by department categories for audience segments
  const aggResult = await db.collection("fogging_organizations")
    .aggregate([
      { $match: { total_gmv: { $gte: 5_000 } } },
      { $group: {
        _id: "$dept_category",
        count: { $sum: 1 },
        total_gmv: { $sum: "$total_gmv" },
      }},
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    .toArray()

  const topCategories = aggResult.filter(a => Number(a.count) >= 5)
  const totalQualified = topCategories.reduce((s: number, a) => s + Number(a.count), 0)

  if (totalQualified < 100) return recs

  const totalGmv = topCategories.reduce((s: number, a) => s + Number(a.total_gmv), 0)
  const topSegmentNames = topCategories.slice(0, 3).map(a => String(a._id || "")).join(", ")

  const revenueEstimate = Math.round(totalGmv * 0.03) // 3% capture from re-engagement

  recs.push({
    run_date: date,
    type: "customer_match_campaign",
    priority: totalQualified >= 500 ? "high" : "medium",
    title: `Build Customer Match audience from ${totalQualified.toLocaleString("en-IN")} govt buyers`,
    why_now: `${totalQualified} government organizations have proven fogging purchase history worth ${inr(totalGmv)} — this is a ready-made audience for Google Customer Match that no competitor can replicate.`,
    evidence: `Fogging Intelligence: ${totalQualified} qualified orgs across ${topCategories.length} department categories. Top segments: ${topSegmentNames}. Total GMV: ${inr(totalGmv)}. This audience has demonstrated intent — they already buy fogging machines.`,
    expected_action: `Approve to generate Customer Match pack. Export organization list, upload to Google Ads as Customer Match audience, and activate a remarketing campaign targeting these proven buyers.`,
    expected_revenue_impact: revenueEstimate,
    confidence: 65,
    effort: "1_hour",
    sources: ["fogging"],
    payload: {
      total_qualified_orgs: totalQualified,
      total_gmv: totalGmv,
      top_categories: topCategories.slice(0, 5).map(a => ({ category: a._id, count: a.count, gmv: a.total_gmv })),
      audience_name: "100X Circle — Govt Fogging Buyers",
    },
    status: "pending",
    generated_at: new Date().toISOString(),
    expires_at: expiresAt(14),
    help_what: `Customer Match lets you upload a list of known buyers to Google Ads, so you can show ads specifically to organizations that have already purchased fogging machines — the highest-intent audience possible.`,
    help_why: `Our Fogging Intelligence database contains ${totalQualified} government organizations with proven fogging purchase history worth ${inr(totalGmv)}. These are exactly the buyers most likely to purchase from 100X Circle — but right now we have no way to target them directly in Google Ads.`,
    help_if_approved: `A Customer Match Execution Pack will be generated with: audience segmentation by department type, upload instructions for Google Ads, campaign brief, targeting recommendations, and expected reach (${Math.round(totalQualified * 0.3)}-${Math.round(totalQualified * 0.5)} matched users).`,
    help_if_ignored: `${totalQualified} proven government buyers remain untargeted in Google Ads. Competitors without this intelligence guess at their audience — we have the data to target precisely. The longer we wait, the more of these buyers complete their next procurement cycle without seeing 100X.`,
  })

  return recs
}

// ─── Signal: Brand Domination Engine (Part 5) ─────────────────────────────────

async function brandDominationGaps(db: Db): Promise<DirectorRec[]> {
  const recs: DirectorRec[] = []
  const date = today()

  // Check total market size — needed to justify brand campaigns
  const [totalOrgCount, gmvAgg] = await Promise.all([
    db.collection("fogging_organizations").countDocuments(),
    db.collection("fogging_organizations")
      .aggregate([{ $group: { _id: null, total: { $sum: "$total_gmv" } } }])
      .toArray(),
  ])
  const totalMarketGmv = Number(gmvAgg[0]?.total || 0)

  if (totalMarketGmv < 500_000) return recs // market too small to justify brand campaigns

  // Check what campaigns are already running
  const lastSync = await db.collection("ads_syncs").findOne(
    { status: { $ne: "error" } }, { sort: { syncedAt: -1 } }
  )
  const adsConnected = Boolean(lastSync)

  // Get competitor OEMs from fogging data
  const competitorAgg = await db.collection("fogging_organizations")
    .aggregate([
      { $match: { incumbent_oem_brand: { $exists: true, $ne: "" } } },
      { $group: {
        _id: "$incumbent_oem_brand",
        count: { $sum: 1 },
        total_gmv: { $sum: "$incumbent_oem_gmv" },
      }},
      { $sort: { total_gmv: -1 } },
      { $limit: 5 },
    ])
    .toArray()

  const topCompetitors = competitorAgg
    .filter(c => String(c._id || "").toLowerCase() !== "100x" && Number(c.total_gmv) > 50_000)
    .map(c => ({ brand: String(c._id), count: Number(c.count), gmv: Number(c.total_gmv) }))

  // YouTube brand awareness — recommend if market > ₹1Cr
  if (totalMarketGmv >= 1_000_000) {
    recs.push({
      run_date: date,
      type: "youtube_campaign",
      priority: totalMarketGmv >= 5_000_000 ? "high" : "medium",
      title: `YouTube brand campaign — ${inr(totalMarketGmv)} market, 100X invisible`,
      why_now: `The government fogging market is ${inr(totalMarketGmv)} and growing — but 100X has no YouTube presence. Government purchase officers are on YouTube. Competitors aren't there either, making this a white space.`,
      evidence: `Fogging Intelligence: ${totalOrgCount} government buyers, ${inr(totalMarketGmv)} total market. 100X Google Ads: ${adsConnected ? "search only, no video" : "not connected"}. Competitor OEMs: ${topCompetitors.map(c => c.brand).join(", ") || "present in market"}. YouTube CPM for B2G segment: low.`,
      expected_action: `Approve to generate a YouTube Campaign Pack with a 30-60 second video brief, targeting strategy, and budget recommendation. Estimated reach: ${Math.round(totalOrgCount * 2).toLocaleString("en-IN")}+ government officials.`,
      expected_revenue_impact: Math.round(totalMarketGmv * 0.02), // 2% brand lift → revenue
      confidence: 50,
      effort: "project",
      sources: ["fogging"],
      payload: { total_market_gmv: totalMarketGmv, total_orgs: totalOrgCount, top_competitors: topCompetitors.map(c => c.brand).join(", ") },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(14),
      help_what: `A YouTube Campaign recommendation suggests running video ads to build 100X Circle brand awareness among government officials who influence fogging machine procurement.`,
      help_why: `The fogging market is ${inr(totalMarketGmv)} and the dominant decision-making pattern for government procurement is: (1) See brand multiple times → (2) Search on GeM → (3) Buy. 100X is only active at step 2. YouTube covers step 1.`,
      help_if_approved: `A YouTube Campaign Execution Pack will be generated with: 30-60 second video brief, targeting strategy (government demographics + fogging intent keywords), budget recommendation, and expected reach.`,
      help_if_ignored: `100X remains invisible in the top-of-funnel. Buyers who haven't heard of 100X Circle will search for whichever brand they remember when the tender opens — typically the brand that advertised to them most recently.`,
    })
  }

  // Competitor conquest — recommend if competitors have significant market share
  if (topCompetitors.length >= 2 && topCompetitors[0].gmv >= 200_000) {
    const topComp = topCompetitors[0]
    recs.push({
      run_date: date,
      type: "competitor_conquest_campaign",
      priority: topComp.gmv >= 1_000_000 ? "high" : "medium",
      title: `Conquer ${topComp.brand} buyers — ${inr(topComp.gmv)} at stake`,
      why_now: `${topComp.brand} controls ${inr(topComp.gmv)} in fogging market share across ${topComp.count} government buyers. Buyers searching "${topComp.brand.toLowerCase()} fogging machine" see no 100X ad — a direct interception opportunity.`,
      evidence: `Fogging Intelligence competitor data: ${topComp.brand} — ${topComp.count} contracts, ${inr(topComp.gmv)} GMV. Top competitors by market share: ${topCompetitors.map(c => `${c.brand} (${inr(c.gmv)})`).join(", ")}.`,
      expected_action: `Approve to generate a Competitor Conquest Campaign Pack with conquest keywords, ad copy for comparison positioning, and landing page recommendations.`,
      expected_revenue_impact: Math.round(topComp.gmv * 0.08), // 8% conquest from bidding on competitor terms
      confidence: 55,
      effort: "half_day",
      sources: ["fogging"],
      payload: { top_competitor: topComp.brand, competitor_gmv: topComp.gmv, competitor_contracts: topComp.count, top_competitors: topCompetitors.map(c => c.brand).join(", ") },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(14),
      help_what: `A Competitor Conquest Campaign intercepts government buyers who are actively searching for ${topComp.brand} products — and shows them 100X Circle as a credible alternative at the exact moment they are comparing options.`,
      help_why: `${topComp.brand} controls ${inr(topComp.gmv)} of the fogging market. When a buyer searches "${topComp.brand.toLowerCase()} fogging machine" on Google, 100X is not visible. This is a direct revenue opportunity — no 100X ad exists at the moment of competitive consideration.`,
      help_if_approved: `A Campaign Pack will be generated with: conquest keywords list, ad copy positioning 100X vs ${topComp.brand}, comparison landing page brief, and bid strategy recommendations.`,
      help_if_ignored: `${topComp.brand} buyers continue their procurement cycle without ever being exposed to 100X Circle. The competitive comparison never happens. These ${topComp.count} accounts remain permanently in the competitor's camp.`,
    })
  }

  // Remarketing — recommend if ads are connected (we have site traffic)
  if (adsConnected) {
    recs.push({
      run_date: date,
      type: "remarketing_campaign",
      priority: "medium",
      title: "Remarketing campaign — capture returning govt buyers",
      why_now: `Government purchase officers research multiple vendors before submitting a tender. Without remarketing, 100X is invisible during the critical comparison phase between their first visit and purchase decision.`,
      evidence: `Google Ads is connected with active campaigns. Remarketing lists can be built from site visitors immediately — these are the highest-intent users (already searched and clicked on 100X). Market context: ${totalOrgCount} active government buyers in fogging.`,
      expected_action: `Approve to generate a Remarketing Campaign Pack with audience configurations (30/90/180-day windows), display creative brief, and bid strategy. Setup takes approximately 1 hour.`,
      expected_revenue_impact: Math.round(totalMarketGmv * 0.01), // 1% re-engagement lift
      confidence: 60,
      effort: "1_hour",
      sources: ["ads", "fogging"],
      payload: { total_orgs: totalOrgCount, total_market_gmv: totalMarketGmv },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(14),
      help_what: `A Remarketing Campaign shows ads specifically to people who have already visited 100xcircle.com but haven't yet converted. These are warm leads — they know about 100X but haven't made a decision.`,
      help_why: `Government procurement decisions involve multiple stakeholders and take weeks or months. A buyer who visits today may submit their tender recommendation next month. Without remarketing, 100X is forgotten by then. With remarketing, we stay visible throughout their decision process.`,
      help_if_approved: `A Remarketing Campaign Pack will be generated with: audience list configurations (30/90/180-day visitor windows), display ad creative brief, bid adjustment recommendations, and expected reach.`,
      help_if_ignored: `Government buyers who visited 100xcircle.com see competitor ads while 100X stays invisible. By the time they finalize their tender recommendation, they may have forgotten 100X entirely. Remarketing typically generates 3-5x higher CTR vs cold audiences.`,
    })
  }

  return recs
}

// ─── Email brief ──────────────────────────────────────────────────────────────

function buildEmailBrief(recs: DirectorRec[], runDate: string, sourcesSummary: string): { subject: string; text: string; html: string } {
  const critical = recs.filter((r) => r.priority === "critical")
  const high = recs.filter((r) => r.priority === "high")
  const quickWins = recs.filter((r) => r.effort === "5_min")

  const subject = critical.length > 0
    ? `Revenue Director: ${critical.length} critical action${critical.length > 1 ? "s" : ""} — ${runDate}`
    : `Revenue Director: ${recs.length} recommendations — ${runDate}`

  const lines: string[] = [
    `REVENUE DIRECTOR — ${runDate}`,
    `Sources: ${sourcesSummary}`,
    ``,
    `━━━ ${recs.length} RECOMMENDATIONS (${critical.length} critical, ${high.length} high) ━━━`,
    ``,
  ]

  const ranked = [...recs].sort((a, b) => {
    const pOrd = { critical: 0, high: 1, medium: 2, low: 3 }
    const pd = pOrd[a.priority] - pOrd[b.priority]
    return pd !== 0 ? pd : b.expected_revenue_impact - a.expected_revenue_impact
  })

  for (const [i, r] of ranked.slice(0, 7).entries()) {
    lines.push(
      `${i + 1}. [${r.priority.toUpperCase()}] ${r.title}`,
      `   ${r.why_now}`,
      `   Impact: ${inr(r.expected_revenue_impact)} | Effort: ${r.effort.replace(/_/g, " ")} | Confidence: ${r.confidence}%`,
      `   Action: ${r.expected_action}`,
      ``,
    )
  }

  if (quickWins.length > 0) {
    lines.push(`━━━ QUICK WINS (5 min each) ━━━`)
    for (const r of quickWins.slice(0, 3)) {
      lines.push(`• ${r.title} — ${inr(r.expected_revenue_impact)} impact`)
    }
    lines.push(``)
  }

  lines.push(
    `Review & approve: https://www.100xcircle.com/admin/growth/director`,
    ``,
    `— Autonomous Revenue Director (100X Circle Growth OS)`,
  )

  const text = lines.join("\n")

  const htmlRows = ranked.slice(0, 7).map((r, i) => {
    const priorityColor = { critical: "#dc2626", high: "#ea580c", medium: "#ca8a04", low: "#16a34a" }[r.priority]
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:13px;color:#6b7280;">${i + 1}. <span style="font-weight:700;color:${priorityColor};text-transform:uppercase;">${r.priority}</span> · ${r.type.replace(/_/g, " ")}</div>
          <div style="font-size:16px;font-weight:600;color:#111827;margin:4px 0;">${r.title}</div>
          <div style="font-size:14px;color:#374151;margin:4px 0;">${r.why_now}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">
            Impact: <strong>${inr(r.expected_revenue_impact)}</strong> ·
            Effort: ${r.effort.replace(/_/g, " ")} ·
            Confidence: ${r.confidence}%
          </div>
          <div style="font-size:13px;color:#1d4ed8;margin-top:6px;">→ ${r.expected_action}</div>
        </td>
      </tr>`
  }).join("")

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <div style="background:#111827;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">100X Circle</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px;">Revenue Director</div>
        <div style="font-size:14px;color:#9ca3af;margin-top:4px;">${runDate} · ${sourcesSummary}</div>
      </div>
      <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
          <strong>${recs.length} recommendations</strong> — ${critical.length} critical, ${high.length} high priority
        </div>
        <table style="width:100%;border-collapse:collapse;">${htmlRows}</table>
        <div style="margin-top:20px;text-align:center;">
          <a href="https://www.100xcircle.com/admin/growth/director"
             style="background:#111827;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            Review &amp; Approve All Recommendations →
          </a>
        </div>
      </div>
    </div>`

  return { subject, text, html }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runRevenueDirector(force = false): Promise<{
  date: string
  skipped?: boolean
  rec_count: number
  critical_count: number
  high_count: number
  sources_connected: DirectorSource[]
  sources_missing: DirectorSource[]
  email_sent: boolean
}> {
  const db: Db = (await clientPromise).db()
  const runDate = today()

  // Idempotency: skip if already completed today (unless forced)
  if (!force) {
    const existing = await db.collection(COLL_RUNS).findOne({ date: runDate, status: "completed" })
    if (existing) {
      return {
        date: runDate, skipped: true,
        rec_count: existing.rec_count || 0,
        critical_count: existing.critical_count || 0,
        high_count: existing.high_count || 0,
        sources_connected: existing.sources_connected || [],
        sources_missing: existing.sources_missing || [],
        email_sent: existing.email_sent || false,
      }
    }
  }

  const startedAt = new Date().toISOString()
  await db.collection(COLL_RUNS).updateOne(
    { date: runDate },
    { $set: { date: runDate, status: "running", started_at: startedAt, rec_count: 0, email_sent: false } },
    { upsert: true }
  )

  const connected: DirectorSource[] = []
  const missing: DirectorSource[] = []
  const allRecs: DirectorRec[] = []

  try {
    // Signal: Fogging attack accounts
    const fogAtk = await fogAttackAccounts(db)
    allRecs.push(...fogAtk)
    if (fogAtk.length > 0) connected.push("fogging")
    else {
      // Check if fogging data exists at all
      const fogCount = await db.collection("fogging_organizations").countDocuments()
      if (fogCount > 0) { connected.push("fogging") } else { missing.push("fogging") }
    }

    // Signal: Fogging dealer gaps
    const fogDealer = await fogDealerGaps(db)
    allRecs.push(...fogDealer)

    // Signal: Ads waste
    const { recs: adsRecs, connected: adsConn } = await adsWaste(db)
    allRecs.push(...adsRecs)
    if (adsConn) connected.push("ads")
    else missing.push("ads")

    // Signal: GSC demand gaps
    const { recs: gscRecs, connected: gscConn } = await gscDemandGaps(db)
    allRecs.push(...gscRecs)
    if (gscConn) connected.push("gsc")
    else missing.push("gsc")

    // Signal: Customer Match Intelligence (v1.1 — Part 4)
    const cmRecs = await customerMatchAudiences(db)
    allRecs.push(...cmRecs)

    // Signal: Brand Domination Engine (v1.1 — Part 5)
    const bdRecs = await brandDominationGaps(db)
    allRecs.push(...bdRecs)

    // De-duplicate by title (same signal can fire twice in edge cases)
    const seen = new Set<string>()
    const deduped = allRecs.filter((r) => {
      const key = `${r.type}:${r.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Rank: critical > high by revenue impact
    deduped.sort((a, b) => {
      const pOrd: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      const pd = pOrd[a.priority] - pOrd[b.priority]
      return pd !== 0 ? pd : b.expected_revenue_impact - a.expected_revenue_impact
    })

    const criticalCount = deduped.filter((r) => r.priority === "critical").length
    const highCount = deduped.filter((r) => r.priority === "high").length

    // Persist: overwrite today's recs
    if (deduped.length > 0) {
      await db.collection(COLL_RECS).deleteMany({ run_date: runDate })
      await db.collection(COLL_RECS).insertMany(deduped as never[])
    }

    // Email brief
    let emailSent = false
    if (isEmailConfigured() && deduped.length > 0) {
      try {
        const sourcesSummary = [
          ...connected.map((s) => `${s} ✓`),
          ...missing.map((s) => `${s} ✗`),
        ].join(", ")
        const { subject, text, html } = buildEmailBrief(deduped, runDate, sourcesSummary)
        await sendAdminEmail({ subject, text, html })
        emailSent = true
      } catch (emailErr) {
        console.error("Revenue Director email failed:", emailErr)
      }
    }

    const completedAt = new Date().toISOString()
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()

    await db.collection(COLL_RUNS).updateOne(
      { date: runDate },
      {
        $set: {
          status: "completed",
          completed_at: completedAt,
          duration_ms: durationMs,
          rec_count: deduped.length,
          critical_count: criticalCount,
          high_count: highCount,
          sources_connected: connected,
          sources_missing: missing,
          email_sent: emailSent,
        },
      }
    )

    await logAgentRun(db, {
      agent: AGENT,
      action: `${deduped.length} recs (${criticalCount} critical, ${highCount} high). Sources: ${connected.join(", ")} ✓ | ${missing.join(", ")} ✗`,
      reason: "Daily autonomous revenue director run",
      expectedImpact: "Ranked revenue recommendations with email brief",
      actualImpact: `${deduped.length} recs, email ${emailSent ? "sent" : "skipped"}`,
      level: "success",
      module: "director",
    })

    return {
      date: runDate,
      rec_count: deduped.length,
      critical_count: criticalCount,
      high_count: highCount,
      sources_connected: connected,
      sources_missing: missing,
      email_sent: emailSent,
    }
  } catch (err) {
    await db.collection(COLL_RUNS).updateOne(
      { date: runDate },
      { $set: { status: "failed", error: String(err), completed_at: new Date().toISOString() } }
    )
    await logAgentRun(db, {
      agent: AGENT, action: "Revenue Director run failed",
      reason: String(err), expectedImpact: "—", actualImpact: "0",
      level: "error", module: "director",
    })
    throw err
  }
}
