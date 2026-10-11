// Approved template send (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { templateHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => templateHandler(request, ctx, defaultCrmApiDeps)
