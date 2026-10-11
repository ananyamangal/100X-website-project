/**
 * Small hand-written validators for CRM API input (no validation dependency in the repo for
 * server code). Each returns a value or records a field error code; callers answer
 * 400 {error:"validation", fields:{field: code}} when any error was recorded.
 */
import { ObjectId } from "mongodb"
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, LEAD_SOURCES, type CustomerType, type LeadSource } from "./model"

export type FieldErrors = Record<string, string>

export class Checker {
  readonly errors: FieldErrors = {}
  fail(field: string, code: string): void {
    // Own-property check + defineProperty: `"__proto__" in {}` is true and `errors["__proto__"] = x`
    // sets the prototype, so a plain `in`/assignment would silently drop that field's error.
    if (!Object.hasOwn(this.errors, field)) Object.defineProperty(this.errors, field, { value: code, enumerable: true, writable: true, configurable: true })
  }
  get ok(): boolean {
    return Object.keys(this.errors).length === 0
  }

  /** Optional trimmed string; "" / null / undefined → null. Control characters are rejected. */
  str(body: Record<string, unknown>, field: string, max: number, opts: { required?: boolean; multiline?: boolean } = {}): string | null {
    const v = body[field]
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      if (opts.required) this.fail(field, "required")
      return null
    }
    if (typeof v !== "string" && typeof v !== "number") {
      this.fail(field, "not_text")
      return null
    }
    const s = String(v).trim()
    if (s.length > max) {
      this.fail(field, "too_long")
      return null
    }
    const ctrl = opts.multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/
    if (ctrl.test(s)) {
      this.fail(field, "invalid_characters")
      return null
    }
    return s
  }

  /** Optional integer in [min, max]; numeric strings accepted. */
  int(body: Record<string, unknown>, field: string, min: number, max: number): number | null {
    const v = body[field]
    if (v === undefined || v === null || v === "") return null
    const n = typeof v === "number" ? v : typeof v === "string" && /^\s*\d+\s*$/.test(v) ? Number(v) : NaN
    if (!Number.isInteger(n) || n < min || n > max) {
      this.fail(field, "invalid_number")
      return null
    }
    return n
  }

  oid(body: Record<string, unknown>, field: string): string | null {
    const v = body[field]
    if (v === undefined || v === null || v === "") return null
    if (typeof v !== "string" || !ObjectId.isValid(v) || !/^[a-f0-9]{24}$/i.test(v)) {
      this.fail(field, "invalid_id")
      return null
    }
    return v.toLowerCase()
  }
}

const key = (v: string) => v.trim().toLowerCase().replace(/[\s\-/]+/g, "_")

// Maps, not object literals: a lookup with user input must never hit Object.prototype ("constructor", "__proto__", ...).
const CUSTOMER_TYPE_ALIASES: ReadonlyMap<string, CustomerType> = new Map<string, CustomerType>([
  ...CUSTOMER_TYPES.map(t => [t, t] as const),
  ...CUSTOMER_TYPES.map(t => [key(CUSTOMER_TYPE_LABEL[t]), t] as const),
  ["gem", "gem_supplier"],
  ["government", "govt_dept"],
  ["government_department", "govt_dept"],
  ["govt_department", "govt_dept"],
  ["government_officer", "govt_officer"],
  ["individual", "b2c"],
])

const LEAD_SOURCE_ALIASES: ReadonlyMap<string, LeadSource> = new Map<string, LeadSource>([
  ...LEAD_SOURCES.map(s => [s, s] as const),
  ["phone", "call"],
  ["phone_call", "call"],
  ["wa", "whatsapp"],
  ["web", "website"],
  ["gem_portal", "gem"],
  ["existing_dealer", "existing_dealer"],
  ["dealer", "existing_dealer"],
])

/** Accepts the slug or the UI label ("Existing dealer", "GeM supplier"); null when absent. */
export function parseCustomerType(c: Checker, body: Record<string, unknown>, field = "customerType", required = false): CustomerType | null {
  const v = body[field]
  if (v === undefined || v === null || v === "") {
    if (required) c.fail(field, "required")
    return null
  }
  const hit = typeof v === "string" ? CUSTOMER_TYPE_ALIASES.get(key(v)) : undefined
  if (!hit) c.fail(field, "invalid_enum")
  return hit ?? null
}

export function parseLeadSource(c: Checker, body: Record<string, unknown>, field = "leadSource", required = true): LeadSource | null {
  const v = body[field]
  if (v === undefined || v === null || v === "") {
    if (required) c.fail(field, "required")
    return null
  }
  const hit = typeof v === "string" ? LEAD_SOURCE_ALIASES.get(key(v)) : undefined
  if (!hit) c.fail(field, "invalid_enum")
  return hit ?? null
}

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)

/** Reads a JSON object body; null when the body is not a JSON object (caller answers 400). */
export async function readJsonObject(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown> | null> {
  const len = Number(request.headers.get("content-length") ?? "0")
  if (len > maxBytes) return null
  let text: string
  try {
    text = await request.text()
  } catch {
    return null
  }
  if (text.length > maxBytes) return null
  try {
    const v = JSON.parse(text)
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}

/** "^…" regex source for a literal string. */
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const toOid = (hex: string): ObjectId => new ObjectId(hex)

export const isHexId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)
