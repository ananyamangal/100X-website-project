/**
 * Broadcast CSV audiences (STEP 9b; DATA_MODEL §1.15 "audience: a segment, or a CSV import").
 *
 * upload → crm_imports {kind:"broadcast_audience", status:"confirmed"}: every row keeps its cells by
 * header (for `csv.column` parameters) plus the normalised phone; invalid and in-file duplicate phones
 * are categorised and never sent to. The mobile column is detected from the same header synonyms as
 * the dealer import (or chosen with `mobileColumn`).
 *
 * At expand time (./run.ts) each valid phone is matched to a contact; a CSV-only number gets a plain
 * contact row (origin "import", no deal — so it never shows up as a lead, but its replies land in the
 * inbox and opt-outs apply).
 */
import { BSON, ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL, type UserRef } from "../model"
import { fromHumanInput } from "../phone"
import { parseCsv } from "../dealers/csv"
import { IMPORT_MAX_ROWS, autoDetectColumns } from "../dealers/import"

export const CSV_MAX_COLUMNS = 20
export const CSV_MAX_HEADER_CHARS = 100
const CSV_MAX_DOC_BYTES = 15 * 1024 * 1024 // under Mongo's 16 MB document limit
const EXCEL_SCI = /^\s*\d+(\.\d+)?e\+\d+\s*$/i

export type CsvAudienceResult =
  | { ok: true; importId: string; headers: string[]; mobileColumn: string; total: number; summary: { valid: number; invalid_phone: number; duplicate_in_batch: number } }
  | { ok: false; status: 400 | 413; error: string; fields?: Record<string, string>; headers?: string[] }

export async function createCsvAudience(crm: CrmDb, by: UserRef, input: { text: string; fileName: string; mobileColumn?: string | null }, now: Date): Promise<CsvAudienceResult> {
  const parsed = parseCsv(input.text, { maxRows: IMPORT_MAX_ROWS })
  if (parsed.headers.length === 0) return { ok: false, status: 400, error: "empty_file" }
  if (parsed.rows.length > IMPORT_MAX_ROWS) return { ok: false, status: 413, error: "too_many_rows", fields: { rows: `max_${IMPORT_MAX_ROWS}` } }
  if (parsed.unterminatedQuote) return { ok: false, status: 400, error: "malformed_csv", fields: { file: "unterminated_quote" } }
  // Header names are keys on every stored row: clipped (and kept unique) so a wide file can't blow the doc size.
  const headers: string[] = []
  for (const h of parsed.headers.slice(0, CSV_MAX_COLUMNS)) {
    let k = h.slice(0, CSV_MAX_HEADER_CHARS)
    for (let n = 2; headers.includes(k); n++) k = `${h.slice(0, CSV_MAX_HEADER_CHARS - 4)} (${n})`
    headers.push(k)
  }
  const mobileColumn = input.mobileColumn ? (headers.includes(input.mobileColumn.slice(0, CSV_MAX_HEADER_CHARS)) ? input.mobileColumn.slice(0, CSV_MAX_HEADER_CHARS) : null) : autoDetectColumns(headers).mobile ?? null
  if (!mobileColumn) return { ok: false, status: 400, error: "validation", fields: { mobileColumn: input.mobileColumn ? "unknown_column" : "not_detected" }, headers }
  const mi = headers.indexOf(mobileColumn)
  const seen = new Set<string>()
  const summary = { valid: 0, invalid_phone: 0, duplicate_in_batch: 0 }
  const rows = parsed.rows.map(cells => {
    const raw: Record<string, string> = {}
    headers.forEach((h, i) => { const v = (cells[i] ?? "").trim(); if (v) raw[h] = v.slice(0, 160) })
    const cell = cells[mi] ?? ""
    const p = cell && !EXCEL_SCI.test(cell) ? fromHumanInput(cell) : { ok: false as const }
    let category: "new" | "invalid_phone" | "duplicate_in_batch" = "new"
    let phoneE164: string | null = null
    if (!p.ok) category = "invalid_phone"
    else if (seen.has(p.phoneE164)) { category = "duplicate_in_batch"; phoneE164 = p.phoneE164 }
    else { seen.add(p.phoneE164); phoneE164 = p.phoneE164 }
    summary[category === "new" ? "valid" : category]++
    return { raw, phoneE164, category }
  })
  const doc: Document = {
    _id: new ObjectId(), kind: "broadcast_audience", fileName: input.fileName.slice(0, 120), columnMap: { mobile: mobileColumn }, headers, rows,
    status: "confirmed", summary, createdBy: by, createdAt: now, updatedAt: now, confirmedAt: now, expireAt: null,
  }
  if (BSON.calculateObjectSize(doc) > CSV_MAX_DOC_BYTES) return { ok: false, status: 413, error: "audience_too_large", fields: { file: "too_wide_or_long" } }
  await crm.collection(COLL.imports).insertOne(doc)
  await logCrmAction(crm, by, "import.broadcast_audience", { type: "import", id: String(doc._id) }, { after: { rows: rows.length, ...summary } })
  return { ok: true, importId: String(doc._id), headers, mobileColumn, total: rows.length, summary }
}

