// Broadcast action: pause (STEP 9). Logic: lib/crm/api/broadcasts.ts, lib/crm/broadcasts/run.ts.
import { after } from "next/server"
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { broadcastActionHandler } from "@/lib/crm/api/broadcasts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const handler = broadcastActionHandler("pause")
export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => handler(request, ctx, { ...defaultCrmApiDeps, schedule: task => after(task) })
