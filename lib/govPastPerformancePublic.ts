/**
 * What the PUBLIC side may see of a gov_past_performance document.
 *
 * The collection also holds internal fields (notes, documents, orderValue, ...).
 * The public JSON API used to return whole documents, so those were readable by
 * anyone who called it. Two allow-lists, both applied at the query (projection)
 * and again on the way out, so a field added to the collection later stays
 * private until it is added here on purpose.
 */

/** Public JSON API (/api/gov-past-performance): the supply-card fields only. */
export const PUBLIC_API_FIELDS = [
  "organization",
  "department",
  "state",
  "product",
  "category",
  "status",
  "orderYear",
  "verified",
] as const

/**
 * The /past-performance-government page renders these in its record cards and
 * detail view (quantity, orderValue and notes are shown there today). Anything
 * not listed - documents, images, timestamps, admin flags - is not rendered and
 * so is not sent to the browser either.
 */
export const PUBLIC_PAGE_FIELDS = [
  ...PUBLIC_API_FIELDS,
  "quantity",
  "orderValue",
  "notes",
] as const

export const projectionFor = (fields: readonly string[]) =>
  Object.fromEntries(fields.map((f) => [f, 1])) as Record<string, 1>

export function pickPublic<T extends Record<string, any>>(doc: T, fields: readonly string[]) {
  const out: Record<string, any> = { _id: String(doc._id) }
  for (const f of fields) if (doc[f] !== undefined) out[f] = doc[f]
  return out
}
