/**
 * Template catalogue (DATA_MODEL §1.9).
 *
 * - syncTemplates(): GET /{CRM_WA_WABA_ID}/message_templates (paged by cursor, never by following
 *   a returned URL) → upsert crm_wa_templates by (name, language) with status, category,
 *   components, body text, positional variable count, header type, opt-out button flag. After a
 *   COMPLETE sync, rows Meta no longer returns become status DISABLED (removedFromMeta).
 * - renderTemplatePreview(): fills {{n}} from params and refuses a wrong parameter count.
 * - Only APPROVED rows are offered to the picker; the gate re-checks the status at send time.
 */
import type { Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL } from "../model"
import { graphRequest, type GraphConfig, type GraphError } from "./graph"

const MAX_PAGES = 20
const PAGE_SIZE = 100
const FIELDS = "id,name,language,status,category,components,parameter_format"

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)

export interface ParsedTemplate {
  metaId: string | null
  name: string
  language: string
  status: string
  category: string
  components: Obj[]
  bodyText: string
  bodyParamCount: number
  headerType: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION"
  headerParamCount: number
  parameterFormat: "POSITIONAL" | "NAMED"
  hasOptOutButton: boolean
}

/** Highest positional {{n}} in a text (Meta numbers them 1..n contiguously). */
export function positionalParamCount(text: string): number {
  let max = 0
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1]))
  return max
}

const hasNamedParams = (text: string) => /\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/.test(text)
const OPT_OUT_BUTTON = /stop promotions|प्रमोशन बंद/i

