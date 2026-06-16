/**
 * Operations Center API — returns full automation registry with live run data.
 * Merges static config from automation-registry.ts with MongoDB run state.
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId, type Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import {
  AUTOMATION_REGISTRY,
  nextScheduledRun,
  computeStatus,
  type AutomationConfig,
  type AutomationStatus,
} from "@/lib/growth-os/automation-registry"

export const dynamic = "force-dynamic"

interface LiveData {
  last_run_at: string | null
  last_run_failed: boolean
  last_run_output?: string
  next_run_at?: string
  status: AutomationStatus
}

async function fetchLiveData(db: Db, config: AutomationConfig): Promise<LiveData> {
  let lastRunAt: string | null = null
  let lastRunFailed = false
  let lastRunOutput: string | undefined

  try {
    if (config.run_collection) {
      const coll = db.collection(config.run_collection)

      // Agents that log to growth_os_logs by agent name
      if (config.run_collection === "growth_os_logs" && config.agent_string) {
        const logDoc = await coll.findOne(
          { agent: config.agent_string },
          { sort: { ts: -1 } }
        )
        if (logDoc) {
          lastRunAt = String(logDoc.ts || "")
          lastRunFailed = logDoc.level === "error"
          lastRunOutput = String(logDoc.action || "").slice(0, 120)
        }
      }
      // Fogging ETL — use ObjectId timestamp of latest contract
      else if (config.id === "fogging-etl") {
        const doc = await coll.findOne({}, { sort: { _id: -1 }, projection: { _id: 1 } })
        if (doc?._id) {
          lastRunAt = new ObjectId(doc._id as string | ObjectId).getTimestamp().toISOString()
          const count = await coll.countDocuments()
          lastRunOutput = `${count.toLocaleString("en-IN")} contracts`
        }
      }
      // Off-page opportunities
      else if (config.id === "offpage-seo") {
        const doc = await coll.findOne({}, { sort: { updatedAt: -1 } })
        if (doc) {
          lastRunAt = String(doc.updatedAt || doc.createdAt || "")
          const count = await coll.countDocuments()
          lastRunOutput = `${count} opportunities`
        }
      }
      // Campaign plans
      else if (config.id === "ads-campaign-factory") {
        const doc = await coll.findOne({}, { sort: { createdAt: -1 } })
        if (doc) {
          lastRunAt = String(doc.createdAt || "")
          const count = await coll.countDocuments()
          lastRunOutput = `${count} campaign plans`
        }
      }
      // Standard: sort by ts_field
      else {
        const tsField = config.run_ts_field || "createdAt"
        const sort: Record<string, 1 | -1> = { [tsField]: -1 }
        const doc = await coll.findOne({}, { sort })
        if (doc) {
          const tsValue = doc[tsField]
          lastRunAt = tsValue ? String(tsValue) : null

          if (config.run_status_field && doc[config.run_status_field] !== undefined) {
            const statusVal = String(doc[config.run_status_field])
            const okVals = config.run_status_ok_values || ["success", "ok", "completed"]
            lastRunFailed = !okVals.includes(statusVal)
          }

          if (config.id === "revenue-director") {
            lastRunOutput = `${doc.rec_count || 0} recs (${doc.critical_count || 0} critical)`
          } else if (config.id === "gsc-sync") {
            lastRunOutput = `${doc.queryCount || 0} queries, ${doc.pageCount || 0} pages`
          } else if (config.id === "google-ads-director") {
            lastRunOutput = `${doc.recommendationCount || 0} recommendations`
          } else if (config.id === "ai-citation") {
            lastRunOutput = `${doc.tasksQueued || 0} tasks queued`
          } else if (config.id === "market-intelligence") {
            lastRunOutput = String(doc.summary || "").slice(0, 80) || "Analysis complete"
          } else if (config.id === "creative-director") {
            lastRunOutput = String(doc.product || doc.objective || "").slice(0, 60)
          }
        }
      }
    }
  } catch {
    // Non-fatal — return unknown status
  }

  const status = computeStatus(config, lastRunAt, lastRunFailed)
  const result: LiveData = { last_run_at: lastRunAt, last_run_failed: lastRunFailed, status }
  if (lastRunOutput) result.last_run_output = lastRunOutput
  if (config.schedule) result.next_run_at = nextScheduledRun(config.schedule)
  return result
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db: Db = (await clientPromise).db()

  const liveResults = await Promise.all(
    AUTOMATION_REGISTRY.map((cfg) =>
      fetchLiveData(db, cfg).catch(() => ({
        last_run_at: null,
        last_run_failed: false,
        status: "unknown" as AutomationStatus,
      } satisfies LiveData))
    )
  )

  const entries = AUTOMATION_REGISTRY.map((cfg, i) => ({ ...cfg, ...liveResults[i] }))

  const stats = {
    total: entries.length,
    active:  entries.filter((e) => e.status === "active").length,
    dormant: entries.filter((e) => e.status === "dormant").length,
    broken:  entries.filter((e) => e.status === "broken").length,
    unknown: entries.filter((e) => e.status === "unknown").length,
    scheduled: entries.filter((e) => e.trigger_type === "scheduled").length,
    manual: entries.filter((e) => e.trigger_type !== "scheduled").length,
  }

  // Next 5 scheduled runs
  const upcoming = (entries as Array<AutomationConfig & LiveData>)
    .filter((e) => Boolean(e.next_run_at))
    .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      module: e.module,
      next_run_at: e.next_run_at!,
      schedule_label: e.schedule_label,
    }))

  const failures = entries.filter((e) => e.status === "broken")

  return NextResponse.json({ entries, stats, upcoming, failures })
}
