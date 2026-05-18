/**
 * Defensive accessors for blog fields.
 *
 * Mongo serialization (`lib/blogSerialize.ts`) returns documents typed
 * as `Record<string, unknown>` because the underlying schema is loose.
 * Server Components that render those fields will crash at runtime if
 * a value is missing / an object / wrong type:
 *   - `{blog.title}` with an object value -> "Objects are not valid
 *     as a React child"
 *   - `blog.topImage.startsWith(...)` with anything non-string ->
 *     `TypeError: ... is not a function`
 *
 * These helpers coerce defensively so a single malformed document
 * can never bring down /blog or /blog/[slug] in production.
 */

/** Return a string if the value is one, otherwise `fallback`. */
export function blogStr(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (value == null) return fallback
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  // Anything else (object, array, function, symbol) -> fallback.
  // Avoids "[object Object]" leaking into rendered copy and avoids the
  // "Objects are not valid as a React child" runtime crash.
  return fallback
}

/** Return the string only when present; never empty / never object. */
export function blogOptStr(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Array of strings, dropping anything that isn't a string. */
export function blogStrArr(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string" && v.length > 0)
}

/** Safe `.startsWith()` that never throws on non-string input. */
export function blogSafeStartsWith(value: unknown, prefix: string): boolean {
  return typeof value === "string" && value.startsWith(prefix)
}

/** First character of a string, with a single-char fallback. */
export function blogFirstChar(value: unknown, fallback = "A"): string {
  const s = blogOptStr(value)
  return s ? s.charAt(0).toUpperCase() : fallback
}

/** Image URL that's guaranteed to be a string. Empty when the source is bad. */
export function blogImageSrc(value: unknown, fallback = "/placeholder.svg"): string {
  const s = blogOptStr(value)
  return s ?? fallback
}
