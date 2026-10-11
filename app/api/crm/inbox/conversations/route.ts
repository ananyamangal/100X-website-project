// Inbox conversation list (STEP 5). Logic: lib/crm/api/inbox.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { listConversationsHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => listConversationsHandler(request, NO_PARAMS, defaultCrmApiDeps)
