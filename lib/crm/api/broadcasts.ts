/**
 * /api/crm/segments/* and /api/crm/broadcasts/* (STEP 9). Viewing: crm.broadcasts.view; creating,
 * editing, starting, pausing, resuming and cancelling: crm.broadcasts.send (critical).
 * Starting / resuming kicks off the chunk loop for the broadcast's number (after()).
 * Imports no notes module.
 */
import { crmError, crmJson } from "./auth"
import { readJsonObject, isPlainObject } from "../validate"
import { COLL, type SegmentFilter } from "../model"
import { readCrmEnv } from "../env"
import { createSegment, parseSegmentInput, previewAudience, segmentView, updateSegment } from "../broadcasts/segments"
import { broadcastView, createBroadcast, deleteDraftBroadcast, parseBroadcastInput, updateBroadcast, type BcResult } from "../broadcasts/service"
import { recountBroadcast, setBroadcastState, startBroadcast, type RunResult } from "../broadcasts/run"
import { runQueue, type QueueDeps } from "../queue/trigger"
import { createCsvAudience } from "../broadcasts/audience-csv"
import { decodeCsvBytes } from "../dealers/csv"
import { IMPORT_MAX_BYTES } from "../dealers/import"
import { userRefOf } from "./auth"
import { idParam, nowOf, route, type CrmApiDeps } from "./route"

const respond = (r: BcResult | RunResult, requestId: string, okStatus = 200) =>
  r.ok ? crmJson({ broadcast: broadcastView(r.broadcast) }, requestId, okStatus) : crmError(r.status, r.error, requestId, r.fields ? { fields: r.fields } : {})

/** Run the chunk loop for a number in the background (inline when no scheduler: tests). */
async function kick(deps: CrmApiDeps, pnid: string, requestId: string): Promise<void> {
  const task = async () => { await runQueue(deps as QueueDeps, pnid, 0, requestId) }
  if (deps.schedule) deps.schedule(task)
  else await task()
}

// ── segments ──

export const listSegmentsHandler = route("segments.list", ["crm.broadcasts.view"], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  const rows = await crm.collection(COLL.segments).find({}, { sort: { name: 1 }, limit: 200 }).toArray()
  return crmJson({ items: rows.map(segmentView) }, requestId)
})

export const createSegmentHandler = route("segments.create", ["crm.broadcasts.send"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseSegmentInput(body)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  return crmJson({ segment: segmentView(await createSegment(crm, actor, p.name, p.filter, nowOf(deps))) }, requestId, 201)
})

export const updateSegmentHandler = route("segments.update", ["crm.broadcasts.send"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseSegmentInput(body)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const s = await updateSegment(crm, actor, id, p.name, p.filter, nowOf(deps))
  return s ? crmJson({ segment: segmentView(s) }, requestId) : crmError(404, "not_found", requestId)
})

/** POST /api/crm/segments/preview {filter} — who would receive it (fresh evaluation). */
export const previewSegmentHandler = route("segments.preview", ["crm.broadcasts.view"], async ({ request, deps, requestId }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseSegmentInput({ name: "preview", filter: isPlainObject(body.filter) ? body.filter : {} })
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  return crmJson({ preview: await previewAudience(crm, p.filter as SegmentFilter, nowOf(deps)) }, requestId)
})

// ── broadcasts ──

export const listBroadcastsHandler = route("broadcasts.list", ["crm.broadcasts.view"], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  const rows = await crm.collection(COLL.broadcasts).find({}, { sort: { createdAt: -1 }, limit: 100 }).toArray()
  return crmJson({ items: rows.map(broadcastView) }, requestId)
})

export const createBroadcastHandler = route("broadcasts.create", ["crm.broadcasts.send"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseBroadcastInput(body)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const env = deps.env ?? readCrmEnv()
  return respond(await createBroadcast(crm, actor, p.input, env.waPhoneNumberIds, nowOf(deps)), requestId, 201)
})

export const getBroadcastHandler = route("broadcasts.get", ["crm.broadcasts.view"], async ({ ctx, deps, requestId }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const b = await crm.collection(COLL.broadcasts).findOne({ _id: id })
  if (!b) return crmError(404, "not_found", requestId)
  const problems = await crm.collection(COLL.broadcastRecipients).find(
    { broadcastId: id, deliveryStatus: { $in: ["failed", "skipped"] } },
    { sort: { _id: 1 }, limit: 100, projection: { phoneE164: 1, contactId: 1, deliveryStatus: 1, skipReason: 1, lastError: 1 } },
  ).toArray()
  return crmJson({
    broadcast: broadcastView(b),
    problems: problems.map(p => ({ phoneE164: p.phoneE164, contactId: p.contactId ? String(p.contactId) : null, status: p.deliveryStatus, reason: p.skipReason ?? p.lastError?.code ?? null })),
  }, requestId)
})

