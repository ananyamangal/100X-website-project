/** /api/crm/dealers and /api/crm/dealers/import/{preview,confirm} (STEP 3e). */
import { ObjectId } from "mongodb"
import { crmError, crmJson, userRefOf } from "./auth"
import { isHexId, isPlainObject, readJsonObject } from "../validate"
import { confirmDealerImport, IMPORT_MAX_BYTES, listDirectory, previewDealerImport } from "../dealers/import"
import { decodeCsvBytes } from "../dealers/csv"
import { auditCtx, nowOf, route } from "./route"

// ─────────────────────────────────────────────────────────────────────────────
// /api/crm/dealers  and  /api/crm/dealers/import/{preview,confirm}
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crm/dealers?q=&state=&page= — crm.view. */
export const listDealersHandler = route("dealers.list", [], async ({ request, deps, requestId }) => {
  const sp = new URL(request.url).searchParams
  const q = sp.get("q")?.trim() || null
  const state = sp.get("state")?.trim() || null
  const page = Number(sp.get("page") ?? "1")
  const fields: Record<string, string> = {}
  if (q && q.length > 100) fields.q = "too_long"
  if (state && state.length > 80) fields.state = "too_long"
  if (!Number.isInteger(page) || page < 1 || page > 1000) fields.page = "invalid_number"
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  return crmJson(await listDirectory(crm, { q, state, page }), requestId)
})

/**
 * POST /api/crm/dealers/import/preview — crm.view + crm.import.run.
 * multipart/form-data: file (CSV ≤ 2 MB), optional columnMap (JSON string)
 * application/json: {text, fileName?, columnMap?}
 */
export const importPreviewHandler = route("dealers.import.preview", ["crm.import.run"], async ({ request, deps, requestId, actor, log }) => {
  const len = Number(request.headers.get("content-length") ?? "0")
  if (len > IMPORT_MAX_BYTES + 64 * 1024) return crmError(413, "file_too_large", requestId, { maxBytes: IMPORT_MAX_BYTES })
  const ct = (request.headers.get("content-type") ?? "").toLowerCase()
  let text: string
  let fileName = "upload.csv"
  let columnMap: unknown
  if (ct.startsWith("multipart/form-data")) {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return crmError(400, "invalid_multipart", requestId)
    }
    const file = form.get("file")
    if (!file || typeof file === "string") return crmError(400, "validation", requestId, { fields: { file: "required" } })
    if (file.size > IMPORT_MAX_BYTES) return crmError(413, "file_too_large", requestId, { maxBytes: IMPORT_MAX_BYTES })
    if (file.size === 0) return crmError(400, "empty_file", requestId)
    fileName = typeof file.name === "string" && file.name ? file.name : fileName
    if (!/\.(csv|txt|tsv)$/i.test(fileName)) return crmError(400, "validation", requestId, { fields: { file: "csv_only" } })
    text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))
    const cm = form.get("columnMap")
    if (typeof cm === "string" && cm.trim()) {
      try {
        columnMap = JSON.parse(cm)
      } catch {
        return crmError(400, "validation", requestId, { fields: { columnMap: "invalid_json" } })
      }
    }
  } else {
    const body = await readJsonObject(request, IMPORT_MAX_BYTES + 64 * 1024)
    if (!body) return crmError(400, "invalid_json", requestId)
    if (typeof body.text !== "string" || !body.text.trim()) return crmError(400, "validation", requestId, { fields: { text: "required" } })
    if (Buffer.byteLength(body.text, "utf8") > IMPORT_MAX_BYTES) return crmError(413, "file_too_large", requestId, { maxBytes: IMPORT_MAX_BYTES })
    text = body.text
    if (typeof body.fileName === "string" && body.fileName.trim()) fileName = body.fileName.trim()
    columnMap = body.columnMap
    if (columnMap !== undefined && columnMap !== null && !isPlainObject(columnMap)) return crmError(400, "validation", requestId, { fields: { columnMap: "invalid_map" } })
  }
  const crm = await deps.getDb()
  const res = await previewDealerImport(crm, userRefOf(actor), { text, fileName, columnMap }, { now: nowOf(deps), ...auditCtx(request) })
  if (!res.ok) return crmError(res.status, res.error, requestId, { ...(res.fields ? { fields: res.fields } : {}), ...(res.headers ? { headers: res.headers } : {}) })
  log.info("import previewed", { importId: res.importId, total: res.total, new: res.summary.new, invalid: res.summary.invalid_phone })
  const { ok: _ok, ...payload } = res
  return crmJson(payload, requestId, 201)
})

/** POST /api/crm/dealers/import/confirm {importId} — crm.view + crm.import.run. Idempotent. */
export const importConfirmHandler = route("dealers.import.confirm", ["crm.import.run"], async ({ request, deps, requestId, actor, log }) => {
  const body = await readJsonObject(request, 4 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  if (!isHexId(body.importId)) return crmError(400, "validation", requestId, { fields: { importId: "invalid_id" } })
  const crm = await deps.getDb()
  const res = await confirmDealerImport(crm, userRefOf(actor), new ObjectId(body.importId), { now: nowOf(deps), ...auditCtx(request) })
  if (!res.ok) return crmError(res.status, res.error, requestId)
  log.info("import confirmed", { importId: res.importId, alreadyConfirmed: res.alreadyConfirmed, inserted: res.counts.inserted, contactsFlagged: res.counts.contactsFlagged })
  const { ok: _ok, ...payload } = res
  return crmJson(payload, requestId)
})
