// Update / complete a task (STEP 7). Logic: lib/crm/api/tasks.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { updateTaskHandler } from "@/lib/crm/api/tasks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) => updateTaskHandler(request, ctx, defaultCrmApiDeps)
