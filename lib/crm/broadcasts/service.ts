/**
 * Broadcasts (STEP 9; DATA_MODEL §1.15) — drafts. A broadcast = segment audience + an APPROVED
 * template (positional, no media header) + one mapping per body parameter (contact name / company /
 * city, or a literal) + language mode (the contact's preference, or fixed en_US / hi).
 * Draft → (start: expand) sending → paused ⇄ sending → completed | cancelled  (./run.ts).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL, WA_LANGUAGES, type WaLanguage } from "../model"
import { userRefOf, type CrmActor } from "../api/auth"
import { fromTemplateParam } from "../outbound/compose"
import { resolveSendNumber } from "../outbound/gate"
import { Checker, isPlainObject, type FieldErrors } from "../validate"
import { toClient } from "../leads/query"

export type ParamSource = { from: "contact.name" | "contact.company" | "contact.city" } | { from: "csv.column"; column: string } | { literal: string }
export const PARAM_FROM = ["contact.name", "contact.company", "contact.city"] as const

export interface BroadcastInput {
  name: string
  /** Exactly one audience: a segment, or a CSV audience import (step 9b). */
  audience: { kind: "segment"; segmentId: ObjectId } | { kind: "csv"; importId: ObjectId }
  templateName: string
  languageMode: "contact_preference" | WaLanguage
  params: ParamSource[]
}

export const EMPTY_COUNTS = { total: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, replied: 0, deferred_cap: 0 }

export function parseBroadcastInput(body: Record<string, unknown>): { ok: true; input: BroadcastInput } | { ok: false; fields: FieldErrors } {
  const c = new Checker()
  for (const k of Object.getOwnPropertyNames(body)) if (!["name", "segmentId", "csvImportId", "templateName", "languageMode", "params"].includes(k)) c.fail(k, "unknown_field")
  const name = c.str(body, "name", 100, { required: true })
  const seg = c.oid(body, "segmentId")
  const csvId = c.oid(body, "csvImportId")
  if (seg && csvId) c.fail("csvImportId", "one_audience_only")
  else if (!seg && !csvId && !Object.hasOwn(c.errors, "segmentId") && !Object.hasOwn(c.errors, "csvImportId")) c.fail("segmentId", "required")
  const tpl = typeof body.templateName === "string" && /^[a-z0-9_]{1,512}$/.test(body.templateName) ? body.templateName : null
  if (!tpl) c.fail("templateName", body.templateName === undefined ? "required" : "invalid")
  const lm = body.languageMode ?? "contact_preference"
  if (lm !== "contact_preference" && !(WA_LANGUAGES as readonly unknown[]).includes(lm)) c.fail("languageMode", "invalid_enum")
  const params: ParamSource[] = []
  if (!Array.isArray(body.params) || body.params.length > 10) c.fail("params", "invalid_list")
  else body.params.forEach((p, i) => {
    if (!isPlainObject(p)) return c.fail(`params.${i}`, "invalid")
    if (p.from === "csv.column") {
      if (typeof p.column !== "string" || !p.column.trim() || p.column.length > 160 || Object.keys(p).length !== 2) return c.fail(`params.${i}`, "invalid")
      params.push({ from: "csv.column", column: p.column })
    } else if (typeof p.from === "string") {
      if (!(PARAM_FROM as readonly string[]).includes(p.from) || Object.keys(p).length !== 1) return c.fail(`params.${i}`, "invalid")
      params.push({ from: p.from as (typeof PARAM_FROM)[number] })
    } else if (typeof p.literal === "string" && Object.keys(p).length === 1) {
      const m = fromTemplateParam(p.literal)
      if (!m.ok) return c.fail(`params.${i}.literal`, m.reason)
      params.push({ literal: p.literal.trim() })
    } else c.fail(`params.${i}`, "invalid")
  })
  if (!c.ok) return { ok: false, fields: c.errors }
  if (!csvId && params.some(p => "from" in p && p.from === "csv.column")) return { ok: false, fields: { params: "csv_column_needs_csv_audience" } }
  const audience: BroadcastInput["audience"] = csvId ? { kind: "csv", importId: new ObjectId(csvId) } : { kind: "segment", segmentId: new ObjectId(seg as string) }
  return { ok: true, input: { name: name as string, audience, templateName: tpl as string, languageMode: lm as BroadcastInput["languageMode"], params } }
}

/** Template must be APPROVED (in the fixed language, or in en_US for contact preference), positional, no media header, matching param count. */
export async function checkBroadcastTemplate(crm: CrmDb, input: Pick<BroadcastInput, "templateName" | "languageMode" | "params">): Promise<FieldErrors | null> {
  const lang = input.languageMode === "contact_preference" ? "en_US" : input.languageMode
  const t = await crm.collection(COLL.waTemplates).findOne({ name: input.templateName, language: lang }, { projection: { status: 1, bodyParamCount: 1, headerType: 1, headerParamCount: 1, parameterFormat: 1 } })
  if (!t) return { templateName: "template_unknown" }
  if (t.status !== "APPROVED") return { templateName: "template_not_approved" }
  if (t.parameterFormat === "NAMED") return { templateName: "template_named_params_unsupported" }
  if (t.headerType && t.headerType !== "NONE" && t.headerType !== "TEXT") return { templateName: "media_header_unsupported" }
  if (Number(t.headerParamCount ?? 0) > 0) return { templateName: "header_params_unsupported" }
  if (Number(t.bodyParamCount ?? 0) !== input.params.length) return { params: `expected_${Number(t.bodyParamCount ?? 0)}` }
  return null
}

