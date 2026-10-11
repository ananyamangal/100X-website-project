// Dealer directory CSV import, step 1 (preview, stored 7 days). Logic: lib/crm/api/dealers.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { importPreviewHandler } from "@/lib/crm/api/dealers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const POST = (request: Request) => importPreviewHandler(request, NO_PARAMS, defaultCrmApiDeps)
