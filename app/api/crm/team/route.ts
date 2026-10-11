// Assignable users (id + name only). Logic: lib/crm/api/team.ts.
import { defaultCrmApiDeps, type RouteCtx } from "@/lib/crm/api/route"
import { teamHandler } from "@/lib/crm/api/team"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_PARAMS: RouteCtx = { params: Promise.resolve({}) }
export const GET = (request: Request) => teamHandler(request, NO_PARAMS, defaultCrmApiDeps)
