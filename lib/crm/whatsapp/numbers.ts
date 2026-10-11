/**
 * crm_wa_numbers bookkeeping (DATA_MODEL §1.8): the env allow-list is authoritative and a listed
 * number with no row gets its row auto-created on first touch — by the webhook, inbound
 * processing or the send path. /health reads lastWebhookAt / lastInboundAt / lastSendAt /
 * lastSendError / sendingPaused from here.
 */
import type { Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, CRM_DEFAULTS } from "../model"
import { fromWaId } from "../phone"

export async function touchWaNumber(
  crm: CrmDb,
  phoneNumberId: string,
  max: { lastWebhookAt?: Date; lastInboundAt?: Date; lastSendAt?: Date },
  now: Date,
  displayPhone?: string | null,
  /** Plain $set fields (e.g. lastSendError, sendingPaused); they override the insert defaults. */
  set: Document = {},
): Promise<void> {
  const disp = displayPhone ? fromWaId(displayPhone.replace(/\D/g, "")) : null
  const $max: Document = {}
  for (const [k, v] of Object.entries(max)) if (v) $max[k] = v
  const defaults: Document = {
    wabaId: null,
    displayPhone: disp && disp.ok ? disp.phoneE164 : null,
    tierCap: CRM_DEFAULTS.initialTierCap,
    tierCapSafetyMargin: 20,
    qualityRating: "UNKNOWN",
    sendingPaused: null,
    lastWebhookAt: null,
    lastInboundAt: null,
    lastSendAt: null,
    lastSendError: null,
    createdAt: now,
  }
  for (const k of [...Object.keys($max), ...Object.keys(set)]) delete defaults[k]
  await crm.collection(COLL.waNumbers).updateOne(
    { phoneNumberId },
    { $setOnInsert: defaults, $set: { ...set, updatedAt: now }, ...(Object.keys($max).length ? { $max } : {}) },
    { upsert: true },
  )
}
