/**
 * Pipeline stage change (STEP 4c; DATA_MODEL §3, ADR §13).
 *
 * Transitions are permissive (any stage to any other). Guards: closed_won needs an invoice number
 * (text, from Busy) and an order value in paise; closed_lost needs a reason (enum, + text when
 * "other"). closed to open (reopen) is allowed only while the contact has no other open deal
 * (unique partial index u_open_per_contact; E11000 answers 409 other_open_deal) and clears won/lost
 * (the old values are kept in the stageHistory note).
 *
 * The deal write is ONE atomic updateOne with filter {_id, stage: <expected>} (optimistic
 * concurrency, 409 stage_conflict): stage, stageEnteredAt, isOpen, closedAt, won, lost and
 * $push stageHistory agree by construction, so no multi-document transaction is needed. The
 * follow-ups (stage_change activity, conversation.stage mirror, audit, closed_won conversion event) are
 * best-effort; a conversion failure never fails the stage change.
 * Audit rows carry ids, enums and numbers only (no PII).
 */
import type { ObjectId, Document } from "mongodb"
import type { CrmDb } from "../db"
import { isDuplicateKeyError } from "../capture"
import { recordConversionEvent } from "../conversions"
import { COLL, CLOSED_STAGES, LOST_REASONS, STAGES, STAGE_LABEL, type LostReason, type Stage } from "../model"
import { Checker, type FieldErrors } from "../validate"
import { can, userRefOf, type CrmActor, type LeadScope } from "../api/auth"
import { DEAL_DETAIL_FIELDS, dealVisible, toClient } from "./query"
import { logCrmAction } from "../audit"

const STAGE_SET: ReadonlyMap<string, Stage> = new Map(STAGES.map(s => [s as string, s]))
const REASON_SET: ReadonlyMap<string, LostReason> = new Map(LOST_REASONS.map(r => [r as string, r]))
const ALLOWED = new Set(["stage", "invoiceNumber", "orderValue", "lostReason", "lostReasonText"])
/** Largest accepted order value: 1e12 paise = Rs 10,000 crore. */
export const MAX_ORDER_PAISE = 1_000_000_000_000

export interface StageInput {
  stage: Stage
  invoiceNumber?: string
  /** Paise (integer). */
  orderValue?: number
  lostReason?: LostReason
  lostReasonText?: string | null
}

export type StageParse = { ok: true; input: StageInput } | { ok: false; error: string; fields: FieldErrors }

export function parseStageInput(body: Record<string, unknown>): StageParse {
  if (Object.hasOwn(body, "__proto__")) {
    // Checker.errors is a plain object, so an own "__proto__" field name needs defineProperty.
    return { ok: false, error: "validation", fields: Object.defineProperty({}, "__proto__", { value: "unknown_field", enumerable: true }) as FieldErrors }
  }
  const c = new Checker()
  for (const k of Object.keys(body)) if (!ALLOWED.has(k)) c.fail(k, "unknown_field")
  const stage = typeof body.stage === "string" ? STAGE_SET.get(body.stage) : undefined
  if (!stage) {
    c.fail("stage", body.stage === undefined ? "required" : "invalid_enum")
    return { ok: false, error: "validation", fields: c.errors }
  }
  const input: StageInput = { stage }
  const has = (k: string) => body[k] !== undefined && body[k] !== null && body[k] !== ""

  if (stage === "closed_won") {
    const inv = c.str(body, "invoiceNumber", 60, { required: true })
    if (inv !== null && !/^[A-Za-z0-9][A-Za-z0-9 ./\-_#]*$/.test(inv)) c.fail("invoiceNumber", "invalid_characters")
    else if (inv) input.invoiceNumber = inv
    const v = body.orderValue
    if (v === undefined || v === null || v === "") c.fail("orderValue", "required")
    else if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > MAX_ORDER_PAISE) c.fail("orderValue", "invalid_number")
    else input.orderValue = v
  } else {
    if (has("invoiceNumber")) c.fail("invoiceNumber", "only_for_closed_won")
    if (has("orderValue")) c.fail("orderValue", "only_for_closed_won")
  }

  if (stage === "closed_lost") {
    const r = typeof body.lostReason === "string" ? REASON_SET.get(body.lostReason) : undefined
    if (!r) c.fail("lostReason", has("lostReason") ? "invalid_enum" : "required")
    else input.lostReason = r
    const text = c.str(body, "lostReasonText", 500, { multiline: true })
    if (r === "other" && !text) c.fail("lostReasonText", "required")
    input.lostReasonText = text
  } else {
    if (has("lostReason")) c.fail("lostReason", "only_for_closed_lost")
    if (has("lostReasonText")) c.fail("lostReasonText", "only_for_closed_lost")
  }

  if (!c.ok) return { ok: false, error: "validation", fields: c.errors }
  return { ok: true, input }
}

export type StageResult =
  | { ok: true; deal: unknown; changed: true }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string; fields?: FieldErrors; required?: string[] }

