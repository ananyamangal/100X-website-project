// Document / image / audio send (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { mediaHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => mediaHandler(request, ctx, defaultCrmApiDeps)
