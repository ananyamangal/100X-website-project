// One quotation: read, edit a draft, discard a draft (STEP 6). Logic: lib/crm/api/quotations.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { discardQuotationHandler, getQuotationHandler, updateQuotationHandler } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }
export const GET = (request: Request, ctx: Ctx) => getQuotationHandler(request, ctx, defaultCrmApiDeps)
export const PATCH = (request: Request, ctx: Ctx) => updateQuotationHandler(request, ctx, defaultCrmApiDeps)
export const DELETE = (request: Request, ctx: Ctx) => discardQuotationHandler(request, ctx, defaultCrmApiDeps)
