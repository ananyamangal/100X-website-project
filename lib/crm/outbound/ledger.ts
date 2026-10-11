/**
 * crm_send_ledger: business-initiated sends (a template sent while the recipient's 24h window is
 * closed) per number, for the rolling-24h unique-recipient tier cap (DATA_MODEL §1.10).
 *
 * - The row is written BEFORE the Graph call: a failed send over-counts the cap, never under-counts.
 * - used24h = distinct recipients with sentAt > now-24h (index cap_window). A recipient already in
 *   that set does not count again.
 * - Limit: staff/quote/system sends may use the safety margin (limit = tierCap); broadcasts stop at
 *   tierCap − tierCapSafetyMargin.
 */
import type { CrmDb } from "../db"
import { COLL, CRM_DEFAULTS, type PhoneE164 } from "../model"

const DAY = 24 * 60 * 60 * 1000
export const DEFAULT_TIER_CAP_SAFETY_MARGIN = 20

export interface TierCapConfig {
  tierCap: number
  tierCapSafetyMargin: number
}

/** Cap values from crm_wa_numbers (owner-edited), else CRM_DEFAULTS. */
export async function tierCapOf(crm: CrmDb, phoneNumberId: string): Promise<TierCapConfig> {
  const row = await crm.collection(COLL.waNumbers).findOne({ phoneNumberId }, { projection: { tierCap: 1, tierCapSafetyMargin: 1 } })
  const cap = typeof row?.tierCap === "number" && row.tierCap > 0 ? row.tierCap : CRM_DEFAULTS.initialTierCap
  const margin = typeof row?.tierCapSafetyMargin === "number" && row.tierCapSafetyMargin >= 0 ? row.tierCapSafetyMargin : DEFAULT_TIER_CAP_SAFETY_MARGIN
  return { tierCap: cap, tierCapSafetyMargin: margin }
}

/** Distinct business-initiated recipients on this number in the rolling 24h before `now`. */
export async function ledgerRecipients24h(crm: CrmDb, phoneNumberId: string, now: Date): Promise<string[]> {
  const out = await crm.collection(COLL.sendLedger).distinct("recipient", { phoneNumberId, sentAt: { $gt: new Date(now.getTime() - DAY) } })
  return out.map(String)
}

export async function tierUsed24h(crm: CrmDb, phoneNumberId: string, now: Date): Promise<number> {
  return (await ledgerRecipients24h(crm, phoneNumberId, now)).length
}

export type CapCheck =
  | { ok: true; alreadyCounted: boolean; used: number; limit: number }
  | { ok: false; used: number; limit: number; retryAfter: Date | null }

export async function checkTierCap(
  crm: CrmDb,
  phoneNumberId: string,
  recipient: PhoneE164,
  now: Date,
  opts: { useMargin: boolean },
): Promise<CapCheck> {
  const cfg = await tierCapOf(crm, phoneNumberId)
  const limit = opts.useMargin ? cfg.tierCap : Math.max(0, cfg.tierCap - cfg.tierCapSafetyMargin)
  const recips = await ledgerRecipients24h(crm, phoneNumberId, now)
  if (recips.includes(recipient)) return { ok: true, alreadyCounted: true, used: recips.length, limit }
  if (recips.length < limit) return { ok: true, alreadyCounted: false, used: recips.length, limit }
  const oldest = await crm.collection(COLL.sendLedger).findOne(
    { phoneNumberId, sentAt: { $gt: new Date(now.getTime() - DAY) } },
    { sort: { sentAt: 1 }, projection: { sentAt: 1 } },
  )
  return { ok: false, used: recips.length, limit, retryAfter: oldest?.sentAt instanceof Date ? new Date(oldest.sentAt.getTime() + DAY) : null }
}

/** Ledger row written before the Graph call. */
export async function writeLedgerRow(crm: CrmDb, phoneNumberId: string, recipient: PhoneE164, now: Date): Promise<void> {
  await crm.collection(COLL.sendLedger).insertOne({
    phoneNumberId,
    recipient,
    sentAt: now,
    expireAt: new Date(now.getTime() + CRM_DEFAULTS.sendLedgerTtlHours * 60 * 60 * 1000),
  })
}
