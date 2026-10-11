/** POST /api/crm/deals/:id/stage (STEP 4c). Imports no notes module. */
import { crmError, crmJson, leadScopeOf } from "./auth"
import { readJsonObject } from "../validate"
import { changeStage, parseStageInput } from "../leads/stage"
import { auditCtx, idParam, nowOf, route } from "./route"

/** crm.view + crm.leads.edit (+ crm.leads.close when entering or leaving Closed-Won / Closed-Lost). */
export const dealStageHandler = route("deals.stage", ["crm.leads.edit"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseStageInput(body)
  if (!p.ok) return crmError(400, p.error, requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const res = await changeStage(crm, actor, leadScopeOf(actor), id, p.input, { now: nowOf(deps), ...auditCtx(request) })
  if (!res.ok) return crmError(res.status, res.error, requestId, { ...(res.fields ? { fields: res.fields } : {}), ...(res.required ? { required: res.required } : {}) })
  log.info("stage changed", { dealId: id.toHexString(), to: p.input.stage })
  return crmJson({ deal: res.deal }, requestId)
})
