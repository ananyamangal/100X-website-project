/** GET /api/crm/reports (STEP 4c). crm.view + crm.reports.view. */
import { crmError, crmJson, leadScopeOf } from "./auth"
import { buildReport, parseReportParams } from "../leads/reports"
import { nowOf, route } from "./route"

export const reportsHandler = route("reports.get", ["crm.reports.view"], async ({ request, deps, requestId, actor, log }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })
  const parsed = parseReportParams(new URL(request.url).searchParams, nowOf(deps))
  if (!parsed.ok) return crmError(400, "validation", requestId, { fields: parsed.fields })
  const crm = await deps.getDb()
  const report = await buildReport(crm, scope, parsed.params)
  log.info("report built", { created: report.totals.created, granularity: parsed.params.granularity, leadScope: scope.kind })
  return crmJson(report, requestId)
})