export const updateBroadcastHandler = route("broadcasts.update", ["crm.broadcasts.send"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseBroadcastInput(body)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  return respond(await updateBroadcast(crm, actor, id, p.input, nowOf(deps)), requestId)
})

export const deleteBroadcastHandler = route("broadcasts.delete", ["crm.broadcasts.send"], async ({ ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const r = await deleteDraftBroadcast(crm, actor, id)
  return r.ok ? crmJson({ deleted: true }, requestId) : crmError(r.status, r.error, requestId)
})

/** POST /api/crm/broadcasts/:id/{start|pause|resume|cancel|recount} */
export function broadcastActionHandler(action: "start" | "pause" | "resume" | "cancel" | "recount") {
  return route(`broadcasts.${action}`, ["crm.broadcasts.send"], async ({ ctx, deps, requestId, actor, log }) => {
    const id = await idParam(ctx)
    if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
    const crm = await deps.getDb()
    const now = nowOf(deps)
    const r = action === "start" ? await startBroadcast(crm, actor, id, now)
      : action === "recount" ? await recountBroadcast(crm, id, now)
      : await setBroadcastState(crm, actor, id, action, now)
    if (r.ok && (action === "start" || action === "resume")) {
      log.info(`broadcast ${action}`, { broadcastId: id.toHexString() })
      await kick(deps, String(r.broadcast.phoneNumberId), requestId)
      const fresh = await crm.collection(COLL.broadcasts).findOne({ _id: id })
      if (fresh) return crmJson({ broadcast: broadcastView(fresh) }, requestId)
    }
    return respond(r, requestId)
  })
}

/**
 * POST /api/crm/broadcasts/audiences — upload a CSV audience (STEP 9b). crm.broadcasts.send.
 * multipart/form-data: file (CSV ≤ 2 MB), optional mobileColumn; or JSON {text, fileName?, mobileColumn?}.
 */
export const createCsvAudienceHandler = route("broadcasts.audience_csv", ["crm.broadcasts.send"], async ({ request, deps, requestId, actor }) => {
  const len = Number(request.headers.get("content-length") ?? "0")
  if (len > IMPORT_MAX_BYTES + 64 * 1024) return crmError(413, "file_too_large", requestId, { maxBytes: IMPORT_MAX_BYTES })
  let text: string
  let fileName = "audience.csv"
  let mobileColumn: string | null = null
  if ((request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    let form: FormData
    try { form = await request.formData() } catch { return crmError(400, "invalid_multipart", requestId) }
    const file = form.get("file")
    if (!file || typeof file === "string") return crmError(400, "validation", requestId, { fields: { file: "required" } })
    if (file.size > IMPORT_MAX_BYTES) return crmError(413, "file_too_large", requestId, { maxBytes: IMPORT_MAX_BYTES })
    if (file.size === 0) return crmError(400, "empty_file", requestId)
    fileName = file.name || fileName
    if (!/\.(csv|txt|tsv)$/i.test(fileName)) return crmError(400, "validation", requestId, { fields: { file: "csv_only" } })
    text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))
    const mc = form.get("mobileColumn")
    if (typeof mc === "string" && mc.trim()) mobileColumn = mc.trim()
  } else {
    const body = await readJsonObject(request, IMPORT_MAX_BYTES + 64 * 1024)
    if (!body) return crmError(400, "invalid_json", requestId)
    if (typeof body.text !== "string" || !body.text.trim()) return crmError(400, "validation", requestId, { fields: { text: "required" } })
    text = body.text
    if (typeof body.fileName === "string" && body.fileName.trim()) fileName = body.fileName.trim()
    if (typeof body.mobileColumn === "string" && body.mobileColumn.trim()) mobileColumn = body.mobileColumn.trim()
  }
  const crm = await deps.getDb()
  const r = await createCsvAudience(crm, userRefOf(actor), { text, fileName, mobileColumn }, nowOf(deps))
  if (!r.ok) return crmError(r.status, r.error, requestId, { ...(r.fields ? { fields: r.fields } : {}), ...(r.headers ? { headers: r.headers } : {}) })
  const { ok: _ok, ...payload } = r
  return crmJson(payload, requestId, 201)
})
