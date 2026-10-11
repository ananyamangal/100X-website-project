/**
 * Website form → CRM lead (DATA_MODEL §1.3, §1.20, §3 "New-deal rules", §7, §8 "Website"; ADR §15).
 *
 * `captureWebsiteSubmission()` maps one stored `submissions` row onto `captureLead()` (channel
 * `website`). It is idempotent per submission through the `crm_attribution` claim row
 * (`u_submission`):
 *   1. insert the claim `{submissionId, dealId:null, completedAt:null}`; E11000 = already ingested
 *      (completedAt set) or in progress (claim younger than 5 min). An older open claim is taken over
 *      with a conditional update, so exactly one retry completes it;
 *   2. capture the lead (create/attach the deal) and merge productInterest + intent into the deal;
 *   3. complete the claim: contactId, dealId (unless another row already owns that deal, u_deal),
 *      completedAt.
 * A submission without a usable phone still gets a completed claim with `skipReason`, so it is
 * recorded and never retried.
 *
 * `CRM_GROWTH_OS_SYNC` on: gclid/gbraid/wbraid, utm_*, landingPage and the form page are copied
 * into the claim row (sales-invisible). Off: the claim row only, no click ids, UTM or pages.
 *
 * Sales-visible output (contact, deal, activity) never carries the submission id, `attribution` or
 * `form_page_url`: the `web_form` activity is built from WEB_FORM_ACTIVITY_FIELDS only.
 *
 * Never imports lib/growth-os/* (ADR §15).
 */
import { randomUUID } from "node:crypto"
import { ObjectId, type Document } from "mongodb"
import { captureLead, isDuplicateKeyError, type DealOutcome } from "./capture"
import { crmDb, CrmWorkspaceViolation, type CrmDb } from "./db"
import { readCrmEnv, type CrmEnv } from "./env"
import {
  COLL,
  DEFAULT_WORKSPACE,
  WEB_FORM_ACTIVITY_FIELDS,
  type AttributionRecord,
  type ContactId,
  type DealId,
  type PhoneE164,
  type PhoneKind,
  type ProductInterest,
  type WaId,
  type WebFormActivityData,
} from "./model"
import { fromHumanInput } from "./phone"

/** A stored `submissions` row (any of the website forms). Only `_id` is required. */
export type WebsiteSubmission = Record<string, unknown> & { _id?: unknown }

export const WEBSITE_ACTOR = { system: "website" } as const
/** An open claim older than this is considered crashed and may be taken over by a retry. */
export const CLAIM_STALE_MS = 5 * 60_000

const MESSAGE_MAX = 2000
const FIELD_MAX = 200

/** Submission types that are a request for a quotation by definition. */
const QUOTE_TYPES: ReadonlySet<string> = new Set(["rfq", "sticky_quote_request"])
/** Submission types that are a dealer enquiry by definition. */
const DEALER_TYPES: ReadonlySet<string> = new Set(["dealer_application"])

// ─────────────────────────────────────────────────────────────────────────────
// Pure mapping (exported for tests and the backfill script)
// ─────────────────────────────────────────────────────────────────────────────

const str = (v: unknown, max = FIELD_MAX): string | undefined => {
  if (typeof v !== "string") return undefined
  const s = v.trim()
  if (s === "") return undefined
  return s.length > max ? s.slice(0, max) : s
}
const firstStr = (sub: WebsiteSubmission, keys: readonly string[], max = FIELD_MAX): string | undefined => {
  for (const k of keys) {
    const v = str(sub[k], max)
    if (v !== undefined) return v
  }
  return undefined
}
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined)

/** Hex string of the submission `_id` (ObjectId or 24-hex string); null when absent/invalid. */
export function submissionIdOf(sub: WebsiteSubmission): string | null {
  const id = sub._id
  if (id instanceof ObjectId) return id.toHexString()
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id.trim())) return id.trim().toLowerCase()
  if (id && typeof id === "object" && typeof (id as { toHexString?: unknown }).toHexString === "function") {
    const h = (id as { toHexString(): string }).toHexString()
    return /^[a-f0-9]{24}$/i.test(h) ? h.toLowerCase() : null
  }
  return null
}

/**
 * The `web_form` activity data: ONLY WEB_FORM_ACTIVITY_FIELDS keys. Values come from the same-named
 * field or a known form alias (organization → company, product → productName,
 * requirement/description → message, dealerInquiry → wantsDealer). Nothing else is copied.
 */
