// Evaluate the reminder rules now (STEP 7; admin button). Logic: lib/crm/api/reminders.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { runRemindersHandler } from "@/lib/crm/api/reminders"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const POST = (request: Request) => runRemindersHandler(request, NO_PARAMS, defaultCrmApiDeps)
