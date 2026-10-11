/**
 * Inbound opt-out / opt-in (DATA_MODEL §1.11). Compliance, not step-8 automation: called from the
 * webhook ingest inbound path (lib/crm/whatsapp/ingest.ts) for every inbound message.
 *
 * - STOP: the whole message (trimmed, case-insensitive, surrounding punctuation ignored) equals one
 *   of settings.stopKeywords (default STOP / UNSUBSCRIBE / STOP PROMOTIONS / बंद / प्रमोशन बंद करें),
 *   or a template quick-reply with payload OPT_OUT or the "Stop promotions" button text →
 *   upsert crm_optouts (by E.164; survives merges/deletes) + contact.marketingOptOut mirror +
 *   `opt_out` activity + audit, then the STOP confirmation (META_TEMPLATES.md session text, en/hi)
 *   through sendMessage() — the gate allows exactly that one text to an opted-out number, and only
 *   inside the 24h window.
 * - START: removes the crm_optouts row and the mirror (+ activity + audit). No reply text is defined.
 * - Every write is idempotent (re-processing an event repeats nothing; the confirmation's
 *   idempotency key is `optout:<messageId>`).
 */
import type { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL, type OptOutVia, type WaLanguage } from "../model"
import { fromAutomationSetting } from "./compose"
import type { GraphConfig } from "./graph"
import { sendMessage, type SendLogger } from "./send"

export const DEFAULT_STOP_KEYWORDS = ["STOP", "UNSUBSCRIBE", "STOP PROMOTIONS", "बंद", "प्रमोशन बंद करें"] as const
export const START_KEYWORDS = ["START"] as const
export const OPT_OUT_PAYLOAD = "OPT_OUT"
const STOP_BUTTON_TEXT = /^(stop promotions|प्रमोशन बंद करें)$/i
const DEVANAGARI = /[ऀ-ॿ]/

