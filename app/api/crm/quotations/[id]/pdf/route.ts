// Quotation PDF: stored copy for issued quotations, watermarked preview for drafts (STEP 6).
// Logic: lib/crm/api/quotations.ts, lib/crm/quotes/document.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { quotationPdfHandler } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) => quotationPdfHandler(request, ctx, defaultCrmApiDeps)
