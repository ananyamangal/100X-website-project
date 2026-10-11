/**
 * /api/crm/inbox/* (STEP 5). Must never import lib/crm/notes (static test): the inbox shows
 * WhatsApp messages and conversation previews only; internal notes have their own route.
 *
 * Visibility = lead scope: crm.leads.view_all → every conversation; crm.leads.view_assigned →
 * conversations assigned to the user, or whose contact (or one of its deals) is assigned to them;
 * neither → 403 on lists, 404 on single conversations.
 *
 * Polling (30 s, tab visible): list / messages / summary answer `ETag` + `Cache-Control: private,
 * no-cache`; a matching `If-None-Match` is a 304 after ONE indexed findOne (index `updated`).
 * Conversation `updatedAt` moves on every inbound, status tick, send, read, assign and resolve.
 * `since=<ISO>` returns only conversations changed after it (+ `serverTime` for the next poll).
 *
 * Sends go through lib/crm/outbound/send.ts (gate → ledger → row → Graph). Every send needs a
 * client `idempotencyKey` (8–128 of [A-Za-z0-9_:.-]); a retry with the same key never sends twice.
 */
import { createHash } from "node:crypto"
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, CRM_DEFAULTS, STAGES, type CrmPermission, type OutboundText, type Stage } from "../model"
import { readCrmEnv, type CrmEnv } from "../env"
import { logCrmAction } from "../audit"
import { can, crmError, crmJson, leadScopeOf, userRefOf, type CrmActor, type LeadScope } from "./auth"
import { isHexId, readJsonObject } from "../validate"
import { CONTACT_SUMMARY_FIELDS, MESSAGE_FIELDS, contactVisible, toClient } from "../leads/query"
import { assignableOf, auditCtx, idParam, nowOf, route, type CrmApiDeps } from "./route"
import { fromComposer, fromComposerCaption, fromTemplateParams } from "../outbound/compose"
import { isSessionOpen, windowOpenUntilOf } from "../outbound/gate"
import { graphConfigFrom } from "../outbound/graph"
import { sendMessage, type SendContent, type SendResult } from "../outbound/send"
import { uploadToCloudinary } from "../../cloudinaryUpload"
import { drainStaleEvents } from "../whatsapp/ingest"

const proj = (fields: readonly string[]): Record<string, 1> => Object.fromEntries(fields.map(f => [f, 1]))
const CONTACT_INBOX_FIELDS = [...CONTACT_SUMMARY_FIELDS, "language"] as const
const CONV_FIELDS = [
  "contactId", "phoneNumberId", "status", "hasUnread", "unreadCount", "lastMessageAt", "lastInboundAt", "lastOutboundAt",
  "lastMessagePreview", "assignedTo", "stage", "resolvedAt", "resolvedBy", "updatedAt",
] as const
const POLL_HEADERS = { "Cache-Control": "private, no-cache" }
const IDEM = /^[\w:.\-]{8,128}$/
const envOf = (deps: CrmApiDeps): CrmEnv => deps.env ?? readCrmEnv()

// ─────────────────────────────────────────────────────────────────────────────
// Scope + views
// ─────────────────────────────────────────────────────────────────────────────

/** Mongo filter limiting conversations to the actor's lead scope (null = everything). */
async function scopeFilter(crm: CrmDb, scope: LeadScope): Promise<Document | null> {
  if (scope.kind === "all") return null
  if (scope.kind === "none") return { _id: { $exists: false } }
  const [contactIds, dealContactIds] = await Promise.all([
    crm.collection(COLL.contacts).distinct("_id", { "assignedTo.userId": scope.userId }),
    crm.collection(COLL.deals).distinct("contactId", { "assignedTo.userId": scope.userId }),
  ])
  const ids = Array.from(new Map([...contactIds, ...dealContactIds].map(id => [String(id), id])).values())
  return { $or: [{ "assignedTo.userId": scope.userId }, ...(ids.length ? [{ contactId: { $in: ids } }] : [])] }
}

async function conversationVisible(crm: CrmDb, scope: LeadScope, conv: Document): Promise<boolean> {
  if (scope.kind === "all") return true
  if (scope.kind === "none") return false
  if (conv.assignedTo && String(conv.assignedTo.userId) === scope.userId) return true
  const contact = await crm.collection(COLL.contacts).findOne({ _id: conv.contactId }, { projection: { assignedTo: 1 } })
  return !!contact && (await contactVisible(crm, scope, contact))
}

