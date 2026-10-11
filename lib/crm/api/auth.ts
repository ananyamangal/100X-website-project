/**
 * Session + permission gate shared by every session-authenticated CRM API route (/api/crm/*).
 *
 * - The session comes from the 100X RBAC cookie (lib/rbac/server getCurrentUser: JWT signature,
 *   expiry and session revocation).
 * - Permissions are RE-RESOLVED from the DB on every request (rbac_role_permissions →
 *   code fallback, + rbac_user_permissions), not taken from the JWT: the JWT embeds permissions at
 *   login, so a revoke would otherwise land only at the next login (DATA_MODEL §8).
 *   If that lookup fails the request fails closed (503), never falls back to the JWT list.
 * - Every CRM route requires `crm.view` plus the route's own keys (all-of).
 * - Errors are uniform JSON: 401 {error:"unauthorized"}, 403 {error:"forbidden", required:[…]},
 *   503 {error:"permissions_unavailable"}. Responses carry `x-request-id` and `Cache-Control: no-store`.
 *
 * The rbac modules are imported lazily so that importing a CRM handler (tests, type-only users)
 * never loads lib/mongodb (which throws without MONGODB_URI). Tests inject `CrmAuthDeps`.
 */
import { NextResponse } from "next/server"
import type { CrmPermission, UserRef } from "../model"

export interface CrmActor {
  userId: string
  name: string
  role: string
  /** Effective permissions resolved from the DB for this request. */
  permissions: ReadonlySet<string>
}

export interface SessionUser {
  sub: string
  name?: string
  email?: string
  role: string
}

export interface CrmAuthDeps {
  /** Verified session user, or null. Default: lib/rbac/server getCurrentUser. */
  getUser?: (request: Request) => Promise<SessionUser | null>
  /** Effective permissions for (userId, role). Default: lib/rbac/engine getEffectivePermissions. */
  resolvePermissions?: (userId: string, role: string) => Promise<readonly string[]>
}

export type CrmAuthResult = { ok: true; actor: CrmActor } | { ok: false; response: NextResponse }

const NO_STORE = "no-store"

/** Same rule as the webhook: trust a well-formed x-request-id / x-vercel-id, else a fresh UUID. */
export function requestIdOf(headers: Headers): string {
  const given = headers.get("x-request-id") ?? headers.get("x-vercel-id")
  const safe = given && /^[\w:.\-]{1,128}$/.test(given) ? given : null
  return safe ?? crypto.randomUUID()
}

export function crmJson(body: unknown, requestId: string, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": NO_STORE, "x-request-id": requestId } })
}

export function crmError(status: number, error: string, requestId: string, extra: Record<string, unknown> = {}): NextResponse {
  return crmJson({ error, ...extra }, requestId, status)
}

export interface CrmApiLogger {
  info(msg: string, fields?: Record<string, string | number | boolean | null>): void
  error(msg: string, fields?: Record<string, string | number | boolean | null>): void
}

/** JSON log lines with route + request id. Callers pass ids and counts only, never lead data. */
export function crmApiLogger(requestId: string, route: string): CrmApiLogger {
  const line = (level: string, msg: string, fields?: Record<string, unknown>) =>
    JSON.stringify({ scope: "crm.api", level, route, requestId, msg, ...(fields ?? {}) })
  return {
    info: (m, f) => console.log(line("info", m, f)),
    error: (m, f) => console.error(line("error", m, f)),
  }
}

/** Error name only (messages can echo input values). */
export const errName = (e: unknown): string => (e instanceof Error ? e.name : "unknown")

async function defaultGetUser(request: Request): Promise<SessionUser | null> {
  const { getCurrentUser } = await import("../../rbac/server")
  // getCurrentUser reads only request.cookies; NextRequest is what Next passes to route handlers.
  const u = await getCurrentUser(request as Parameters<typeof getCurrentUser>[0])
  return u ? { sub: u.sub, name: u.name, email: u.email, role: u.role } : null
}

async function defaultResolvePermissions(userId: string, role: string): Promise<readonly string[]> {
  const { getEffectivePermissions } = await import("../../rbac/engine")
  return getEffectivePermissions(userId, role as Parameters<typeof getEffectivePermissions>[1])
}

/**
 * Authenticates the request and checks `crm.view` + every key in `required`.
 * Usage: `const auth = await requireCrm(req, ["crm.leads.create"], requestId); if (!auth.ok) return auth.response`.
 */
export async function requireCrm(
  request: Request,
  required: readonly CrmPermission[],
  requestId: string,
  deps: CrmAuthDeps = {},
): Promise<CrmAuthResult> {
  let user: SessionUser | null
  try {
    user = await (deps.getUser ?? defaultGetUser)(request)
  } catch {
    user = null
  }
  if (!user || !user.sub) return { ok: false, response: crmError(401, "unauthorized", requestId) }

  let perms: readonly string[]
  try {
    perms = await (deps.resolvePermissions ?? defaultResolvePermissions)(user.sub, user.role)
  } catch (e) {
    crmApiLogger(requestId, "auth").error("permission resolution failed", { error: errName(e) })
    return { ok: false, response: crmError(503, "permissions_unavailable", requestId) }
  }
  const set = new Set(perms)
  const need: CrmPermission[] = ["crm.view", ...required.filter(p => p !== "crm.view")]
  const missing = need.filter(p => !set.has(p))
  if (missing.length) return { ok: false, response: crmError(403, "forbidden", requestId, { required: missing }) }

  const name = (user.name && user.name.trim()) || (user.email ? user.email.split("@")[0] : "") || "User"
  return { ok: true, actor: { userId: user.sub, name, role: user.role, permissions: set } }
}

export const can = (actor: CrmActor, perm: CrmPermission): boolean => actor.permissions.has(perm)

export const userRefOf = (actor: CrmActor): UserRef => ({ userId: actor.userId, name: actor.name })

/**
 * Lead visibility: crm.leads.view_all sees everything; crm.leads.view_assigned sees leads assigned
 * to the actor; neither → nothing (routes return 403 for lists, 404 for single records).
 */
export type LeadScope = { kind: "all" } | { kind: "assigned"; userId: string } | { kind: "none" }
export function leadScopeOf(actor: CrmActor): LeadScope {
  if (can(actor, "crm.leads.view_all")) return { kind: "all" }
  if (can(actor, "crm.leads.view_assigned")) return { kind: "assigned", userId: actor.userId }
  return { kind: "none" }
}

/** Client IP for audit rows (first x-forwarded-for hop). */
export function clientIpOf(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for")
  const first = xff ? xff.split(",")[0]?.trim() : ""
  return first || headers.get("x-real-ip") || null
}
