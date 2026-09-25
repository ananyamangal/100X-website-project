/**
 * Runs a sync job to completion (progress + result written to the job record),
 * and the fire-and-forget trigger used when content is saved. The manual
 * "Rebuild Knowledge Base" button and the automatic sync both call
 * executeSyncJob(), which calls runKnowledgeSync(): one code path.
 */
import { revalidateTag } from "next/cache"
import { after } from "next/server"
import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { KNOWLEDGE_CACHE_TAG } from "@/lib/knowledgeQuery"
import { runKnowledgeSync, isSyncSource, type SyncSourceKey } from "./run"
import { finishJob, heartbeat, requestRerun, startJob, takeRerun, type SourceResult } from "./jobs"

const MAX_PASSES = 3

function mergeResults(into: SourceResult[], more: SourceResult[]) {
  for (const r of more) {
    const cur = into.find((x) => x.source === r.source)
    if (!cur) {
      into.push({ ...r, errors: [...r.errors], notes: [...(r.notes ?? [])] })
      continue
    }
    cur.scanned = r.scanned
    cur.created += r.created
    cur.updated += r.updated
    cur.unchanged = r.unchanged
    cur.published += r.published
    cur.drafted += r.drafted
    cur.skippedLocked = r.skippedLocked
    cur.unpublished += r.unpublished
    cur.errors.push(...r.errors)
    cur.notes = [...new Set([...(cur.notes ?? []), ...(r.notes ?? [])])]
  }
}

export async function executeSyncJob(db: Db, jobId: unknown, sources: SyncSourceKey[]) {
  const results: SourceResult[] = []
  let pending = sources
  try {
    // A save that lands while a job runs asks for a re-run of its source; do it once the pass ends.
    for (let pass = 0; pending.length && pass < MAX_PASSES; pass++) {
      const out = await runKnowledgeSync(db, {
        sources: pending,
        onProgress: (p, partial) => heartbeat(db, jobId, p, [...results.map((r) => ({ ...r })), ...partial]),
      })
      mergeResults(results, out.results)
      pending = (await takeRerun(db, jobId)).filter(isSyncSource)
    }
    const fin = await finishJob(db, jobId, { results })
    if (results.some((r) => r.created || r.updated || r.unpublished)) revalidateTag(KNOWLEDGE_CACHE_TAG)
    return fin
  } catch (err) {
    return finishJob(db, jobId, { results, error: err instanceof Error ? err.message : String(err) })
  }
}

/** Sync these sources in the background of the current request. Never throws, never blocks the save. */
export function scheduleAutoSync(sources: SyncSourceKey[]) {
  try {
    after(async () => {
      try {
        const db = (await clientPromise).db()
        const started = await startJob(db, { sources, trigger: "auto" })
        if ("conflict" in started) {
          await requestRerun(db, sources)
          return
        }
        await executeSyncJob(db, started.job._id, sources)
      } catch (err) {
        console.error("[knowledge-sync] automatic sync failed:", err)
      }
    })
  } catch (err) {
    // `after` is unavailable outside a request scope; the content save must still succeed.
    console.error("[knowledge-sync] could not schedule automatic sync:", err)
  }
}
