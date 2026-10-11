// Assign conversation (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { assignHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => assignHandler(request, ctx, defaultCrmApiDeps)
