// Conversation messages (cursor; markRead=1) (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { listMessagesHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) => listMessagesHandler(request, ctx, defaultCrmApiDeps)
