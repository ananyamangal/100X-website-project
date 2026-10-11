/**
 * crm_audit writer (DATA_MODEL §1.19).
 *
 * Fire-and-forget: the returned promise NEVER rejects and resolves to the inserted id or null, so a
 * route may `await` it (preferred on serverless, where an un-awaited promise can be cut off) or
 * ignore it, and an audit failure can never fail the request.
 *
 * No PII: `before`/`after` carry ids, enums, dates, counts and staff names only. Keys that usually
 * hold customer data (phone, name, company, email, text, notes, message, …) are dropped here as a
 * backstop, and string values are clipped. Never pass note text or message bodies.
 */
import type { CrmDb } from "./db"
import { COLL, type UserRef } from "./model"

export type AuditActor = UserRef | { system: string }

export interface AuditTarget {
  type: "contact" | "deal" | "note" | "import" | "dealer_directory" | "export" | "settings" | string
  id: string | null
}

export interface AuditMeta {
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
}

/** Keys never stored in an audit row, at any depth (case-insensitive). */
const PII_KEYS = new Set([
  "phone", "phonee164", "mobile", "waid", "altphones", "altphone", "name", "waprofilename", "company",
  "email", "text", "body", "note", "notes", "message", "summary", "raw", "address", "gst", "gstin",
])

function scrub(v: unknown, depth = 0): unknown {
  if (v === null || v === undefined) return v ?? null
  if (typeof v === "string") return v.length > 200 ? v.slice(0, 199) + "…" : v
  if (typeof v === "number" || typeof v === "boolean") return v
  if (v instanceof Date) return v
  if (depth > 4) return "[depth]"
  if (Array.isArray(v)) return v.slice(0, 50).map(x => scrub(x, depth + 1))
  if (typeof v === "object") {
    // ObjectId and other BSON values: keep their string form.
    const proto = Object.getPrototypeOf(v)
    if (proto !== Object.prototype && proto !== null) return String(v)
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) continue
      out[k] = scrub(x, depth + 1)
    }
    return out
  }
  return null
}

export function scrubAuditMeta(rec: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!rec) return null
  return scrub(rec) as Record<string, unknown>
}

export async function logCrmAction(
  crm: CrmDb,
  actor: AuditActor,
  action: string,
  target: AuditTarget,
  meta: AuditMeta = {},
): Promise<string | null> {
  try {
    const res = await crm.collection(COLL.audit).insertOne({
      at: new Date(),
      actor: "userId" in actor ? { userId: actor.userId, name: actor.name } : { system: actor.system },
      action,
      targetType: target.type,
      targetId: target.id,
      before: scrubAuditMeta(meta.before),
      after: scrubAuditMeta(meta.after),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ? meta.userAgent.slice(0, 300) : null,
    })
    return String(res.insertedId)
  } catch (e) {
    console.error(JSON.stringify({ scope: "crm.audit", level: "error", msg: "audit write failed", action, error: e instanceof Error ? e.name : "unknown" }))
    return null
  }
}