/** Valid, unique rows of a confirmed broadcast-audience import. */
export async function csvAudienceRows(crm: CrmDb, importId: ObjectId): Promise<{ headers: string[]; rows: { raw: Record<string, string>; phoneE164: string }[] } | null> {
  const imp = await crm.collection(COLL.imports).findOne({ _id: importId, kind: "broadcast_audience", status: "confirmed" }, { projection: { headers: 1, rows: 1 } })
  if (!imp) return null
  const rows = (imp.rows as { raw: Record<string, string>; phoneE164: string | null; category: string }[]).filter(r => r.category === "new" && r.phoneE164) as { raw: Record<string, string>; phoneE164: string }[]
  return { headers: (imp.headers as string[]) ?? [], rows }
}

/**
 * Contacts for the CSV phones: existing (not merged) ones are reused; missing ones are created as
 * plain contacts (origin "import", no deal), with the CSV name / company / city when present.
 */
export async function contactsForCsv(crm: CrmDb, rows: { raw: Record<string, string>; phoneE164: string }[], cols: { name?: string; company?: string; city?: string }, now: Date): Promise<Map<string, Document>> {
  const contacts = crm.collection(COLL.contacts)
  const phones = rows.map(r => r.phoneE164)
  const proj = { phoneE164: 1, name: 1, waProfileName: 1, company: 1, city: 1, language: 1, marketingOptOut: 1, notOnWhatsApp: 1, staffUserId: 1, mergedInto: 1 }
  const found = await contacts.find({ phoneE164: { $in: phones } }, { projection: proj }).toArray()
  const byPhone = new Map(found.filter(c => !c.mergedInto).map(c => [String(c.phoneE164), c]))
  const missing = rows.filter(r => !byPhone.has(r.phoneE164) && !found.some(c => c.phoneE164 === r.phoneE164))
  if (missing.length) {
    const val = (r: { raw: Record<string, string> }, col?: string) => (col && r.raw[col] ? r.raw[col] : null)
    const docs = missing.map(r => ({
      _id: new ObjectId(), phoneE164: r.phoneE164, waId: r.phoneE164.slice(1), notOnWhatsApp: null, phoneKind: r.phoneE164.startsWith("+91") ? "mobile" : "international", altPhones: [],
      name: val(r, cols.name), waProfileName: null, company: val(r, cols.company), customerType: null, state: null, city: val(r, cols.city), email: null, language: "en_US",
      interestTags: [], suggestions: [], existingDealer: null, assignedTo: null, marketingOptOut: null, amcDueAt: null, lastActivityAt: now,
      origin: { channel: "import" }, mergedInto: null, staffUserId: null, createdBy: { system: "broadcast_csv" }, createdAt: now, updatedAt: now,
    }))
    try {
      await contacts.insertMany(docs, { ordered: false })
    } catch (e) {
      if ((e as { code?: number }).code !== 11000 && !String((e as Error).message).includes("E11000")) throw e
    }
    for (const c of await contacts.find({ phoneE164: { $in: missing.map(r => r.phoneE164) } }, { projection: proj }).toArray()) if (!c.mergedInto) byPhone.set(String(c.phoneE164), c)
  }
  // A CSV number that belongs to a merged contact goes to the surviving contact (never silently dropped).
  let pending = found.filter(c => c.mergedInto).map(c => ({ phone: String(c.phoneE164), target: c.mergedInto as ObjectId }))
  for (let hop = 0; hop < 5 && pending.length; hop++) {
    const targets = new Map((await contacts.find({ _id: { $in: pending.map(p => p.target) } }, { projection: proj }).toArray()).map(t => [String(t._id), t]))
    const next: typeof pending = []
    for (const p of pending) {
      const t = targets.get(String(p.target))
      if (!t) continue
      if (t.mergedInto) next.push({ phone: p.phone, target: t.mergedInto as ObjectId })
      else if (!byPhone.has(p.phone)) byPhone.set(p.phone, t)
    }
    pending = next
  }
  return byPhone
}
