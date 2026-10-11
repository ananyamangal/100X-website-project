/**
 * One driver for every trigger (lazy task-list load, "Run now", later the daily cron): evaluate
 * the rules, then send due staff_push / customer_reminder jobs (bounded). Without a WhatsApp
 * access token the jobs simply stay pending.
 */
import type { CrmDb } from "../db"
import type { CrmEnv } from "../env"
import { graphConfigFrom, type FetchLike } from "../outbound/graph"
import { runJobs, type RunTally } from "../queue/jobs"
import { evaluateReminders, maybeEvaluateReminders, type EvalTally } from "./evaluate"
import { reminderHandlers } from "./send"

export interface DriveResult {
  evaluated: EvalTally | null
  jobs: RunTally | null
  jobsSkipped: "whatsapp_not_configured" | null
}

export async function driveReminders(
  crm: CrmDb,
  o: { env: Pick<CrmEnv, "waPhoneNumberIds" | "waAccessToken" | "waApiVersion">; fetch?: FetchLike; requestId: string; now: Date; lazy: boolean; jobLimit?: number; budgetMs?: number },
): Promise<DriveResult> {
  const evaluated = o.lazy ? await maybeEvaluateReminders(crm, o.now, `lazy:${o.requestId}`) : await evaluateReminders(crm, o.now)
  // Lazy runs only send when this call actually evaluated (keeps the 15-min cadence for sends too).
  if (o.lazy && !evaluated) return { evaluated, jobs: null, jobsSkipped: null }
  const graph = graphConfigFrom(o.env, o.fetch)
  if (!graph) return { evaluated, jobs: null, jobsSkipped: "whatsapp_not_configured" }
  const jobs = await runJobs(crm, reminderHandlers(crm, { allowList: o.env.waPhoneNumberIds, graph, requestId: o.requestId, now: () => o.now }), {
    owner: `reminders:${o.requestId}`, limit: o.jobLimit ?? 25, budgetMs: o.budgetMs ?? 20_000, now: () => o.now,
  })
  return { evaluated, jobs, jobsSkipped: null }
}
