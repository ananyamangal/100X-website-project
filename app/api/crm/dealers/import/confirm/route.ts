// Dealer directory CSV import, step 2 (confirm; idempotent). Logic: lib/crm/api/dealers.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { importConfirmHandler } from "@/lib/crm/api/dealers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const POST = (request: Request) => importConfirmHandler(request, NO_PARAMS, defaultCrmApiDeps)