export interface StageDeps {
  now?: Date
  ip?: string | null
  userAgent?: string | null
}

const isClosed = (s: unknown): boolean => (CLOSED_STAGES as readonly unknown[]).includes(s)

export async function changeStage(
  crm: CrmDb,
  actor: CrmActor,
  scope: LeadScope,
  dealId: ObjectId,
  input: StageInput,
  deps: StageDeps = {},
): Promise<StageResult> {
  if (!can(actor, "crm.leads.edit")) return { ok: false, status: 403, error: "forbidden", required: ["crm.leads.edit"] }
  const deals = crm.collection(COLL.deals)
  const deal = await deals.findOne({ _id: dealId })
  if (!deal || !(await dealVisible(crm, scope, deal))) return { ok: false, status: 404, error: "not_found" }

  const from = deal.stage as Stage
  const to = input.stage
  if (from === to) return { ok: false, status: 400, error: "validation", fields: { stage: "unchanged" } }
  // Entering or leaving a closed stage is a close/reopen: it needs crm.leads.close as well.
  if ((isClosed(to) || isClosed(from)) && !can(actor, "crm.leads.close")) {
    return { ok: false, status: 403, error: "forbidden", required: ["crm.leads.close"] }
  }

  const now = deps.now ?? new Date()
  const me = userRefOf(actor)
  const closing = isClosed(to)
  const won = to === "closed_won" ? { invoiceNumber: input.invoiceNumber as string, invoiceAmountText: null, orderValue: input.orderValue as number, wonAt: now } : null
  const lost = to === "closed_lost" ? { reason: input.lostReason as LostReason, text: input.lostReasonText ?? null, lostAt: now } : null

  // Old won/lost values travel in the history note when they are cleared (reopen or won<->lost).
  let note: string | undefined
  if (deal.won && !won) note = `cleared won: invoice ${String(deal.won.invoiceNumber)}, ${String(deal.won.orderValue)} paise`
  else if (deal.lost && !lost) note = `cleared lost: ${String(deal.lost.reason)}`
  const entry: Document = { from, to, at: now, by: me, ...(note ? { note: note.slice(0, 200) } : {}) }

  try {
    const update: Document = {
        $set: { stage: to, stageEnteredAt: now, isOpen: !closing, closedAt: closing ? now : null, won, lost, updatedAt: now },
        $push: { stageHistory: entry },
    }
    const res = await deals.updateOne({ _id: dealId, stage: from }, update)
    if (res.matchedCount !== 1) return { ok: false, status: 409, error: "stage_conflict" }
  } catch (e) {
    if (isDuplicateKeyError(e)) return { ok: false, status: 409, error: "other_open_deal" }
    throw e
  }

  const contactId = deal.contactId as ObjectId
  const dealHex = dealId.toHexString()
  const summary = `Stage: ${STAGE_LABEL[from] ?? from} to ${STAGE_LABEL[to]}`
  const fail = (msg: string, e: unknown) =>
    console.error(JSON.stringify({ scope: "crm.stage", level: "error", msg, dealId: dealHex, error: e instanceof Error ? e.name : "unknown" }))
  try {
    await crm.collection(COLL.activities).insertOne({
      contactId,
      dealId,
      kind: "stage_change",
      at: now,
      by: me,
      summary,
      data: { from, to, ...(input.lostReason ? { lostReason: input.lostReason } : {}), ...(input.orderValue ? { orderValue: input.orderValue } : {}) },
    })
  } catch (e) {
    fail("activity write failed", e)
  }
  // Inbox filter mirror = the contact's current open deal stage (null when none). Closed to closed changes nothing.
  if (!(isClosed(from) && isClosed(to))) {
    try {
      const open = await deals.findOne({ contactId, isOpen: true }, { projection: { stage: 1 } })
      await crm.collection(COLL.conversations).updateMany({ contactId }, { $set: { stage: open ? (open.stage as Stage) : null, updatedAt: now } })
    } catch (e) {
      fail("conversation mirror failed", e)
    }
  }

  await logCrmAction(
    crm,
    me,
    "deal.stage_change",
    { type: "deal", id: dealHex },
    {
      before: { stage: from },
      after: {
        stage: to,
        contactId: contactId.toHexString(),
        ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
        ...(input.orderValue ? { orderValuePaise: input.orderValue } : {}),
        ...(input.lostReason ? { lostReason: input.lostReason } : {}),
      },
      ip: deps.ip ?? null,
      userAgent: deps.userAgent ?? null,
    },
  )

  // Growth OS value-out (ADR §15), closed_won only; quotation_sent is recorded by the quotation module on actual send. Never fails the stage change.
  try {
    if (to === "closed_won") await recordConversionEvent(crm, { _id: dealId, contactId, won, lastQuotation: null }, "closed_won", undefined, { now })
  } catch (e) {
    console.error(JSON.stringify({ scope: "crm.stage", level: "error", msg: "conversion event failed", dealId: dealHex, error: e instanceof Error ? e.name : "unknown" }))
  }

  try {
    const fresh = await deals.findOne({ _id: dealId }, { projection: Object.fromEntries(DEAL_DETAIL_FIELDS.map(f => [f, 1])) })
    if (fresh) return { ok: true, deal: toClient(fresh), changed: true }
  } catch (e) {
    fail("re-read failed", e)
  }
  // The write succeeded: answer with the state we computed rather than a 500.
  const computed: Document = {
    ...deal,
    stage: to, stageEnteredAt: now, isOpen: !closing, closedAt: closing ? now : null, won, lost, updatedAt: now,
    stageHistory: [...(Array.isArray(deal.stageHistory) ? deal.stageHistory : []), entry],
  }
  return { ok: true, deal: toClient(Object.fromEntries(DEAL_DETAIL_FIELDS.map(f => [f, computed[f]]).filter(([, v]) => v !== undefined))), changed: true }
}

