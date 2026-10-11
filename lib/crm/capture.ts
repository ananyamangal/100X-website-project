/**
 * Channel-agnostic lead capture (DATA_MODEL §1.1–1.3, §1.16, §3 "New-deal rules"; ADR §13).
 *
 * Used by the WhatsApp webhook ingest now, and by website ingest (3c) and manual call entry (3d)
 * later. Given a normalised phone it:
 *   1. finds the contact by phoneE164, then altPhones (following `mergedInto`), or creates it
 *      (insert-first; E11000 on u_phone → re-read the winner);
 *   2. fills empty profile fields only (waProfileName is refreshed from WhatsApp);
 *   3. checks crm_dealer_directory for [primary, …altPhones] while the contact has no
 *      `existingDealer`, sets it once (conditional update) + a pending customerType suggestion +
 *      an `existing_dealer_match` activity;
 *   4. attaches to the open deal or creates one per the channel's rule; a racing creator gets
 *      E11000 on u_open_per_contact and attaches to the winner's deal (never a second insert);
 *   5. writes a `stage_change` activity for a created deal and the caller's activity, if any.
 *
 * Never touches attribution (crm_attribution is website-ingest only, 3c) and never reads notes.
 * All DB access goes through the scoped wrapper passed in.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb, CrmSession } from "./db"
import {
  COLL,
  CRM_DEFAULTS,
  type ActivityKind,
  type ContactId,
  type DealId,
  type LeadSource,
  type PhoneE164,
  type PhoneKind,
  type Stage,
  type UserRef,
  type WaId,
} from "./model"

export type SystemActor = { system: string }
export type Actor = UserRef | SystemActor

/**
 * "always": open deal → attach; otherwise a new deal (`repeat_enquiry` when the contact had
 *   deals before). Website form + manual call entry.
 * "quiet_days": WhatsApp inbound. No deals → new; open deal → attach; all closed → a new
 *   `repeat_enquiry` deal only if the latest closedAt is older than quietDays, else timeline only.
 */
export type DealPolicy = "always" | "quiet_days"

export interface CaptureInput {
  channel: LeadSource
  phone: { phoneE164: PhoneE164; waId: WaId; phoneKind: PhoneKind }
  /** Profile values from the channel. Only empty contact fields are filled; waProfileName is refreshed. */
  profile?: {
    waProfileName?: string | null
    name?: string | null
    company?: string | null
    email?: string | null
    state?: string | null
    city?: string | null
  }
  createdBy: Actor
  /** Default: "quiet_days" for whatsapp, "always" for every other channel. */
  dealPolicy?: DealPolicy
  /** Days after the latest close during which an inbound does not open a repeat enquiry. */
  quietDays?: number
  /** Stored on a newly created deal's origin. */
  origin?: { conversationId?: string; firstMessageId?: string }
  /** Optional channel activity (web_form, call_log…) written on the contact/deal. */
  activity?: { kind: ActivityKind; summary: string; data?: Record<string, unknown>; by?: Actor }
  now?: Date
  session?: CrmSession
}

export type DealOutcome = "created" | "attached" | "attached_after_race" | "timeline_only"

export interface CaptureResult {
  contactId: ContactId
  contactCreated: boolean
  dealId: DealId | null
  dealOutcome: DealOutcome
  dealStage: Stage | null
  /** true only on the capture that first matched the dealer directory. */
  existingDealerMatched: boolean
  existingDealer: boolean
}

export const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === 11000

/** References are stored as ObjectId (DATA_MODEL conventions); callers pass hex strings. */
const oid = (s: string | undefined | null): ObjectId | null => (s && /^[a-f0-9]{24}$/i.test(s) ? new ObjectId(s) : null)
const hex = (id: unknown): string => (id instanceof ObjectId ? id.toHexString() : String(id))
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s)
const empty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")
const clean = (v: string | null | undefined): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null)