export function parseTemplate(raw: unknown): ParsedTemplate | null {
  if (!isObj(raw)) return null
  const name = str(raw.name)
  const language = str(raw.language)
  if (!name || !language) return null
  const components = Array.isArray(raw.components) ? raw.components.filter(isObj) : []
  const byType = (t: string) => components.find(c => String(c.type).toUpperCase() === t) ?? null
  const body = byType("BODY")
  const header = byType("HEADER")
  const buttons = byType("BUTTONS")
  const bodyText = str(body?.text) ?? ""
  const headerFormat = String(header?.format ?? "").toUpperCase()
  const headerType: ParsedTemplate["headerType"] = header
    ? (["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(headerFormat) ? headerFormat : "TEXT") as ParsedTemplate["headerType"]
    : "NONE"
  const headerText = headerType === "TEXT" ? str(header?.text) ?? "" : ""
  const fmt = String(raw.parameter_format ?? "").toUpperCase()
  const parameterFormat: ParsedTemplate["parameterFormat"] = fmt === "NAMED" || (fmt !== "POSITIONAL" && hasNamedParams(bodyText)) ? "NAMED" : "POSITIONAL"
  const btns = Array.isArray(buttons?.buttons) ? buttons.buttons.filter(isObj) : []
  return {
    metaId: str(raw.id),
    name,
    language,
    status: String(raw.status ?? "PENDING").toUpperCase(),
    category: String(raw.category ?? "").toUpperCase(),
    components,
    bodyText,
    bodyParamCount: positionalParamCount(bodyText),
    headerType,
    headerParamCount: positionalParamCount(headerText),
    parameterFormat,
    hasOptOutButton: btns.some(b => OPT_OUT_BUTTON.test(String(b.text ?? "")) || String(b.type ?? "").toUpperCase() === "MARKETING_OPT_OUT"),
  }
}

export type SyncResult =
  | { ok: true; fetched: number; upserted: number; disabled: number; complete: boolean }
  | { ok: false; error: "whatsapp_not_configured" | "waba_not_set" | "graph_error"; graphError?: GraphError }

export async function syncTemplates(crm: CrmDb, graph: GraphConfig | null, wabaId: string | undefined, now: Date = new Date()): Promise<SyncResult> {
  if (!graph) return { ok: false, error: "whatsapp_not_configured" }
  const waba = wabaId?.trim()
  if (!waba) return { ok: false, error: "waba_not_set" }
  const coll = crm.collection(COLL.waTemplates)
  let after: string | null = null
  let fetched = 0
  let upserted = 0
  let complete = false
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({ fields: FIELDS, limit: String(PAGE_SIZE) })
    if (after) q.set("after", after)
    const r = await graphRequest(graph, "GET", `${encodeURIComponent(waba)}/message_templates?${q.toString()}`)
    if (!r.ok) return { ok: false, error: "graph_error", graphError: r.error }
    const body = isObj(r.json) ? r.json : {}
    const data = Array.isArray(body.data) ? body.data : []
    for (const raw of data) {
      const t = parseTemplate(raw)
      if (!t) continue
      fetched++
      const { name, language, ...rest } = t
      await coll.updateOne({ name, language }, { $set: { ...rest, syncedAt: now, removedFromMeta: false } }, { upsert: true })
      upserted++
    }
    const paging = isObj(body.paging) ? body.paging : {}
    const cursors = isObj(paging.cursors) ? paging.cursors : {}
    const next = str(cursors.after)
    if (!paging.next || !next || data.length === 0) {
      complete = true
      break
    }
    after = next
  }
  let disabled = 0
  if (complete) {
    const res = await coll.updateMany({ syncedAt: { $lt: now }, removedFromMeta: { $ne: true } }, { $set: { status: "DISABLED", removedFromMeta: true } })
    disabled = res.modifiedCount
  }
  return { ok: true, fetched, upserted, disabled, complete }
}

// ─────────────────────────────────────────────────────────────────────────────
// Picker + preview
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateSummary {
  name: string
  language: string
  category: string
  bodyText: string
  bodyParamCount: number
  headerType: string
  hasOptOutButton: boolean
  syncedAt: string | null
}

/** APPROVED, positional templates only. */
export async function listApprovedTemplates(crm: CrmDb, opts: { language?: string | null } = {}): Promise<TemplateSummary[]> {
  const rows: Document[] = await crm
    .collection(COLL.waTemplates)
    .find(
      { status: "APPROVED", parameterFormat: { $ne: "NAMED" }, ...(opts.language ? { language: opts.language } : {}) },
      { sort: { name: 1, language: 1 }, limit: 200, projection: { name: 1, language: 1, category: 1, bodyText: 1, bodyParamCount: 1, headerType: 1, hasOptOutButton: 1, syncedAt: 1 } },
    )
    .toArray()
  return rows.map(r => ({
    name: String(r.name),
    language: String(r.language),
    category: String(r.category ?? ""),
    bodyText: String(r.bodyText ?? ""),
    bodyParamCount: typeof r.bodyParamCount === "number" ? r.bodyParamCount : 0,
    headerType: String(r.headerType ?? "NONE"),
    hasOptOutButton: r.hasOptOutButton === true,
    syncedAt: r.syncedAt instanceof Date ? r.syncedAt.toISOString() : null,
  }))
}

export type PreviewResult =
  | { ok: true; header: string | null; body: string; footer: string | null; buttons: string[] }
  | { ok: false; error: "param_count"; expected: number; got: number }

/** Renders a template row (or a Graph template) with positional params. */
export function renderTemplatePreview(
  template: { components?: unknown; bodyText?: string; bodyParamCount?: number },
  params: readonly string[],
): PreviewResult {
  const components = Array.isArray(template.components) ? template.components.filter(isObj) : []
  const byType = (t: string) => components.find(c => String(c.type).toUpperCase() === t) ?? null
  const bodyText = template.bodyText ?? str(byType("BODY")?.text) ?? ""
  const expected = typeof template.bodyParamCount === "number" ? template.bodyParamCount : positionalParamCount(bodyText)
  if (params.length !== expected) return { ok: false, error: "param_count", expected, got: params.length }
  const fill = (s: string) => s.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => params[Number(n) - 1] ?? m)
  const header = byType("HEADER")
  const footer = byType("FOOTER")
  const buttons = byType("BUTTONS")
  return {
    ok: true,
    header: header && String(header.format ?? "TEXT").toUpperCase() === "TEXT" ? str(header.text) : header ? `[${String(header.format).toUpperCase()}]` : null,
    body: fill(bodyText),
    footer: str(footer?.text),
    buttons: Array.isArray(buttons?.buttons) ? buttons.buttons.filter(isObj).map(b => String(b.text ?? "")) : [],
  }
}
