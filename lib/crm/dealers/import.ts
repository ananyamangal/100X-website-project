/**
 * STEP 3e — dealer directory CSV import: preview → confirm (with an upload
 * path and column mapping), plus the
 * directory list (DATA_MODEL §1.16).
 *
 * Row categories (ImportRowCategory, lib/crm/model.ts; precedence top-down):
 *   invalid_phone              — no usable mobile (fromHumanInput fails, or an Excel 9.87E+09 value)
 *   duplicate_in_batch         — same E.164 as an earlier row of this file
 *   duplicate_existing_dealer  — already in crm_dealer_directory (never overwritten)
 *   duplicate_existing_contact — new to the directory but the phone is a CRM contact (primary or alt):
 *                                inserted on confirm AND that contact gets the existing-dealer flag
 *   new                        — inserted on confirm
 *
 * Confirm is idempotent: a confirmed import returns its stored result; inserts rely on the
 * u_phone unique index (dupes ignored); contact flags are conditional on existingDealer:null so a
 * retry or a double click never writes a second activity.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { fromHumanInput } from "../phone"
import { COLL, CRM_DEFAULTS, type ImportRowCategory, type UserRef } from "../model"
import { parseCsv } from "./csv"
import { escapeRegex, type FieldErrors } from "../validate"
import { logCrmAction } from "../audit"
import { toClient } from "../leads/query"

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024
export const IMPORT_MAX_ROWS = 10_000
export const PREVIEW_ROWS_RETURNED = 1000

export const IMPORT_FIELDS = ["name", "company", "mobile", "altPhone", "state", "city", "gst", "notes"] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]
export type ColumnMap = Partial<Record<ImportField, string>>

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Normalised header → field. Exact (normalised) matches only; the first header wins per field. */
const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  name: ["name", "dealername", "contactname", "contactperson", "person", "ownername", "owner", "fullname", "proprietor", "proprietorname"],
  company: ["company", "companyname", "firm", "firmname", "business", "businessname", "shop", "shopname", "organisation", "organization", "agency", "agencyname", "tradename", "dealership"],
  mobile: ["mobile", "mobileno", "mobilenumber", "mob", "mobno", "phone", "phoneno", "phonenumber", "contact", "contactno", "contactnumber", "whatsapp", "whatsappno", "whatsappnumber", "cell", "cellno", "telephone", "tel", "primaryphone", "primarymobile", "phone1", "mobile1"],
  altPhone: ["altphone", "alternatephone", "alternativephone", "altmobile", "alternatemobile", "alternatenumber", "altno", "altnumber", "phone2", "mobile2", "secondaryphone", "secondarymobile", "landline", "othercontact", "othernumber"],
  state: ["state", "statename", "province"],
  city: ["city", "town", "district", "location", "place", "cityname"],
  gst: ["gst", "gstin", "gstno", "gstnumber", "gstin/uin", "gstinuin"],
  notes: ["notes", "note", "remarks", "remark", "comments", "comment", "description"],
}

export function autoDetectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {}
  const used = new Set<number>()
  for (const field of IMPORT_FIELDS) {
    const syn = HEADER_SYNONYMS[field].map(norm)
    const idx = headers.findIndex((h, i) => !used.has(i) && syn.includes(norm(h)))
    if (idx >= 0) {
      map[field] = headers[idx]
      used.add(idx)
    }
  }
  return map
}

/** Merges a client-supplied map over the detected one; every named header must exist. */
export function resolveColumnMap(headers: string[], override: unknown): { ok: true; map: ColumnMap } | { ok: false; fields: FieldErrors } {
  const map = autoDetectColumns(headers)
  const errors: FieldErrors = {}
  if (override !== undefined && override !== null) {
    if (typeof override !== "object" || Array.isArray(override)) return { ok: false, fields: { columnMap: "invalid_map" } }
    for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
      if (!(IMPORT_FIELDS as readonly string[]).includes(k)) {
        errors[`columnMap.${k}`] = "unknown_field"
        continue
      }
      if (v === null || v === "") {
        delete map[k as ImportField]
        continue
      }
      if (typeof v !== "string" || !headers.includes(v)) errors[`columnMap.${k}`] = "unknown_header"
      else map[k as ImportField] = v
    }
  }
  if (!map.mobile) errors["columnMap.mobile"] = "required"
  return Object.keys(errors).length ? { ok: false, fields: errors } : { ok: true, map }
}

