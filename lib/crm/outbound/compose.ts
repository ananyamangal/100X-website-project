/**
 * The ONLY place `OutboundText` is minted (DATA_MODEL §6 layer 3, ADR §14).
 *
 * Mint functions:
 * - fromComposer(text)            — a staff member's free-form reply / media caption (request body).
 * - fromTemplateParam(value)      — one template body parameter (request body or a contact/deal field).
 * - fromTemplateParams(values)    — the whole positional parameter list.
 * - fromAutomationSetting(key, l) — system texts (STOP confirmation, …) from META_TEMPLATES.md.
 * - fromPersistedOutbound(crm, id)— re-reads text/params/caption already stored on a crm_messages row
 *                                   (queued retries). The send gate re-checks them like any new text.
 *
 * Producers take `NotInternalNote<T>`, so passing an `InternalNoteText` directly is a compile error.
 * HONEST LIMIT: `.trim()` / template literals drop the brand; the import rule (this directory never
 * imports lib/crm/notes) and the gate's hash tripwire are the real guarantees.
 *
 * Minting uses a type predicate instead of a cast: the static guard bans `as OutboundText` (and
 * every other unsafe cast) under lib/crm/outbound/**. Mint functions are arrow constants, so the
 * "no explicit type arguments on mint functions" scan never matches their own definitions.
 */
import { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, type NotInternalNote, type OutboundText, type WaLanguage } from "../model"

/** Meta limits: text body 4096 chars, media caption 1024, template body parameter 1024 (we cap lower). */
export const COMPOSER_MAX_CHARS = 4096
export const CAPTION_MAX_CHARS = 1024
export const TEMPLATE_PARAM_MAX_CHARS = 1024

function isOutboundText(_s: string): _s is OutboundText {
  return true
}

/** The single brand point. Private to this module. */
function mint(s: string): OutboundText {
  if (isOutboundText(s)) return s
  throw new Error("unreachable")
}

export type MintResult = { ok: true; text: OutboundText } | { ok: false; reason: "not_text" | "empty" | "too_long" | "invalid_characters" }

// Control characters except \n and \t are refused (they can break rendering or smuggle content).
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function check(raw: string, max: number): MintResult {
  if (typeof raw !== "string") return { ok: false, reason: "not_text" }
  const t = raw.replace(/\r\n?/g, "\n").trim()
  if (!t) return { ok: false, reason: "empty" }
  if (t.length > max) return { ok: false, reason: "too_long" }
  if (CTRL.test(t)) return { ok: false, reason: "invalid_characters" }
  return { ok: true, text: mint(t) }
}

/** Composer free-form text (≤ 4096). */
export const fromComposer = <T extends string>(text: NotInternalNote<T>): MintResult => check(text, COMPOSER_MAX_CHARS)

/** Media caption (≤ 1024). */
export const fromComposerCaption = <T extends string>(text: NotInternalNote<T>): MintResult => check(text, CAPTION_MAX_CHARS)

/**
 * One template parameter. Meta rejects parameters containing new lines, tabs or more than four
 * consecutive spaces (error 132018), so those are refused here instead of failing at Graph.
 */
export const fromTemplateParam = <T extends string>(value: NotInternalNote<T>): MintResult => {
  if (typeof value !== "string") return { ok: false, reason: "not_text" }
  const t = value.trim()
  if (!t) return { ok: false, reason: "empty" }
  if (t.length > TEMPLATE_PARAM_MAX_CHARS) return { ok: false, reason: "too_long" }
  if (/[\n\r\t]/.test(t) || / {5,}/.test(t) || CTRL.test(t)) return { ok: false, reason: "invalid_characters" }
  return { ok: true, text: mint(t) }
}

export type ParamsResult = { ok: true; params: OutboundText[] } | { ok: false; index: number; reason: Exclude<MintResult, { ok: true }>["reason"] }

export const fromTemplateParams = <T extends string>(values: readonly NotInternalNote<T>[]): ParamsResult => {
  const out: OutboundText[] = []
  for (let i = 0; i < values.length; i++) {
    const r = fromTemplateParam(values[i])
    if (!r.ok) return { ok: false, index: i, reason: r.reason }
    out.push(r.text)
  }
  return { ok: true, params: out }
}

