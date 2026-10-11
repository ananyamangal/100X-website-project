/**
 * Growth OS "value out" point (DATA_MODEL §1.21, §7; ADR §15).
 *
 * `recordConversionEvent()` writes one `crm_conversion_events` row for a deal:
 *   - `closed_won` (primary): value = won.orderValue (paise), conversionAt = won.wonAt,
 *     orderId = "<dealId>:won";
 *   - `quotation_sent` (secondary): value = lastQuotation.grandTotal, conversionAt =
 *     lastQuotation.sentAt, orderId = "<quoteNumber>:v<version>".
 * It writes only when CRM_GROWTH_OS_SYNC is on AND the deal's contact has a `crm_attribution` row
 * with a click id (gclid / gbraid / wbraid); otherwise it is a no-op. The upsert on the unique
 * `orderId` (u_order) makes repeated calls no-ops.
 *
 * Callers: the stage module (lib/crm/leads/stage.ts) calls it after a successful move to closed_won
 * (wired in step 4c). The quotation module (step 6) will call it for quotation_sent on each
 * quotation version actually sent; the manual stage move to quotation_sent does NOT record it.
 *
 * Never imports lib/growth-os/* (ADR §15): Growth OS may only read the collection later.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "./db"
import { isDuplicateKeyError } from "./capture"
import { readCrmEnv, type CrmEnv } from "./env"
import { COLL, type ConversionKind } from "./model"

/** The deal fields this function reads (a `crm_deals` document satisfies it). */
export interface ConversionDealInput {
  _id: unknown
  contactId: unknown
  won?: { orderValue?: unknown; wonAt?: unknown } | null
  lastQuotation?: { quoteNumber?: unknown; version?: unknown; grandTotal?: unknown; sentAt?: unknown } | null
}

export type ConversionSkipReason =
  | "growth_sync_off"
  | "bad_deal"
  | "not_won"
  | "no_quotation"
  | "invalid_value"
  | "no_click_id"

export type ConversionResult =
  | { status: "recorded"; orderId: string }
  | { status: "duplicate"; orderId: string }
  | { status: "skipped"; reason: ConversionSkipReason }

const toOid = (v: unknown): ObjectId | null => {
  if (v instanceof ObjectId) return v
  if (typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) return new ObjectId(v)
  return null
}
const isPaise = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0
const isDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime())
const clickIdOf = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null)

/** Order id, value and time for the event, or why there is none. Pure. */
export function conversionFacts(
  deal: ConversionDealInput,
  kind: ConversionKind,
  now: Date,
): { ok: true; orderId: string; value: number; conversionAt: Date } | { ok: false; reason: ConversionSkipReason } {
  const dealOid = toOid(deal._id)
  if (!dealOid || !toOid(deal.contactId)) return { ok: false, reason: "bad_deal" }
  if (kind === "closed_won") {
    const won = deal.won
    if (!won || !isDate(won.wonAt)) return { ok: false, reason: "not_won" }
    if (!isPaise(won.orderValue)) return { ok: false, reason: "invalid_value" }
    return { ok: true, orderId: `${dealOid.toHexString()}:won`, value: won.orderValue, conversionAt: won.wonAt }
  }
  const q = deal.lastQuotation
  const quoteNumber = q && typeof q.quoteNumber === "string" ? q.quoteNumber.trim() : ""
  if (!q || !quoteNumber || !(typeof q.version === "number" && Number.isInteger(q.version) && q.version > 0)) {
    return { ok: false, reason: "no_quotation" }
  }
  if (!isPaise(q.grandTotal)) return { ok: false, reason: "invalid_value" }
  return { ok: true, orderId: `${quoteNumber}:v${q.version}`, value: q.grandTotal, conversionAt: isDate(q.sentAt) ? q.sentAt : now }
}

/**
 * Records a conversion event for `deal`. No-op (status "skipped") unless the toggle is on and the
 * contact has attribution with a click id. The row for this deal is preferred; otherwise the most
 * recently captured row of the contact with a click id is used.
 */
export async function recordConversionEvent(
  crm: CrmDb,
  deal: ConversionDealInput,
  kind: ConversionKind,
  env: Pick<CrmEnv, "growthSync"> = readCrmEnv(),
  opts: { now?: Date } = {},
): Promise<ConversionResult> {
  if (!env.growthSync) return { status: "skipped", reason: "growth_sync_off" }
  const now = opts.now ?? new Date()
  const facts = conversionFacts(deal, kind, now)
  if (!facts.ok) return { status: "skipped", reason: facts.reason }
  const dealOid = toOid(deal._id) as ObjectId
  const contactOid = toOid(deal.contactId) as ObjectId

  const rows = await crm
    .collection(COLL.attribution)
    .find(
      { contactId: contactOid, $or: [{ gclid: { $type: "string" } }, { gbraid: { $type: "string" } }, { wbraid: { $type: "string" } }] },
      { sort: { capturedAt: -1 }, limit: 50, projection: { dealId: 1, gclid: 1, gbraid: 1, wbraid: 1 } },
    )
    .toArray()
  const withClick = rows.filter(r => clickIdOf(r.gclid) || clickIdOf(r.gbraid) || clickIdOf(r.wbraid))
  const row: Document | undefined = withClick.find(r => r.dealId instanceof ObjectId && r.dealId.equals(dealOid)) ?? withClick[0]
  if (!row) return { status: "skipped", reason: "no_click_id" }

  const doc = {
    kind,
    dealId: dealOid,
    // orderId comes from the upsert filter.
    value: facts.value,
    currency: "INR" as const,
    conversionAt: facts.conversionAt,
    gclid: clickIdOf(row.gclid),
    gbraid: clickIdOf(row.gbraid),
    wbraid: clickIdOf(row.wbraid),
    hasClickId: true,
    exports: [],
    createdAt: now,
  }
  try {
    const res = await crm.collection(COLL.conversionEvents).updateOne({ orderId: facts.orderId }, { $setOnInsert: doc }, { upsert: true })
    return res.upsertedCount === 1 ? { status: "recorded", orderId: facts.orderId } : { status: "duplicate", orderId: facts.orderId }
  } catch (e) {
    // Two concurrent upserts on the same orderId: the loser hits u_order.
    if (isDuplicateKeyError(e)) return { status: "duplicate", orderId: facts.orderId }
    throw e
  }
}
