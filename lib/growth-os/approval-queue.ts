/**
 * Growth OS — Approval Queue.
 *
 * Central queue for all AI-generated recommendations.
 * No recommendation is ever applied automatically.
 * Every change must appear here first and be reviewed by a human.
 *
 * Recommendation flow:
 *   Agent generates recommendation
 *   → pushed to approval queue (status: "pending")
 *   → admin reviews in /admin/growth/ads/approval-queue
 *   → approved: status → "approved", ready to apply manually
 *   → rejected: status → "rejected", reason recorded
 *   → applied: status → "applied", appliedAt recorded
 *   → expired: status → "expired" if not acted on within expiresInDays
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Types ────────────────────────────────────────────────────────────────────

export type RecommendationType =
  | "add_negative_keyword"     // add query to campaign negative list
  | "promote_keyword"          // move keyword from observe-only → active EXACT
  | "demote_keyword"           // reduce match type or pause keyword
  | "new_positive_keyword"     // add new keyword to campaign
  | "increase_budget"          // raise daily budget on a campaign/ad group
  | "decrease_budget"          // lower daily budget (waste detected)
  | "pause_ad_group"           // pause an ad group (zero conversions, draining budget)
  | "expand_ad_group"          // add keywords to underperforming ad group
  | "split_ad_group"           // split a broad ad group into targeted ones
  | "create_ad_group"          // create a new ad group for a demand cluster
  | "change_landing_page"      // route a keyword to a higher-converting landing page
  | "rsa_headline_swap"        // swap underperforming RSA headline

export type RecommendationStatus = "pending" | "approved" | "rejected" | "applied" | "expired"

export type RecommendationPriority = "critical" | "high" | "medium" | "low"

export interface ApprovalItem {
  id:               string
  type:             RecommendationType
  status:           RecommendationStatus
  priority:         RecommendationPriority
  title:            string
  rationale:        string       // why the agent recommends this
  payload:          Record<string, unknown>  // the actual change data
  estimatedImpact:  string       // human-readable impact description
  agentSource:      string       // which agent generated this
  dataWindowDays:   number       // how many days of data this is based on
  confidence:       number       // 0–100: agent's confidence in this recommendation
  generatedAt:      string       // ISO timestamp
  expiresAt:        string       // ISO timestamp — auto-expires if not reviewed
  reviewedAt?:      string
  reviewedBy?:      string
  rejectionReason?: string
  appliedAt?:       string
  applicationNotes?: string
}

export const APPROVAL_QUEUE_COLL = "ads_approval_queue"
const DEFAULT_EXPIRY_DAYS = 14

// ── Queue writes (from agents) ────────────────────────────────────────────────

export async function pushToQueue(
  db: Db,
  item: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">,
): Promise<string> {
  const now    = new Date()
  const expiry = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 86_400_000)
  const id     = `aq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  const doc: ApprovalItem = {
    ...item,
    id,
    status:      "pending",
    generatedAt: now.toISOString(),
    expiresAt:   expiry.toISOString(),
  }

  await db.collection(APPROVAL_QUEUE_COLL).insertOne(doc)
  return id
}

export async function pushBatch(
  db: Db,
  items: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">[],
): Promise<string[]> {
  if (items.length === 0) return []
  const now    = new Date()
  const expiry = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 86_400_000)

  const docs: ApprovalItem[] = items.map(item => ({
    ...item,
    id:          `aq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status:      "pending",
    generatedAt: now.toISOString(),
    expiresAt:   expiry.toISOString(),
  }))

  await db.collection(APPROVAL_QUEUE_COLL).insertMany(docs)
  return docs.map(d => d.id)
}

// ── Queue reads (for admin UI) ────────────────────────────────────────────────

export interface QueueFilters {
  status?:   RecommendationStatus | RecommendationStatus[]
  type?:     RecommendationType
  priority?: RecommendationPriority
  limit?:    number
}

export async function getQueueItems(db: Db, filters: QueueFilters = {}): Promise<ApprovalItem[]> {
  const query: Record<string, unknown> = {}

  if (filters.status) {
    query.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status
  }
  if (filters.type)     query.type     = filters.type
  if (filters.priority) query.priority = filters.priority

  const PRIORITY_ORDER: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  const items = await db
    .collection<ApprovalItem>(APPROVAL_QUEUE_COLL)
    .find(query)
    .sort({ generatedAt: -1 })
    .limit(filters.limit ?? 200)
    .toArray()

  return items.sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
  )
}

export async function getPendingCount(db: Db): Promise<number> {
  return db.collection(APPROVAL_QUEUE_COLL).countDocuments({ status: "pending" })
}

// ── Queue mutations (from admin review) ───────────────────────────────────────

export async function approveItem(db: Db, id: string, reviewedBy = "admin"): Promise<boolean> {
  const r = await db.collection(APPROVAL_QUEUE_COLL).updateOne(
    { id, status: "pending" },
    { $set: { status: "approved", reviewedAt: new Date().toISOString(), reviewedBy } },
  )
  return r.modifiedCount === 1
}

export async function rejectItem(
  db: Db,
  id: string,
  reason: string,
  reviewedBy = "admin",
): Promise<boolean> {
  const r = await db.collection(APPROVAL_QUEUE_COLL).updateOne(
    { id, status: "pending" },
    { $set: { status: "rejected", reviewedAt: new Date().toISOString(), reviewedBy, rejectionReason: reason } },
  )
  return r.modifiedCount === 1
}

export async function markApplied(db: Db, id: string, notes?: string): Promise<boolean> {
  const r = await db.collection(APPROVAL_QUEUE_COLL).updateOne(
    { id, status: "approved" },
    { $set: { status: "applied", appliedAt: new Date().toISOString(), ...(notes ? { applicationNotes: notes } : {}) } },
  )
  return r.modifiedCount === 1
}

// ── Expiry sweep (run daily) ──────────────────────────────────────────────────

export async function expireStalePendingItems(db: Db): Promise<number> {
  const r = await db.collection(APPROVAL_QUEUE_COLL).updateMany(
    { status: "pending", expiresAt: { $lt: new Date().toISOString() } },
    { $set: { status: "expired" } },
  )
  return r.modifiedCount
}

// ── Summary stats ─────────────────────────────────────────────────────────────

export interface QueueSummary {
  pending:  number
  approved: number
  rejected: number
  applied:  number
  expired:  number
  byType:   Partial<Record<RecommendationType, number>>
}

export async function getQueueSummary(db: Db): Promise<QueueSummary> {
  const all = await db.collection<ApprovalItem>(APPROVAL_QUEUE_COLL).find({}).toArray()
  const byStatus = { pending: 0, approved: 0, rejected: 0, applied: 0, expired: 0 }
  const byType: Partial<Record<RecommendationType, number>> = {}

  for (const item of all) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1
    if (item.status === "pending") {
      byType[item.type] = (byType[item.type] ?? 0) + 1
    }
  }

  return { ...byStatus, byType }
}

// ── Standalone DB helper (for API routes) ────────────────────────────────────

export async function getDb(): Promise<Db> {
  return (await clientPromise).db()
}
