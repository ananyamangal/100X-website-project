// Dealer directory list. Logic: lib/crm/api/dealers.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { listDealersHandler } from "@/lib/crm/api/dealers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listDealersHandler(request, NO_PARAMS, defaultCrmApiDeps)
