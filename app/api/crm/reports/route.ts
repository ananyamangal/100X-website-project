// One-page sales reports (STEP 4c). Logic: lib/crm/api/reports.ts, lib/crm/leads/reports.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { reportsHandler } from "@/lib/crm/api/reports"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => reportsHandler(request, NO_PARAMS, defaultCrmApiDeps)
