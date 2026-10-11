// Lead list (STEP 4a) + manual call entry (STEP 3d). Logic: lib/crm/api/leads.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { createLeadHandler, listLeadsHandler } from "@/lib/crm/api/leads"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listLeadsHandler(request, NO_PARAMS, defaultCrmApiDeps)
export const POST = (request: Request) => createLeadHandler(request, NO_PARAMS, defaultCrmApiDeps)
