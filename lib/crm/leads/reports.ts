/**
 * One-page sales reports (STEP 4c; DATA_MODEL §3 "Reports").
 *
 * Everything is one $facet aggregate on crm_deals over a COHORT: deals CREATED in [from, to]
 * (IST calendar days, `to` inclusive). It uses index reports_source (workspace, createdAt, leadSource);
 * the wrapper prepends {$match:{workspace}}. Only deal fields are read: no attribution, no
 * contact data, no notes.
 *
 * Definitions:
 *  - conversion rate = cohort deals now in stage closed_won / cohort deals (0 when empty);
 *    by leadSource and by customerType (null customerType is grouped as "unknown").
 *  - average days to win = mean(closedAt - createdAt) in days over cohort deals now closed_won.
 *  - top lost reasons = cohort deals now closed_lost grouped by lost.reason (top 10).
 *  - leads by source per period = cohort deals grouped by IST ISO week (%G-W%V) or month (%Y-%m) of createdAt.
 * A reopened deal leaves the won/lost sets, so every figure describes the deal's current state.
 * Lead scope: view_all sees all deals; view_assigned only deals assigned to the caller.
 */
import type { Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, LEAD_SOURCES, LOST_REASONS } from "../model"
import type { LeadScope } from "../api/auth"
import type { FieldErrors } from "../validate"

export type Granularity = "week" | "month"
const GRANULARITY: ReadonlyMap<string, Granularity> = new Map([["week", "week"], ["month", "month"]])
const IST = "Asia/Kolkata"
const DAY_MS = 86_400_000
const MAX_RANGE_DAYS = 732

export interface ReportParams {
  from: string // YYYY-MM-DD (IST)
  to: string // YYYY-MM-DD (IST), inclusive
  fromDate: Date
  toExclusive: Date
  granularity: Granularity
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const istStart = (day: string): Date | null => {
  if (!DAY_RE.test(day)) return null
  const d = new Date(`${day}T00:00:00+05:30`)
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2020 || d.getUTCFullYear() > 2100) return null
  // Round-trip: rejects impossible dates such as 2026-02-30 (which Date would roll over).
  return istDay(d) === day ? d : null
}
function istDay(d: Date): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10)
}

export function parseReportParams(sp: URLSearchParams, now: Date): { ok: true; params: ReportParams } | { ok: false; fields: FieldErrors } {
  const fields: FieldErrors = {}
  const toRaw = sp.get("to") || istDay(now)
  const fromRaw = sp.get("from") || istDay(new Date(now.getTime() - 29 * DAY_MS))
  const gRaw = sp.get("granularity") || "week"
  const granularity = GRANULARITY.get(gRaw)
  if (!granularity) fields.granularity = "invalid_enum"
  const fromDate = istStart(fromRaw)
  const toStart = istStart(toRaw)
  if (!fromDate) fields.from = "invalid_date"
  if (!toStart) fields.to = "invalid_date"
  if (fromDate && toStart) {
    const toExclusive = new Date(toStart.getTime() + DAY_MS)
    if (toExclusive <= fromDate) fields.to = "before_from"
    else if (toExclusive.getTime() - fromDate.getTime() > MAX_RANGE_DAYS * DAY_MS) fields.to = "range_too_long"
  }
  if (Object.keys(fields).length || !fromDate || !toStart || !granularity) return { ok: false, fields }
  return { ok: true, params: { from: fromRaw, to: toRaw, fromDate, toExclusive: new Date(toStart.getTime() + DAY_MS), granularity } }
}

export interface SourceRow { source: string; created: number; won: number; conversionRate: number; avgDaysToWon: number | null }
export interface TypeRow { customerType: string; created: number; won: number; conversionRate: number; avgDaysToWon: number | null }
export interface PeriodRow { period: string; total: number; bySource: Record<string, number> }
export interface Report {
  range: { from: string; to: string; granularity: Granularity }
  totals: { created: number; won: number; lost: number; open: number; conversionRate: number; avgDaysToWon: number | null }
  periods: PeriodRow[]
  bySource: SourceRow[]
  byCustomerType: TypeRow[]
  lostReasons: { reason: string; count: number }[]
  /** True when the assigned-contact id list hit its cap, so contact-based assignment may be undercounted (view_assigned only). */
  truncated?: boolean
}

const rate = (won: number, created: number) => (created > 0 ? Math.round((won / created) * 1000) / 1000 : 0)
const days = (sumMs: number, n: number) => (n > 0 ? Math.round((sumMs / n / DAY_MS) * 10) / 10 : null)
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)

/** Group stage shared by the two conversion breakdowns. */
const groupBy = (key: string): Document[] => [
  {
    $group: {
      _id: key,
      created: { $sum: 1 },
      won: { $sum: { $cond: [{ $eq: ["$stage", "closed_won"] }, 1, 0] } },
      wonMs: { $sum: { $cond: [{ $and: [{ $eq: ["$stage", "closed_won"] }, { $eq: [{ $type: "$closedAt" }, "date"] }] }, { $subtract: ["$closedAt", "$createdAt"] }, 0] } },
    },
  },
  { $sort: { created: -1, _id: 1 } },
  { $limit: 50 },
]

