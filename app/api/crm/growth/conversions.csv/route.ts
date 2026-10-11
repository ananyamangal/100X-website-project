// Google Ads offline-conversion CSV (STEP 10). Logic: lib/crm/api/growth.ts, lib/crm/growth/exports.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { conversionsCsvHandler } from "@/lib/crm/api/growth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => conversionsCsvHandler(request, NO_PARAMS, defaultCrmApiDeps)
