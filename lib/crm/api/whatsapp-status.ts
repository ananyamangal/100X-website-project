/**
 * GET /api/crm/settings/whatsapp (STEP 10): the /health report for signed-in users (crm.view), for
 * the Settings page. /api/crm/health itself stays Bearer-CRON_SECRET only (uptime checks).
 * Contains ids, timestamps, counts and Meta error codes only.
 */
import { crmJson } from "./auth"
import { readCrmEnv } from "../env"
import { buildHealthReport } from "../health"
import { nowOf, route } from "./route"

export const whatsappStatusHandler = route("settings.whatsapp", [], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  return crmJson(await buildHealthReport(crm, deps.env ?? readCrmEnv(), nowOf(deps)), requestId)
})
