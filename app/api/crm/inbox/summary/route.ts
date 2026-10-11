// Inbox unread counts for the nav badge (STEP 5); also sweeps stale webhook events in after().
// Logic: lib/crm/api/inbox.ts.
import { after } from "next/server"
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { inboxSummaryHandler } from "@/lib/crm/api/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => inboxSummaryHandler(request, NO_PARAMS, { ...defaultCrmApiDeps, schedule: task => after(task) })
