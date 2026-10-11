// Edit / deactivate a reminder rule (STEP 7). Logic: lib/crm/api/reminders.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { updateRuleHandler } from "@/lib/crm/api/reminders"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) => updateRuleHandler(request, ctx, defaultCrmApiDeps)
