// Start a revision (same number, version + 1) of an issued quotation (STEP 6). Logic: lib/crm/api/quotations.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { reviseQuotationHandler } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => reviseQuotationHandler(request, ctx, defaultCrmApiDeps)
