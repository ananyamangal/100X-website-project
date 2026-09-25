/**
 * Pollable job records for the Knowledge Base sync (collection `knowledge_sync_jobs`).
 * Same shape idea as `category_jobs`: a status, a heartbeat, progress, and a
 * result summary. The manual "Rebuild Knowledge Base" button and the automatic
 * sync (on blog / case-study / past-performance saves) both go through here, so
 * there is one job history and never two syncs at once.
 */
import type { Db } from "mongodb"

export const JOBS_COLLECTION = "knowledge_sync_jobs"

/** A running job with no heartbeat for this long is presumed dead (the function was killed). */
export const STALE_MS = 3 * 60 * 1000

export type JobStatus = "running" | "success" | "partial" | "failed"
export type JobTrigger = "manual" | "auto"

export interface SourceResult {
  source: string
  scanned: number
  created: number
  updated: number
  unchanged: number
  /** Entries that are published after this run (created + updated ones). */
  published: number
  /** Entries held as drafts for owner review (chemicals / dosing / safety). */
  drafted: number
  /** Skipped because an admin edited the synced article. */
  skippedLocked: number
  /** Previously synced entries taken offline because their source is gone. */
  unpublished: number
  errors: string[]
  /** Source items skipped on purpose (e.g. a product with no model code): informational, not a failure. */
  notes: string[]
}

export interface JobTotals {
  scanned: number
  created: number
  updated: number
  unchanged: number
  published: number
  drafted: number
  skippedLocked: number
  unpublished: number
  errors: number
}

export interface SyncJob {
  _id?: unknown
  status: JobStatus
  trigger: JobTrigger
  sources: string[]
  startedBy?: string
  startedAt: Date
  updatedAt: Date
  finishedAt?: Date
  progress: { done: number; total: number; current: string | null }
  results?: SourceResult[]
  totals?: JobTotals
  error?: string
  /** Sources whose content changed while this job was running; re-run once at the end. */
  rerun?: string[]
}

export function totalsOf(results: SourceResult[]): JobTotals {
  const t: JobTotals = { scanned: 0, created: 0, updated: 0, unchanged: 0, published: 0, drafted: 0, skippedLocked: 0, unpublished: 0, errors: 0 }
  for (const r of results) {
    t.scanned += r.scanned
    t.created += r.created
    t.updated += r.updated
    t.unchanged += r.unchanged
    t.published += r.published
    t.drafted += r.drafted
    t.skippedLocked += r.skippedLocked
    t.unpublished += r.unpublished
    t.errors += r.errors.length
  }
  return t
}

export async function startJob(
  db: Db,
  input: { sources: string[]; trigger: JobTrigger; startedBy?: string; now?: Date },
): Promise<{ job: SyncJob & { _id: unknown } } | { conflict: SyncJob & { _id: unknown } }> {
  const col = db.collection<SyncJob>(JOBS_COLLECTION)
  const now = input.now ?? new Date()

  // A crashed run must not block the button forever.
  await col.updateMany(
    { status: "running", updatedAt: { $lt: new Date(now.getTime() - STALE_MS) } },
    { $set: { status: "failed", error: "Stopped without finishing (no heartbeat); presumed interrupted.", finishedAt: now } },
  )

  const running = await col.findOne({ status: "running" })
  if (running) return { conflict: running as SyncJob & { _id: unknown } }

  const doc: SyncJob = {
    status: "running",
    trigger: input.trigger,
    sources: input.sources,
    startedBy: input.startedBy,
    startedAt: now,
    updatedAt: now,
    progress: { done: 0, total: input.sources.length, current: null },
  }
  const res = await col.insertOne(doc as never)
  return { job: { ...doc, _id: res.insertedId } }
}

export async function heartbeat(db: Db, id: unknown, progress: SyncJob["progress"], results?: SourceResult[]) {
  await db
    .collection(JOBS_COLLECTION)
    .updateOne({ _id: id as never }, { $set: { updatedAt: new Date(), progress, ...(results ? { results } : {}) } })
}

export async function finishJob(
  db: Db,
  id: unknown,
  outcome: { results: SourceResult[]; error?: string },
) {
  const totals = totalsOf(outcome.results)
  const status: JobStatus = outcome.error ? "failed" : totals.errors > 0 ? "partial" : "success"
  const now = new Date()
  await db.collection(JOBS_COLLECTION).updateOne(
    { _id: id as never },
    {
      $set: {
        status,
        results: outcome.results,
        totals,
        finishedAt: now,
        updatedAt: now,
        ...(outcome.error ? { error: outcome.error } : {}),
      },
    },
  )
  return { status, totals }
}

/** Ask the running job to sync these sources again when it ends. False if nothing is running. */
export async function requestRerun(db: Db, sources: string[]): Promise<boolean> {
  const res = await db
    .collection(JOBS_COLLECTION)
    .updateOne({ status: "running" }, { $addToSet: { rerun: { $each: sources } } })
  return res.matchedCount > 0
}

/** Read and clear the pending re-run list of a job. */
export async function takeRerun(db: Db, id: unknown): Promise<string[]> {
  const before = await db
    .collection<SyncJob>(JOBS_COLLECTION)
    .findOneAndUpdate({ _id: id as never }, { $set: { rerun: [] } }, { returnDocument: "before" })
  return before?.rerun ?? []
}

export async function latestJobs(db: Db, limit = 5): Promise<Array<SyncJob & { _id: unknown }>> {
  return (await db.collection<SyncJob>(JOBS_COLLECTION).find({}).sort({ startedAt: -1 }).limit(limit).toArray()) as Array<SyncJob & { _id: unknown }>
}

export function serializeJob(job: SyncJob & { _id: unknown }) {
  const { _id, rerun, ...rest } = job
  void rerun
  return { id: String(_id), ...rest }
}
