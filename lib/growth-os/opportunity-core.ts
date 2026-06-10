import type { Db } from "mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"
import {
  TAXONOMY, RECENCY_BUCKETS, CONFIDENCE, TOP_N_PER_SEGMENT,
  SCORING_VERSION, TAXONOMY_VERSION,
  ACTION_STATUSES, SUPPRESSED_STATUSES, IN_PROGRESS_STATUSES, IN_PROGRESS_DOWNGRADE,
  type Segment, type Confidence, type ActionStatus,
} from "@/lib/growth-os/opportunity-config"

// Collections (unified, segment-tagged)
export const COLL = {
  opportunities: "growth_opportunities",
  reports: "growth_opportunity_reports",
  status: "growth_opportunity_status",
}

// ── Compiled taxonomy (built once from config) ──────────────────────────────────
const reOf = (arr: string[]) => new RegExp(arr.join("|"), "i")
const RE = {
  tierA: reOf(TAXONOMY.tierA),
  tierB: reOf(TAXONOMY.tierB),
  chemical: reOf(TAXONOMY.chemical),
  exclude: reOf(TAXONOMY.exclude),
}

export type FitClass = "A" | "B" | "CHEM" | null

/** Classify free-text product evidence into a taxonomy class (config-driven). */
export function classifyText(text: string): FitClass {
  const t = text || ""
  const hitsTaxonomy = RE.tierA.test(t) || RE.tierB.test(t) || RE.chemical.test(t)
  if (RE.exclude.test(t) && !hitsTaxonomy) return null
  if (RE.tierA.test(t)) return "A"
  if (RE.chemical.test(t)) return "CHEM"
  if (RE.tierB.test(t)) return "B"
  return null
}

/** Combined regex used to pre-filter contracts cheaply at the DB layer. */
export function taxonomyMatchRegexSource(): string {
  return [...TAXONOMY.tierA, ...TAXONOMY.tierB, ...TAXONOMY.chemical].join("|")
}

export function recencyScore(days: number | null): number {
  if (days == null) return RECENCY_BUCKETS[RECENCY_BUCKETS.length - 1].value
  for (const b of RECENCY_BUCKETS) if (days <= b.maxDays) return b.value
  return 0.1
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return Number.isNaN(d) ? null : d
}

export function confidenceFor(score: number, topSignal: boolean, hasContact: boolean): Confidence {
  if (score >= CONFIDENCE.highScore && topSignal && hasContact) return "high"
  if (score >= CONFIDENCE.mediumScore) return "medium"
  return "low"
}

export function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

// ── Engine row contract ─────────────────────────────────────────────────────────
export interface RawRow {
  entityKey: string // unique within segment (dealer name / buyer key)
  entityName: string
  score: number // 0–100 pre-status-adjustment
  topSignal: boolean // tier A or chemical → eligible for High confidence
  hasContact: boolean
  geography: string | null
  reason: string
  fitExplanation: string
  gemActivity: string
  contact: { phone?: string | null; email?: string | null; gst?: string | null; msme?: string | null }
  nextAction: string
  extra?: Record<string, unknown> // segment-specific (tier, oemAuthProbability, dept, signals, intentPct)
}

export interface StoredRow extends RawRow {
  segment: Segment
  week: string
  rank: number
  confidence: Confidence
  actionStatus: ActionStatus
  scoringVersion: string
  taxonomyVersion: string
  generatedAt: string
}

const SEGMENT_LABEL: Record<Segment, string> = {
  dealer: "Dealers to Contact This Week",
  machine_buyer: "Machine Buyers to Contact This Week",
}

/**
 * Apply the status workflow, rank, stamp versions + confidence, and persist.
 * Suppresses Won/Lost/Ignore; downgrades in-progress so fresh entities surface.
 */