const EXCEL_SCI = /^\s*\d+(\.\d+)?e\+?\d+\s*$/i

export interface PreviewRow {
  i: number
  raw: Partial<Record<ImportField, string>>
  phoneE164: string | null
  altPhoneE164: string | null
  category: ImportRowCategory
  reason?: "empty" | "invalid_phone" | "excel_scientific"
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s)

function phoneOf(v: string | undefined): { phone: string | null; reason?: PreviewRow["reason"] } {
  if (!v || !v.trim()) return { phone: null, reason: "empty" }
  if (EXCEL_SCI.test(v)) return { phone: null, reason: "excel_scientific" }
  const p = fromHumanInput(v)
  return p.ok ? { phone: p.phoneE164 } : { phone: null, reason: p.reason === "empty" ? "empty" : "invalid_phone" }
}

async function inChunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size))
}

export type PreviewResult =
  | {
      ok: true
      importId: string
      fileName: string
      delimiter: string
      headers: string[]
      columnMap: ColumnMap
      unmappedHeaders: string[]
      summary: Record<ImportRowCategory, number>
      total: number
      rows: PreviewRow[]
      truncated: boolean
      expiresAt: string
    }
  | { ok: false; status: 400 | 413; error: string; fields?: FieldErrors; headers?: string[] }

