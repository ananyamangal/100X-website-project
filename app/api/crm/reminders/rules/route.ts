// Reminder rule table (STEP 7). Logic: lib/crm/api/reminders.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { createRuleHandler, listRulesHandler } from "@/lib/crm/api/reminders"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listRulesHandler(request, NO_PARAMS, defaultCrmApiDeps)
export const POST = (request: Request) => createRuleHandler(request, NO_PARAMS, defaultCrmApiDeps)
