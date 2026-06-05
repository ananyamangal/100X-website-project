/**
 * SEO Opportunity Agent — reads latest GSC sync from MongoDB and creates
 * growth_os_opportunities for near-wins, rank drops, CTR gaps, and new keywords.
 * Also creates content draft recommendations for significant keyword clusters.
 * Read-only with respect to GSC. Does not write back to Google.
 */
import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

const MIN_IMPRESSIONS_FOR_OPPORTUNITY = 50

function expectedCtr(position: number): number {
  if (position <= 3) return 0.11
  if (position <= 5) return 0.08
  if (position <= 10) return 0.05
  if (position <= 20) return 0.015
  return 0.005
}

export interface SEOOpportunityResult {
  summary: string
  opportunitiesCreated: number
  contentDraftsCreated: number
  nearWinsFound: number
  rankDropsFound: number
  ctrGapsFound: number
  newKeywordsFound: number
}

export async function runSEOOpportunityAgent(): Promise<SEOOpportunityResult> {
  const db = (await clientPromise).db()

  const latestSync = await db.collection("gsc_syncs").findOne({ status: { $ne: "error" } }, { sort: { syncedAt: -1 } })
  if (!latestSync) {
    return { summary: "No GSC sync data found. Run a GSC sync first.", opportunitiesCreated: 0, contentDraftsCreated: 0, nearWinsFound: 0, rankDropsFound: 0, ctrGapsFound: 0, newKeywordsFound: 0 }
  }
  const syncDate = latestSync.syncDate as string
  const siteUrl = String(latestSync.siteUrl || "")

  const [currQ, prevQ, currP, prevP] = await Promise.all([
    db.collection("gsc_query_rows").find({ syncDate, period: "current" }).toArray(),
    db.collection("gsc_query_rows").find({ syncDate, period: "previous" }).toArray(),
    db.collection("gsc_page_rows").find({ syncDate, period: "current" }).toArray(),
    db.collection("gsc_page_rows").find({ syncDate, period: "previous" }).toArray(),
  ])

  const prevQMap = new Map(prevQ.map(r => [String(r.query), r]))
  const prevPMap = new Map(prevP.map(r => [String(r.page), r]))

  let opportunitiesCreated = 0
  let contentDraftsCreated = 0
  let nearWinsFound = 0
  let rankDropsFound = 0
  let ctrGapsFound = 0
  let newKeywordsFound = 0

  async function upsertOpportunity(title: string, doc: Record<string, unknown>) {
    const existing = await db.collection("growth_os_opportunities").findOne({ title })
    if (!existing) {
      await db.collection("growth_os_opportunities").insertOne({ title, ...doc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      opportunitiesCreated++
    }
  }

  // 1. Near-win keywords — position 4-20, high impressions, CTR below expected
  const nearWins = currQ.filter(r => {
    const pos = r.position as number
    const imp = r.impressions as number
    const ctr = r.ctr as number
    return pos >= 4 && pos <= 20 && imp >= MIN_IMPRESSIONS_FOR_OPPORTUNITY && ctr < expectedCtr(pos) * 0.75
  }).sort((a, b) => (b.impressions as number) - (a.impressions as number)).slice(0, 10)

  for (const nw of nearWins) {
    nearWinsFound++
    const pos = Math.round((nw.position as number) * 10) / 10
    const imp = nw.impressions as number
    const title = `Near-win: "${nw.query}" at position ${pos}`
    const priority = imp >= 200 ? "high" : imp >= 100 ? "medium" : "low"
    const action = pos <= 10
      ? "Add FAQ section, improve title tag, strengthen H1 — already on page 1, needs CTR boost"
      : "Add internal links, expand content, add FAQ — push from page 2 to page 1"
    await upsertOpportunity(title, {
      description: `Query "${nw.query}" has ${imp} impressions at position ${pos} but only ${Math.round((nw.ctr as number) * 100)}% CTR (expected ~${Math.round(expectedCtr(nw.position as number) * 100)}%). ${action}.`,
      module: "seo", source: "gsc-agent", status: "pending",
      businessValue: priority, seoValue: "high", geoValue: "medium", dealerImpact: "medium", effort: "low",
      gscQuery: nw.query, gscPosition: pos, gscImpressions: imp,
    })
  }

  // 2. Rank drops — position worsened >= 5 on high-impression queries
  for (const curr of currQ) {
    const prev = prevQMap.get(String(curr.query))
    if (!prev) continue
    const posChange = (curr.position as number) - (prev.position as number)
    if (posChange < 5) continue
    if ((curr.impressions as number) < MIN_IMPRESSIONS_FOR_OPPORTUNITY) continue
    rankDropsFound++
    const title = `Rank drop: "${curr.query}" fell ${Math.round(posChange)} positions`
    await upsertOpportunity(title, {
      description: `"${curr.query}" dropped from position ${Math.round(prev.position as number)} to ${Math.round(curr.position as number)} (−${Math.round(posChange)} positions). Impressions: ${curr.impressions}. Investigate: content freshness, competing pages, technical issues.`,
      module: "seo", source: "gsc-agent", status: "pending",
      businessValue: "high", seoValue: "high", geoValue: "low", dealerImpact: "medium", effort: "medium",
      gscQuery: curr.query, gscPositionDelta: posChange,
    })
  }

  // 3. Page CTR drops — pages with declining CTR and meaningful click volume
  for (const curr of currP) {
    const prev = prevPMap.get(String(curr.page))
    if (!prev) continue
    if ((curr.clicks as number) < 5) continue
    const ctrDrop = (prev.ctr as number) - (curr.ctr as number)
    if (ctrDrop < 0.03) continue // less than 3 percentage points
    ctrGapsFound++
    const pagePath = String(curr.page || "").replace(siteUrl.replace(/\/$/, ""), "") || "/"
    const title = `CTR drop: ${pagePath}`
    await upsertOpportunity(title, {
      description: `${pagePath} CTR dropped from ${Math.round((prev.ctr as number) * 1000) / 10}% to ${Math.round((curr.ctr as number) * 1000) / 10}%. Clicks: ${curr.clicks}. Review: title tag, meta description, and rich result eligibility.`,
      module: "seo", source: "gsc-agent", status: "pending",
      businessValue: "medium", seoValue: "high", geoValue: "low", dealerImpact: "low", effort: "low",
      gscPage: curr.page,
    })
  }

  // 4. New high-impression keywords — in current but not in previous
  const newKeywords = currQ
    .filter(r => !prevQMap.has(String(r.query)) && (r.impressions as number) >= 100)
    .sort((a, b) => (b.impressions as number) - (a.impressions as number))
    .slice(0, 5)

  for (const nk of newKeywords) {
    newKeywordsFound++
    const title = `New keyword: "${nk.query}" (${nk.impressions} impressions)`
    await upsertOpportunity(title, {
      description: `New query "${nk.query}" appeared with ${nk.impressions} impressions at position ${Math.round((nk.position as number) * 10) / 10}. This intent isn't tracked yet — create or optimize content to capture it.`,
      module: "seo", source: "gsc-agent", status: "pending",
      businessValue: "medium", seoValue: "high", geoValue: "medium", dealerImpact: "medium", effort: "medium",
      gscQuery: nk.query, gscImpressions: nk.impressions,
    })
  }

  // 5. Content draft: cluster new keywords by token overlap for content recommendations
  const newClusters = new Map<string, string[]>()
  for (const nk of newKeywords) {
    const query = String(nk.query || "")
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 4)
    const key = tokens.slice(0, 2).join(" ")
    if (!newClusters.has(key)) newClusters.set(key, [])
    newClusters.get(key)!.push(query)
  }
  for (const [cluster, queries] of newClusters.entries()) {
    if (queries.length === 0) continue
    const existing = await db.collection("growth_os_drafts").findOne({ targetIntent: cluster, opportunitySource: "gsc-agent" })
    if (!existing) {
      await db.collection("growth_os_drafts").insertOne({
        title: `Content opportunity: ${queries[0] || cluster}`,
        targetIntent: cluster,
        opportunitySource: "gsc-agent",
        confidenceScore: 60,
        expectedImpact: `Create or update content targeting: ${queries.join("; ")}. These queries appeared in GSC with no prior ranking — an underserved intent cluster.`,
        content: `Target queries: ${queries.join(", ")}`,
        status: "draft",
        riskLevel: "low",
        slug: "",
        targetUrl: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      contentDraftsCreated++
    }
  }

  const summary = `GSC opportunity scan: ${nearWinsFound} near-wins, ${rankDropsFound} rank drops, ${ctrGapsFound} CTR gaps, ${newKeywordsFound} new keywords. Created ${opportunitiesCreated} opportunities, ${contentDraftsCreated} content drafts.`

  await logAgentRun(db, {
    agent: "SEO Opportunity Agent",
    action: summary,
    reason: "GSC data analysis",
    expectedImpact: "Surface actionable SEO opportunities from real ranking data",
    actualImpact: `${opportunitiesCreated} new opportunities created`,
    level: opportunitiesCreated > 0 ? "success" : "info",
    module: "seo",
    after: JSON.stringify({ nearWinsFound, rankDropsFound, ctrGapsFound, newKeywordsFound, opportunitiesCreated }),
  })

  return { summary, opportunitiesCreated, contentDraftsCreated, nearWinsFound, rankDropsFound, ctrGapsFound, newKeywordsFound }
}