/** Position in the pipeline order (DATA_MODEL §3). Repeat Enquiry is an entry stage, level with New. */
export function stageRank(s: Stage): number {
  return s === "repeat_enquiry" ? STAGES.indexOf("new") : STAGES.indexOf(s)
}

/**
 * Automatic forward-only move (e.g. quotation sent → quotation_sent): moves an OPEN deal to `to`
 * only when it is earlier in the order; never backwards, never touches closed deals, needs no
 * user permission (the triggering action was already authorised). Same atomic write and
 * follow-ups as changeStage (history, activity, inbox mirror, audit). Returns whether it moved.
 */
export async function advanceStageForward(
  crm: CrmDb,
  dealId: ObjectId,
  to: Exclude<Stage, "closed_won" | "closed_lost">,
  by: { userId: string; name: string } | { system: string },
  now: Date,
  reason: string,
): Promise<boolean> {
  const deals = crm.collection(COLL.deals)
  const deal = await deals.findOne({ _id: dealId }, { projection: { stage: 1, isOpen: 1, contactId: 1 } })
  if (!deal || deal.isOpen !== true) return false
  const from = deal.stage as Stage
  if (from === to || stageRank(from) >= stageRank(to)) return false
  const entry: Document = { from, to, at: now, by, note: `auto: ${reason}`.slice(0, 200) }
  const update: Document = { $set: { stage: to, stageEnteredAt: now, updatedAt: now }, $push: { stageHistory: entry } }
  const res = await deals.updateOne({ _id: dealId, stage: from, isOpen: true }, update)
  if (res.modifiedCount !== 1) return false
  const contactId = deal.contactId as ObjectId
  try {
    await crm.collection(COLL.activities).insertOne({
      contactId, dealId, kind: "stage_change", at: now, by,
      summary: `Stage: ${STAGE_LABEL[from] ?? from} to ${STAGE_LABEL[to]} (${reason})`,
      data: { from, to, auto: true },
    })
    await crm.collection(COLL.conversations).updateMany({ contactId }, { $set: { stage: to, updatedAt: now } })
  } catch (e) {
    console.error(JSON.stringify({ scope: "crm.stage", level: "error", msg: "auto-advance follow-up failed", dealId: dealId.toHexString(), error: e instanceof Error ? e.name : "unknown" }))
  }
  await logCrmAction(crm, by, "deal.stage_change", { type: "deal", id: dealId.toHexString() }, { before: { stage: from }, after: { stage: to, auto: true, reason } })
  return true
}
