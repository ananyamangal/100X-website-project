// Vercel Cron authentication for the scheduled /api/admin/* jobs.
//
// Vercel Cron calls each path in vercel.json `crons` with GET and, when the
// CRON_SECRET environment variable is set, an `Authorization: Bearer <CRON_SECRET>`
// header. It sends no session cookie, so without this the middleware's session
// check answered every scheduled call with 401 (no job had run since June 2026).
//
// Pure and dependency-free: runs in middleware and is imported by the node:test suite.
// The job handlers re-check CRON_SECRET themselves (procurement/insights GET is read-only).

// Must match vercel.json `crons[].path` exactly (tests/unit/cron-auth.test.mjs pins this).
export const CRON_PATHS: ReadonlySet<string> = new Set([
  "/api/admin/procurement/insights",
  "/api/admin/growth/cron/dealer-opportunity",
  "/api/admin/growth/cron/machine-buyer-opportunity",
  "/api/admin/growth/cron/weekly-exec-summary",
  "/api/admin/growth/cron/google-ads-director",
  "/api/admin/growth/cron/gsc-sync",
  "/api/admin/growth/cron/revenue-director",
  "/api/admin/growth/cron/offpage-discovery",
])

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * True only for a GET to an exact scheduled path carrying `Bearer <secret>`.
 * With no secret configured nothing qualifies (fail closed).
 */
export function isAuthorizedCronRequest(
  method: string,
  pathname: string,
  authorization: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!secret) return false
  if (method.toUpperCase() !== "GET") return false
  if (!CRON_PATHS.has(pathname)) return false
  if (!authorization) return false
  return constantTimeEqual(authorization, `Bearer ${secret}`)
}
