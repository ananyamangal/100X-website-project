import { NextRequest, NextResponse, after } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, isAuthResult, writeAuditLog } from "@/lib/rbac/server"
import { SYNC_SOURCES, SOURCE_LABELS, isSyncSource, type SyncSourceKey } from "@/lib/knowledge/sync/run"
import { executeSyncJob } from "@/lib/knowledge/sync/execute"
import { JOBS_COLLECTION, latestJobs, serializeJob, startJob, type SyncJob } from "@/lib/knowledge/sync/jobs"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SOURCES = SYNC_SOURCES.map((key) => ({ key, label: SOURCE_LABELS[key] }))

// GET  /api/admin/knowledge/rebuild            -> latest job, last successful sync, recent history
// GET  /api/admin/knowledge/rebuild?jobId=...  -> one job (what the panel polls while it runs)
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "knowledge.rebuild")
  if (!isAuthResult(auth)) return auth
  try {
    const db = (await clientPromise).db()
    const jobId = new URL(request.url).searchParams.get("jobId")
    if (jobId) {
      if (!ObjectId.isValid(jobId)) return NextResponse.json({ error: "Invalid jobId" }, { status: 400 })
      const job = await db.collection<SyncJob>(JOBS_COLLECTION).findOne({ _id: new ObjectId(jobId) as never })
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
      return NextResponse.json({ job: serializeJob(job as SyncJob & { _id: unknown }) })
    }
    const recent = await latestJobs(db, 5)
    const lastSuccess = await db
      .collection<SyncJob>(JOBS_COLLECTION)
      .find({ status: { $in: ["success", "partial"] } })
      .sort({ startedAt: -1 })
      .limit(1)
      .toArray()
    return NextResponse.json({
      sources: SOURCES,
      latest: recent[0] ? serializeJob(recent[0]) : null,
      lastSuccess: lastSuccess[0] ? serializeJob(lastSuccess[0] as SyncJob & { _id: unknown }) : null,
      recent: recent.map(serializeJob),
    })
  } catch (error) {
    console.error("Error reading knowledge sync status:", error)
    return NextResponse.json({ error: "Failed to read sync status" }, { status: 500 })
  }
}

// POST body: { sources?: ("blogs" | "case_studies" | "past_performance")[] }  (omitted = all)
// Starts the sync and answers 202 immediately; poll GET ?jobId= for progress and the result summary.
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "knowledge.rebuild")
  if (!isAuthResult(auth)) return auth
  try {
    const body = (await request.json().catch(() => ({}))) as { sources?: unknown }
    let sources: SyncSourceKey[] = [...SYNC_SOURCES]
    if (body.sources !== undefined) {
      if (!Array.isArray(body.sources) || body.sources.length === 0 || !body.sources.every(isSyncSource)) {
        return NextResponse.json({ error: `sources must be a non-empty list of: ${SYNC_SOURCES.join(", ")}` }, { status: 400 })
      }
      sources = [...new Set(body.sources)] as SyncSourceKey[]
    }

    const db = (await clientPromise).db()
    const started = await startJob(db, { sources, trigger: "manual", startedBy: auth.user.email })
    if ("conflict" in started) {
      return NextResponse.json(
        { error: "A sync is already running.", job: serializeJob(started.conflict) },
        { status: 409 },
      )
    }

    const jobId = started.job._id
    after(() => executeSyncJob(db, jobId, sources))
    await writeAuditLog(auth.user, "edit", "knowledge/rebuild", { id: String(jobId), sources }, request)

    return NextResponse.json({ jobId: String(jobId), status: "running", sources }, { status: 202 })
  } catch (error) {
    console.error("Error starting knowledge sync:", error)
    return NextResponse.json({ error: "Failed to start sync" }, { status: 500 })
  }
}
