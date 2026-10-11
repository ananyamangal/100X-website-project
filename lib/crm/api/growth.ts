/**
 * /api/crm/growth/* (STEP 10; DATA_MODEL §7): offline-conversion and Customer Match CSV exports.
 * crm.growth.export (critical), audited (counts + batch id only), 409 when CRM_GROWTH_OS_SYNC is off.
 * The sales-invisible collections are read only inside lib/crm/growth (static test).
 */
import { crmError, userRefOf } from "./auth"
import { logCrmAction } from "../audit"
import { readCrmEnv } from "../env"
import { COLL, type SegmentFilter } from "../model"
import { conversionsCsv, customerMatchCsv } from "../growth/exports"
import { auditCtx, nowOf, route, type CrmApiDeps } from "./route"
import { isHexId } from "../validate"
import { ObjectId } from "mongodb"

const SYNC_OFF = "Growth OS sync is switched off (CRM_GROWTH_OS_SYNC). Nothing is captured or exported while it is off."

function csvResponse(csv: string, filename: string, requestId: string): Response {
  return new Response(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "x-request-id": requestId },
  })
}
const syncOn = (deps: CrmApiDeps) => (deps.env ?? readCrmEnv()).growthSync
const day = (v: string | null): Date | null | "bad" => {
  if (!v) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "bad"
  const d = new Date(`${v}T00:00:00+05:30`)
  return Number.isNaN(d.getTime()) ? "bad" : d
}

/** GET /api/crm/growth/conversions.csv?kind=closed_won|quotation_sent|all&from=YYYY-MM-DD&to=YYYY-MM-DD (IST days, to exclusive) */
export const conversionsCsvHandler = route("growth.conversions", ["crm.growth.export"], async ({ request, deps, requestId, actor }) => {
  if (!syncOn(deps)) return crmError(409, "growth_sync_disabled", requestId, { message: SYNC_OFF })
  const sp = new URL(request.url).searchParams
  const kind = sp.get("kind") ?? "all"
  const from = day(sp.get("from")), to = day(sp.get("to"))
  const fields: Record<string, string> = {}
  if (!["closed_won", "quotation_sent", "all"].includes(kind)) fields.kind = "invalid_enum"
  if (from === "bad") fields.from = "invalid_date"
  if (to === "bad") fields.to = "invalid_date"
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const r = await conversionsCsv(crm, { kind: kind as "all", from: from as Date | null, to: to as Date | null }, userRefOf(actor), nowOf(deps))
  await logCrmAction(crm, userRefOf(actor), "export.conversions", { type: "export", id: r.batchId }, { after: { kind, from: sp.get("from"), to: sp.get("to"), rows: r.rows }, ...auditCtx(request) })
  return csvResponse(r.csv, `crm-conversions-${kind}-${nowOf(deps).toISOString().slice(0, 10)}.csv`, requestId)
})

/** GET /api/crm/growth/customer-match.csv?segmentId= */
export const customerMatchCsvHandler = route("growth.customer_match", ["crm.growth.export"], async ({ request, deps, requestId, actor }) => {
  if (!syncOn(deps)) return crmError(409, "growth_sync_disabled", requestId, { message: SYNC_OFF })
  const segmentId = new URL(request.url).searchParams.get("segmentId")
  if (!isHexId(segmentId)) return crmError(400, "validation", requestId, { fields: { segmentId: "invalid_id" } })
  const crm = await deps.getDb()
  const seg = await crm.collection(COLL.segments).findOne({ _id: new ObjectId(segmentId) }, { projection: { filter: 1, name: 1 } })
  if (!seg) return crmError(404, "not_found", requestId)
  const r = await customerMatchCsv(crm, (seg.filter ?? {}) as SegmentFilter, nowOf(deps))
  if (r.tooMany) return crmError(409, "audience_too_large", requestId)
  await logCrmAction(crm, userRefOf(actor), "export.customer_match", { type: "segment", id: segmentId }, { after: { rows: r.rows, excluded: r.excluded }, ...auditCtx(request) })
  return csvResponse(r.csv, `crm-customer-match-${nowOf(deps).toISOString().slice(0, 10)}.csv`, requestId)
})
