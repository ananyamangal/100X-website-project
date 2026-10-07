/**
 * CDN caching for public, anonymous, read-only API routes.
 *
 * A route handler that reads the query string is rendered on every request
 * (its `revalidate` export is ignored), so the only thing that stops a
 * crawler or a dashboard from invoking the function on every call is a
 * `Cache-Control` header the CDN honours. `s-maxage` lets Vercel's CDN serve
 * the response (keyed by the full URL) without running the function;
 * `stale-while-revalidate` keeps serving the previous copy while one refresh
 * runs in the background. Browsers are left on their default (no `max-age`).
 *
 * Only wrap handlers whose output depends on the URL alone — never on
 * cookies, sessions or the Authorization header.
 */
export const CDN_CACHE = {
  /** Reference data refreshed by daily imports/crons (GeM procurement intelligence). */
  daily: "public, s-maxage=3600, stale-while-revalidate=86400",
  /** Content an admin may edit during the day. */
  content: "public, s-maxage=300, stale-while-revalidate=3600",
} as const

type Handler<A extends unknown[]> = (...args: A) => Response | Promise<Response>

/**
 * Adds `Cache-Control` to a 2xx response that does not already set one.
 * Errors and redirects pass through untouched, and a handler that sets its
 * own header (for example `no-store` on an export) keeps it.
 */
export function withCdnCache<A extends unknown[]>(handler: Handler<A>, cacheControl: string = CDN_CACHE.daily) {
  return async (...args: A): Promise<Response> => {
    const res = await handler(...args)
    if (res.ok && !res.headers.has("Cache-Control")) res.headers.set("Cache-Control", cacheControl)
    return res
  }
}
