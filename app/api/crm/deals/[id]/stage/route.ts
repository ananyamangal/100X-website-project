// Pipeline stage change (STEP 4c). Logic: lib/crm/api/stage.ts, lib/crm/leads/stage.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { dealStageHandler } from "@/lib/crm/api/stage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => dealStageHandler(request, ctx, defaultCrmApiDeps)
