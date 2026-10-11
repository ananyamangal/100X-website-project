/**
 * Quotations (STEP 6; DATA_MODEL §1.12).
 *
 * Life cycle: draft → issued → superseded. Drafts are editable and discardable; issued and
 * superseded quotations are never edited or deleted (no route does it).
 *
 * - Issue (version 1): ONE transaction increments crm_counters "<ws>:quotation:<FY>" and flips the
 *   draft to issued with the number, so a number is never allocated without its quotation and
 *   never twice (gapless). A failure after commit (activity, PDF) never releases the number.
 * - Revise: copies an issued quotation into a draft with the same number and version + 1 (the
 *   unique {quoteNumber, version} index allows one draft revision at a time). Issuing the revision
 *   flips version n to superseded in the same transaction.
 * - Internal notes can never reach a customer: every PDF text (line model/description, terms) is
 *   checked against the contact's note hashes at create, update and issue (422 matches_internal_note).
 * - Lead scope: a quotation is visible iff its deal is (lib/crm/leads/query.ts dealVisible).
 * - Audit rows carry ids, numbers and counts only.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { isDuplicateKeyError } from "../capture"
import { COLL, type QuotationLine } from "../model"
import { userRefOf, type CrmActor, type LeadScope } from "../api/auth"
import { dealVisible, toClient } from "../leads/query"
import { findInternalNoteMatch } from "../outbound/gate"
import { computeLine, totalsOf } from "./money"
import { DEFAULT_TERMS, quoteTexts, type QuoteInput, type QuoteTerms } from "./input"
import { counterIdOf, fyOf, formatQuoteNumber, quoteLabel } from "./numbering"

export type QuoteError =
  | "not_found"
  | "deal_closed"
  | "not_draft"
  | "not_issued"
  | "not_latest"
  | "revision_exists"
  | "empty_quotation"
  | "matches_internal_note"
  | "conflict"

export type QuoteResult<T = Document> = { ok: true; quotation: T } | { ok: false; status: 400 | 404 | 409 | 422; error: QuoteError; detail?: Record<string, unknown> }

export interface QuoteDeps {
  now?: Date
  ip?: string | null
  userAgent?: string | null
  /** Called after a successful issue (best-effort; e.g. PDF render). Errors are swallowed. */
  afterIssue?: (quotation: Document, crm: CrmDb) => Promise<void>
}

const fail = (status: 400 | 404 | 409 | 422, error: QuoteError, detail?: Record<string, unknown>) => ({ ok: false as const, status, error, ...(detail ? { detail } : {}) })
const auditCtx = (d: QuoteDeps) => ({ ip: d.ip ?? null, userAgent: d.userAgent ?? null })

/** Client view: everything except internal bookkeeping; ObjectIds/Dates as strings. */
export function quotationView(q: Document): unknown {
  const v = toClient(q) as Record<string, unknown>
  return { ...v, label: quoteLabel((q.quoteNumber as string | null) ?? null, Number(q.version ?? 1)) }
}

async function visibleDeal(crm: CrmDb, scope: LeadScope, dealId: ObjectId): Promise<Document | null> {
  const deal = await crm.collection(COLL.deals).findOne({ _id: dealId }, { projection: { contactId: 1, isOpen: 1, stage: 1, assignedTo: 1, lastQuotation: 1 } })
  if (!deal || !(await dealVisible(crm, scope, deal))) return null
  return deal
}

async function loadVisible(crm: CrmDb, scope: LeadScope, id: ObjectId): Promise<{ q: Document; deal: Document } | null> {
  const q = await crm.collection(COLL.quotations).findOne({ _id: id })
  if (!q) return null
  const deal = await visibleDeal(crm, scope, q.dealId as ObjectId)
  return deal ? { q, deal } : null
}

async function noteBlock(crm: CrmDb, actor: CrmActor, contactId: ObjectId, lines: readonly QuotationLine[], terms: QuoteTerms, route: string): Promise<string | null> {
  const noteId = await findInternalNoteMatch(crm, contactId, quoteTexts(lines, terms))
  if (!noteId) return null
  await logCrmAction(crm, userRefOf(actor), "outbound.blocked_internal_note", { type: "contact", id: contactId.toHexString() }, {
    after: { noteId, route, kind: "quotation" },
  })
  return noteId
}

export async function listDealQuotations(crm: CrmDb, scope: LeadScope, dealId: ObjectId): Promise<Document[] | null> {
  const deal = await visibleDeal(crm, scope, dealId)
  if (!deal) return null
  return crm.collection(COLL.quotations).find({ dealId }, { sort: { createdAt: -1 }, limit: 100 }).toArray()
}