export function webFormActivityData(sub: WebsiteSubmission): WebFormActivityData {
  const src: Record<(typeof WEB_FORM_ACTIVITY_FIELDS)[number], string | boolean | undefined> = {
    type: str(sub.type),
    productName: firstStr(sub, ["productName", "product"]),
    subject: str(sub.subject),
    message: firstStr(sub, ["message", "requirement", "description"], MESSAGE_MAX),
    company: firstStr(sub, ["company", "organization"]),
    state: str(sub.state),
    email: str(sub.email),
    intent: str(sub.intent),
    wantsQuote: bool(sub.wantsQuote),
    wantsDealer: bool(sub.wantsDealer) ?? bool(sub.dealerInquiry),
  }
  const out: WebFormActivityData = {}
  for (const k of WEB_FORM_ACTIVITY_FIELDS) {
    const v = src[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

/** First positive integer in `quantity` ("10", "10 units", 10); null otherwise. */
export function parseQuantity(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) && v > 0 && v < 1_000_000 ? v : null
  if (typeof v !== "string") return null
  const m = /\d+/.exec(v.replace(/,/g, ""))
  if (!m) return null
  const n = Number(m[0])
  return n > 0 && n < 1_000_000 ? n : null
}

export interface WebsiteAttributionFields {
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm: AttributionRecord["utm"]
  landingPage: string | null
  formPage: string | null
}

export const EMPTY_ATTRIBUTION: Readonly<WebsiteAttributionFields> = Object.freeze({
  gclid: null,
  gbraid: null,
  wbraid: null,
  utm: Object.freeze({}),
  landingPage: null,
  formPage: null,
})

/** Click ids / UTM / pages from `submissions.attribution` (already whitelisted by sanitizeAttribution). */
export function attributionFields(sub: WebsiteSubmission): WebsiteAttributionFields {
  const a = sub.attribution && typeof sub.attribution === "object" && !Array.isArray(sub.attribution)
    ? (sub.attribution as Record<string, unknown>)
    : {}
  const utm: AttributionRecord["utm"] = {}
  for (const k of ["source", "medium", "campaign", "term", "content"] as const) {
    const v = str(a[`utm_${k}`], 300)
    if (v !== undefined) utm[k] = v
  }
  return {
    gclid: str(a.gclid, 300) ?? null,
    gbraid: str(a.gbraid, 300) ?? null,
    wbraid: str(a.wbraid, 300) ?? null,
    utm,
    landingPage: str(a.landingPage, 1000) ?? null,
    formPage: firstStr(sub, ["form_page_url", "form_page_path"], 1000) ?? null,
  }
}

export type MappedWebsiteLead =
  | { ok: false; reason: "no_phone" | "invalid_phone" }
  | {
      ok: true
      phone: { phoneE164: PhoneE164; waId: WaId; phoneKind: PhoneKind }
      profile: { name?: string; company?: string; email?: string; state?: string; city?: string }
      productInterest: ProductInterest | null
      intent: { wantsQuote: boolean; wantsDealer: boolean } | null
      activity: { summary: string; data: WebFormActivityData }
    }

/** Maps a submission to captureLead input parts. No I/O. */
export function mapWebsiteSubmission(sub: WebsiteSubmission): MappedWebsiteLead {
  // Forms use either `mobile` (partner/dealer/landing) or `phone` (contact/quote/RFQ).
  const rawPhone = firstStr(sub, ["mobile", "phone"], 64)
  const phone = fromHumanInput(rawPhone)
  if (!phone.ok) return { ok: false, reason: phone.reason === "empty" ? "no_phone" : "invalid_phone" }

  const data = webFormActivityData(sub)
  const type = typeof data.type === "string" ? data.type : undefined

  const productName = typeof data.productName === "string" ? data.productName : undefined
  const productInterest: ProductInterest | null = productName
    ? { productSlug: null, label: productName, qty: parseQuantity(sub.quantity) }
    : null

  const explicitQuote = bool(sub.wantsQuote)
  const explicitDealer = bool(sub.wantsDealer) ?? bool(sub.dealerInquiry)
  const wantsQuote = explicitQuote === true || (type !== undefined && QUOTE_TYPES.has(type))
  const wantsDealer = explicitDealer === true || (type !== undefined && DEALER_TYPES.has(type))
  const intent =
    wantsQuote || wantsDealer || explicitQuote !== undefined || explicitDealer !== undefined ? { wantsQuote, wantsDealer } : null

  const label = type ? type.replace(/_/g, " ") : "enquiry"
  const summary = `Website form (${label})${productName ? `: ${productName}` : ""}`

  return {
    ok: true,
    phone: { phoneE164: phone.phoneE164, waId: phone.waId, phoneKind: phone.phoneKind },
    profile: {
      name: str(sub.name),
      company: typeof data.company === "string" ? data.company : undefined,
      email: typeof data.email === "string" ? data.email : undefined,
      state: typeof data.state === "string" ? data.state : undefined,
      city: firstStr(sub, ["city", "cityState", "location"]),
    },
    productInterest,
    intent,
    activity: { summary, data },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingest
// ─────────────────────────────────────────────────────────────────────────────

export type WebsiteIngestResult =
  | { status: "captured"; submissionId: string; contactId: ContactId; dealId: DealId | null; dealOutcome: DealOutcome; contactCreated: boolean; attributionWritten: boolean }
  | { status: "skipped"; submissionId: string; reason: "no_phone" | "invalid_phone" }
  | { status: "duplicate"; submissionId: string }
  | { status: "in_progress"; submissionId: string }
  | { status: "invalid"; reason: "no_submission_id" }

const attributionSet = (fields: WebsiteAttributionFields): Document => ({
  gclid: fields.gclid,
  gbraid: fields.gbraid,
  wbraid: fields.wbraid,
  utm: { ...fields.utm },
  landingPage: fields.landingPage,
  formPage: fields.formPage,
})

/** Merges the form's product interest (new label only) and intent (OR) into the deal. */
async function mergeDealInterest(crm: CrmDb, dealId: string, lead: Extract<MappedWebsiteLead, { ok: true }>, now: Date): Promise<void> {
  if (!lead.productInterest && !lead.intent) return
  const deals = crm.collection(COLL.deals)
  const _id = new ObjectId(dealId)
  const deal = await deals.findOne({ _id }, { projection: { productInterest: 1, intent: 1 } })
  if (!deal) return
  const update: Document = {}
  const $set: Document = {}
  if (lead.productInterest) {
    const label = lead.productInterest.label.toLowerCase()
    const list: unknown[] = Array.isArray(deal.productInterest) ? deal.productInterest : []
    const known = list.some(p => p && typeof p === "object" && String((p as { label?: unknown }).label ?? "").toLowerCase() === label)
    if (!known) update.$push = { productInterest: lead.productInterest }
  }
  if (lead.intent) {
    const cur = deal.intent && typeof deal.intent === "object" ? (deal.intent as { wantsQuote?: unknown; wantsDealer?: unknown }) : null
    const next = {
      wantsQuote: cur?.wantsQuote === true || lead.intent.wantsQuote,
      wantsDealer: cur?.wantsDealer === true || lead.intent.wantsDealer,
    }
    if (!cur || cur.wantsQuote !== next.wantsQuote || cur.wantsDealer !== next.wantsDealer) $set.intent = next
  }
  if (!update.$push && !$set.intent) return
  $set.updatedAt = now
  update.$set = $set
  await deals.updateOne({ _id }, update)
}

/**
 * Ingests one stored website submission into the CRM. Idempotent per submission id.
 * `env.growthSync` decides whether click ids / UTM / pages are copied into the claim row.
 */
export async function captureWebsiteSubmission(
  crm: CrmDb,
  submission: WebsiteSubmission,
  env: Pick<CrmEnv, "growthSync">,
  opts: { now?: Date } = {},
): Promise<WebsiteIngestResult> {
  const submissionId = submissionIdOf(submission)
  if (!submissionId) return { status: "invalid", reason: "no_submission_id" }
  const now = opts.now ?? new Date()
  const attribution = crm.collection(COLL.attribution)
  const fields = env.growthSync ? attributionFields(submission) : EMPTY_ATTRIBUTION

  // 1. Claim.
  const claimId = new ObjectId()
  let claimOid: ObjectId = claimId
  try {
    await attribution.insertOne({
      _id: claimId,
      submissionId,
      dealId: null,
      contactId: null,
      ...attributionSet(fields),
      completedAt: null,
      skipReason: null,
      capturedAt: now,
    })
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e
    const existing = await attribution.findOne({ submissionId }, { projection: { _id: 1, completedAt: 1, capturedAt: 1 } })
    if (!existing) throw e
    if (existing.completedAt) return { status: "duplicate", submissionId }
    const at = existing.capturedAt instanceof Date ? existing.capturedAt : null
    if (at && now.getTime() - at.getTime() < CLAIM_STALE_MS) return { status: "in_progress", submissionId }
    // Take over a crashed claim: exactly one retry wins this conditional update.
    const res = await attribution.updateOne(
      { _id: existing._id, completedAt: null, capturedAt: at },
      { $set: { ...attributionSet(fields), capturedAt: now } },
    )
    if (res.modifiedCount !== 1) return { status: "in_progress", submissionId }
    claimOid = existing._id as ObjectId
  }

  // No usable phone: record why, complete the claim, never retry.
  const lead = mapWebsiteSubmission(submission)
  if (!lead.ok) {
    await attribution.updateOne({ _id: claimOid }, { $set: { completedAt: now, skipReason: lead.reason } })
    return { status: "skipped", submissionId, reason: lead.reason }
  }

  // 2. Lead + deal.
  const capture = await captureLead(crm, {
    channel: "website",
    phone: lead.phone,
    profile: lead.profile,
    createdBy: WEBSITE_ACTOR,
    dealPolicy: "always",
    activity: { kind: "web_form", summary: lead.activity.summary, data: { ...lead.activity.data } },
    now,
  })
  if (capture.dealId) await mergeDealInterest(crm, capture.dealId, lead, now)

  // 3. Complete the claim. u_deal allows one attribution row per deal: when this form attached to
  // a deal another row already owns, the claim keeps dealId null (contactId still links it).
  const contactOid = new ObjectId(capture.contactId)
  const dealOid = capture.dealId ? new ObjectId(capture.dealId) : null
  try {
    await attribution.updateOne({ _id: claimOid }, { $set: { contactId: contactOid, dealId: dealOid, completedAt: now } })
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e
    await attribution.updateOne({ _id: claimOid }, { $set: { contactId: contactOid, completedAt: now } })
  }

  const attributionWritten = env.growthSync && (fields.gclid !== null || fields.gbraid !== null || fields.wbraid !== null || Object.keys(fields.utm).length > 0 || fields.landingPage !== null || fields.formPage !== null)
  return {
    status: "captured",
    submissionId,
    contactId: capture.contactId,
    dealId: capture.dealId,
    dealOutcome: capture.dealOutcome,
    contactCreated: capture.contactCreated,
    attributionWritten,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route entry point (app/api/submissions POST, inside after())
// ─────────────────────────────────────────────────────────────────────────────

type LogFields = Record<string, string | number | boolean | null | undefined>
const logLine = (level: string, requestId: string, msg: string, fields: LogFields) =>
  JSON.stringify({ scope: "crm.web", level, requestId, msg, ...fields })

/** Error class/code only: driver messages can echo document values (e.g. an E11000 dup key = a phone). */
function errorShape(e: unknown): LogFields {
  if (e instanceof CrmWorkspaceViolation) return { error: e.name, kind: e.kind }
  if (e && typeof e === "object") {
    const o = e as { name?: unknown; code?: unknown }
    return { error: typeof o.name === "string" ? o.name : "Error", code: typeof o.code === "number" || typeof o.code === "string" ? o.code : undefined }
  }
  return { error: typeof e }
}

/**
 * Called from the submissions route after the response is sent. NEVER throws and never logs lead
 * data: one JSON line with the request id, the submission id and the outcome.
 * Returns immediately, silently, unless CRM_WEBSITE_INGEST is on (kill switch, default off).
 * Skips (one info line) when the CRM env is not configured or the prod-DB guard refuses.
 */
export async function ingestWebsiteSubmissionSafely(submission: WebsiteSubmission, requestId?: string | null): Promise<void> {
  // Kill switch (CRM_WEBSITE_INGEST, default off): no DB import, no log, nothing.
  try {
    if (!readCrmEnv().websiteIngest) return
  } catch {
    return
  }
  const rid = (typeof requestId === "string" && requestId.trim()) || randomUUID()
  const submissionId = submissionIdOf(submission) ?? "(none)"
  try {
    const env = readCrmEnv()
    // Same precondition as the guard in crmDb(), checked before any DB client is touched.
    if (env.vercelEnv !== "production" && !env.prodDbName) {
      console.log(logLine("info", rid, "crm website ingest skipped: CRM env not configured", { submissionId }))
      return
    }
    let crm: CrmDb
    try {
      crm = await crmDb(DEFAULT_WORKSPACE)
    } catch (e) {
      if (e instanceof CrmWorkspaceViolation && e.kind === "db_guard") {
        console.log(logLine("info", rid, "crm website ingest skipped: CRM DB guard refused", { submissionId }))
        return
      }
      throw e
    }
    const r = await captureWebsiteSubmission(crm, submission, env)
    console.log(
      logLine("info", rid, "crm website ingest", {
        submissionId,
        status: r.status,
        reason: "reason" in r ? r.reason : undefined,
        dealOutcome: r.status === "captured" ? r.dealOutcome : undefined,
      }),
    )
  } catch (e) {
    try {
      console.error(logLine("error", rid, "crm website ingest failed", { submissionId, ...errorShape(e) }))
    } catch {
      /* logging must never throw out of after() */
    }
  }
}
