/**
 * Idempotent index application for INDEX_SPECS (lib/crm/model.ts).
 *
 * This module never resolves a collection itself: lib/crm/db.ts (the only place allowed to
 * call `.collection(...)` for CRM names, ADR §12) hands it an accessor. Use it through
 * `crmDbFrom(db, ws).ensureIndexes()` or scripts/crm/ensure-indexes.mjs.
 *
 * Behaviour per spec:
 * - name absent                 → createIndex (created)
 * - name present, same shape    → nothing (exists)
 * - name present, other shape   → reported as conflict; NEVER dropped or rebuilt automatically
 * - createIndex error (e.g. same key under another name) → reported as conflict
 */
import type { Document } from "mongodb"
import { INDEX_SPECS, type CollectionName, type IndexSpec } from "./model"

export interface IndexTarget {
  listIndexes(): { toArray(): Promise<Document[]> }
  createIndex(key: Record<string, 1 | -1 | "text">, options: Document): Promise<string>
}

export interface IndexReport {
  dryRun: boolean
  created: string[]
  existing: string[]
  conflicts: { index: string; reason: string }[]
}

const label = (s: IndexSpec) => `${s.collection}.${s.name}`
const isTtl = (s: IndexSpec) => s.expireAfterSeconds !== undefined

/** Static checks on the spec list: unique names per collection, non-TTL indexes lead with workspace. */
export function validateIndexSpecs(specs: readonly IndexSpec[] = INDEX_SPECS): void {
  const seen = new Set<string>()
  for (const s of specs) {
    if (seen.has(label(s))) throw new Error(`duplicate index spec ${label(s)}`)
    seen.add(label(s))
    const first = Object.keys(s.key)[0]
    if (!isTtl(s) && first !== "workspace") throw new Error(`index ${label(s)} must lead with workspace`)
  }
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`
  }
  return JSON.stringify(v)
}

/** Ordered key comparison; text indexes are stored as {_fts,_ftsx} + weights, so compare those. */
function sameKey(spec: IndexSpec, existing: Document): boolean {
  const textFields = Object.keys(spec.key).filter(k => spec.key[k] === "text")
  const ek = (existing.key ?? {}) as Record<string, unknown>
  if (textFields.length === 0) {
    const a = Object.entries(spec.key)
    const b = Object.entries(ek)
    return a.length === b.length && a.every(([k, v], i) => b[i][0] === k && Number(b[i][1]) === v)
  }
  const prefix = Object.keys(spec.key).filter(k => spec.key[k] !== "text")
  const weights = Object.keys((existing.weights ?? {}) as Record<string, unknown>).sort()
  return (
    "_fts" in ek &&
    prefix.every(k => k in ek) &&
    canonical(weights) === canonical([...textFields].sort())
  )
}

function sameOptions(spec: IndexSpec, existing: Document): boolean {
  return (
    Boolean(spec.unique) === Boolean(existing.unique) &&
    (spec.expireAfterSeconds ?? null) === (existing.expireAfterSeconds ?? null) &&
    canonical(spec.partialFilterExpression ?? null) === canonical(existing.partialFilterExpression ?? null) &&
    (spec.languageOverride === undefined || spec.languageOverride === (existing.language_override ?? "language"))
  )
}

function createOptions(spec: IndexSpec): Document {
  const o: Document = { name: spec.name }
  if (spec.unique) o.unique = true
  if (spec.partialFilterExpression) o.partialFilterExpression = spec.partialFilterExpression
  if (spec.expireAfterSeconds !== undefined) o.expireAfterSeconds = spec.expireAfterSeconds
  if (spec.languageOverride !== undefined) o.language_override = spec.languageOverride
  return o
}

async function existingIndexes(target: IndexTarget): Promise<Document[]> {
  try {
    return await target.listIndexes().toArray()
  } catch (err) {
    // NamespaceNotFound (26): collection not created yet → no indexes.
    if ((err as { code?: number }).code === 26) return []
    throw err
  }
}

export async function applyIndexSpecs(
  getTarget: (name: CollectionName) => IndexTarget,
  specs: readonly IndexSpec[] = INDEX_SPECS,
  opts: { dryRun?: boolean } = {},
): Promise<IndexReport> {
  validateIndexSpecs(specs)
  const report: IndexReport = { dryRun: Boolean(opts.dryRun), created: [], existing: [], conflicts: [] }
  const byCollection = new Map<CollectionName, IndexSpec[]>()
  for (const s of specs) byCollection.set(s.collection, [...(byCollection.get(s.collection) ?? []), s])

  for (const [collection, list] of byCollection) {
    const target = getTarget(collection)
    const current = await existingIndexes(target)
    for (const spec of list) {
      const found = current.find(ix => ix.name === spec.name)
      if (found) {
        if (sameKey(spec, found) && sameOptions(spec, found)) report.existing.push(label(spec))
        else report.conflicts.push({ index: label(spec), reason: "an index with this name exists with a different key/options; not modified" })
        continue
      }
      if (opts.dryRun) {
        report.created.push(label(spec))
        continue
      }
      try {
        await target.createIndex(spec.key, createOptions(spec))
        report.created.push(label(spec))
      } catch (err) {
        const e = err as { code?: number; codeName?: string; message?: string }
        report.conflicts.push({ index: label(spec), reason: `${e.codeName ?? e.code ?? "error"}: ${e.message ?? String(err)}` })
      }
    }
  }
  return report
}