export async function getQuotation(crm: CrmDb, scope: LeadScope, id: ObjectId): Promise<Document | null> {
  const r = await loadVisible(crm, scope, id)
  return r ? r.q : null
}

export async function createDraft(crm: CrmDb, actor: CrmActor, scope: LeadScope, dealId: ObjectId, input: QuoteInput, deps: QuoteDeps = {}): Promise<QuoteResult> {
  const deal = await visibleDeal(crm, scope, dealId)
  if (!deal) return fail(404, "not_found")
  if (deal.isOpen === false) return fail(409, "deal_closed")
  const now = deps.now ?? new Date()
  const lines = (input.lines ?? []).map(computeLine)
  const terms = input.terms ?? DEFAULT_TERMS
  if (await noteBlock(crm, actor, deal.contactId as ObjectId, lines, terms, "quotations.create")) return fail(422, "matches_internal_note")
  const me = userRefOf(actor)
  const doc: Document = {
    _id: new ObjectId(),
    contactId: deal.contactId,
    dealId,
    status: "draft",
    quoteNumber: null,
    version: 1,
    revisionOf: null,
    lines,
    totals: totalsOf(lines),
    terms,
    pdf: null,
    sends: [],
    issuedAt: null,
    issuedBy: null,
    createdBy: me,
    createdAt: now,
    updatedAt: now,
  }
  await crm.collection(COLL.quotations).insertOne(doc)
  await logCrmAction(crm, me, "quotation.create", { type: "quotation", id: String(doc._id) }, {
    after: { dealId: dealId.toHexString(), lines: lines.length, grandTotal: doc.totals.grandTotal },
    ...auditCtx(deps),
  })
  return { ok: true, quotation: doc }
}

export async function updateDraft(crm: CrmDb, actor: CrmActor, scope: LeadScope, id: ObjectId, input: QuoteInput, deps: QuoteDeps = {}): Promise<QuoteResult> {
  const r = await loadVisible(crm, scope, id)
  if (!r) return fail(404, "not_found")
  if (r.q.status !== "draft") return fail(409, "not_draft")
  const now = deps.now ?? new Date()
  const lines: QuotationLine[] = input.lines ? input.lines.map(computeLine) : (r.q.lines as QuotationLine[])
  const terms: QuoteTerms = input.terms ?? (r.q.terms as QuoteTerms)
  if (await noteBlock(crm, actor, r.q.contactId as ObjectId, lines, terms, "quotations.update")) return fail(422, "matches_internal_note")
  const set = { lines, totals: totalsOf(lines), terms, updatedAt: now }
  const res = await crm.collection(COLL.quotations).updateOne({ _id: id, status: "draft" }, { $set: set })
  if (res.matchedCount !== 1) return fail(409, "not_draft")
  await logCrmAction(crm, userRefOf(actor), "quotation.update", { type: "quotation", id: id.toHexString() }, {
    after: { lines: lines.length, grandTotal: set.totals.grandTotal },
    ...auditCtx(deps),
  })
  return { ok: true, quotation: { ...r.q, ...set } }
}

export async function discardDraft(crm: CrmDb, actor: CrmActor, scope: LeadScope, id: ObjectId, deps: QuoteDeps = {}): Promise<QuoteResult<{ id: string }>> {
  const r = await loadVisible(crm, scope, id)
  if (!r) return fail(404, "not_found")
  if (r.q.status !== "draft") return fail(409, "not_draft")
  const res = await crm.collection(COLL.quotations).deleteOne({ _id: id, status: "draft" })
  if (res.deletedCount !== 1) return fail(409, "not_draft")
  await logCrmAction(crm, userRefOf(actor), "quotation.discard", { type: "quotation", id: id.toHexString() }, {
    before: { version: r.q.version, quoteNumber: r.q.quoteNumber ?? null },
    ...auditCtx(deps),
  })
  return { ok: true, quotation: { id: id.toHexString() } }
}

