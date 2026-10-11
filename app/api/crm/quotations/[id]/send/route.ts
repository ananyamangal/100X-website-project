// Send an issued quotation on WhatsApp or by email (STEP 6). Logic: lib/crm/api/quotations.ts, lib/crm/quotes/send.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { sendQuotationHandler } from "@/lib/crm/api/quotations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => sendQuotationHandler(request, ctx, defaultCrmApiDeps)
