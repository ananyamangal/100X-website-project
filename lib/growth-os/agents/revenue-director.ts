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
      expected_revenue_impact: spend * 4, // recovered spend freed for real conversions
      confidence: 85,
      effort: "5_min",
      sources: ["ads"],
      payload: { searchTerm: t.searchTerm, campaign: t.campaign, clicks: t.clicks, spend: t.spend, syncDate },
      status: "pending",
      generated_at: new Date().toISOString(),
      expires_at: expiresAt(3),
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
    })
  }

  return { recs, connected: true }
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
