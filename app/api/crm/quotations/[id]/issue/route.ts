// Issue a draft quotation: gapless number / supersede the previous version, then render + store the
// PDF (STEP 6). Logic: lib/crm/api/quotations.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { issueQuotationHandler, renderPdfAfterIssue } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) =>
  issueQuotationHandler(request, ctx, { ...defaultCrmApiDeps, afterQuoteIssue: renderPdfAfterIssue })