export function reportPipeline(scope: LeadScope, p: ReportParams, contactIds: readonly unknown[] = []): Document[] {
  const match: Document = { createdAt: { $gte: p.fromDate, $lt: p.toExclusive } }
  // Same visibility as dealVisible(): the deal OR its contact is assigned to the user.
  if (scope.kind === "assigned") match.$or = [{ "assignedTo.userId": scope.userId }, ...(contactIds.length ? [{ contactId: { $in: [...contactIds] } }] : [])]
  const fmt = p.granularity === "week" ? "%G-W%V" : "%Y-%m"
  return [
    { $match: match },
    { $project: { _id: 0, leadSource: 1, customerType: { $ifNull: ["$customerType", "unknown"] }, stage: 1, createdAt: 1, closedAt: 1, "lost.reason": 1 } },
    {
      $facet: {
        periods: [
          { $group: { _id: { p: { $dateToString: { format: fmt, date: "$createdAt", timezone: IST } }, s: "$leadSource" }, n: { $sum: 1 } } },
          { $sort: { "_id.p": 1 } },
          { $limit: 2000 },
        ],
        bySource: groupBy("$leadSource"),
        byType: groupBy("$customerType"),
        totals: [{ $group: { _id: "$stage", n: { $sum: 1 } } }],
        lost: [
          { $match: { stage: "closed_lost" } },
          { $group: { _id: { $ifNull: ["$lost.reason", "unknown"] }, n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
          { $limit: 10 },
        ],
      },
    },
  ]
}

export const CONTACT_ID_CAP = 50_000

export async function buildReport(crm: CrmDb, scope: LeadScope, p: ReportParams, opts: { contactCap?: number } = {}): Promise<Report> {
  let contactIds: unknown[] = []
  let truncated = false
  if (scope.kind === "assigned") {
    const cap = opts.contactCap ?? CONTACT_ID_CAP
    const cs = await crm.collection(COLL.contacts).find({ "assignedTo.userId": scope.userId }, { projection: { _id: 1 }, limit: cap + 1, maxTimeMS: 10_000 }).toArray()
    if (cs.length > cap) {
      truncated = true
      cs.length = cap
      console.error(JSON.stringify({ scope: "crm.reports", level: "warn", msg: "assigned-contact list truncated", cap }))
    }
    contactIds = cs.map(c => c._id)
  }
  const rows = await crm.collection(COLL.deals).aggregate(reportPipeline(scope, p, contactIds), { maxTimeMS: 20_000 }).toArray()
  const f = (rows[0] ?? {}) as Record<string, Document[] | undefined>

  const periodMap = new Map<string, PeriodRow>()
  for (const r of f.periods ?? []) {
    const id = r._id as { p?: unknown; s?: unknown }
    const period = String(id.p)
    const row = periodMap.get(period) ?? { period, total: 0, bySource: Object.fromEntries(LEAD_SOURCES.map(s => [s, 0])) }
    const n = num(r.n)
    row.total += n
    row.bySource[String(id.s)] = (row.bySource[String(id.s)] ?? 0) + n
    periodMap.set(period, row)
  }

  const breakdown = (list: Document[] | undefined) =>
    (list ?? []).map(r => {
      const created = num(r.created)
      const won = num(r.won)
      return { key: String(r._id), created, won, conversionRate: rate(won, created), avgDaysToWon: days(num(r.wonMs), won), wonMs: num(r.wonMs) }
    })
  const src = breakdown(f.bySource)
  const types = breakdown(f.byType)

  const byStage = new Map<string, number>()
  for (const r of f.totals ?? []) byStage.set(String(r._id), num(r.n))
  const created = [...byStage.values()].reduce((a, b) => a + b, 0)
  const won = byStage.get("closed_won") ?? 0
  const lost = byStage.get("closed_lost") ?? 0
  const wonMs = src.reduce((a, r) => a + r.wonMs, 0)

  const known = new Set<string>(LOST_REASONS)
  return {
    range: { from: p.from, to: p.to, granularity: p.granularity },
    totals: { created, won, lost, open: created - won - lost, conversionRate: rate(won, created), avgDaysToWon: days(wonMs, won) },
    periods: [...periodMap.values()].sort((a, b) => a.period.localeCompare(b.period)),
    bySource: src.map(({ key, wonMs: _w, ...r }) => ({ source: key, ...r })),
    byCustomerType: types.map(({ key, wonMs: _w, ...r }) => ({ customerType: key, ...r })),
    ...(truncated ? { truncated: true } : {}),
    lostReasons: (f.lost ?? []).map(r => ({ reason: known.has(String(r._id)) ? String(r._id) : "unknown", count: num(r.n) })),
  }
}
