// Sync the template cache from Graph (STEP 5; crm.settings.edit). Logic: lib/crm/api/templates.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { syncTemplatesHandler } from "@/lib/crm/api/templates"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const POST = (request: Request) => syncTemplatesHandler(request, NO_PARAMS, defaultCrmApiDeps)
