/**
 * Pure parser for Meta WhatsApp Cloud API webhook payloads (no I/O, no DB).
 *
 * Shape: { object: "whatsapp_business_account", entry: [{ id: <WABA>, changes: [{ field, value }] }] }
 * where value = { messaging_product, metadata: { display_phone_number, phone_number_id },
 *                 contacts?: [{ profile: { name }, wa_id }], messages?: [...], statuses?: [...], errors?: [...] }
 *
 * Two layers:
 * - splitWebhook(body): one slice per message / status (metadata + matching contact kept), with
 *   the dedupe key that crm_wa_events stores (DATA_MODEL §1.7). Anything else (other fields,
 *   errors-only values) becomes a "raw:<sha256>" slice of kind "other" — never dropped.
 * - parseSlice(payload): a stored slice → normalized events. Unknown message types come back
 *   as type "unsupported" with the original type name, never dropped silently.
 */
import { createHash } from "node:crypto"
import { fromWaId } from "../phone"
import type { DeliveryStatus, PhoneE164, WaEventKind, WaId, WaMessageType } from "../model"

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null)
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Meta timestamps are unix seconds as strings. */
export function waTimestampToDate(v: unknown): Date | null {
  const n = num(v)
  if (n === null || n <= 0) return null
  const d = new Date(n * 1000)
  return Number.isNaN(d.getTime()) ? null : d
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalized events
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedMedia {
  waMediaId: string | null
  mime: string
  sha256: string | null
  filename: string | null
  caption: string | null
  /** audio only: true for a recorded voice note (PTT). */
  voice: boolean
  /** sticker only */
  animated: boolean
}

export interface InboundMessageEvent {
  kind: "message"
  phoneNumberId: string
  displayPhone: string | null
  wamid: string
  /** E.164 from messages[].from via fromWaId (null if Meta sent something unparseable). */
  from: PhoneE164 | null
  waId: WaId | null
  fromRaw: string | null
  profileName: string | null
  waTimestamp: Date | null
  type: WaMessageType
  /** Body for text; caption-free summary for button/interactive/contacts/reaction; else null. */
  text: string | null
  media: ParsedMedia | null
  location: { lat: number; lng: number; name?: string; address?: string } | null
  /** button_reply / list_reply, and a template quick-reply `button` (id = payload). */
  interactive: { kind: "button_reply" | "list_reply"; id: string; title: string } | null
  contextWaMessageId: string | null
  /** Set when type === "unsupported": Meta's own "unsupported" or a type this parser does not know. */
  unsupported: { originalType: string; errorCode: number | null } | null
}

export interface StatusError {
  code: number | null
  title: string | null
  detail: string | null
}

export interface StatusEvent {
  kind: "status"
  phoneNumberId: string
  wamid: string
  status: Exclude<DeliveryStatus, "queued">
  recipientWaId: string | null
  at: Date | null
  errors: StatusError[]
}

export interface OtherEvent {
  kind: "other"
  phoneNumberId: string | null
  reason: string
}

export type ParsedEvent = InboundMessageEvent | StatusEvent | OtherEvent

const KNOWN_STATUSES = new Set(["sent", "delivered", "read", "failed"])

function previewOfContacts(v: unknown): string {
  const names = arr(v)
    .map(c => (isObj(c) && isObj(c.name) ? str(c.name.formatted_name) : null))
    .filter((n): n is string => !!n)
  return names.length ? `Shared contact: ${names.join(", ")}` : "Shared contact"
}

function mediaOf(m: Obj, type: string): ParsedMedia | null {
  const media = m[type]
  if (!isObj(media)) return null
  return {
    waMediaId: str(media.id),
    mime: str(media.mime_type) ?? "application/octet-stream",
    sha256: str(media.sha256),
    filename: str(media.filename),
    caption: str(media.caption),
    voice: media.voice === true,
    animated: media.animated === true,
  }
}

/** One messages[] entry → normalized inbound message (null when it has no wamid). */
export function parseInboundMessage(m: unknown, value: Obj): InboundMessageEvent | null {
  if (!isObj(m)) return null
  const wamid = str(m.id)
  if (!wamid) return null
  const metadata = isObj(value.metadata) ? value.metadata : {}
  const fromRaw = str(m.from)
  const phone = fromWaId(fromRaw)
  const contact = arr(value.contacts).find(c => isObj(c) && str(c.wa_id) === fromRaw) ?? arr(value.contacts)[0]
  const profileName = isObj(contact) && isObj(contact.profile) ? str(contact.profile.name) : null
  const rawType = str(m.type) ?? "unknown"
  const context = isObj(m.context) ? m.context : null

  const ev: InboundMessageEvent = {
    kind: "message",
    phoneNumberId: str(metadata.phone_number_id) ?? "",
    displayPhone: str(metadata.display_phone_number),
    wamid,
    from: phone.ok ? phone.phoneE164 : null,
    waId: phone.ok ? phone.waId : null,
    fromRaw,
    profileName,
    waTimestamp: waTimestampToDate(m.timestamp),
    type: "unsupported",
    text: null,
    media: null,
    location: null,
    interactive: null,
    contextWaMessageId: context ? str(context.id) : null,
    unsupported: null,
  }

  switch (rawType) {
    case "text": {
      ev.type = "text"
      ev.text = isObj(m.text) ? str(m.text.body) : null
      return ev
    }
    case "image":
    case "document":
    case "audio":
    case "video":
    case "sticker": {
      ev.type = rawType
      ev.media = mediaOf(m, rawType)
      ev.text = ev.media?.caption ?? null
      return ev
    }
    case "location": {
      const l = isObj(m.location) ? m.location : {}
      const lat = num(l.latitude)
      const lng = num(l.longitude)
      ev.type = "location"
      if (lat !== null && lng !== null) {
        ev.location = { lat, lng, ...(str(l.name) ? { name: str(l.name)! } : {}), ...(str(l.address) ? { address: str(l.address)! } : {}) }
      }
      ev.text = str(l.name) ?? str(l.address)
      return ev
    }
    case "contacts": {
      ev.type = "contacts"
      ev.text = previewOfContacts(m.contacts)
      return ev
    }
    case "interactive": {
      const i = isObj(m.interactive) ? m.interactive : {}
      const kind = str(i.type)
      const reply = kind === "button_reply" || kind === "list_reply" ? i[kind] : null
      if (isObj(reply) && (kind === "button_reply" || kind === "list_reply")) {
        ev.type = "interactive"
        ev.interactive = { kind, id: str(reply.id) ?? "", title: str(reply.title) ?? "" }
        ev.text = ev.interactive.title || null
        return ev
      }
      // nfm_reply (Flows) and future interactive kinds: kept, flagged unsupported.
      ev.unsupported = { originalType: `interactive:${kind ?? "unknown"}`, errorCode: null }
      return ev
    }
    case "button": {
      // Quick-reply button on a template message (e.g. "Stop promotions" → payload OPT_OUT).
      const b = isObj(m.button) ? m.button : {}
      ev.type = "button"
      ev.text = str(b.text)
      ev.interactive = { kind: "button_reply", id: str(b.payload) ?? "", title: str(b.text) ?? "" }
      return ev
    }
    case "reaction": {
      const r = isObj(m.reaction) ? m.reaction : {}
      ev.type = "reaction"
      ev.text = str(r.emoji)
      ev.contextWaMessageId = str(r.message_id) ?? ev.contextWaMessageId
      return ev
    }
    case "unsupported":
    default: {
      const firstErr = arr(m.errors)[0]
      ev.unsupported = {
        originalType: rawType,
        errorCode: isObj(firstErr) ? num(firstErr.code) : null,
      }
      return ev
    }
  }
}

/** One statuses[] entry → normalized status (null when wamid/status missing or unknown). */
export function parseStatus(s: unknown, value: Obj): StatusEvent | null {
  if (!isObj(s)) return null
  const wamid = str(s.id)
  const status = str(s.status)
  if (!wamid || !status || !KNOWN_STATUSES.has(status)) return null
  const metadata = isObj(value.metadata) ? value.metadata : {}
  return {
    kind: "status",
    phoneNumberId: str(metadata.phone_number_id) ?? "",
    wamid,
    status: status as StatusEvent["status"],
    recipientWaId: str(s.recipient_id),
    at: waTimestampToDate(s.timestamp),
    errors: arr(s.errors).filter(isObj).map(e => ({
      code: num(e.code),
      title: str(e.title) ?? str(e.message),
      detail: isObj(e.error_data) ? str(e.error_data.details) : null,
    })),
  }
}

/** Parses one stored slice (a change.value narrowed to ≤1 message or status). */
export function parseSlice(payload: unknown): ParsedEvent[] {
  if (!isObj(payload)) return [{ kind: "other", phoneNumberId: null, reason: "payload_not_object" }]
  const metadata = isObj(payload.metadata) ? payload.metadata : {}
  const pnid = str(metadata.phone_number_id)
  const out: ParsedEvent[] = []
  for (const m of arr(payload.messages)) {
    const ev = parseInboundMessage(m, payload)
    out.push(ev ?? { kind: "other", phoneNumberId: pnid, reason: "message_without_id" })
  }
  for (const s of arr(payload.statuses)) {
    const ev = parseStatus(s, payload)
    out.push(ev ?? { kind: "other", phoneNumberId: pnid, reason: "status_unrecognised" })
  }
  if (out.length === 0) out.push({ kind: "other", phoneNumberId: pnid, reason: "no_messages_or_statuses" })
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Splitting a webhook body into crm_wa_events slices
// ─────────────────────────────────────────────────────────────────────────────

export interface EventSlice {
  /** "msg:<wamid>" | "st:<wamid>:<status>" | "raw:<sha256>" */
  dedupeKey: string
  kind: WaEventKind
  phoneNumberId: string | null
  /** changes[].field ("messages" for messages/statuses). */
  field: string | null
  /** change.value narrowed to this one message/status (metadata + matching contact kept). */
  payload: Obj
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

export function isWhatsAppWebhook(body: unknown): body is Obj {
  return isObj(body) && body.object === "whatsapp_business_account" && Array.isArray(body.entry)
}

/** Webhook body → one slice per message/status; other changes as raw slices. Pure. */
export function splitWebhook(body: unknown): EventSlice[] {
  if (!isWhatsAppWebhook(body)) return []
  const out: EventSlice[] = []
  for (const entry of arr(body.entry)) {
    if (!isObj(entry)) continue
    for (const change of arr(entry.changes)) {
      if (!isObj(change)) continue
      const field = str(change.field)
      const value = isObj(change.value) ? change.value : {}
      const metadata = isObj(value.metadata) ? value.metadata : null
      const pnid = metadata ? str(metadata.phone_number_id) : null
      const base: Obj = {}
      for (const k of ["messaging_product", "metadata"]) if (k in value) base[k] = value[k]

      let produced = 0
      if (field === "messages") {
        for (const m of arr(value.messages)) {
          const id = isObj(m) ? str(m.id) : null
          if (!id) continue
          const from = isObj(m) ? str(m.from) : null
          const contacts = arr(value.contacts).filter(c => isObj(c) && str(c.wa_id) === from)
          out.push({
            dedupeKey: `msg:${id}`,
            kind: "message",
            phoneNumberId: pnid,
            field,
            payload: { ...base, contacts: contacts.length ? contacts : arr(value.contacts).slice(0, 1), messages: [m] },
          })
          produced++
        }
        for (const s of arr(value.statuses)) {
          const id = isObj(s) ? str(s.id) : null
          const st = isObj(s) ? str(s.status) : null
          if (!id || !st) continue
          out.push({ dedupeKey: `st:${id}:${st}`, kind: "status", phoneNumberId: pnid, field, payload: { ...base, statuses: [s] } })
          produced++
        }
      }
      if (produced === 0) {
        // Other webhook fields (template status, account updates…) or errors-only values: keep raw.
        const payload: Obj = { ...value, _field: field ?? null }
        out.push({ dedupeKey: `raw:${sha256(JSON.stringify(payload))}`, kind: "other", phoneNumberId: pnid, field, payload })
      }
    }
  }
  return out
}

/** ≤120-char inbox preview of an inbound message. */
export function previewOf(ev: InboundMessageEvent): string {
  const label: Partial<Record<WaMessageType, string>> = {
    image: "Photo",
    document: "Document",
    audio: ev.media?.voice ? "Voice message" : "Audio",
    video: "Video",
    sticker: "Sticker",
    location: "Location",
    unsupported: "Unsupported message",
  }
  const head = label[ev.type]
  const body = ev.text ?? (ev.type === "document" ? ev.media?.filename ?? null : null)
  const s = head ? (body ? `${head}: ${body}` : head) : body ?? ""
  return s.length > 120 ? s.slice(0, 119) + "…" : s
}