export async function previewDealerImport(
  crm: CrmDb,
  actor: UserRef,
  input: { text: string; fileName: string; columnMap?: unknown },
  deps: { now?: Date; ip?: string | null; userAgent?: string | null } = {},
): Promise<PreviewResult> {
  const now = deps.now ?? new Date()
  const parsed = parseCsv(input.text, { maxRows: IMPORT_MAX_ROWS })
  if (parsed.headers.length === 0) return { ok: false, status: 400, error: "empty_file" }
  if (parsed.rows.length > IMPORT_MAX_ROWS) return { ok: false, status: 413, error: "too_many_rows", fields: { rows: `max_${IMPORT_MAX_ROWS}` } }
  if (parsed.unterminatedQuote) return { ok: false, status: 400, error: "malformed_csv", fields: { file: "unterminated_quote" } }
  const cm = resolveColumnMap(parsed.headers, input.columnMap)
  // The parsed headers (BOM stripped, trimmed) come back so the client can render column selects.
  if (!cm.ok) return { ok: false, status: 400, error: "validation", fields: cm.fields, headers: parsed.headers }
  const map = cm.map
  const col = Object.fromEntries(Object.entries(map).map(([f, h]) => [f, parsed.headers.indexOf(h as string)])) as Partial<Record<ImportField, number>>

  const rows: PreviewRow[] = parsed.rows.map((cells, i) => {
    const raw: Partial<Record<ImportField, string>> = {}
    for (const f of IMPORT_FIELDS) {
      const idx = col[f]
      const v = idx !== undefined && idx >= 0 ? cells[idx] ?? "" : ""
      if (v) raw[f] = clip(v, f === "notes" ? 500 : 160)
    }
    let { phone, reason } = phoneOf(raw.mobile)
    let alt = phoneOf(raw.altPhone).phone
    if (!phone && alt) {
      // No usable primary but a usable alternate: the alternate becomes the key.
      phone = alt
      alt = null
      reason = undefined
    }
    if (alt === phone) alt = null
    return { i: i + 1, raw, phoneE164: phone, altPhoneE164: alt, category: phone ? "new" : "invalid_phone", ...(phone ? {} : { reason }) }
  })

  // In-batch duplicates (first occurrence wins).
  const seen = new Set<string>()
  for (const r of rows) {
    if (!r.phoneE164) continue
    if (seen.has(r.phoneE164)) r.category = "duplicate_in_batch"
    else seen.add(r.phoneE164)
  }
  const phones = [...seen]
  const inDirectory = new Set<string>()
  const contactPhones = new Set<string>()
  await inChunks(phones, 1000, async chunk => {
    const dir = await crm.collection(COLL.dealerDirectory).find({ phoneE164: { $in: chunk } }, { projection: { phoneE164: 1 } }).toArray()
    for (const d of dir) inDirectory.add(String(d.phoneE164))
    const cs = await crm
      .collection(COLL.contacts)
      .find({ $or: [{ phoneE164: { $in: chunk } }, { altPhones: { $in: chunk } }] }, { projection: { phoneE164: 1, altPhones: 1 } })
      .toArray()
    for (const c of cs) {
      contactPhones.add(String(c.phoneE164))
      for (const a of Array.isArray(c.altPhones) ? c.altPhones : []) contactPhones.add(String(a))
    }
  })
  for (const r of rows) {
    if (r.category !== "new" || !r.phoneE164) continue
    if (inDirectory.has(r.phoneE164)) r.category = "duplicate_existing_dealer"
    else if (contactPhones.has(r.phoneE164)) r.category = "duplicate_existing_contact"
  }

  const summary: Record<ImportRowCategory, number> = {
    new: 0,
    duplicate_existing_contact: 0,
    duplicate_existing_dealer: 0,
    duplicate_in_batch: 0,
    invalid_phone: 0,
  }
  for (const r of rows) summary[r.category]++

  const id = new ObjectId()
  const expireAt = new Date(now.getTime() + CRM_DEFAULTS.importPreviewTtlDays * 86_400_000)
  const fileName = clip(input.fileName || "upload.csv", 200)
  await crm.collection(COLL.imports).insertOne({
    _id: id,
    kind: "dealer_directory",
    fileName,
    columnMap: map,
    headers: parsed.headers.slice(0, 100).map(h => clip(h, 100)),
    rows,
    status: "previewed",
    summary,
    result: null,
    createdBy: actor,
    confirmedAt: null,
    expireAt,
    createdAt: now,
    updatedAt: now,
  })
  await logCrmAction(crm, actor, "import.preview", { type: "import", id: id.toHexString() }, { after: { kind: "dealer_directory", total: rows.length, ...summary }, ip: deps.ip, userAgent: deps.userAgent })

  const mapped = new Set(Object.values(map))
  return {
    ok: true,
    importId: id.toHexString(),
    fileName,
    delimiter: parsed.delimiter === "\t" ? "tab" : parsed.delimiter,
    headers: parsed.headers,
    columnMap: map,
    unmappedHeaders: parsed.headers.filter(h => h && !mapped.has(h)),
    summary,
    total: rows.length,
    rows: rows.slice(0, PREVIEW_ROWS_RETURNED),
    truncated: rows.length > PREVIEW_ROWS_RETURNED,
    expiresAt: expireAt.toISOString(),
  }
}

export interface ConfirmCounts {
  inserted: number
  alreadyInDirectory: number
  contactsFlagged: number
  skippedInvalid: number
  skippedDuplicateInBatch: number
}

export type ConfirmResult =
  | { ok: true; importId: string; alreadyConfirmed: boolean; counts: ConfirmCounts }
  | { ok: false; status: 404 | 409; error: string }

const isDup = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: unknown }).code === 11000

/** Inserted count from a driver bulk error whose write errors are all duplicate keys; null otherwise. */
function insertedFromDupError(e: unknown): number | null {
  if (typeof e !== "object" || e === null) return null
  const err = e as { code?: unknown; writeErrors?: unknown; insertedCount?: unknown; result?: { insertedCount?: unknown } }
  const list = Array.isArray(err.writeErrors) ? err.writeErrors : err.writeErrors ? [err.writeErrors] : []
  const allDup = list.length > 0 ? list.every(w => isDup(w) || (w as { err?: unknown }).err && isDup((w as { err?: unknown }).err)) : isDup(e)
  if (!allDup) return null
  const n = typeof err.insertedCount === "number" ? err.insertedCount : typeof err.result?.insertedCount === "number" ? err.result.insertedCount : 0
  return n
}

