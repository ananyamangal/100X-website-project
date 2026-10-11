/**
 * crm_jobs runner (DATA_MODEL §1.14, §5). STEP 7 uses it for `staff_push` and `customer_reminder`;
 * the step-9 chunk loop will call the same runner (plus locks / self-continuation / broadcasts).
 *
 * Claim: one findOneAndUpdate per job — pending & due, or leased with an expired lease — sets
 * leased + leaseUntil (now + 60 s) + leaseOwner and $inc attempts. Outcomes:
 *   done   → expireAt = now + 30 d (TTL)
 *   retry  → pending, nextAttemptAt = now + min(30 s · 4^(attempts−1), 1 h); dead at maxAttempts
 *   failed → permanent (kept for review, no TTL)
 * Bounded by `limit` and a wall-clock budget so a request never runs long.
 */
import type { Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, CRM_DEFAULTS } from "../model"

const DAY = 86_400_000
export const LEASE_MS = 60_000

export type JobOutcome =
  | { kind: "done"; note?: string }
  | { kind: "retry"; code: string; message: string }
  | { kind: "failed"; code: string; message: string }

export type JobHandler = (job: Document) => Promise<JobOutcome>

export function backoffMs(attempts: number): number {
  return Math.min(CRM_DEFAULTS.jobBackoffBaseMs * 4 ** Math.max(0, attempts - 1), CRM_DEFAULTS.jobBackoffCapMs)
}

export async function claimJob(crm: CrmDb, kinds: readonly string[], owner: string, now: Date): Promise<Document | null> {
  return crm.collection(COLL.jobs).findOneAndUpdate(
    {
      kind: { $in: [...kinds] },
      $or: [{ status: "pending", nextAttemptAt: { $lte: now } }, { status: "leased", leaseUntil: { $lt: now } }],
      $expr: { $lt: ["$attempts", { $ifNull: ["$maxAttempts", CRM_DEFAULTS.jobMaxAttempts] }] },
    },
    { $set: { status: "leased", leaseUntil: new Date(now.getTime() + LEASE_MS), leaseOwner: owner }, $inc: { attempts: 1 } },
    { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
  )
}

export async function finishJob(crm: CrmDb, job: Document, outcome: JobOutcome, owner: string, now: Date): Promise<string> {
  const jobs = crm.collection(COLL.jobs)
  const mine = { _id: job._id, leaseOwner: owner, status: "leased" }
  if (outcome.kind === "done") {
    await jobs.updateOne(mine, { $set: { status: "done", doneAt: now, leaseUntil: null, expireAt: new Date(now.getTime() + 30 * DAY), ...(outcome.note ? { note: outcome.note } : {}) } })
    return "done"
  }
  const lastError = { code: outcome.code, message: outcome.message.slice(0, 300), at: now, retryable: outcome.kind === "retry" }
  if (outcome.kind === "failed") {
    await jobs.updateOne(mine, { $set: { status: "failed", leaseUntil: null, lastError } })
    return "failed"
  }
  const attempts = Number(job.attempts ?? 1)
  const max = Number(job.maxAttempts ?? CRM_DEFAULTS.jobMaxAttempts)
  if (attempts >= max) {
    await jobs.updateOne(mine, { $set: { status: "dead", leaseUntil: null, lastError } })
    return "dead"
  }
  await jobs.updateOne(mine, { $set: { status: "pending", leaseUntil: null, leaseOwner: null, nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)), lastError } })
  return "retry"
}

export interface RunTally {
  claimed: number
  done: number
  retry: number
  failed: number
  dead: number
  stoppedBy: "empty" | "limit" | "time"
}

export async function runJobs(
  crm: CrmDb,
  handlers: Record<string, JobHandler>,
  opts: { owner: string; limit?: number; budgetMs?: number; now?: () => Date; beforeEach?: () => Promise<boolean> },
): Promise<RunTally> {
  const t: RunTally = { claimed: 0, done: 0, retry: 0, failed: 0, dead: 0, stoppedBy: "empty" }
  const kinds = Object.keys(handlers)
  const limit = opts.limit ?? 25
  const started = Date.now()
  const nowOf = opts.now ?? (() => new Date())
  while (true) {
    if (t.claimed >= limit) { t.stoppedBy = "limit"; break }
    if (Date.now() - started > (opts.budgetMs ?? 20_000)) { t.stoppedBy = "time"; break }
    if (opts.beforeEach && !(await opts.beforeEach())) { t.stoppedBy = "time"; break }
    const job = await claimJob(crm, kinds, opts.owner, nowOf())
    if (!job) break
    t.claimed++
    let outcome: JobOutcome
    try {
      outcome = await handlers[String(job.kind)](job)
    } catch (e) {
      outcome = { kind: "retry", code: "exception", message: e instanceof Error ? e.name : "unknown" }
    }
    const r = await finishJob(crm, job, outcome, opts.owner, nowOf())
    t[r as "done" | "retry" | "failed" | "dead"]++
  }
  return t
}
