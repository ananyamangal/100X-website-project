// WhatsApp number health for the CRM Settings page (STEP 10). Logic: lib/crm/api/whatsapp-status.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { whatsappStatusHandler } from "@/lib/crm/api/whatsapp-status"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => whatsappStatusHandler(request, NO_PARAMS, defaultCrmApiDeps)