export async function issueQuotation(crm: CrmDb, actor: CrmActor, scope: LeadScope, id: ObjectId, deps: QuoteDeps = {}): Promise<QuoteResult> {
  const r = await loadVisible(crm, scope, id)
  if (!r) return fail(404, "not_found")
  const q = r.q
  if (q.status !== "draft") return fail(409, "not_draft")
  if (r.deal.isOpen === false) return fail(409, "deal_closed")
  const lines = q.lines as QuotationLine[]
  if (!lines.length || !(Number(q.totals?.grandTotal) > 0)) return fail(400, "empty_quotation")
  if (await noteBlock(crm, actor, q.contactId as ObjectId, lines, q.terms as QuoteTerms, "quotations.issue")) return fail(422, "matches_internal_note")

  const now = deps.now ?? new Date()
  const me = userRefOf(actor)
  const quotations = crm.collection(COLL.quotations)
  let quoteNumber: string = (q.quoteNumber as string | null) ?? ""
  try {
    await crm.withTransaction(async session => {
      if (Number(q.version) === 1) {
        const fy = fyOf(now)
        const counter = await crm.collection(COLL.counters).findOneAndUpdate(
          { _id: counterIdOf(crm.workspace, fy) } as Document,
          { $inc: { seq: 1 }, $setOnInsert: { kind: "quotation", fy } },
          { upsert: true, returnDocument: "after", session },
        )
        if (!counter || typeof counter.seq !== "number") throw new Error("counter allocation failed")
        quoteNumber = formatQuoteNumber(fy, counter.seq)
      } else {
        // Revision: version n-1 must still be the issued one; it becomes superseded.
        const prev = await quotations.updateOne(
          { quoteNumber, version: Number(q.version) - 1, status: "issued" },
          { $set: { status: "superseded", supersededAt: now, updatedAt: now } },
          { session },
        )
        if (prev.modifiedCount !== 1) throw Object.assign(new Error("previous version not issued"), { quoteConflict: true })
      }
      const res = await quotations.updateOne(
        { _id: id, status: "draft" },
        { $set: { status: "issued", quoteNumber, issuedAt: now, issuedBy: me, updatedAt: now } },
        { session },
      )
      if (res.modifiedCount !== 1) throw Object.assign(new Error("not a draft any more"), { quoteConflict: true })
    })
  } catch (e) {
    if ((e as { quoteConflict?: boolean }).quoteConflict || isDuplicateKeyError(e)) return fail(409, "conflict")
    throw e
  }

  const issued: Document = { ...q, status: "issued", quoteNumber, issuedAt: now, issuedBy: me, updatedAt: now }
  // Follow-ups after commit: the number is final whatever happens below.
  const label = quoteLabel(quoteNumber, Number(q.version))
  await crm.collection(COLL.deals).updateOne(
    { _id: q.dealId },
    { $set: { lastQuotation: { quotationId: id, quoteNumber, version: Number(q.version), grandTotal: Number(q.totals.grandTotal), sentAt: null }, updatedAt: now } },
  )
  await crm.collection(COLL.activities).insertOne({
    contactId: q.contactId,
    dealId: q.dealId,
    kind: "quotation_issued",
    at: now,
    by: me,
    summary: `Quotation ${label} issued`,
    data: { quotationId: id, quoteNumber, version: Number(q.version), grandTotal: Number(q.totals.grandTotal) },
  })
  await logCrmAction(crm, me, "quotation.issue", { type: "quotation", id: id.toHexString() }, {
    after: { quoteNumber, version: Number(q.version), grandTotal: Number(q.totals.grandTotal), dealId: String(q.dealId) },
    ...auditCtx(deps),
  })
  if (deps.afterIssue) {
    try {
      await deps.afterIssue(issued, crm)
    } catch {
      // PDF render failures leave pdf:null; the quotation can be re-rendered (DATA_MODEL §1.12).
    }
  }
  return { ok: true, quotation: (await quotations.findOne({ _id: id })) ?? issued }
}

export async function reviseQuotation(crm: CrmDb, actor: CrmActor, scope: LeadScope, id: ObjectId, deps: QuoteDeps = {}): Promise<QuoteResult> {
  const r = await loadVisible(crm, scope, id)
  if (!r) return fail(404, "not_found")
  const q = r.q
  if (q.status !== "issued") return fail(409, q.status === "superseded" ? "not_latest" : "not_issued")
  if (r.deal.isOpen === false) return fail(409, "deal_closed")
  const now = deps.now ?? new Date()
  const me = userRefOf(actor)
  const doc: Document = {
    _id: new ObjectId(),
    contactId: q.contactId,
    dealId: q.dealId,
    status: "draft",
    quoteNumber: q.quoteNumber,
    version: Number(q.version) + 1,
    revisionOf: q._id,
    lines: q.lines,
    totals: q.totals,
    terms: q.terms,
    pdf: null,
    sends: [],
    issuedAt: null,
    issuedBy: null,
    createdBy: me,
    createdAt: now,
    updatedAt: now,
  }
  try {
    await crm.collection(COLL.quotations).insertOne(doc)
  } catch (e) {
    if (isDuplicateKeyError(e)) return fail(409, "revision_exists")
    throw e
  }
  await logCrmAction(crm, me, "quotation.revise", { type: "quotation", id: String(doc._id) }, {
    after: { quoteNumber: q.quoteNumber, version: doc.version, revisionOf: String(q._id) },
    ...auditCtx(deps),
  })
  return { ok: true, quotation: doc }
}
