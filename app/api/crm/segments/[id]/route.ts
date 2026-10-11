// Edit a segment (STEP 9). Logic: lib/crm/api/broadcasts.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { updateSegmentHandler } from "@/lib/crm/api/broadcasts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) => updateSegmentHandler(request, ctx, defaultCrmApiDeps)
