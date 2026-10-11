// Broadcasts: list / create draft (STEP 9). Logic: lib/crm/api/broadcasts.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { createBroadcastHandler, listBroadcastsHandler } from "@/lib/crm/api/broadcasts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listBroadcastsHandler(request, NO_PARAMS, defaultCrmApiDeps)
export const POST = (request: Request) => createBroadcastHandler(request, NO_PARAMS, defaultCrmApiDeps)
