// Tasks: list (mine / all / a contact's) and create (STEP 7). Logic: lib/crm/api/tasks.ts.
import { after } from "next/server"
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { createTaskHandler, listTasksHandler } from "@/lib/crm/api/tasks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
// The task list also lazily evaluates reminder rules, in after() so the response is not delayed.
export const GET = (request: Request) => listTasksHandler(request, NO_PARAMS, { ...defaultCrmApiDeps, schedule: task => after(task) })
export const POST = (request: Request) => createTaskHandler(request, NO_PARAMS, defaultCrmApiDeps)
