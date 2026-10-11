// Free-form reply inside the 24h window (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { replyHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => replyHandler(request, ctx, defaultCrmApiDeps)