function windowView(lastInboundAt: unknown, now: Date) {
  const until = windowOpenUntilOf(lastInboundAt)
  return {
    open: isSessionOpen(lastInboundAt, now),
    openUntil: until ? until.toISOString() : null,
    /** Free-form sends stop 10 min before the 24h window closes (DATA_MODEL §4). */
    freeFormUntil: until ? new Date(until.getTime() - CRM_DEFAULTS.windowSafetyMarginMs).toISOString() : null,
  }
}

function conversationView(conv: Document, contact: Document | null | undefined, now: Date) {
  const c = toClient(conv) as Record<string, unknown>
  return {
    ...c,
    window: windowView(conv.lastInboundAt, now),
    contact: contact ? toClient(contact) : null,
  }
}

async function contactsById(crm: CrmDb, ids: ObjectId[]): Promise<Map<string, Document>> {
  if (!ids.length) return new Map()
  const rows = await crm.collection(COLL.contacts).find({ _id: { $in: ids } }, { projection: proj(CONTACT_INBOX_FIELDS) }).toArray()
  return new Map(rows.map(r => [String(r._id), r]))
}

async function messageView(crm: CrmDb, id: ObjectId): Promise<unknown> {
  const m = await crm.collection(COLL.messages).findOne({ _id: id }, { projection: proj(MESSAGE_FIELDS) })
  return m ? toClient(m) : null
}

/** Latest conversation change (index `updated`): the cheap poll validator. */
async function latestChange(crm: CrmDb, extra: Document = {}): Promise<number> {
  const row = await crm.collection(COLL.conversations).findOne(extra, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } })
  return row?.updatedAt instanceof Date ? row.updatedAt.getTime() : 0
}

function etagOf(parts: (string | number)[]): string {
  return `W/"${createHash("sha256").update(parts.join("|")).digest("base64url").slice(0, 27)}"`
}

function notModified(request: Request, etag: string, requestId: string): Response | null {
  const inm = request.headers.get("if-none-match")
  if (!inm || !inm.split(",").map(s => s.trim()).includes(etag)) return null
  return new Response(null, { status: 304, headers: { ...POLL_HEADERS, ETag: etag, "x-request-id": requestId } })
}

function withPoll(res: Response, etag: string): Response {
  res.headers.set("Cache-Control", POLL_HEADERS["Cache-Control"])
  res.headers.set("ETag", etag)
  return res
}

const forbiddenScope = (requestId: string) => crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/crm/inbox/conversations
// ─────────────────────────────────────────────────────────────────────────────

type ListParams = {
  assignee: "me" | "unassigned" | string | null
  stage: Stage | null
  status: "open" | "resolved" | "all"
  unread: boolean
  limit: number
  cursor: { u: boolean; t: number; id: string } | null
  since: Date | null
}

function parseListParams(sp: URLSearchParams): { ok: true; p: ListParams } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  const assignee = sp.get("assignee")
  if (assignee && assignee !== "me" && assignee !== "unassigned" && !isHexId(assignee) && !/^[\w-]{1,64}$/.test(assignee)) fields.assignee = "invalid"
  const stage = sp.get("stage")
  if (stage && !(STAGES as readonly string[]).includes(stage)) fields.stage = "invalid"
  const status = sp.get("status") ?? "open"
  if (!["open", "resolved", "all"].includes(status)) fields.status = "invalid"
  const unread = sp.get("unread")
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 30
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fields.limit = "invalid_number"
  let cursor: ListParams["cursor"] = null
  const rawCursor = sp.get("cursor")
  if (rawCursor) {
    try {
      const c = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8"))
      if (typeof c?.u !== "boolean" || !Number.isFinite(c?.t) || !isHexId(c?.id)) throw new Error("bad")
      cursor = { u: c.u, t: c.t, id: c.id }
    } catch {
      fields.cursor = "invalid"
    }
  }
  let since: Date | null = null
  const rawSince = sp.get("since")
  if (rawSince) {
    since = new Date(rawSince)
    if (Number.isNaN(since.getTime())) fields.since = "invalid_date"
  }
  if (Object.keys(fields).length) return { ok: false, fields }
  return {
    ok: true,
    p: {
      assignee: assignee || null,
      stage: (stage as Stage) || null,
      status: status as ListParams["status"],
      unread: unread === "1" || unread === "true",
      limit,
      cursor,
      since,
    },
  }
}

