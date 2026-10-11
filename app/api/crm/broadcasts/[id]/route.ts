// One broadcast: read / edit draft / delete draft (STEP 9). Logic: lib/crm/api/broadcasts.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { deleteBroadcastHandler, getBroadcastHandler, updateBroadcastHandler } from "@/lib/crm/api/broadcasts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }
export const GET = (request: Request, ctx: Ctx) => getBroadcastHandler(request, ctx, defaultCrmApiDeps)
export const PATCH = (request: Request, ctx: Ctx) => updateBroadcastHandler(request, ctx, defaultCrmApiDeps)
export const DELETE = (request: Request, ctx: Ctx) => deleteBroadcastHandler(request, ctx, defaultCrmApiDeps)
