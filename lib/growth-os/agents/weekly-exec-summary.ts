import clientPromise from "@/lib/mongodb"
import type { Db } from "mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"
import { COLL, isoWeek } from "@/lib/growth-os/opportunity-core"
import { SCORING_VERSION, TAXONOMY_VERSION } from "@/lib/growth-os/opportunity-config"

const AGENT = "Weekly Executive Summary"
const COLL_SUMMARY = "growth_exec_summaries"

interface OppLite { segment: string; entityName: string; score: number; confidence: string; geography: string | null; actionStatus: string; reason: string }

function prevWeekKey(): string {
  return isoWeek(new Date(Date.now() - 7 * 86_400_000))
}

/**
 * Weekly Executive Summary — generated every Monday after the engines run.
 * Aggregates: Top 20 dealers, Top 20 machine buyers, status changes,
 * new opportunities, wins, and lost opportunities (last 7 days).
 */
export async function runWeeklyExecSummary() {
  const db: Db = (await clientPromise).db()
  const week = isoWeek()
  const prevWeek = prevWeekKey()
  const generatedAt = new Date().toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const opp = db.collection(COLL.opportunities)
  const [thisWeekRows, prevWeekRows] = await Promise.all([
    opp.find({ week }).sort({ score: -1 }).toArray() as Promise<unknown[]>,
    opp.find({ week: prevWeek }, { projection: { segment: 1, entityName: 1 } }).toArray() as Promise<unknown[]>,
  ])
  const rows = thisWeekRows as unknown as OppLite[]
  const dealers = rows.filter((r) => r.segment === "dealer").slice(0, 20)
  const buyers = rows.filter((r) => r.segment === "machine_buyer").slice(0, 20)

  const prevKeys = new Set((prevWeekRows as Array<{ segment: string; entityName: string }>).map((r) => `${r.segment}::${r.entityName}`))
  const newOpps = rows.filter((r) => !prevKeys.has(`${r.segment}::${r.entityName}`))

  // Status changes / wins / losses from the workflow timeline (last 7 days)
  const statusDocs = await db.collection(COLL.status).find({}).toArray()
  const changes: Array<{ entity: string; segment: string; status: string; at: string }> = []
  for (const d of statusDocs) {
    const hist = Array.isArray(d.statusHistory) ? d.statusHistory : []
    for (const h of hist as Array<{ status: string; at: string }>) {
      if (h.at >= sevenDaysAgo) changes.push({ entity: String(d.entityKey), segment: String(d.segment), status: h.status, at: h.at })
    }
  }
  const wins = changes.filter((c) => c.status === "Won")
  const lost = changes.filter((c) => c.status === "Lost")
  const statusCounts = changes.reduce((m: Record<string, number>, c) => { m[c.status] = (m[c.status] || 0) + 1; return m }, {})

  const stats = {
    dealerCount: dealers.length, buyerCount: buyers.length,
    newOpportunities: newOpps.length, statusChanges: changes.length,
    wins: wins.length, lost: lost.length, statusCounts,
  }

  const markdown = buildMarkdown({ week, prevWeek, generatedAt, dealers, buyers, newOpps, changes, wins, lost, statusCounts })

  await db.collection(COLL_SUMMARY).updateOne(
    { week },
    { $set: { week, generatedAt, stats, markdown, scoringVersion: SCORING_VERSION, taxonomyVersion: TAXONOMY_VERSION } },
    { upsert: true }
  )

  // Executive card into the recommendation queue
  await db.collection("growth_os_opportunities").updateOne(
    { title: `Weekly Executive Summary — ${week}` },
    {
      $set: {
        title: `Weekly Executive Summary — ${week}`,
        description: `${dealers.length} dealer + ${buyers.length} buyer opportunities · ${newOpps.length} new · ${wins.length} won · ${lost.length} lost this week. Open Contact This Week → Exec Summary.`,
        module: "dealers", source: "agent", businessValue: "high", seoValue: "low", geoValue: "low",
        dealerImpact: "high", effort: "low", status: "pending", updatedAt: generatedAt,
      },
      $setOnInsert: { createdAt: generatedAt },
    },
    { upsert: true }
  )

  await logAgentRun(db, {
    agent: AGENT,
    action: `Week ${week}: ${dealers.length} dealers, ${buyers.length} buyers, ${newOpps.length} new, ${wins.length} won, ${lost.length} lost.`,
    reason: "Monday executive roll-up",
    expectedImpact: "Weekly leadership visibility into pipeline + conversion",
    actualImpact: `${changes.length} status changes tracked`,
    level: "success", module: "dealers",
    after: JSON.stringify(stats),
  })

  return { week, ...stats }
}

function buildMarkdown(d: {
  week: string; prevWeek: string; generatedAt: string
  dealers: OppLite[]; buyers: OppLite[]; newOpps: OppLite[]
  changes: Array<{ entity: string; segment: string; status: string; at: string }>
  wins: Array<{ entity: string }>; lost: Array<{ entity: string }>; statusCounts: Record<string, number>
}): string {
  const o: string[] = []
  o.push(`# Weekly Executive Summary — ${d.week}`)
  o.push("")
  o.push(`Generated ${d.generatedAt} · vs ${d.prevWeek}`)
  o.push("")
  o.push(`**Pipeline:** ${d.dealers.length} dealer opportunities · ${d.buyers.length} machine buyers · ${d.newOpps.length} new this week`)
  o.push(`**Conversion:** ${d.wins.length} won · ${d.lost.length} lost · ${d.changes.length} status changes`)
  if (Object.keys(d.statusCounts).length) o.push(`**Status moves:** ${Object.entries(d.statusCounts).map(([s, n]) => `${s} ${n}`).join(" · ")}`)
  o.push("")

  const list = (title: string, rows: OppLite[]) => {
    o.push(`## ${title}`)
    if (!rows.length) { o.push("_None._"); o.push(""); return }
    rows.forEach((r, i) => o.push(`${i + 1}. **${r.entityName}** — ${r.score}/100 (${r.confidence}) · ${r.geography || "—"} · status: ${r.actionStatus}`))
    o.push("")
  }
  list("Top 20 Dealer Opportunities", d.dealers)
  list("Top 20 Machine Buyers", d.buyers)

  o.push(`## New Opportunities This Week (${d.newOpps.length})`)
  if (d.newOpps.length) d.newOpps.slice(0, 30).forEach((r) => o.push(`- [${r.segment === "dealer" ? "Dealer" : "Buyer"}] ${r.entityName} — ${r.score}/100`))
  else o.push("_None._")
  o.push("")

  o.push(`## Wins (${d.wins.length})`)
  d.wins.length ? d.wins.forEach((w) => o.push(`- 🏆 ${w.entity}`)) : o.push("_None this week._")
  o.push("")
  o.push(`## Lost (${d.lost.length})`)
  d.lost.length ? d.lost.forEach((w) => o.push(`- ✖ ${w.entity}`)) : o.push("_None this week._")
  return o.join("\n")
}
