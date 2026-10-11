/**
 * Internal notes (DATA_MODEL §1.4 + §6, ADR §14): private team notes in their own collection.
 *
 * - The ONLY module that reads or writes `crm_internal_notes` text and the only place that mints
 *   `InternalNoteText`. (The future send gate lib/crm/outbound/gate.ts may read `{textHash:1}`.)
 * - Must never be imported, directly or transitively, by any sending module:
 *   lib/crm/{outbound,broadcast,queue,automation,reminders,growth,ai,flows}/** or the
 *   inbox/broadcast/queue/cron routes (static test). Importers today: the notes route and the
 *   manual call-entry handler (write-only: the call note from the form).
 * - Note text is never copied into activities, conversations, audit rows or logs.
 */
import { createHash } from "node:crypto"
import { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, type InternalNoteText, type UserRef } from "../model"

export const NOTE_MAX_CHARS = 4000

/** lower-case + whitespace-collapse + trim; the send gate hashes outbound text the same way. */
export function normaliseForHash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

export function noteTextHash(text: string): string {
  return createHash("sha256").update(normaliseForHash(text), "utf8").digest("hex")
}

export type NoteTextCheck = { ok: true; text: InternalNoteText } | { ok: false; reason: "empty" | "too_long" | "not_text" }

/** Validates raw input and mints the brand. Leading/trailing whitespace is trimmed; inner text kept. */
export function toNoteText(raw: unknown): NoteTextCheck {
  if (typeof raw !== "string") return { ok: false, reason: "not_text" }
  const t = raw.replace(/\r\n?/g, "\n").trim()
  if (!t) return { ok: false, reason: "empty" }
  if (t.length > NOTE_MAX_CHARS) return { ok: false, reason: "too_long" }
  return { ok: true, text: t as InternalNoteText }
}

export interface NoteView {
  id: string
  contactId: string
  dealId: string | null
  author: UserRef
  at: string
  text: string
  editedAt: string | null
}

const hex = (v: unknown): string => (v instanceof ObjectId ? v.toHexString() : String(v))
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : null)

export async function createInternalNote(
  crm: CrmDb,
  input: { contactId: ObjectId; dealId: ObjectId | null; author: UserRef; text: InternalNoteText; now?: Date },
): Promise<NoteView> {
  const at = input.now ?? new Date()
  const doc = {
    _id: new ObjectId(),
    contactId: input.contactId,
    dealId: input.dealId,
    author: { userId: input.author.userId, name: input.author.name },
    at,
    text: input.text,
    textHash: noteTextHash(input.text),
    editedAt: null,
    deletedAt: null,
  }
  await crm.collection(COLL.internalNotes).insertOne(doc)
  return {
    id: doc._id.toHexString(),
    contactId: hex(doc.contactId),
    dealId: doc.dealId ? hex(doc.dealId) : null,
    author: doc.author,
    at: at.toISOString(),
    text: doc.text,
    editedAt: null,
  }
}

/** Newest first; soft-deleted notes excluded. Cursor: `before` = the last item's `at`. */
export async function listInternalNotes(
  crm: CrmDb,
  contactId: ObjectId,
  opts: { before?: Date | null; limit?: number } = {},
): Promise<{ items: NoteView[]; nextBefore: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
  const filter: Record<string, unknown> = { contactId, deletedAt: null }
  if (opts.before) filter.at = { $lt: opts.before }
  const rows = await crm
    .collection(COLL.internalNotes)
    .find(filter, { sort: { at: -1, _id: -1 }, limit: limit + 1, projection: { textHash: 0 } })
    .toArray()
  const page = rows.slice(0, limit)
  const items: NoteView[] = page.map(r => ({
    id: hex(r._id),
    contactId: hex(r.contactId),
    dealId: r.dealId ? hex(r.dealId) : null,
    author: { userId: String(r.author?.userId ?? ""), name: String(r.author?.name ?? "") },
    at: iso(r.at) ?? "",
    text: typeof r.text === "string" ? r.text : "",
    editedAt: iso(r.editedAt),
  }))
  return { items, nextBefore: rows.length > limit && items.length ? items[items.length - 1].at : null }
}

