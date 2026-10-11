// Inbound automation settings (STEP 8). Logic: lib/crm/api/automation.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { getAutomationHandler, putAutomationHandler } from "@/lib/crm/api/automation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => getAutomationHandler(request, NO_PARAMS, defaultCrmApiDeps)
export const PUT = (request: Request) => putAutomationHandler(request, NO_PARAMS, defaultCrmApiDeps)
