// Chunk loop trigger: admin session or signed self-continuation (STEP 9). Logic: lib/crm/queue/trigger.ts.
import { after } from "next/server"
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { handleQueueRun } from "@/lib/crm/queue/trigger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

export const POST = (request: Request) => handleQueueRun(request, { ...defaultCrmApiDeps, schedule: task => after(task) })