export function normaliseKeyword(s: string): string {
  return s
    .trim()
    .replace(/^[\s.!?,;:'"()\-]+|[\s.!?,;:'"()\-।]+$/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase()
}

export type OptKeyword = { action: "stop"; via: Extract<OptOutVia, "stop_keyword" | "stop_button">; hindi: boolean } | { action: "start" } | null

export interface OptKeywordInput {
  type: string
  text: string | null
  interactive: { kind: string; id: string; title: string } | null
}

/** Pure detection. `stopKeywords` = settings.stopKeywords (falls back to the defaults when empty). */
export function detectOptKeyword(ev: OptKeywordInput, stopKeywords?: readonly string[] | null): OptKeyword {
  const list = (stopKeywords && stopKeywords.length ? stopKeywords : DEFAULT_STOP_KEYWORDS).map(normaliseKeyword).filter(Boolean)
  if (ev.interactive) {
    const id = ev.interactive.id.trim().toUpperCase()
    const title = ev.interactive.title.trim()
    if (id === OPT_OUT_PAYLOAD || STOP_BUTTON_TEXT.test(title)) return { action: "stop", via: "stop_button", hindi: DEVANAGARI.test(title) }
  }
  if (ev.type !== "text" || !ev.text) return null
  const t = normaliseKeyword(ev.text)
  if (!t) return null
  if (list.includes(t)) return { action: "stop", via: "stop_keyword", hindi: DEVANAGARI.test(t) }
  if ((START_KEYWORDS as readonly string[]).includes(t)) return { action: "start" }
  return null
}

export interface OptOutContext {
  event: OptKeywordInput & { from: string | null }
  contactId: ObjectId
  conversationId: ObjectId
  messageId: ObjectId
}

export interface OptOutDeps {
  allowList: readonly string[]
  graph: GraphConfig | null
  requestId: string
  now?: () => Date
  log?: SendLogger
}

export type OptOutOutcome = { action: "stop" | "start" | null; confirmation?: string }

export async function handleInboundOptOut(crm: CrmDb, ctx: OptOutContext, deps: OptOutDeps): Promise<OptOutOutcome> {
  // Cheap pre-check: only short texts and button replies can be keywords; skip the settings read otherwise.
  const ev = ctx.event
  if (!ev.interactive && (ev.type !== "text" || !ev.text || ev.text.length > 60)) return { action: null }
  const settings = await crm.collection<{ _id: string; stopKeywords?: unknown }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { stopKeywords: 1 } })
  const kw = detectOptKeyword(ctx.event, Array.isArray(settings?.stopKeywords) ? settings.stopKeywords.map(String) : null)
  if (!kw || !ctx.event.from) return { action: null }
  const now = deps.now ? deps.now() : new Date()
  const phone = ctx.event.from
  const system = { system: "webhook" }

  if (kw.action === "start") {
    const del = await crm.collection(COLL.optOuts).deleteOne({ phoneE164: phone })
    const upd = await crm.collection(COLL.contacts).updateOne({ _id: ctx.contactId, marketingOptOut: { $ne: null } }, { $set: { marketingOptOut: null, updatedAt: now } })
    if (del.deletedCount || upd.modifiedCount) {
      await crm.collection(COLL.activities).insertOne({
        contactId: ctx.contactId,
        dealId: null,
        kind: "opt_out",
        at: now,
        by: system,
        summary: "Re-subscribed to promotional WhatsApp messages (START)",
        data: { action: "opt_in", messageId: ctx.messageId },
      })
      await logCrmAction(crm, system, "optout.clear", { type: "contact", id: ctx.contactId.toHexString() }, { after: { via: "start_keyword", messageId: ctx.messageId.toHexString(), requestId: deps.requestId } })
    }
    deps.log?.info("opt-in recorded", { contactId: ctx.contactId.toHexString(), changed: !!(del.deletedCount || upd.modifiedCount) })
    return { action: "start" }
  }

  const ins = await crm.collection(COLL.optOuts).updateOne(
    { phoneE164: phone },
    { $setOnInsert: { scope: "marketing", via: kw.via, at: now, by: null, sourceMessageId: ctx.messageId } },
    { upsert: true },
  )
  await crm.collection(COLL.contacts).updateOne({ _id: ctx.contactId, marketingOptOut: null }, { $set: { marketingOptOut: { at: now, via: kw.via }, updatedAt: now } })
  if (ins.upsertedCount) {
    await crm.collection(COLL.activities).insertOne({
      contactId: ctx.contactId,
      dealId: null,
      kind: "opt_out",
      at: now,
      by: system,
      summary: kw.via === "stop_button" ? "Opted out of promotional WhatsApp messages (Stop promotions button)" : "Opted out of promotional WhatsApp messages (STOP)",
      data: { action: "opt_out", via: kw.via, messageId: ctx.messageId },
    })
    await logCrmAction(crm, system, "optout.set", { type: "contact", id: ctx.contactId.toHexString() }, { after: { via: kw.via, messageId: ctx.messageId.toHexString(), requestId: deps.requestId } })
  }
  deps.log?.info("opt-out recorded", { contactId: ctx.contactId.toHexString(), via: kw.via, isNew: ins.upsertedCount === 1 })

  // Confirmation (session text). Never fails the event: the opt-out itself is already stored.
  if (!deps.graph) {
    deps.log?.info("opt-out confirmation skipped", { reason: "whatsapp_not_configured" })
    return { action: "stop", confirmation: "not_configured" }
  }
  let language: WaLanguage = "en_US"
  if (kw.hindi) language = "hi"
  else {
    const c = await crm.collection(COLL.contacts).findOne({ _id: ctx.contactId }, { projection: { language: 1 } })
    if (c?.language === "hi") language = "hi"
  }
  try {
    const r = await sendMessage(
      crm,
      system,
      {
        contactId: ctx.contactId,
        conversationId: ctx.conversationId,
        idempotencyKey: `optout:${ctx.messageId.toHexString()}`,
        purpose: "optout_confirmation",
        route: "webhook.optout",
        content: { kind: "text", text: fromAutomationSetting("optout_confirmation", language), contextWaMessageId: null },
      },
      { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log },
    )
    return { action: "stop", confirmation: r.ok ? (r.deduped ? "deduped" : "sent") : r.error }
  } catch (e) {
    deps.log?.error("opt-out confirmation threw", { contactId: ctx.contactId.toHexString(), error: e instanceof Error ? e.name : "unknown" })
    return { action: "stop", confirmation: "error" }
  }
}