export const listConversationsHandler = route("inbox.list", ["crm.inbox.view"], async ({ request, deps, requestId, actor, log }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return forbiddenScope(requestId)
  const sp = new URL(request.url).searchParams
  const parsed = parseListParams(sp)
  if (!parsed.ok) return crmError(400, "validation", requestId, { fields: parsed.fields })
  const p = parsed.p
  const crm = await deps.getDb()
  const now = nowOf(deps)

  // Cheap validator first. Assigned scope also depends on deal/contact assignment, which does not
  // touch conversations, so it is folded in by never caching across a scope change (user id + kind).
  const etag = etagOf(["inbox.list", actor.userId, scope.kind, sp.toString(), await latestChange(crm)])
  const nm = notModified(request, etag, requestId)
  if (nm && scope.kind === "all") return nm

  const and: Document[] = []
  const sf = await scopeFilter(crm, scope)
  if (sf) and.push(sf)
  if (p.status !== "all") and.push({ status: p.status })
  if (p.stage) and.push({ stage: p.stage })
  if (p.unread) and.push({ hasUnread: true })
  if (p.assignee === "me") and.push({ "assignedTo.userId": actor.userId })
  else if (p.assignee === "unassigned") and.push({ assignedTo: null })
  else if (p.assignee) and.push({ "assignedTo.userId": p.assignee })
  if (p.since) and.push({ updatedAt: { $gt: p.since } })
  else if (p.cursor) {
    const t = new Date(p.cursor.t)
    const id = new ObjectId(p.cursor.id)
    and.push({
      $or: [
        { hasUnread: { $lt: p.cursor.u } },
        { hasUnread: p.cursor.u, lastMessageAt: { $lt: t } },
        { hasUnread: p.cursor.u, lastMessageAt: t, _id: { $lt: id } },
      ],
    })
  }
  const filter = and.length ? { $and: and } : {}
  const limit = p.since ? 100 : p.limit
  const rows = await crm
    .collection(COLL.conversations)
    .find(filter, { sort: { hasUnread: -1, lastMessageAt: -1, _id: -1 }, limit: limit + 1, projection: proj(CONV_FIELDS) })
    .toArray()
  const page = rows.slice(0, limit)
  const contacts = await contactsById(crm, page.map(r => r.contactId as ObjectId))
  const last = page[page.length - 1]
  const nextCursor =
    !p.since && rows.length > limit && last
      ? Buffer.from(JSON.stringify({ u: last.hasUnread === true, t: (last.lastMessageAt as Date).getTime(), id: String(last._id) })).toString("base64url")
      : null
  log.info("inbox listed", { count: page.length, leadScope: scope.kind, since: !!p.since })
  return withPoll(
    crmJson({ items: page.map(r => conversationView(r, contacts.get(String(r.contactId)), now)), nextCursor, serverTime: now.toISOString() }, requestId),
    etag,
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/crm/inbox/conversations/:id/messages?before=&limit=&since=&markRead=1
// ─────────────────────────────────────────────────────────────────────────────

async function loadVisibleConversation(crm: CrmDb, actor: CrmActor, id: ObjectId): Promise<Document | null> {
  const conv = await crm.collection(COLL.conversations).findOne({ _id: id }, { projection: proj(CONV_FIELDS) })
  if (!conv || !(await conversationVisible(crm, leadScopeOf(actor), conv))) return null
  return conv
}

export const listMessagesHandler = route("inbox.messages", ["crm.inbox.view"], async ({ request, ctx, deps, requestId, actor }) => {
  if (leadScopeOf(actor).kind === "none") return forbiddenScope(requestId)
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const sp = new URL(request.url).searchParams
  const fields: Record<string, string> = {}
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fields.limit = "invalid_number"
  let before: { t: Date; id: ObjectId } | null = null
  const rawBefore = sp.get("before")
  if (rawBefore) {
    const m = /^(\d{1,15})\.([a-f0-9]{24})$/i.exec(rawBefore)
    if (!m) fields.before = "invalid"
    else before = { t: new Date(Number(m[1])), id: new ObjectId(m[2]) }
  }
  let since: Date | null = null
  if (sp.get("since")) {
    since = new Date(String(sp.get("since")))
    if (Number.isNaN(since.getTime())) fields.since = "invalid_date"
  }
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const markRead = sp.get("markRead") === "1" || sp.get("markRead") === "true"

  const crm = await deps.getDb()
  const now = nowOf(deps)
  let conv = await loadVisibleConversation(crm, actor, id)
  if (!conv) return crmError(404, "not_found", requestId)

  if (markRead && conv.hasUnread) {
    await crm.collection(COLL.conversations).updateOne({ _id: id }, { $set: { hasUnread: false, unreadCount: 0, updatedAt: now } })
    conv = { ...conv, hasUnread: false, unreadCount: 0, updatedAt: now }
  }
  const etag = etagOf(["inbox.messages", actor.userId, sp.toString(), conv.updatedAt instanceof Date ? conv.updatedAt.getTime() : 0])
  const nm = notModified(request, etag, requestId)
  if (nm) return nm

  const filter: Document = { conversationId: id }
  if (since) filter.createdAt = { $gt: since }
  else if (before) filter.$or = [{ createdAt: { $lt: before.t } }, { createdAt: before.t, _id: { $lt: before.id } }]
  const rows = await crm
    .collection(COLL.messages)
    .find(filter, { sort: { createdAt: -1, _id: -1 }, limit: limit + 1, projection: proj(MESSAGE_FIELDS) })
    .toArray()
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  const contact = await crm.collection(COLL.contacts).findOne({ _id: conv.contactId }, { projection: proj(CONTACT_INBOX_FIELDS) })
  const optedOut = contact?.phoneE164 ? !!(await crm.collection(COLL.optOuts).findOne({ phoneE164: contact.phoneE164 }, { projection: { _id: 1 } })) : false
  return withPoll(
    crmJson(
      {
        conversation: { ...conversationView(conv, contact, now), optedOut },
        messages: page.map(toClient),
        nextBefore: !since && rows.length > limit && last ? `${(last.createdAt as Date).getTime()}.${String(last._id)}` : null,
        serverTime: now.toISOString(),
      },
      requestId,
    ),
    etag,
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Sends: reply / template / media
// ─────────────────────────────────────────────────────────────────────────────

function sendDepsOf(deps: CrmApiDeps, request: Request, requestId: string, log: { info: (m: string, f?: Record<string, string | number | boolean | null>) => void; error: (m: string, f?: Record<string, string | number | boolean | null>) => void }) {
  const env = envOf(deps)
  return {
    allowList: env.waPhoneNumberIds,
    graph: graphConfigFrom(env, deps.fetch),
    requestId,
    now: deps.now,
    log,
    ...auditCtx(request),
  }
}

async function sendResponse(crm: CrmDb, r: SendResult, requestId: string): Promise<Response> {
  if (r.ok) return crmJson({ deduped: r.deduped, message: await messageView(crm, r.message._id as ObjectId) }, requestId, r.deduped ? 200 : 201)
  const message = r.message ? await messageView(crm, r.message._id as ObjectId) : undefined
  return crmError(r.status, r.error, requestId, { ...(r.detail ? { detail: r.detail } : {}), ...(message ? { message } : {}) })
}

const idemKey = (kind: string, actor: CrmActor, raw: unknown): string | null =>
  typeof raw === "string" && IDEM.test(raw) ? `${kind}:${actor.userId}:${raw}` : null

/** POST …/reply {text, idempotencyKey, contextWaMessageId?} — crm.inbox.reply. */
export const replyHandler = route("inbox.reply", ["crm.inbox.reply"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 32 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const fields: Record<string, string> = {}
  const key = idemKey("reply", actor, body.idempotencyKey)
  if (!key) fields.idempotencyKey = "invalid"
  const t = typeof body.text === "string" ? fromComposer(body.text) : { ok: false as const, reason: "not_text" as const }
  if (!t.ok) fields.text = t.reason === "empty" ? "required" : t.reason
  const ctxId = body.contextWaMessageId
  if (ctxId !== undefined && ctxId !== null && (typeof ctxId !== "string" || !/^[\w.=:-]{1,200}$/.test(ctxId))) fields.contextWaMessageId = "invalid"
  if (Object.keys(fields).length || !t.ok || !key) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const conv = await loadVisibleConversation(crm, actor, id)
  if (!conv) return crmError(404, "not_found", requestId)
  const r = await sendMessage(
    crm,
    userRefOf(actor),
    {
      contactId: conv.contactId,
      conversationId: id,
      idempotencyKey: key,
      route: "inbox.reply",
      content: { kind: "text", text: t.text, contextWaMessageId: typeof ctxId === "string" ? ctxId : null },
    },
    sendDepsOf(deps, request, requestId, log),
  )
  return sendResponse(crm, r, requestId)
})

/** POST …/template {name, language, params[], idempotencyKey} — crm.inbox.reply. */
export const templateHandler = route("inbox.template", ["crm.inbox.reply"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 32 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const fields: Record<string, string> = {}
  const key = idemKey("tpl", actor, body.idempotencyKey)
  if (!key) fields.idempotencyKey = "invalid"
  const name = typeof body.name === "string" && /^[a-z0-9_]{1,512}$/.test(body.name) ? body.name : null
  if (!name) fields.name = "invalid"
  const language = typeof body.language === "string" && /^[a-z]{2,3}(_[A-Z]{2})?$/.test(body.language) ? body.language : null
  if (!language) fields.language = "invalid"
  const raw = body.params ?? []
  let params: ReturnType<typeof fromTemplateParams> | null = null
  if (!Array.isArray(raw) || raw.length > 20 || !raw.every((x): x is string => typeof x === "string")) fields.params = "invalid"
  else {
    const strings: string[] = raw
    params = fromTemplateParams(strings)
    if (!params.ok) fields[`params.${params.index}`] = params.reason
  }
  if (Object.keys(fields).length || !key || !name || !language || !params || !params.ok) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const conv = await loadVisibleConversation(crm, actor, id)
  if (!conv) return crmError(404, "not_found", requestId)
  const r = await sendMessage(
    crm,
    userRefOf(actor),
    { contactId: conv.contactId, conversationId: id, idempotencyKey: key, route: "inbox.template", content: { kind: "template", name, language, params: params.params } },
    sendDepsOf(deps, request, requestId, log),
  )
  return sendResponse(crm, r, requestId)
})

/** WhatsApp media limits (Cloud API): image 5 MB (jpeg/png), audio 16 MB, documents capped at 16 MB here. */
export const MEDIA_UPLOAD_MAX_BYTES = 16 * 1024 * 1024
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_MIMES = new Set(["image/jpeg", "image/png"])
const AUDIO_MIMES = new Set(["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"])
const DOC_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

function mediaTypeOf(mime: string): "image" | "audio" | "document" | null {
  const m = mime.split(";")[0].trim().toLowerCase()
  if (IMAGE_MIMES.has(m)) return "image"
  if (AUDIO_MIMES.has(m)) return "audio"
  if (DOC_MIMES.has(m)) return "document"
  return null
}

const safeFilename = (s: string) => s.replace(/[\\/\0\r\n]/g, "_").trim().slice(0, 120) || "file"

/** Only links to this site's Cloudinary (the composer uploads there first). */
export function isAllowedMediaLink(link: string): boolean {
  try {
    const u = new URL(link)
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && !u.username && !u.password
  } catch {
    return false
  }
}

/**
 * POST …/media — crm.inbox.reply. Either multipart `file` (+ `caption`, `idempotencyKey`), uploaded
 * server-side via lib/cloudinaryUpload (NOTE: Vercel caps request bodies at ~4.5 MB), or JSON
 * {link (res.cloudinary.com https), mime, filename?, bytes?, caption?, idempotencyKey} for files the
 * browser already uploaded. Images ≤ 5 MB (jpeg/png), audio and documents ≤ 16 MB.
 */
export const mediaHandler = route("inbox.media", ["crm.inbox.reply"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const fields: Record<string, string> = {}
  let file: File | null = null
  let link: string | null = null
  let mime = ""
  let filename: string | null = null
  let bytes: number | null = null
  let rawCaption: unknown = null
  let rawKey: unknown = null

  const ctype = request.headers.get("content-type") ?? ""
  if (ctype.toLowerCase().startsWith("multipart/form-data")) {
    const len = Number(request.headers.get("content-length") ?? "0")
    if (Number.isFinite(len) && len > MEDIA_UPLOAD_MAX_BYTES + 64 * 1024) return crmError(413, "file_too_large", requestId, { maxBytes: MEDIA_UPLOAD_MAX_BYTES })
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return crmError(400, "invalid_form", requestId)
    }
    const f = form.get("file")
    if (!(f instanceof File)) fields.file = "required"
    else {
      file = f
      mime = f.type || ""
      filename = safeFilename(f.name || "file")
      bytes = f.size
    }
    rawCaption = form.get("caption")
    rawKey = form.get("idempotencyKey")
  } else {
    const body = await readJsonObject(request, 16 * 1024)
    if (!body) return crmError(400, "invalid_json", requestId)
    if (typeof body.link !== "string" || !isAllowedMediaLink(body.link)) fields.link = "invalid"
    else link = body.link
    mime = typeof body.mime === "string" ? body.mime : ""
    filename = typeof body.filename === "string" && body.filename.trim() ? safeFilename(body.filename) : null
    bytes = typeof body.bytes === "number" && Number.isFinite(body.bytes) ? body.bytes : null
    rawCaption = body.caption ?? null
    rawKey = body.idempotencyKey
  }
  const key = idemKey("media", actor, rawKey)
  if (!key) fields.idempotencyKey = "invalid"
  const mediaType = mediaTypeOf(mime)
  if (!mediaType) fields.mime = "unsupported"
  if (bytes !== null && (bytes > MEDIA_UPLOAD_MAX_BYTES || (mediaType === "image" && bytes > IMAGE_MAX_BYTES))) fields.file = "too_large"
  let caption: OutboundText | null = null
  if (typeof rawCaption === "string" && rawCaption.trim()) {
    if (mediaType === "audio") fields.caption = "not_supported_for_audio"
    else {
      const c = fromComposerCaption(rawCaption)
      if (!c.ok) fields.caption = c.reason
      else caption = c.text
    }
  }
  if (Object.keys(fields).length || !key || !mediaType) return crmError(400, "validation", requestId, { fields })

  const crm = await deps.getDb()
  const conv = await loadVisibleConversation(crm, actor, id)
  if (!conv) return crmError(404, "not_found", requestId)

  // A retried request with the same key must not upload again either.
  const prior = await crm.collection(COLL.messages).findOne({ idempotencyKey: key }, { projection: { _id: 1, contactId: 1 } })
  if (!prior && file) {
    try {
      const upload = deps.uploadMedia ?? uploadToCloudinary
      link = await upload(file, mediaType === "image" ? "image" : mediaType === "audio" ? "video" : "raw")
    } catch {
      log.error("composer upload failed", { conversationId: id.toHexString() })
      return crmError(502, "upload_failed", requestId)
    }
    if (!link || !/^https:\/\//i.test(link)) return crmError(502, "upload_failed", requestId)
  }
  const content: SendContent = { kind: "media", mediaType, link: link ?? undefined, mime, filename, caption, bytes }
  const r = await sendMessage(
    crm,
    userRefOf(actor),
    { contactId: conv.contactId, conversationId: id, idempotencyKey: key, route: "inbox.media", content },
    sendDepsOf(deps, request, requestId, log),
  )
  return sendResponse(crm, r, requestId)
})

// ─────────────────────────────────────────────────────────────────────────────
// Assign / resolve / reopen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST …/assign {assignedTo: userId | null} — crm.inbox.view + crm.leads.assign; assigning to
 * yourself also works with crm.inbox.reply. The assignee must be an assignable CRM user.
 */
export const assignHandler = route("inbox.assign", ["crm.inbox.view"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const target = body.assignedTo
  if (target !== null && (typeof target !== "string" || !/^[\w-]{1,64}$/.test(target))) return crmError(400, "validation", requestId, { fields: { assignedTo: "invalid" } })
  const self = target === actor.userId
  const needed: CrmPermission = self && !can(actor, "crm.leads.assign") ? "crm.inbox.reply" : "crm.leads.assign"
  if (!can(actor, needed)) return crmError(403, "forbidden", requestId, { required: [needed] })
  const crm = await deps.getDb()
  const conv = await loadVisibleConversation(crm, actor, id)
  if (!conv) return crmError(404, "not_found", requestId)
  let assignedTo: { userId: string; name: string } | null = null
  if (target !== null) {
    const user = (await assignableOf(deps)()).find(u => u.id === target)
    if (!user) return crmError(400, "validation", requestId, { fields: { assignedTo: "not_assignable" } })
    assignedTo = { userId: user.id, name: user.name }
  }
  const now = nowOf(deps)
  await crm.collection(COLL.conversations).updateOne({ _id: id }, { $set: { assignedTo, updatedAt: now } })
  await crm.collection(COLL.activities).insertOne({
    contactId: conv.contactId,
    dealId: null,
    kind: "assignment",
    at: now,
    by: userRefOf(actor),
    summary: assignedTo ? `Conversation assigned to ${assignedTo.name}` : "Conversation unassigned",
    data: { conversationId: id, assignedTo: assignedTo ? assignedTo.userId : null },
  })
  await logCrmAction(crm, userRefOf(actor), "conversation.assign", { type: "conversation", id: id.toHexString() }, {
    before: { assignedTo: conv.assignedTo ? String(conv.assignedTo.userId) : null },
    after: { assignedTo: assignedTo ? assignedTo.userId : null },
    ...auditCtx(request),
  })
  log.info("conversation assigned", { conversationId: id.toHexString(), assigned: !!assignedTo })
  return crmJson({ conversation: conversationView({ ...conv, assignedTo, updatedAt: now }, null, now) }, requestId)
})

function statusHandler(action: "resolve" | "reopen") {
  return route(`inbox.${action}`, ["crm.inbox.reply"], async ({ request, ctx, deps, requestId, actor, log }) => {
    const id = await idParam(ctx)
    if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
    const crm = await deps.getDb()
    const conv = await loadVisibleConversation(crm, actor, id)
    if (!conv) return crmError(404, "not_found", requestId)
    const now = nowOf(deps)
    const me = userRefOf(actor)
    const set =
      action === "resolve"
        ? { status: "resolved", resolvedAt: now, resolvedBy: me, hasUnread: false, unreadCount: 0, updatedAt: now }
        : { status: "open", resolvedAt: null, resolvedBy: null, updatedAt: now }
    const res = await crm.collection(COLL.conversations).updateOne({ _id: id, status: action === "resolve" ? "open" : "resolved" }, { $set: set })
    if (res.modifiedCount) {
      await logCrmAction(crm, me, `conversation.${action}`, { type: "conversation", id: id.toHexString() }, { before: { status: conv.status }, after: { status: set.status }, ...auditCtx(request) })
      log.info(`conversation ${action}d`, { conversationId: id.toHexString() })
    }
    const updated = res.modifiedCount ? { ...conv, ...set } : conv
    return crmJson({ changed: res.modifiedCount === 1, conversation: conversationView(updated, null, now) }, requestId)
  })
}
export const resolveHandler = statusHandler("resolve")
export const reopenHandler = statusHandler("reopen")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/crm/inbox/summary — nav badge
// ─────────────────────────────────────────────────────────────────────────────

export const inboxSummaryHandler = route("inbox.summary", ["crm.inbox.view"], async ({ request, deps, requestId, actor, log }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return forbiddenScope(requestId)
  const crm = await deps.getDb()
  const now = nowOf(deps)

  // DATA_MODEL §1.7: each inbox poll also sweeps ≤5 stale pending webhook events, in after(),
  // and only when one is actually due (one indexed findOne otherwise).
  if (deps.schedule) {
    const due = await crm.collection(COLL.waEvents).findOne({ allowed: true, status: "pending", nextAttemptAt: { $lte: now } }, { projection: { _id: 1 } })
    if (due) {
      const env = envOf(deps)
      deps.schedule(async () => {
        try {
          await drainStaleEvents(crm, { allowList: env.waPhoneNumberIds, accessToken: env.waAccessToken, apiVersion: env.waApiVersion, fetch: deps.fetch, requestId, leaseOwner: `poll:${requestId}` })
        } catch (e) {
          log.error("poll sweep failed", { error: e instanceof Error ? e.name : "unknown" })
        }
      })
    }
  }

  const etag = etagOf(["inbox.summary", actor.userId, scope.kind, await latestChange(crm)])
  const nm = notModified(request, etag, requestId)
  if (nm && scope.kind === "all") return nm

  const sf = await scopeFilter(crm, scope)
  const base: Document = { status: "open", ...(sf ? { $and: [sf] } : {}) }
  const [unread] = await crm
    .collection(COLL.conversations)
    .aggregate([{ $match: { ...base, hasUnread: true } }, { $group: { _id: null, conversations: { $sum: 1 }, messages: { $sum: "$unreadCount" } } }])
    .toArray()
  const mine = await crm.collection(COLL.conversations).countDocuments({ ...base, hasUnread: true, "assignedTo.userId": actor.userId })
  return withPoll(
    crmJson(
      {
        unreadConversations: unread?.conversations ?? 0,
        unreadMessages: unread?.messages ?? 0,
        unreadAssignedToMe: mine,
        serverTime: now.toISOString(),
      },
      requestId,
    ),
    etag,
  )
})
