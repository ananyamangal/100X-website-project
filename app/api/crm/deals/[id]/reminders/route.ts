// Customer reminder opt-ins + service/AMC due date for a deal (STEP 7). Logic: lib/crm/api/reminder-settings.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { dealRemindersHandler } from "@/lib/crm/api/reminder-settings"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) => dealRemindersHandler(request, ctx, defaultCrmApiDeps)
