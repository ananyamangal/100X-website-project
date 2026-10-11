// Resolve conversation (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { resolveHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => resolveHandler(request, ctx, defaultCrmApiDeps)
