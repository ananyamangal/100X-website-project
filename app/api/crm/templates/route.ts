// Approved WhatsApp templates for the composer picker (STEP 5). Logic: lib/crm/api/templates.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { listTemplatesHandler } from "@/lib/crm/api/templates"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listTemplatesHandler(request, NO_PARAMS, defaultCrmApiDeps)