/** The audience exists; csv.column params name real CSV columns. */
async function checkAudience(crm: CrmDb, input: BroadcastInput): Promise<FieldErrors | null> {
  if (input.audience.kind === "segment") {
    const s = await crm.collection(COLL.segments).findOne({ _id: input.audience.segmentId }, { projection: { _id: 1 } })
    return s ? null : { segmentId: "not_found" }
  }
  const imp = await crm.collection(COLL.imports).findOne({ _id: input.audience.importId, kind: "broadcast_audience", status: "confirmed" }, { projection: { headers: 1 } })
  if (!imp) return { csvImportId: "not_found" }
  const headers = (imp.headers as string[]) ?? []
  const bad = input.params.findIndex(p => "from" in p && p.from === "csv.column" && !headers.includes(p.column))
  return bad >= 0 ? { [`params.${bad}`]: "unknown_csv_column" } : null
}

export type BcResult = { ok: true; broadcast: Document } | { ok: false; status: 400 | 404 | 409; error: string; fields?: FieldErrors }

export const broadcastView = (b: Document) => toClient(b)

export async function createBroadcast(crm: CrmDb, actor: CrmActor, input: BroadcastInput, allowList: readonly string[], now: Date): Promise<BcResult> {
  const audErr = await checkAudience(crm, input)
  if (audErr) return { ok: false, status: 400, error: "validation", fields: audErr }
  const tplErr = await checkBroadcastTemplate(crm, input)
  if (tplErr) return { ok: false, status: 400, error: "validation", fields: tplErr }
  const sender = resolveSendNumber(allowList, null)
  if (!sender.ok) return { ok: false, status: 409, error: sender.reason }
  const me = userRefOf(actor)
  const doc: Document = {
    _id: new ObjectId(), name: input.name, phoneNumberId: sender.phoneNumberId, audience: input.audience,
    templateName: input.templateName, params: input.params, languageMode: input.languageMode, status: "draft", scheduledAt: null,
    counts: { ...EMPTY_COUNTS }, createdBy: me, startedAt: null, completedAt: null, createdAt: now, updatedAt: now,
  }
  await crm.collection(COLL.broadcasts).insertOne(doc)
  await logCrmAction(crm, me, "broadcast.create", { type: "broadcast", id: String(doc._id) }, { after: { templateName: input.templateName, audience: input.audience.kind, params: input.params.length } })
  return { ok: true, broadcast: doc }
}

export async function updateBroadcast(crm: CrmDb, actor: CrmActor, id: ObjectId, input: BroadcastInput, now: Date): Promise<BcResult> {
  const b = await crm.collection(COLL.broadcasts).findOne({ _id: id })
  if (!b) return { ok: false, status: 404, error: "not_found" }
  if (b.status !== "draft") return { ok: false, status: 409, error: "not_draft" }
  const audErr = await checkAudience(crm, input)
  if (audErr) return { ok: false, status: 400, error: "validation", fields: audErr }
  const tplErr = await checkBroadcastTemplate(crm, input)
  if (tplErr) return { ok: false, status: 400, error: "validation", fields: tplErr }
  const set = { name: input.name, audience: input.audience, templateName: input.templateName, params: input.params, languageMode: input.languageMode, updatedAt: now }
  const r = await crm.collection(COLL.broadcasts).updateOne({ _id: id, status: "draft" }, { $set: set })
  if (r.matchedCount !== 1) return { ok: false, status: 409, error: "not_draft" }
  await logCrmAction(crm, userRefOf(actor), "broadcast.update", { type: "broadcast", id: id.toHexString() }, { after: { templateName: input.templateName, audience: input.audience.kind, params: input.params.length } })
  return { ok: true, broadcast: { ...b, ...set } }
}

export async function deleteDraftBroadcast(crm: CrmDb, actor: CrmActor, id: ObjectId): Promise<BcResult> {
  const r = await crm.collection(COLL.broadcasts).deleteOne({ _id: id, status: "draft" })
  if (r.deletedCount !== 1) {
    const exists = await crm.collection(COLL.broadcasts).findOne({ _id: id }, { projection: { _id: 1 } })
    return exists ? { ok: false, status: 409, error: "not_draft" } : { ok: false, status: 404, error: "not_found" }
  }
  await logCrmAction(crm, userRefOf(actor), "broadcast.delete", { type: "broadcast", id: id.toHexString() }, {})
  return { ok: true, broadcast: { _id: id } }
}
