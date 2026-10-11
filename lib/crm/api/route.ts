/**
 * Shared plumbing for the session-authenticated CRM API handlers (lib/crm/api/{leads,contacts,notes,dealers}.ts).
 * Route files under app/api/crm/** are one-liners over those handlers, so tests can inject the DB,
 * the session/permission resolver and the assignee list (no Next request scope, no real DB).
 * Kept free of lib/crm/notes imports: only lib/crm/api/notes.ts and lib/crm/api/leads.ts (manual
 * entry writes the call note) reach the notes module.
 *
 * Every handler: request id (x-request-id header on every response) → requireCrm (crm.view + the
 * route's keys, permissions re-resolved per request) → validation (400 {error, fields}) → DB via
 * crmDb("fogging") → audit on mutations → JSON. Logs carry route, request id, ids and counts only.
 */
import { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import type { CrmPermission } from "../model"
import type { CrmEnv } from "../env"
import type { FetchLike } from "../outbound/graph"
import { clientIpOf, crmApiLogger, crmError, errName, requestIdOf, requireCrm, type CrmActor, type CrmAuthDeps } from "./auth"
import { isHexId } from "../validate"

export interface CrmApiDeps {
  getDb: () => Promise<CrmDb>
  auth?: CrmAuthDeps
  /** Assignable users (id + name). Default: lib/rbac/assignable listAssignableUsers. */
  assignable?: () => Promise<{ id: string; name: string }[]>
  now?: () => Date
  /** STEP 5 (inbox / templates): env (default readCrmEnv()), Graph fetch (tests stub it), media uploader, after(). */
  env?: CrmEnv
  fetch?: FetchLike
  /** Uploads a composer attachment; returns its https URL. Default: lib/cloudinaryUpload. */
  uploadMedia?: (file: File, resourceType: "image" | "video" | "raw") => Promise<string>
  /** next/server after() in route files; absent in tests (background work is then skipped). */
  schedule?: (task: () => Promise<void>) => void
  /** STEP 6: runs after a quotation is issued (PDF render); best-effort. */
  afterQuoteIssue?: (quotation: import("mongodb").Document, crm: CrmDb) => Promise<void>
  /** STEP 6: customer email sender (default lib/email.ts sendCustomerEmail; tests stub it). */
  sendEmail?: import("../quotes/send").QuoteSendDeps["sendEmail"]
}

export const defaultCrmApiDeps: CrmApiDeps = {
  getDb: async () => {
    const { crmDb } = await import("../db")
    return crmDb("fogging")
  },
}

export async function defaultAssignable(): Promise<{ id: string; name: string }[]> {
  const { listAssignableUsers } = await import("../../rbac/assignable")
  return listAssignableUsers()
}

export type RouteCtx = { params: Promise<Record<string, string>> }

export type Handler = (request: Request, ctx: RouteCtx, deps: CrmApiDeps) => Promise<Response>

/** Wraps auth + uniform 500 handling. */
export function route(name: string, required: readonly CrmPermission[], fn: (a: {
  request: Request
  ctx: RouteCtx
  deps: CrmApiDeps
  requestId: string
  log: ReturnType<typeof crmApiLogger>
  actor: CrmActor
}) => Promise<Response>): Handler {
  return async (request, ctx, deps) => {
    const requestId = requestIdOf(request.headers)
    const log = crmApiLogger(requestId, name)
    const auth = await requireCrm(request, required, requestId, deps.auth)
    if (!auth.ok) return auth.response
    try {
      return await fn({ request, ctx, deps, requestId, log, actor: auth.actor })
    } catch (e) {
      log.error("handler failed", { error: errName(e) })
      return crmError(500, "internal_error", requestId)
    }
  }
}

export const auditCtx = (request: Request) => ({ ip: clientIpOf(request.headers), userAgent: request.headers.get("user-agent") })
export const assignableOf = (deps: CrmApiDeps) => deps.assignable ?? defaultAssignable
export const nowOf = (deps: CrmApiDeps) => (deps.now ? deps.now() : new Date())

export async function idParam(ctx: RouteCtx): Promise<ObjectId | null> {
  const p = await ctx.params
  return isHexId(p.id) ? new ObjectId(p.id) : null
}