export async function finalizeAndPersist(
  db: Db,
  segment: Segment,
  rawRows: RawRow[],
  agentName: string
): Promise<{ week: string; count: number; suppressed: number; top: StoredRow[] }> {
  const week = isoWeek()
  const generatedAt = new Date().toISOString()

  const statusDocs = await db.collection(COLL.status).find({ segment }).toArray()
  const statusMap = new Map<string, ActionStatus>(
    statusDocs.map((d) => [String(d.entityKey), (d.status as ActionStatus) || "New"])
  )

  let suppressed = 0
  const eligible: Array<RawRow & { adjScore: number; status: ActionStatus }> = []
  for (const r of rawRows) {
    const status = statusMap.get(r.entityKey) || "New"
    if (SUPPRESSED_STATUSES.includes(status)) { suppressed++; continue }
    let adjScore = r.score
    if (IN_PROGRESS_STATUSES.includes(status)) adjScore = Math.round(adjScore * IN_PROGRESS_DOWNGRADE * 10) / 10
    eligible.push({ ...r, adjScore, status })
  }

  eligible.sort((a, b) => b.adjScore - a.adjScore)
  const top: StoredRow[] = eligible.slice(0, TOP_N_PER_SEGMENT).map((r, i) => ({
    ...r,
    score: r.adjScore,
    segment,
    week,
    rank: i + 1,
    confidence: confidenceFor(r.adjScore, r.topSignal, r.hasContact),
    actionStatus: r.status,
    scoringVersion: SCORING_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    generatedAt,
  }))

  // Persist recommendations (replace this week + segment)
  const opp = db.collection(COLL.opportunities)
  await opp.deleteMany({ week, segment })
  if (top.length) await opp.insertMany(top.map((r) => ({ ...r })))

  // Durable weekly report archive (serverless FS is read-only)
  const markdown = buildReport(segment, week, top, suppressed)
  await db.collection(COLL.reports).updateOne(
    { week, segment },
    { $set: { week, segment, generatedAt, count: top.length, suppressed, scoringVersion: SCORING_VERSION, taxonomyVersion: TAXONOMY_VERSION, markdown } },
    { upsert: true }
  )

  // Summary card into the Growth OS recommendation queue
  const label = SEGMENT_LABEL[segment]
  const title = `Top ${top.length} ${label} — week ${week}`
  const lead = top[0]
  await db.collection("growth_os_opportunities").updateOne(
    { title },
    {
      $set: {
        title,
        description: lead
          ? `#1: ${lead.entityName} (${lead.score}/100, ${lead.confidence} confidence). ${suppressed} suppressed. Open Growth OS → Contact This Week.`
          : `No qualifying ${segment} opportunities this week.`,
        module: "dealers",
        source: "agent",
        businessValue: "high", seoValue: "low", geoValue: "low", dealerImpact: "high",
        effort: "low", status: "pending", updatedAt: generatedAt,
      },
      $setOnInsert: { createdAt: generatedAt },
    },
    { upsert: true }
  )

  await logAgentRun(db, {
    agent: agentName,
    action: `Week ${week}: ${top.length} ${segment} opportunities (${suppressed} suppressed). Top: ${lead?.entityName || "—"} (${lead?.score ?? 0}/100, ${lead?.confidence ?? "n/a"}).`,
    reason: `Scoring ${SCORING_VERSION}, taxonomy ${TAXONOMY_VERSION}`,
    expectedImpact: segment === "dealer" ? "Expand 100X dealer network / OEM authorizations" : "Direct machine sales to govt buyers",
    actualImpact: `${top.length} queued, report archived`,
    level: top.length > 0 ? "success" : "warning",
    module: "dealers",
    after: JSON.stringify({ week, segment, top: top.slice(0, 5).map((r) => ({ e: r.entityName, s: r.score, c: r.confidence })) }),
  })

  return { week, count: top.length, suppressed, top }
}

function buildReport(segment: Segment, week: string, rows: StoredRow[], suppressed: number): string {
  const out: string[] = []
  out.push(`# Top ${rows.length} ${SEGMENT_LABEL[segment]} — Week ${week}`)
  out.push("")
  out.push(`Generated ${new Date().toISOString()} · scoring ${SCORING_VERSION} · taxonomy ${TAXONOMY_VERSION} · ${suppressed} suppressed`)
  out.push("")
  rows.forEach((r) => {
    out.push(`## ${r.rank}. ${r.entityName} — ${r.score}/100 (${r.confidence} confidence)`)
    out.push(`- **Geography:** ${r.geography || "—"}`)
    out.push(`- **Why ranked:** ${r.reason}`)
    out.push(`- **Product fit:** ${r.fitExplanation}`)
    out.push(`- **GeM activity:** ${r.gemActivity}`)
    out.push(`- **Contact:** ${r.contact.phone || r.contact.email || "no contact"}${r.contact.gst ? ` · GST ${r.contact.gst}` : ""}`)
    out.push(`- **Next action:** ${r.nextAction}`)
    out.push(`- **Status:** ${r.actionStatus}`)
    out.push("")
  })
  return out.join("\n")
}

export { ACTION_STATUSES }