const CHANNEL_LABEL: Record<LeadSource, string> = {
  call: "call",
  whatsapp: "WhatsApp",
  website: "website",
  gem: "GeM",
  referral: "referral",
  existing_dealer: "existing dealer",
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact
// ─────────────────────────────────────────────────────────────────────────────

async function followMerged(crm: CrmDb, contact: Document | null, opts: { session?: CrmSession }): Promise<Document | null> {
  let c = contact
  for (let hop = 0; c && c.mergedInto && hop < 5; hop++) {
    const next = await crm.collection(COLL.contacts).findOne({ _id: c.mergedInto }, opts)
    if (!next) break
    c = next
  }
  return c
}

async function findContactByPhone(crm: CrmDb, phone: PhoneE164, opts: { session?: CrmSession }): Promise<Document | null> {
  const contacts = crm.collection(COLL.contacts)
  const primary = await contacts.findOne({ phoneE164: phone }, opts)
  if (primary) return followMerged(crm, primary, opts)
  const alt = await contacts.findOne({ altPhones: phone }, opts)
  return alt ? followMerged(crm, alt, opts) : null
}

function newContactDoc(input: CaptureInput, now: Date): Document {
  const p = input.profile ?? {}
  return {
    _id: new ObjectId(),
    phoneE164: input.phone.phoneE164,
    waId: input.phone.waId,
    notOnWhatsApp: null,
    phoneKind: input.phone.phoneKind,
    altPhones: [],
    name: clean(p.name),
    waProfileName: clean(p.waProfileName),
    company: clean(p.company),
    customerType: null,
    state: clean(p.state),
    city: clean(p.city),
    email: clean(p.email),
    language: "en_US",
    interestTags: [],
    suggestions: [],
    existingDealer: null,
    assignedTo: null,
    marketingOptOut: null,
    amcDueAt: null,
    lastActivityAt: now,
    origin: { channel: input.channel },
    mergedInto: null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
}

async function findOrCreateContact(
  crm: CrmDb,
  input: CaptureInput,
  now: Date,
  opts: { session?: CrmSession },
): Promise<{ contact: Document; created: boolean }> {
  const found = await findContactByPhone(crm, input.phone.phoneE164, opts)
  if (found) return { contact: found, created: false }
  const doc = newContactDoc(input, now)
  try {
    await crm.collection(COLL.contacts).insertOne(doc, opts)
    return { contact: doc, created: true }
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e
    const winner = await findContactByPhone(crm, input.phone.phoneE164, opts)
    if (!winner) throw e
    return { contact: winner, created: false }
  }
}

async function refreshContact(crm: CrmDb, contact: Document, input: CaptureInput, now: Date, opts: { session?: CrmSession }) {
  const p = input.profile ?? {}
  const $set: Document = { lastActivityAt: now, updatedAt: now }
  const wa = clean(p.waProfileName)
  if (wa && wa !== contact.waProfileName) $set.waProfileName = wa
  for (const k of ["name", "company", "email", "state", "city"] as const) {
    const v = clean(p[k])
    if (v && empty(contact[k])) $set[k] = v
  }
  await crm.collection(COLL.contacts).updateOne({ _id: contact._id }, { $set }, opts)
}

// ─────────────────────────────────────────────────────────────────────────────
// Dealer directory
// ─────────────────────────────────────────────────────────────────────────────

async function matchDealerDirectory(
  crm: CrmDb,
  contact: Document,
  input: CaptureInput,
  now: Date,
  opts: { session?: CrmSession },
): Promise<boolean> {
  if (contact.existingDealer) return false
  const phones = [contact.phoneE164, ...(Array.isArray(contact.altPhones) ? contact.altPhones : [])].filter(Boolean)
  const entry = await crm.collection(COLL.dealerDirectory).findOne({ phoneE164: { $in: phones } }, opts)
  if (!entry) return false
  const set: Document = { existingDealer: { directoryId: hex(entry._id), matchedAt: now }, updatedAt: now }
  const update: Document = { $set: set }
  if (empty(contact.customerType)) {
    update.$push = {
      suggestions: {
        field: "customerType",
        value: "dealer",
        keyword: "dealer_directory",
        fromMessageId: oid(input.origin?.firstMessageId),
        status: "pending",
        at: now,
      },
    }
  }
  // Conditional: only the first capture to see the match flips it (no duplicate activity on races/retries).
  const res = await crm.collection(COLL.contacts).updateOne({ _id: contact._id, existingDealer: null }, update, opts)
  if (res.modifiedCount !== 1) return false
  const who = [entry.name, entry.company].filter((s: unknown) => typeof s === "string" && s).join(", ")
  await crm.collection(COLL.activities).insertOne(
    {
      contactId: contact._id,
      dealId: null,
      kind: "existing_dealer_match",
      at: now,
      by: { system: "dealer_directory" },
      summary: clip(who ? `Matches dealer directory: ${who}` : "Matches dealer directory", 200),
      data: { directoryId: hex(entry._id) },
    },
    opts,
  )
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal
// ─────────────────────────────────────────────────────────────────────────────

function newDealDoc(contact: Document, input: CaptureInput, stage: Stage, now: Date): Document {
  const by = input.createdBy
  return {
    _id: new ObjectId(),
    contactId: contact._id,
    stage,
    stageEnteredAt: now,
    stageHistory: [{ from: null, to: stage, at: now, by }],
    isOpen: true,
    isRepeat: stage === "repeat_enquiry",
    leadSource: input.channel,
    customerType: contact.customerType ?? null,
    assignedTo: contact.assignedTo ?? null,
    productInterest: [],
    intent: null,
    state: contact.state ?? clean(input.profile?.state) ?? null,
    city: contact.city ?? clean(input.profile?.city) ?? null,
    nextFollowUpAt: null,
    lastQuotation: null,
    closedAt: null,
    won: null,
    lost: null,
    customerReminders: { quoteFollowUp: false, serviceAmc: false },
    origin: {
      channel: input.channel,
      ...(oid(input.origin?.conversationId) ? { conversationId: oid(input.origin?.conversationId) } : {}),
      ...(oid(input.origin?.firstMessageId) ? { firstMessageId: oid(input.origin?.firstMessageId) } : {}),
    },
    createdBy: by,
    createdAt: now,
    updatedAt: now,
  }
}

/** Decides the entry stage for a new deal, or null for "timeline only". Caller has checked there is no open deal. */
async function entryStageFor(
  crm: CrmDb,
  contactId: unknown,
  policy: DealPolicy,
  quietDays: number,
  now: Date,
  opts: { session?: CrmSession },
): Promise<Stage | null> {
  const deals = crm.collection(COLL.deals)
  const latestClosed = await deals.findOne({ contactId, isOpen: false }, { ...opts, sort: { closedAt: -1 }, projection: { closedAt: 1 } })
  if (!latestClosed) {
    // No closed deal; a deal of any kind?  (An open one was ruled out by the caller.)
    const any = await deals.findOne({ contactId }, { ...opts, projection: { _id: 1 } })
    return any ? "repeat_enquiry" : "new"
  }
  if (policy === "always") return "repeat_enquiry"
  const closedAt: Date | null = latestClosed.closedAt instanceof Date ? latestClosed.closedAt : null
  if (!closedAt) return "repeat_enquiry"
  return now.getTime() - closedAt.getTime() > quietDays * 86_400_000 ? "repeat_enquiry" : null
}

async function attachOrCreateDeal(
  crm: CrmDb,
  contact: Document,
  input: CaptureInput,
  now: Date,
  opts: { session?: CrmSession },
): Promise<{ deal: Document | null; outcome: DealOutcome }> {
  const deals = crm.collection(COLL.deals)
  // A team member's own number (lib/crm/staff.ts) never opens a deal, so staff never become leads.
  if (typeof contact.staffUserId === "string" && contact.staffUserId) return { deal: null, outcome: "timeline_only" }
  const policy: DealPolicy = input.dealPolicy ?? (input.channel === "whatsapp" ? "quiet_days" : "always")
  const quietDays = input.quietDays ?? CRM_DEFAULTS.repeatEnquiryQuietDays

  for (let attempt = 0; attempt < 3; attempt++) {
    const open = await deals.findOne({ contactId: contact._id, isOpen: true }, opts)
    if (open) return { deal: open, outcome: attempt === 0 ? "attached" : "attached_after_race" }

    const stage = await entryStageFor(crm, contact._id, policy, quietDays, now, opts)
    if (!stage) return { deal: null, outcome: "timeline_only" }

    const doc = newDealDoc(contact, input, stage, now)
    try {
      await deals.insertOne(doc, opts)
      return { deal: doc, outcome: "created" }
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e
      // Lost the u_open_per_contact race: loop → re-read the winner's open deal and attach.
    }
  }
  const open = await deals.findOne({ contactId: contact._id, isOpen: true }, opts)
  if (open) return { deal: open, outcome: "attached_after_race" }
  throw new Error("capture: could not create or attach a deal after 3 attempts")
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function captureLead(crm: CrmDb, input: CaptureInput): Promise<CaptureResult> {
  const now = input.now ?? new Date()
  const opts = input.session ? { session: input.session } : {}

  const { contact, created } = await findOrCreateContact(crm, input, now, opts)
  if (!created) await refreshContact(crm, contact, input, now, opts)
  if (input.channel === "whatsapp" && !contact.staffUserId) {
    const settings = await crm.collection<{ _id: string; staff?: { userId: string; waE164: string | null }[] }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { staff: 1 } })
    const staff = (settings?.staff ?? []).find(s => s.waE164 === input.phone.phoneE164)
    if (staff) {
      await crm.collection(COLL.contacts).updateOne({ _id: contact._id }, { $set: { staffUserId: String(staff.userId), updatedAt: now } }, opts)
      contact.staffUserId = String(staff.userId)
    }
  }

  const matched = await matchDealerDirectory(crm, contact, input, now, opts)
  const { deal, outcome } = await attachOrCreateDeal(crm, contact, input, now, opts)

  const activities = crm.collection(COLL.activities)
  if (deal && outcome === "created") {
    const stage = deal.stage as Stage
    await activities.insertOne(
      {
        contactId: contact._id,
        dealId: deal._id,
        kind: "stage_change",
        at: now,
        by: input.createdBy,
        summary: clip(
          stage === "repeat_enquiry"
            ? `Repeat enquiry via ${CHANNEL_LABEL[input.channel]}`
            : `New lead via ${CHANNEL_LABEL[input.channel]}`,
          200,
        ),
        data: { from: null, to: stage, leadSource: input.channel },
      },
      opts,
    )
  }
  if (input.activity) {
    await activities.insertOne(
      {
        contactId: contact._id,
        dealId: deal ? deal._id : null,
        kind: input.activity.kind,
        at: now,
        by: input.activity.by ?? input.createdBy,
        summary: clip(input.activity.summary, 200),
        data: input.activity.data ?? {},
      },
      opts,
    )
  }

  return {
    contactId: hex(contact._id) as ContactId,
    contactCreated: created,
    dealId: deal ? (hex(deal._id) as DealId) : null,
    dealOutcome: outcome,
    dealStage: deal ? (deal.stage as Stage) : null,
    existingDealerMatched: matched,
    existingDealer: matched || !!contact.existingDealer,
  }
}
