/**
 * PATCH /api/crm/settings/numbers {phoneNumberId, tierCap?, tierCapSafetyMargin?, resume?} (STEP 10).
 * crm.settings.edit. tierCap = the messaging limit shown in WhatsApp Manager (owner-edited, DATA_MODEL
 * §1.10); the safety margin is kept free for staff / quotation sends (broadcasts stop before it).
 * resume:true clears a sending pause set by Meta errors 131048 / 368 (after checking WhatsApp Manager).
 * Only allow-listed numbers. Audited.
 */
import type { Document } from "mongodb"
import { crmError, crmJson, userRefOf } from "./auth"
import { readJsonObject } from "../validate"
import { logCrmAction } from "../audit"
import { readCrmEnv } from "../env"
import { COLL, CRM_DEFAULTS } from "../model"
import { DEFAULT_TIER_CAP_SAFETY_MARGIN } from "../outbound/ledger"
import { touchWaNumber } from "../whatsapp/numbers"
import { auditCtx, nowOf, route } from "./route"

export const updateNumberHandler = route("settings.numbers", ["crm.settings.edit"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const env = deps.env ?? readCrmEnv()
  const fields: Record<string, string> = {}
  for (const k of Object.getOwnPropertyNames(body)) if (!["phoneNumberId", "tierCap", "tierCapSafetyMargin", "resume"].includes(k)) fields[k] = "unknown_field"
  const pnid = typeof body.phoneNumberId === "string" ? body.phoneNumberId : ""
  if (!env.waPhoneNumberIds.includes(pnid)) fields.phoneNumberId = "not_allow_listed"
  const set: Document = {}
  if (body.tierCap !== undefined) {
    if (!Number.isInteger(body.tierCap) || (body.tierCap as number) < 1 || (body.tierCap as number) > 1_000_000) fields.tierCap = "invalid_number"
    else set.tierCap = body.tierCap
  }
  if (body.tierCapSafetyMargin !== undefined) {
    if (!Number.isInteger(body.tierCapSafetyMargin) || (body.tierCapSafetyMargin as number) < 0 || (body.tierCapSafetyMargin as number) > 10_000) fields.tierCapSafetyMargin = "invalid_number"
    else set.tierCapSafetyMargin = body.tierCapSafetyMargin
  }
  if (body.resume !== undefined && body.resume !== true) fields.resume = "invalid"
  if (body.resume === true) set.sendingPaused = null
  if (!Object.keys(set).length && !Object.keys(fields).length) fields.body = "empty"
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const before = await crm.collection(COLL.waNumbers).findOne({ phoneNumberId: pnid }, { projection: { tierCap: 1, tierCapSafetyMargin: 1, sendingPaused: 1 } })
  // Effective values as the ledger sees them (its defaults when the row or field doesn't exist yet).
  const cap = (set.tierCap ?? before?.tierCap ?? CRM_DEFAULTS.initialTierCap) as number
  const margin = (set.tierCapSafetyMargin ?? before?.tierCapSafetyMargin ?? DEFAULT_TIER_CAP_SAFETY_MARGIN) as number
  if (margin >= cap) return crmError(400, "validation", requestId, { fields: { tierCapSafetyMargin: "must_be_below_cap" } })
  const now = nowOf(deps)
  await touchWaNumber(crm, pnid, {}, now, null, set)
  await logCrmAction(crm, userRefOf(actor), "settings.number", { type: "wa_number", id: pnid }, {
    before: { tierCap: before?.tierCap ?? null, tierCapSafetyMargin: before?.tierCapSafetyMargin ?? null, paused: !!before?.sendingPaused },
    after: { tierCap: cap ?? null, tierCapSafetyMargin: margin ?? null, paused: body.resume === true ? false : !!before?.sendingPaused },
    ...auditCtx(request),
  })
  const row = await crm.collection(COLL.waNumbers).findOne({ phoneNumberId: pnid }, { projection: { tierCap: 1, tierCapSafetyMargin: 1, sendingPaused: 1 } })
  return crmJson({ number: { phoneNumberId: pnid, tierCap: row?.tierCap ?? null, tierCapSafetyMargin: row?.tierCapSafetyMargin ?? null, sendingPaused: row?.sendingPaused ?? null } }, requestId)
})
