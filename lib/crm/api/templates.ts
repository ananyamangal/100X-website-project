/** /api/crm/templates (STEP 5): approved-template picker + Graph sync. Imports no notes module. */
import { crmError, crmJson, userRefOf } from "./auth"
import { readCrmEnv } from "../env"
import { logCrmAction } from "../audit"
import { graphConfigFrom } from "../outbound/graph"
import { listApprovedTemplates, syncTemplates } from "../outbound/templates"
import { auditCtx, nowOf, route } from "./route"

/** GET /api/crm/templates?language= — crm.view + crm.inbox.view. APPROVED (positional) templates only. */
export const listTemplatesHandler = route("templates.list", ["crm.inbox.view"], async ({ request, deps, requestId }) => {
  const language = new URL(request.url).searchParams.get("language")
  if (language && !/^[a-z]{2,3}(_[A-Z]{2})?$/.test(language)) return crmError(400, "validation", requestId, { fields: { language: "invalid" } })
  const crm = await deps.getDb()
  return crmJson({ items: await listApprovedTemplates(crm, { language }) }, requestId)
})

/** POST /api/crm/templates/sync — crm.view + crm.settings.edit. Pulls GET /{CRM_WA_WABA_ID}/message_templates. */
export const syncTemplatesHandler = route("templates.sync", ["crm.settings.edit"], async ({ request, deps, requestId, actor, log }) => {
  const env = deps.env ?? readCrmEnv()
  const crm = await deps.getDb()
  const now = nowOf(deps)
  const r = await syncTemplates(crm, graphConfigFrom(env, deps.fetch), env.waWabaId, now)
  if (!r.ok) {
    const g = r.graphError
    log.error("template sync failed", {
      error: r.error,
      httpStatus: g?.httpStatus ?? null,
      metaCode: g?.code ?? null,
      metaSubcode: g?.subcode ?? null,
      metaTitle: g?.title ?? null,
      fbtraceId: g?.fbtraceId ?? null,
    })
    const status = r.error === "graph_error" ? 502 : 503
    return crmError(status, r.error, requestId, g ? { detail: { code: g.code, title: g.title } } : {})
  }
  await logCrmAction(crm, userRefOf(actor), "templates.sync", { type: "settings", id: "wa_templates" }, {
    after: { fetched: r.fetched, upserted: r.upserted, disabled: r.disabled, complete: r.complete, requestId },
    ...auditCtx(request),
  })
  log.info("templates synced", { fetched: r.fetched, upserted: r.upserted, disabled: r.disabled, complete: r.complete })
  return crmJson(r, requestId)
})
