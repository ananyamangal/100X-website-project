// Contact timeline page (activities + WhatsApp messages, merge-sorted; never notes). Logic: lib/crm/api/contacts.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { contactTimelineHandler } from "@/lib/crm/api/contacts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) => contactTimelineHandler(request, ctx, defaultCrmApiDeps)
