/**
 * THE send gate (DATA_MODEL §4, §1.9–1.11, §6 layer 2; ADR §14). Every Graph send passes here:
 * `checkSend()` returns a one-shot `SendPass`, and lib/crm/outbound/graph.ts refuses to call Meta
 * without a live pass whose approved payload equals exactly what it is about to send.
 *
 * Rules, in order (first failure wins):
 *  1. note-hash tripwire — sha256 of the normalised body / caption / each template param vs the
 *     contact's crm_internal_notes `textHash` (projection {textHash:1} ONLY). Match → 422
 *     `matches_internal_note` + one audit row holding the note id, route and kind (never text).
 *  2. contact exists; a send number resolves from the allow-list (conversation's own number when
 *     allow-listed, else the single allow-listed id; several and no conversation → refuse).
 *  3. number not paused (`crm_wa_numbers.sendingPaused`, set by Meta 131048 / 368).
 *  4. opted out (`crm_optouts` by E.164, or the contact mirror) → refuse templates and every
 *     broadcast / automation / staff_push send. Allowed (DATA_MODEL §1.11 "free-form replies inside a
 *     customer-opened 24h window are still allowed"): staff / quotation session text or media, and
 *     the STOP confirmation session text (purpose `optout_confirmation`). Rule 6 still enforces the window.
 *  5. notOnWhatsApp (131026) → refuse, unless the customer has written to us since.
 *  6. 24h window: free-form (session text/media) only while now < lastInboundAt + 24h − 10 min.
 *  7. templates: the (name, language) row in crm_wa_templates must be APPROVED (unknown, PAUSED,
 *     PENDING, REJECTED, DISABLED refused), positional, with exactly bodyParamCount params; a
 *     media header needs the caller to supply it.
 *  8. tier cap: a template outside the window (business-initiated) needs room in the rolling-24h
 *     unique-recipient ledger (broadcasts keep the safety margin free).
 *
 * This module never imports lib/crm/notes; it is the one sanctioned reader of note HASHES.
 */
import { createHash, randomUUID } from "node:crypto"
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction, type AuditActor } from "../audit"
import { COLL, CRM_DEFAULTS, type OutboundText, type PhoneE164 } from "../model"
import { checkTierCap } from "./ledger"

// ─────────────────────────────────────────────────────────────────────────────
// Hashing (must equal lib/crm/notes normaliseForHash/noteTextHash — parity is unit-tested)
// ─────────────────────────────────────────────────────────────────────────────

export function normaliseOutboundForHash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

