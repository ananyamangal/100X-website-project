// Quotations of a deal: list every version, or start a draft (STEP 6). Logic: lib/crm/api/quotations.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { createQuotationHandler, listDealQuotationsHandler } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }
export const GET = (request: Request, ctx: Ctx) => listDealQuotationsHandler(request, ctx, defaultCrmApiDeps)
export const POST = (request: Request, ctx: Ctx) => createQuotationHandler(request, ctx, defaultCrmApiDeps)