/**
 * System texts. Source: docs/crm/META_TEMPLATES.md "Not templates (session messages)". Settings
 * overrides (step 8) will be read here too, so every automation text is still minted in this file.
 */
export const AUTOMATION_TEXTS = {
  auto_ack: {
    en_US: "Thanks for contacting 100X Circle. We've received your message and our team will reply shortly.",
    hi: "100X Circle से संपर्क करने के लिए धन्यवाद। आपका संदेश मिल गया है, हमारी टीम जल्द ही जवाब देगी।",
  },
  after_hours: {
    en_US: "Thanks for your message. Our office hours are {hours}. We'll reply as soon as we're back.",
    hi: "आपके संदेश के लिए धन्यवाद। हमारा कार्यालय समय {hours} है। हम जल्द ही जवाब देंगे।",
  },
  optout_confirmation: {
    en_US: "You've been unsubscribed from promotional messages. Reply START to subscribe again.",
    hi: "आपको प्रमोशनल संदेशों से हटा दिया गया है। फिर से जुड़ने के लिए START लिखें।",
  },
} as const satisfies Record<string, Record<WaLanguage, string>>

export type AutomationTextKey = keyof typeof AUTOMATION_TEXTS

export const fromAutomationSetting = (key: AutomationTextKey, language: WaLanguage): OutboundText => {
  const set: Record<WaLanguage, string> = AUTOMATION_TEXTS[key]
  return mint(set[language] ?? set.en_US)
}

export interface PersistedOutbound {
  messageId: ObjectId
  contactId: ObjectId
  conversationId: ObjectId
  type: string
  text: OutboundText | null
  caption: OutboundText | null
  template: { name: string; language: string; params: OutboundText[] } | null
  media: { url: string | null; waMediaId: string | null; mime: string; filename: string | null } | null
}

/**
 * Re-reads an OUTBOUND message row for a queued retry. Returns null for inbound rows or unknown ids.
 * The values are re-branded here, and every send still passes the gate (which hashes them again),
 * so a tampered row is caught by the tripwire, not trusted.
 */
export async function fromPersistedOutbound(crm: CrmDb, messageId: ObjectId): Promise<PersistedOutbound | null> {
  const m = await crm.collection(COLL.messages).findOne(
    { _id: messageId, direction: "out" },
    { projection: { contactId: 1, conversationId: 1, type: 1, text: 1, template: 1, media: 1 } },
  )
  if (!m) return null
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)
  const tpl = m.template && typeof m.template === "object" ? m.template : null
  const media = m.media && typeof m.media === "object" ? m.media : null
  const text = str(m.text)
  const caption = str(media?.caption)
  return {
    messageId,
    contactId: m.contactId,
    conversationId: m.conversationId,
    type: String(m.type),
    text: text ? mint(text) : null,
    caption: caption ? mint(caption) : null,
    template: tpl
      ? {
          name: String(tpl.name),
          language: String(tpl.language),
          params: Array.isArray(tpl.params) ? tpl.params.map((p: unknown) => mint(String(p))) : [],
        }
      : null,
    media: media ? { url: str(media.url), waMediaId: str(media.waMediaId), mime: String(media.mime ?? ""), filename: str(media.filename) } : null,
  }
}

/**
 * Automation text with an optional settings override (STEP 8, CRM settings → Automation) and
 * `{name}` placeholders. An invalid / empty override falls back to the default text.
 */
export function fromAutomationText(key: AutomationTextKey, language: WaLanguage, opts: { override?: string | null; vars?: Record<string, string> } = {}): OutboundText {
  const set: Record<WaLanguage, string> = AUTOMATION_TEXTS[key]
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k: string) => (opts.vars && Object.prototype.hasOwnProperty.call(opts.vars, k) ? opts.vars[k] : m))
  const fallback = fill(set[language] ?? set.en_US)
  if (opts.override && opts.override.trim()) {
    const r = check(fill(opts.override), COMPOSER_MAX_CHARS)
    if (r.ok) return r.text
  }
  const d = check(fallback, COMPOSER_MAX_CHARS)
  return d.ok ? d.text : mint(fallback)
}
