/**
 * Sending an issued quotation (STEP 6; DATA_MODEL §1.12 "Sending", §5, §7).
 *
 * WhatsApp: the stored PDF is uploaded to Meta (/{phone-number-id}/media) and sent through
 * lib/crm/outbound/send.ts (gate → ledger → row → Graph, purpose "quotation"):
 *   - customer window open → a `document` message with a short caption;
 *   - window closed → the utility template `fog_quote_document` (DOCUMENT header + 5 body params:
 *     name, number, product, total, valid-until), in the contact's language (hi → en_US fallback).
 *   The gate verdict is checked BEFORE the upload, so a refused send makes no Meta call at all.
 * Email: lib/email.ts sendCustomerEmail with the PDF attached (to = body.to or contact.email).
 *
 * Every send needs a client idempotency key; a retry with the same key never uploads or sends
 * again. On success: sends[] entry, `quotation_sent` activity, deal.lastQuotation.sentAt, the deal
 * moves forward to quotation_sent (never backwards), audit, and — on the FIRST send of a version —
 * the secondary `quotation_sent` conversion event (no-op without a click id / sync off).
 * Only the latest issued version can be sent (a superseded one answers 409 not_latest).
 */
import type { Document, ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { recordConversionEvent } from "../conversions"
import { COLL, type WaLanguage } from "../model"
import { userRefOf, type CrmActor, type LeadScope } from "../api/auth"
import { advanceStageForward } from "../leads/stage"
import { fromComposerCaption, fromTemplateParams } from "../outbound/compose"
import { checkSend, isSessionOpen, type GateInput } from "../outbound/gate"
import { uploadMedia, type GraphConfig } from "../outbound/graph"
import { sendMessage, type SendContent, type SendLogger } from "../outbound/send"
import { getQuotation } from "./service"
import { ensureIssuedPdf } from "./document"
import { formatInr } from "./money"
import { istDate, validUntilOf } from "./layout"
import { quoteFilename, quoteLabel } from "./numbering"
import type { QuoteTerms } from "./input"

export const QUOTE_TEMPLATE = "fog_quote_document"
const EMAIL_RE = /^[^\s@<>()[\],;:"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

export type SendChannel = "whatsapp" | "email"

export interface QuoteSendDeps {
  allowList: readonly string[]
  graph: GraphConfig | null
  requestId: string
  now?: () => Date
  log?: SendLogger
  ip?: string | null
  userAgent?: string | null
  sendEmail?: (args: { to: string; subject: string; text: string; attachments: { filename: string; content: Buffer; contentType: string }[] }) => Promise<{ ok: true; messageId?: string } | { ok: false; reason: string; error?: string }>
  env?: { growthSync: boolean }
}

export type QuoteSendResult =
  | { ok: true; deduped: boolean; channel: SendChannel; quotation: Document; message?: Document | null }
  | { ok: false; status: number; error: string; detail?: Record<string, unknown> }

const fail = (status: number, error: string, detail?: Record<string, unknown>): QuoteSendResult => ({ ok: false, status, error, ...(detail ? { detail } : {}) })

function productSummary(q: Document): string {
  const lines = (q.lines ?? []) as { model: string }[]
  const first = lines[0]?.model ?? "your requirement"
  return lines.length > 1 ? `${first} and ${lines.length - 1} more` : first
}

export async function sendQuotation(
  crm: CrmDb,
  actor: CrmActor,
  scope: LeadScope,
  id: ObjectId,
  req: { channel: SendChannel; clientKey: string; to?: string | null },
  deps: QuoteSendDeps,
): Promise<QuoteSendResult> {
  const now = deps.now ? deps.now() : new Date()
  const q = await getQuotation(crm, scope, id)
  if (!q) return fail(404, "not_found")
  if (q.status === "draft") return fail(409, "not_issued")
  if (q.status === "superseded") return fail(409, "not_latest")
  const me = userRefOf(actor)
  const key = `quote:${actor.userId}:${req.clientKey}`
  const label = quoteLabel(q.quoteNumber as string, Number(q.version))

  // idempotent replay (both channels)
  const prior = ((q.sends ?? []) as Document[]).find(s => s.key === key)
  if (prior) return { ok: true, deduped: true, channel: prior.channel as SendChannel, quotation: q, message: null }

  const contact = await crm.collection(COLL.contacts).findOne({ _id: q.contactId }, { projection: { name: 1, waProfileName: 1, email: 1, phoneE164: 1, language: 1 } })
  if (!contact) return fail(404, "contact_not_found")
  const name = (typeof contact.name === "string" && contact.name.trim()) || (typeof contact.waProfileName === "string" && contact.waProfileName.trim()) || "Customer"
  const validUntil = istDate(validUntilOf(q.issuedAt as Date, (q.terms as QuoteTerms).validityDays))
  const filename = quoteFilename(q.quoteNumber as string, Number(q.version))

  let messageDoc: Document | null = null
  let to: string
  if (req.channel === "email") {
    const addr = (req.to ?? (typeof contact.email === "string" ? contact.email : "")).trim()
    if (!EMAIL_RE.test(addr) || addr.length > 254) return fail(400, "validation", { fields: { to: addr ? "invalid_email" : "no_email_on_contact" } })
    const pdf = await ensureIssuedPdf(crm, q, now)
    const send = deps.sendEmail ?? (await import("../../email")).sendCustomerEmail
    const total = formatInr(Number(q.totals.grandTotal))
    const r = await send({
      to: addr,
      subject: `Quotation ${label} — 100X Circle`,
      text: `Dear ${name},\n\nPlease find attached our quotation ${label} for ${productSummary(q)}.\nTotal amount: Rs. ${total} (incl. GST). This quotation is valid until ${validUntil}.\n\nReply to this email if you have any questions.\n\nRegards,\n100X Circle`,
      attachments: [{ filename, content: pdf.data, contentType: "application/pdf" }],
    })
    if (!r.ok) {
      deps.log?.error("quotation email failed", { quotationId: id.toHexString(), reason: r.reason })
      return fail(r.reason === "not_configured" ? 503 : 502, r.reason === "not_configured" ? "email_not_configured" : "email_failed")
    }
    to = addr
  } else {
    // A replay whose message row exists (e.g. the sends[] write was lost) also never re-sends.
    const existing = await crm.collection(COLL.messages).findOne({ idempotencyKey: key }, { projection: { _id: 1, status: 1, contactId: 1 } })
    if (!existing) {
      const conv = await crm.collection(COLL.conversations).findOne({ contactId: q.contactId }, { sort: { lastInboundAt: -1 }, projection: { _id: 1, lastInboundAt: 1 } })
      const open = isSessionOpen(conv?.lastInboundAt, now)
      const captionMint = fromComposerCaption(`Quotation ${label}`)
      if (!captionMint.ok) return fail(500, "caption_invalid")
      const preferred: WaLanguage = contact.language === "hi" ? "hi" : "en_US"
      let content: SendContent | null = null
      let gateInput: GateInput
      let gate = null as Awaited<ReturnType<typeof checkSend>> | null
      if (open) {
        gateInput = { contact: q.contactId as ObjectId, conversationId: (conv?._id as ObjectId) ?? null, kind: "session_media", caption: captionMint.text, purpose: "quotation", route: "quotations.send" }
        gate = await checkSend(crm, gateInput, { allowList: deps.allowList, now, actor: me, requestId: deps.requestId })
      } else {
        const params = fromTemplateParams([name, label, productSummary(q), formatInr(Number(q.totals.grandTotal), { decimals: false }), validUntil])
        if (!params.ok) return fail(400, "validation", { fields: { [`templateParam.${params.index}`]: params.reason } })
        for (const language of preferred === "hi" ? (["hi", "en_US"] as const) : (["en_US"] as const)) {
          gateInput = { contact: q.contactId as ObjectId, conversationId: (conv?._id as ObjectId) ?? null, kind: "template", templateName: QUOTE_TEMPLATE, language, params: params.params, headerMedia: true, purpose: "quotation", route: "quotations.send" }
          gate = await checkSend(crm, gateInput, { allowList: deps.allowList, now, actor: me, requestId: deps.requestId })
          if (gate.ok || (gate.reason !== "template_unknown" && gate.reason !== "template_not_approved")) {
            content = { kind: "template", name: QUOTE_TEMPLATE, language, params: params.params }
            break
          }
        }
      }
      if (!gate || !gate.ok) {
        const g = gate as Exclude<Awaited<ReturnType<typeof checkSend>>, { ok: true }> | null
        return fail(g?.status ?? 409, g?.reason ?? "send_refused", g?.detail)
      }
      if (!deps.graph) return fail(503, "whatsapp_not_configured")
      const pdf = await ensureIssuedPdf(crm, q, now)
      const up = await uploadMedia(deps.graph, gate.phoneNumberId, { data: pdf.data, mime: "application/pdf", filename })
      if (!up.ok) {
        deps.log?.error("quotation media upload failed", { quotationId: id.toHexString(), metaCode: up.error.code, httpStatus: up.error.httpStatus, fbtraceId: up.error.fbtraceId, errKind: up.error.kind })
        return fail(502, "media_upload_failed", { code: up.error.code, title: up.error.title })
      }
      if (open) content = { kind: "media", mediaType: "document", id: up.id, mime: "application/pdf", filename, caption: captionMint.text, bytes: pdf.bytes }
      else if (content && content.kind === "template") content = { ...content, header: { type: "document", id: up.id, filename } }
      const r = await sendMessage(
        crm,
        me,
        { contactId: q.contactId as ObjectId, conversationId: (conv?._id as ObjectId) ?? null, idempotencyKey: key, purpose: "quotation", route: "quotations.send", content: content as SendContent },
        { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log, ip: deps.ip, userAgent: deps.userAgent },
      )
      if (!r.ok) return fail(r.status, r.error, { ...(r.detail ?? {}), ...(r.message ? { messageId: String(r.message._id) } : {}) })
      messageDoc = r.message
    } else {
      if (String(existing.contactId) !== String(q.contactId)) return fail(409, "idempotency_conflict")
      // A failed attempt stays failed: resending is a deliberate new request with a new key.
      if (existing.status === "failed") return fail(502, "send_failed", { messageId: String(existing._id) })
      messageDoc = existing
    }
    to = String(contact.phoneE164 ?? "")
  }

  // ── record (sends[] is the per-version first-send detector) ──
  const firstOfVersion = ((q.sends ?? []) as Document[]).length === 0
  const entry = { channel: req.channel, at: now, by: me, to, key, ...(messageDoc ? { messageId: messageDoc._id } : {}) }
  const push: Document = { $push: { sends: entry }, $set: { updatedAt: now } }
  await crm.collection(COLL.quotations).updateOne({ _id: id }, push)
  await crm.collection(COLL.activities).insertOne({
    contactId: q.contactId,
    dealId: q.dealId,
    kind: "quotation_sent",
    at: now,
    by: me,
    summary: `Quotation ${label} sent by ${req.channel === "email" ? "email" : "WhatsApp"}`,
    data: { quotationId: id, quoteNumber: q.quoteNumber, version: Number(q.version), channel: req.channel, ...(messageDoc ? { messageId: messageDoc._id } : {}) },
  })
  const lastQuotation = { quotationId: id, quoteNumber: q.quoteNumber, version: Number(q.version), grandTotal: Number(q.totals.grandTotal), sentAt: now }
  await crm.collection(COLL.deals).updateOne(
    { _id: q.dealId, $or: [{ "lastQuotation.quotationId": { $ne: id } }, { "lastQuotation.sentAt": null }] },
    { $set: { lastQuotation, updatedAt: now } },
  )
  await advanceStageForward(crm, q.dealId as ObjectId, "quotation_sent", me, now, `quotation ${label} sent`)
  await logCrmAction(crm, me, "quotation.send", { type: "quotation", id: id.toHexString() }, {
    after: { channel: req.channel, quoteNumber: q.quoteNumber, version: Number(q.version), firstOfVersion, messageId: messageDoc ? String(messageDoc._id) : null, requestId: deps.requestId },
    ip: deps.ip ?? null,
    userAgent: deps.userAgent ?? null,
  })
  if (firstOfVersion) {
    try {
      const deal = await crm.collection(COLL.deals).findOne({ _id: q.dealId }, { projection: { contactId: 1, lastQuotation: 1 } })
      if (deal) await recordConversionEvent(crm, { _id: deal._id, contactId: deal.contactId, lastQuotation: { ...lastQuotation } }, "quotation_sent", deps.env, { now })
    } catch (e) {
      deps.log?.error("quotation conversion event failed", { quotationId: id.toHexString(), error: e instanceof Error ? e.name : "unknown" })
    }
  }
  const fresh = await crm.collection(COLL.quotations).findOne({ _id: id })
  return { ok: true, deduped: false, channel: req.channel, quotation: fresh ?? q, message: messageDoc }
}
