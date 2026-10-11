/**
 * Inbound automation (STEP 8; DATA_MODEL §8): runs once per newly stored inbound message from the
 * webhook (lib/crm/whatsapp/ingest.ts inboundAutomationHook). Never for STOP / START keyword
 * messages (ingest skips the hook) and never for team members' own numbers (staff contacts).
 *
 * 1. Keyword tagging → contact.suggestions[] (pending) for each matching rule, unless the contact
 *    already has that tag / customer type or any suggestion (pending, accepted or rejected) for it —
 *    a rejected tag is never suggested again.
 * 2. Replies (session text; the customer just wrote, so the 24-hour window is open):
 *    - outside business hours (afterHoursReply.enabled) → after-hours text, at most once per
 *      minIntervalHours per conversation (claim on conversation.lastAutoReplyAt);
 *    - else first message from a NEW contact (autoAck.enabled) → acknowledgement, once per
 *      conversation (claim on conversation.autoAckSentAt).
 *    When both apply, only the after-hours text goes out (it acknowledges too) and the auto-ack is
 *    marked done, so the customer gets one message, not two.
 *    Language: Hindi when the contact's language is hi or the message is in Devanagari.
 *    Sends go through sendMessage (purpose "automation": the gate refuses opted-out numbers, the
 *    note tripwire runs) with keys autoack:<conversationId> / afterhours:<messageId>.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, type WaLanguage } from "../model"
import { fromAutomationText } from "../outbound/compose"
import type { GraphConfig } from "../outbound/graph"
import { sendMessage, type SendLogger } from "../outbound/send"
import { matchKeywordRules } from "./keywords"
import { formatBusinessHours, isWithinBusinessHours, loadAutomationSettings } from "./settings"

const DEVANAGARI = /[ऀ-ॿ]/

export interface AutomationInput {
  contactId: ObjectId
  contactCreated: boolean
  conversationId: ObjectId
  messageId: ObjectId
  text: string | null
}

export interface AutomationDeps {
  allowList: readonly string[]
  graph: GraphConfig | null
  requestId: string
  now: Date
  log?: SendLogger
}

export interface AutomationResult {
  skipped?: "staff_contact" | "contact_not_found"
  suggestionsAdded: number
  reply: "auto_ack" | "after_hours" | null
  replyOutcome?: string
}

export async function runInboundAutomation(crm: CrmDb, input: AutomationInput, deps: AutomationDeps): Promise<AutomationResult> {
  const res: AutomationResult = { suggestionsAdded: 0, reply: null }
  const contacts = crm.collection(COLL.contacts)
  const contact = await contacts.findOne({ _id: input.contactId }, { projection: { staffUserId: 1, language: 1, customerType: 1, interestTags: 1, suggestions: 1 } })
  if (!contact) return { ...res, skipped: "contact_not_found" }
  if (typeof contact.staffUserId === "string" && contact.staffUserId) return { ...res, skipped: "staff_contact" }
  const settings = await loadAutomationSettings(crm)
  const now = deps.now

  // 1. keyword tagging
  const suggestions = (Array.isArray(contact.suggestions) ? contact.suggestions : []) as Document[]
  const tags = new Set((Array.isArray(contact.interestTags) ? contact.interestTags : []).map(String))
  const seen = new Set<string>()
  for (const rule of matchKeywordRules(input.text, settings.keywordRules)) {
    const key = `${rule.field}:${rule.value}`
    if (seen.has(key)) continue
    seen.add(key)
    if (rule.field === "interestTag" && tags.has(rule.value)) continue
    if (rule.field === "customerType" && contact.customerType === rule.value) continue
    if (suggestions.some(s => s.field === rule.field && s.value === rule.value)) continue
    const push: Document = { $push: { suggestions: { field: rule.field, value: rule.value, keyword: rule.keyword, fromMessageId: input.messageId, status: "pending", at: now } }, $set: { updatedAt: now } }
    const r = await contacts.updateOne({ _id: input.contactId, suggestions: { $not: { $elemMatch: { field: rule.field, value: rule.value } } } }, push)
    res.suggestionsAdded += r.modifiedCount
  }

  // 2. one automatic reply at most
  const afterHours = settings.afterHoursReply.enabled && !isWithinBusinessHours(settings.businessHours, now)
  const ack = settings.autoAck.enabled && input.contactCreated
  if (!afterHours && !ack) return res
  const convs = crm.collection(COLL.conversations)
  let kind: "auto_ack" | "after_hours"
  if (afterHours) {
    const threshold = new Date(now.getTime() - settings.afterHoursReply.minIntervalHours * 3600_000)
    const claim = await convs.updateOne(
      { _id: input.conversationId, $or: [{ lastAutoReplyAt: null }, { lastAutoReplyAt: { $exists: false } }, { lastAutoReplyAt: { $lte: threshold } }] },
      { $set: { lastAutoReplyAt: now, ...(ack ? { autoAckSentAt: now } : {}) } },
    )
    if (claim.modifiedCount !== 1) {
      if (!ack) return res
      kind = "auto_ack" // after-hours already sent recently; a brand-new contact still gets the ack
    } else kind = "after_hours"
  } else kind = "auto_ack"
  if (kind === "auto_ack") {
    const claim = await convs.updateOne(
      { _id: input.conversationId, $or: [{ autoAckSentAt: null }, { autoAckSentAt: { $exists: false } }] },
      { $set: { autoAckSentAt: now } },
    )
    if (claim.modifiedCount !== 1) return res
  }
  res.reply = kind
  if (!deps.graph) {
    res.replyOutcome = "whatsapp_not_configured"
    return res
  }
  const language: WaLanguage = contact.language === "hi" || (input.text && DEVANAGARI.test(input.text)) ? "hi" : "en_US"
  const text = kind === "after_hours"
    ? fromAutomationText("after_hours", language, { override: language === "hi" ? settings.afterHoursReply.textHi : settings.afterHoursReply.text, vars: { hours: formatBusinessHours(settings.businessHours) } })
    : fromAutomationText("auto_ack", language, { override: language === "hi" ? settings.autoAck.textHi : settings.autoAck.text })
  const r = await sendMessage(
    crm,
    { system: "automation" },
    {
      contactId: input.contactId,
      conversationId: input.conversationId,
      idempotencyKey: kind === "auto_ack" ? `autoack:${input.conversationId.toHexString()}` : `afterhours:${input.messageId.toHexString()}`,
      purpose: "automation",
      route: `automation.${kind}`,
      content: { kind: "text", text, contextWaMessageId: null },
    },
    { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: () => now, log: deps.log },
  )
  res.replyOutcome = r.ok ? (r.deduped ? "deduped" : "sent") : r.error
  return res
}
