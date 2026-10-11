// WhatsApp number settings: tier cap, safety margin, resume after a Meta pause (STEP 10). Logic: lib/crm/api/numbers.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { updateNumberHandler } from "@/lib/crm/api/numbers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const PATCH = (request: Request) => updateNumberHandler(request, NO_PARAMS, defaultCrmApiDeps)
