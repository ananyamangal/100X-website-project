// Contact page payload: contact + deals + merged timeline (never internal notes). Logic: lib/crm/api/contacts.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { contactDetailHandler } from "@/lib/crm/api/contacts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) => contactDetailHandler(request, ctx, defaultCrmApiDeps)
