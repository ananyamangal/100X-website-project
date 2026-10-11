// Team members WhatsApp numbers for task pushes (STEP 7). Logic: lib/crm/api/reminder-settings.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { getStaffHandler, putStaffHandler } from "@/lib/crm/api/reminder-settings"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => getStaffHandler(request, NO_PARAMS, defaultCrmApiDeps)
export const PUT = (request: Request) => putStaffHandler(request, NO_PARAMS, defaultCrmApiDeps)