export async function confirmDealerImport(
  crm: CrmDb,
  actor: UserRef,
  importId: ObjectId,
  deps: { now?: Date; ip?: string | null; userAgent?: string | null } = {},
): Promise<ConfirmResult> {
  const now = deps.now ?? new Date()
  const imports = crm.collection(COLL.imports)
  const imp = await imports.findOne({ _id: importId, kind: "dealer_directory" })
  if (!imp) return { ok: false, status: 404, error: "import_not_found_or_expired" }
  if (imp.status === "confirmed" && imp.result) return { ok: true, importId: importId.toHexString(), alreadyConfirmed: true, counts: imp.result as ConfirmCounts }
  if (imp.status === "discarded") return { ok: false, status: 409, error: "import_discarded" }

  const rows = (Array.isArray(imp.rows) ? imp.rows : []) as PreviewRow[]
  const toInsert = rows.filter(r => r.phoneE164 && (r.category === "new" || r.category === "duplicate_existing_contact"))
  const dirDocs = toInsert.map(r => {
    const extra: Record<string, string> = {}
    if (r.altPhoneE164) extra.altPhoneE164 = r.altPhoneE164
    if (r.raw.gst) extra.gst = r.raw.gst
    if (r.raw.notes) extra.notes = r.raw.notes
    return {
      _id: new ObjectId(),
      phoneE164: r.phoneE164,
      name: r.raw.name ?? null,
      company: r.raw.company ?? null,
      state: r.raw.state ?? null,
      city: r.raw.city ?? null,
      importId: importId.toHexString(),
      extra,
      createdAt: now,
      updatedAt: now,
    }
  })

  let inserted = 0
  await inChunks(dirDocs, 500, async chunk => {
    try {
      const res = await crm.collection(COLL.dealerDirectory).insertMany(chunk, { ordered: false })
      inserted += res.insertedCount
    } catch (e) {
      const n = insertedFromDupError(e)
      if (n === null) throw e
      inserted += n
    }
  })

  // Flag contacts whose phone matches any directory phone of this batch (rows new to the directory
  // and rows that were already there: a contact created before its directory row was never matched).
  const batchPhones = [...new Set(rows.filter(r => r.phoneE164 && r.category !== "invalid_phone" && r.category !== "duplicate_in_batch").map(r => r.phoneE164 as string))]
  let contactsFlagged = 0
  await inChunks(batchPhones, 500, async chunk => {
    const dir = await crm.collection(COLL.dealerDirectory).find({ phoneE164: { $in: chunk } }, { projection: { phoneE164: 1, name: 1, company: 1 } }).toArray()
    const byPhone = new Map<string, Document>(dir.map(d => [String(d.phoneE164), d]))
    const contacts = await crm
      .collection(COLL.contacts)
      .find(
        { $or: [{ phoneE164: { $in: chunk } }, { altPhones: { $in: chunk } }], existingDealer: null, mergedInto: null },
        { projection: { phoneE164: 1, altPhones: 1, customerType: 1 } },
      )
      .toArray()
    for (const c of contacts) {
      const phones = [String(c.phoneE164), ...(Array.isArray(c.altPhones) ? c.altPhones.map(String) : [])]
      const entry = phones.map(p => byPhone.get(p)).find(Boolean)
      if (!entry) continue
      const directoryId = String(entry._id)
      const update: Document = { $set: { existingDealer: { directoryId, matchedAt: now }, updatedAt: now } }
      if (!c.customerType) {
        update.$push = { suggestions: { field: "customerType", value: "dealer", keyword: "dealer_directory", fromMessageId: null, status: "pending", at: now } }
      }
      const res = await crm.collection(COLL.contacts).updateOne({ _id: c._id, existingDealer: null }, update)
      if (res.modifiedCount !== 1) continue
      contactsFlagged++
      const who = [entry.name, entry.company].filter((s: unknown) => typeof s === "string" && s).join(", ")
      const summary = who ? `Matches dealer directory (import): ${who}` : "Matches dealer directory (import)"
      await crm.collection(COLL.activities).insertOne({
        contactId: c._id,
        dealId: null,
        kind: "existing_dealer_match",
        at: now,
        by: actor,
        summary: summary.length > 200 ? summary.slice(0, 199) + "…" : summary,
        data: { directoryId, importId: importId.toHexString() },
      })
    }
  })

  const counts: ConfirmCounts = {
    inserted,
    alreadyInDirectory: rows.filter(r => r.category === "duplicate_existing_dealer").length + (dirDocs.length - inserted),
    contactsFlagged,
    skippedInvalid: rows.filter(r => r.category === "invalid_phone").length,
    skippedDuplicateInBatch: rows.filter(r => r.category === "duplicate_in_batch").length,
  }
  const done = await imports.updateOne(
    { _id: importId, status: "previewed" },
    { $set: { status: "confirmed", confirmedAt: now, expireAt: null, result: counts, updatedAt: now } },
  )
  if (done.modifiedCount !== 1) {
    // A concurrent confirm finished first: answer with its stored result (same end state).
    const again = await imports.findOne({ _id: importId }, { projection: { result: 1 } })
    if (again?.result) return { ok: true, importId: importId.toHexString(), alreadyConfirmed: true, counts: again.result as ConfirmCounts }
  }
  await logCrmAction(crm, actor, "import.confirm", { type: "import", id: importId.toHexString() }, { after: { kind: "dealer_directory", ...counts }, ip: deps.ip, userAgent: deps.userAgent })
  return { ok: true, importId: importId.toHexString(), alreadyConfirmed: false, counts }
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory list
// ─────────────────────────────────────────────────────────────────────────────

export const DIRECTORY_FIELDS = ["phoneE164", "name", "company", "state", "city", "extra", "importId", "createdAt"] as const
export const DIRECTORY_PAGE_SIZE = 50

export function directoryFilter(q: string | null, state: string | null): Document {
  const and: Document[] = []
  if (state) and.push({ state: { $regex: "^" + escapeRegex(state) + "$", $options: "i" } })
  if (q) {
    const digits = q.replace(/\D/g, "")
    if (/^[\d\s+()\-.]+$/.test(q) && digits.length >= 3) {
      const p = fromHumanInput(q)
      const d = q.trim().startsWith("+") ? digits : digits.replace(/^0+/, "")
      const ors: Document[] = [{ phoneE164: { $regex: "^\\+" + d } }]
      if (!q.trim().startsWith("+")) ors.push({ phoneE164: { $regex: "^\\+91" + d } })
      if (p.ok) ors.push({ phoneE164: p.phoneE164 })
      and.push({ $or: ors })
    } else {
      const rx = { $regex: escapeRegex(q), $options: "i" }
      and.push({ $or: [{ name: rx }, { company: rx }, { city: rx }] })
    }
  }
  return and.length ? { $and: and } : {}
}

export async function listDirectory(crm: CrmDb, params: { q: string | null; state: string | null; page: number }) {
  const filter = directoryFilter(params.q, params.state)
  const coll = crm.collection(COLL.dealerDirectory)
  const [rows, total] = await Promise.all([
    coll
      .find(filter, {
        sort: { company: 1, name: 1, _id: 1 },
        skip: (params.page - 1) * DIRECTORY_PAGE_SIZE,
        limit: DIRECTORY_PAGE_SIZE,
        projection: Object.fromEntries(DIRECTORY_FIELDS.map(f => [f, 1])),
      })
      .toArray(),
    coll.countDocuments(filter),
  ])
  return { items: rows.map(toClient), total, page: params.page, pageSize: DIRECTORY_PAGE_SIZE }
}