export function outboundTextHash(text: string): string {
  return createHash("sha256").update(normaliseOutboundForHash(text), "utf8").digest("hex")
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SendKind = "session_text" | "session_media" | "template"
/** Who is sending. Broadcasts may not use the tier-cap safety margin. */
export type SendPurpose = "staff" | "quotation" | "staff_push" | "automation" | "broadcast" | "optout_confirmation"

/** What an opted-out contact may still receive (rule 4): a human's free-form reply, never a template or bulk/automated send. */
function optOutAllows(purpose: SendPurpose, kind: SendKind): boolean {
  if (purpose === "optout_confirmation") return kind === "session_text"
  return (purpose === "staff" || purpose === "quotation") && (kind === "session_text" || kind === "session_media")
}

export interface GateInput {
  contact: ObjectId | { _id: ObjectId }
  kind: SendKind
  conversationId?: ObjectId | null
  text?: OutboundText | null
  caption?: OutboundText | null
  templateName?: string | null
  language?: string | null
  params?: readonly OutboundText[]
  /** Template header media is supplied by the caller (quotation PDF, step 6). */
  headerMedia?: boolean
  purpose?: SendPurpose
  /** Route / caller label for the tripwire audit row. */
  route?: string
}

export interface GateContext {
  /** CRM_WA_PHONE_NUMBER_IDS (trimmed). */
  allowList: readonly string[]
  now?: Date
  actor?: AuditActor
  requestId?: string
}

export type GateDenyReason =
  | "matches_internal_note"
  | "contact_not_found"
  | "conversation_not_found"
  | "no_sender_number"
  | "sender_ambiguous"
  | "sender_not_allow_listed"
  | "sending_paused"
  | "opted_out"
  | "not_on_whatsapp"
  | "window_closed"
  | "empty_message"
  | "template_required"
  | "template_unknown"
  | "template_paused"
  | "template_not_approved"
  | "template_named_params_unsupported"
  | "template_param_count"
  | "template_needs_header"
  | "tier_cap"

const DENY_STATUS: Record<GateDenyReason, number> = {
  matches_internal_note: 422,
  contact_not_found: 404,
  conversation_not_found: 404,
  no_sender_number: 503,
  sender_ambiguous: 503,
  sender_not_allow_listed: 409,
  sending_paused: 409,
  opted_out: 409,
  not_on_whatsapp: 409,
  window_closed: 409,
  empty_message: 400,
  template_required: 400,
  template_unknown: 422,
  template_paused: 422,
  template_not_approved: 422,
  template_named_params_unsupported: 422,
  template_param_count: 422,
  template_needs_header: 422,
  tier_cap: 429,
}

export interface ApprovedPayload {
  kind: SendKind
  text: OutboundText | null
  caption: OutboundText | null
  templateName: string | null
  language: string | null
  params: OutboundText[]
}

export interface PassData {
  contactId: ObjectId
  conversationId: ObjectId | null
  phoneNumberId: string
  /** wa_id (E.164 digits without "+"): the Graph `to`. */
  to: string
  recipient: PhoneE164
  businessInitiated: boolean
  windowOpenUntil: Date | null
  template: { name: string; language: string; bodyParamCount: number; headerType: string; category: string | null } | null
  approved: ApprovedPayload
  issuedAt: Date
}

/** Opaque, frozen, one-shot. The data lives in a module-private WeakMap, not on the object. */
export interface SendPass {
  readonly passId: string
}

export type GateResult =
  | ({ ok: true; pass: SendPass } & Omit<PassData, "approved" | "issuedAt">)
  | { ok: false; reason: GateDenyReason; status: number; detail?: Record<string, string | number | boolean | null> }

/** Pass registry. `realMs` is wall-clock (Date.now), independent of the injectable test clock. */
const ISSUED = new WeakMap<SendPass, { data: PassData; realMs: number }>()
export const PASS_TTL_MS = 2 * 60 * 1000

function issue(data: PassData): SendPass {
  const pass: SendPass = Object.freeze({ passId: randomUUID() })
  ISSUED.set(pass, { data, realMs: Date.now() })
  return pass
}

export class GatePassError extends Error {
  readonly code: "invalid_pass" | "pass_expired" | "payload_mismatch"
  constructor(code: GatePassError["code"]) {
    super(`send gate pass rejected: ${code}`)
    this.name = "GatePassError"
    this.code = code
  }
}

/** graph.ts only: returns the pass data once and invalidates the pass. Throws GatePassError. */
export function consumePass(pass: SendPass): PassData {
  const entry = pass && typeof pass === "object" ? ISSUED.get(pass) : undefined
  if (!entry) throw new GatePassError("invalid_pass")
  ISSUED.delete(pass)
  if (Date.now() - entry.realMs > PASS_TTL_MS) throw new GatePassError("pass_expired")
  return entry.data
}

/** Read-only view (send.ts builds its rows from it) without consuming. */
export function peekPass(pass: SendPass): PassData | null {
  return (pass && typeof pass === "object" ? ISSUED.get(pass)?.data : undefined) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const deny = (reason: GateDenyReason, detail?: Record<string, string | number | boolean | null>): GateResult => ({
  ok: false,
  reason,
  status: DENY_STATUS[reason],
  ...(detail ? { detail } : {}),
})

export function windowOpenUntilOf(lastInboundAt: unknown): Date | null {
  return lastInboundAt instanceof Date ? new Date(lastInboundAt.getTime() + CRM_DEFAULTS.customerServiceWindowMs) : null
}

/** Free-form allowed iff now < windowOpenUntil − 10 min (DATA_MODEL §4). */
export function isSessionOpen(lastInboundAt: unknown, now: Date): boolean {
  const until = windowOpenUntilOf(lastInboundAt)
  return !!until && now.getTime() < until.getTime() - CRM_DEFAULTS.windowSafetyMarginMs
}

/** Sender number: the conversation's own (if allow-listed), else the single allow-listed id. */
export function resolveSendNumber(
  allowList: readonly string[],
  conversationPnid: string | null,
): { ok: true; phoneNumberId: string } | { ok: false; reason: "no_sender_number" | "sender_ambiguous" | "sender_not_allow_listed" } {
  const list = Array.from(new Set(allowList.map(s => s.trim()).filter(Boolean)))
  if (conversationPnid) return list.includes(conversationPnid) ? { ok: true, phoneNumberId: conversationPnid } : { ok: false, reason: "sender_not_allow_listed" }
  if (list.length === 0) return { ok: false, reason: "no_sender_number" }
  if (list.length > 1) return { ok: false, reason: "sender_ambiguous" }
  return { ok: true, phoneNumberId: list[0] }
}

/**
 * The one sanctioned read of note hashes (DATA_MODEL §6): id of a note of `contactId` whose
 * normalised text equals any of `texts`, else null. Also used for quotation text (lib/crm/quotes),
 * because a quotation PDF is outbound content too.
 */
export async function findInternalNoteMatch(crm: CrmDb, contactId: ObjectId, texts: readonly string[]): Promise<string | null> {
  const nonEmpty = texts.filter(t => typeof t === "string" && t.trim() !== "")
  if (nonEmpty.length === 0) return null
  const hashes = Array.from(new Set(nonEmpty.map(outboundTextHash)))
  // Projection {textHash:1} only (plus the implicit _id, kept for the audit row). Soft-deleted notes
  // are matched too: deleting a note must not make its text sendable.
  const hit = await crm.collection(COLL.internalNotes).findOne({ contactId, textHash: { $in: hashes } }, { projection: { textHash: 1 } })
  return hit ? String(hit._id) : null
}

async function noteTripwire(crm: CrmDb, contactId: ObjectId, input: GateInput, ctx: GateContext): Promise<GateResult | null> {
  const texts = [input.text, input.caption, ...(input.params ?? [])].filter((t): t is OutboundText => typeof t === "string" && t.trim() !== "")
  const noteId = await findInternalNoteMatch(crm, contactId, texts)
  if (!noteId) return null
  await logCrmAction(crm, ctx.actor ?? { system: "send_gate" }, "outbound.blocked_internal_note", { type: "contact", id: contactId.toHexString() }, {
    after: {
      noteId,
      route: input.route ?? null,
      kind: input.kind,
      purpose: input.purpose ?? "staff",
      requestId: ctx.requestId ?? null,
    },
  })
  return deny("matches_internal_note")
}

// ─────────────────────────────────────────────────────────────────────────────
// checkSend
// ─────────────────────────────────────────────────────────────────────────────

export async function checkSend(crm: CrmDb, input: GateInput, ctx: GateContext): Promise<GateResult> {
  const now = ctx.now ?? new Date()
  const contactId = input.contact instanceof ObjectId ? input.contact : input.contact._id
  const purpose: SendPurpose = input.purpose ?? "staff"

  // 1. tripwire first, so every attempt carrying note text is audited whatever else is wrong.
  const trip = await noteTripwire(crm, contactId, input, ctx)
  if (trip) return trip

  if (input.kind === "session_text" && !input.text) return deny("empty_message")

  // 2. contact + conversation + sender number
  const contact = await crm.collection(COLL.contacts).findOne(
    { _id: contactId },
    { projection: { phoneE164: 1, waId: 1, notOnWhatsApp: 1, marketingOptOut: 1, mergedInto: 1 } },
  )
  if (!contact || typeof contact.phoneE164 !== "string" || typeof contact.waId !== "string") return deny("contact_not_found")

  let conv: Document | null = null
  if (input.conversationId) {
    conv = await crm.collection(COLL.conversations).findOne(
      { _id: input.conversationId, contactId },
      { projection: { phoneNumberId: 1, lastInboundAt: 1 } },
    )
    if (!conv) return deny("conversation_not_found")
  }
  const sender = resolveSendNumber(ctx.allowList, conv ? String(conv.phoneNumberId) : null)
  if (!sender.ok) return deny(sender.reason)
  const phoneNumberId = sender.phoneNumberId
  if (!conv) {
    conv = await crm.collection(COLL.conversations).findOne({ contactId, phoneNumberId }, { projection: { phoneNumberId: 1, lastInboundAt: 1 } })
  }
  const lastInboundAt: Date | null = conv?.lastInboundAt instanceof Date ? conv.lastInboundAt : null

  // 3. number paused
  const num = await crm.collection(COLL.waNumbers).findOne({ phoneNumberId }, { projection: { sendingPaused: 1 } })
  const paused = num?.sendingPaused
  if (paused && (!(paused.until instanceof Date) || paused.until > now)) return deny("sending_paused", { reason: typeof paused.reason === "string" ? paused.reason : null })

  // 4. opt-out
  const optOut = await crm.collection(COLL.optOuts).findOne({ phoneE164: contact.phoneE164 }, { projection: { _id: 1 } })
  if ((optOut || contact.marketingOptOut) && !optOutAllows(purpose, input.kind)) return deny("opted_out")

  // 5. not on WhatsApp (131026), unless they have written to us since it was set
  if (contact.notOnWhatsApp instanceof Date && !(lastInboundAt && lastInboundAt > contact.notOnWhatsApp)) return deny("not_on_whatsapp")

  // 6. window
  const windowOpenUntil = windowOpenUntilOf(lastInboundAt)
  const sessionOpen = isSessionOpen(lastInboundAt, now)
  if ((input.kind === "session_text" || input.kind === "session_media") && !sessionOpen) {
    return deny("window_closed", { windowOpenUntil: windowOpenUntil ? windowOpenUntil.toISOString() : null })
  }

  // 7. template
  let template: PassData["template"] = null
  if (input.kind === "template") {
    const name = (input.templateName ?? "").trim()
    const language = (input.language ?? "").trim()
    if (!name || !language) return deny("template_required")
    const t = await crm.collection(COLL.waTemplates).findOne(
      { name, language },
      { projection: { status: 1, bodyParamCount: 1, headerType: 1, headerParamCount: 1, parameterFormat: 1, category: 1 } },
    )
    if (!t) return deny("template_unknown")
    if (t.status === "PAUSED") return deny("template_paused")
    if (t.status !== "APPROVED") return deny("template_not_approved", { status: String(t.status ?? "") })
    if (t.parameterFormat === "NAMED") return deny("template_named_params_unsupported")
    const expected = typeof t.bodyParamCount === "number" ? t.bodyParamCount : 0
    const got = (input.params ?? []).length
    if (got !== expected) return deny("template_param_count", { expected, got })
    const headerType = typeof t.headerType === "string" ? t.headerType : "NONE"
    if (["IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(headerType) && !input.headerMedia) return deny("template_needs_header", { headerType })
    // Text-header variables are not supported by any send path yet.
    if (typeof t.headerParamCount === "number" && t.headerParamCount > 0) return deny("template_needs_header", { headerType })
    template = { name, language, bodyParamCount: expected, headerType, category: typeof t.category === "string" ? t.category : null }
  }

  // 8. tier cap for business-initiated sends (template while the window is closed)
  const businessInitiated = input.kind === "template" && !sessionOpen
  if (businessInitiated) {
    const cap = await checkTierCap(crm, phoneNumberId, contact.phoneE164 as PhoneE164, now, { useMargin: purpose !== "broadcast" })
    if (!cap.ok) return deny("tier_cap", { used: cap.used, limit: cap.limit, retryAfter: cap.retryAfter ? cap.retryAfter.toISOString() : null })
  }

  const data: PassData = {
    contactId,
    conversationId: conv?._id instanceof ObjectId ? conv._id : null,
    phoneNumberId,
    to: contact.waId,
    recipient: contact.phoneE164 as PhoneE164,
    businessInitiated,
    windowOpenUntil,
    template,
    approved: {
      kind: input.kind,
      text: input.text ?? null,
      caption: input.caption ?? null,
      templateName: template?.name ?? null,
      language: template?.language ?? null,
      params: [...(input.params ?? [])],
    },
    issuedAt: now,
  }
  const { approved: _a, issuedAt: _i, ...info } = data
  return { ok: true, pass: issue(data), ...info }
}
