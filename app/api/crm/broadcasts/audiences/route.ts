// Upload a CSV audience for a broadcast (STEP 9b). Logic: lib/crm/api/broadcasts.ts, lib/crm/broadcasts/audience-csv.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { createCsvAudienceHandler } from "@/lib/crm/api/broadcasts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const POST = (request: Request) => createCsvAudienceHandler(request, NO_PARAMS, defaultCrmApiDeps)
