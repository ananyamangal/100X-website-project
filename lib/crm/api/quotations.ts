/**
 * /api/crm/quotations/* and /api/crm/deals/:id/quotations (STEP 6). Imports no notes module (the
 * internal-note tripwire runs through lib/crm/outbound/gate.ts findInternalNoteMatch).
 *
 * Permissions: reading needs crm.view + a lead scope over the deal; drafting, issuing, revising and
 * discarding need crm.quotes.create. Out-of-scope quotations answer 404.
 */
import { crmError, crmJson, leadScopeOf } from "./auth"
import { readJsonObject } from "../validate"
import { parseQuoteInput } from "../quotes/input"
import {
  createDraft, discardDraft, getQuotation, issueQuotation, listDealQuotations, quotationView, reviseQuotation, updateDraft,
  type QuoteDeps, type QuoteResult,
} from "../quotes/service"
import { auditCtx, idParam, nowOf, route, type CrmApiDeps } from "./route"
import { ensureIssuedPdf, renderQuotation } from "../quotes/document"
import { quoteFilename } from "../quotes/numbering"
import { sendQuotation } from "../quotes/send"
import { readCrmEnv } from "../env"
import { graphConfigFrom } from "../outbound/graph"

const forbiddenScope = (requestId: string) => crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })

function quoteDeps(deps: CrmApiDeps, request: Request): QuoteDeps {
  return { now: nowOf(deps), ...auditCtx(request), ...(deps.afterQuoteIssue ? { afterIssue: deps.afterQuoteIssue } : {}) }
}

function respond(r: QuoteResult, requestId: string, okStatus = 200): Response {
  if (!r.ok) return crmError(r.status, r.error, requestId, r.detail ? { detail: r.detail } : {})
  return crmJson({ quotation: quotationView(r.quotation) }, requestId, okStatus)
}

/** GET /api/crm/deals/:id/quotations — every version, newest first. */
export const listDealQuotationsHandler = route("quotations.list", [], async ({ ctx, deps, requestId, actor }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return forbiddenScope(requestId)
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const rows = await listDealQuotations(crm, scope, id)
  if (!rows) return crmError(404, "not_found", requestId)
  return crmJson({ items: rows.map(quotationView) }, requestId)
})

/** POST /api/crm/deals/:id/quotations {lines, terms?} — new draft. */
export const createQuotationHandler = route("quotations.create", ["crm.quotes.create"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 128 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseQuoteInput(body, { requireLines: true })
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const r = await createDraft(crm, actor, leadScopeOf(actor), id, p.input, quoteDeps(deps, request))
  if (r.ok) log.info("quotation drafted", { dealId: id.toHexString(), quotationId: String(r.quotation._id) })
  return respond(r, requestId, 201)
})

/** GET /api/crm/quotations/:id */
export const getQuotationHandler = route("quotations.get", [], async ({ ctx, deps, requestId, actor }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return forbiddenScope(requestId)
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const q = await getQuotation(crm, scope, id)
  if (!q) return crmError(404, "not_found", requestId)
  return crmJson({ quotation: quotationView(q) }, requestId)
})

/** PATCH /api/crm/quotations/:id {lines?, terms?} — drafts only. */
export const updateQuotationHandler = route("quotations.update", ["crm.quotes.create"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 128 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseQuoteInput(body, { requireLines: false })
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  return respond(await updateDraft(crm, actor, leadScopeOf(actor), id, p.input, quoteDeps(deps, request)), requestId)
})

/** DELETE /api/crm/quotations/:id — drafts only; issued / superseded quotations are never deleted. */
export const discardQuotationHandler = route("quotations.discard", ["crm.quotes.create"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const r = await discardDraft(crm, actor, leadScopeOf(actor), id, quoteDeps(deps, request))
  if (!r.ok) return crmError(r.status, r.error, requestId)
  return crmJson({ discarded: true, id: r.quotation.id }, requestId)
})

/** POST /api/crm/quotations/:id/issue — allocates the number (version 1) or supersedes version n-1. */
export const issueQuotationHandler = route("quotations.issue", ["crm.quotes.create"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const r = await issueQuotation(crm, actor, leadScopeOf(actor), id, quoteDeps(deps, request))
  if (r.ok) log.info("quotation issued", { quotationId: id.toHexString(), version: Number(r.quotation.version) })
  return respond(r, requestId)
})

/** POST /api/crm/quotations/:id/revise — new draft, same number, version + 1. */
export const reviseQuotationHandler = route("quotations.revise", ["crm.quotes.create"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  return respond(await reviseQuotation(crm, actor, leadScopeOf(actor), id, quoteDeps(deps, request)), requestId, 201)
})

/** Issue hook used by the issue route: render + store the PDF right away (best-effort). */
export const renderPdfAfterIssue: NonNullable<CrmApiDeps["afterQuoteIssue"]> = async (quotation, crm) => {
  await ensureIssuedPdf(crm, quotation)
}

/**
 * GET /api/crm/quotations/:id/pdf — issued/superseded: the stored copy (rendered + stored on first
 * use); draft: a watermarked preview, not stored. Private, never cached.
 */
export const quotationPdfHandler = route("quotations.pdf", [], async ({ ctx, deps, requestId, actor, log }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return forbiddenScope(requestId)
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const crm = await deps.getDb()
  const q = await getQuotation(crm, scope, id)
  if (!q) return crmError(404, "not_found", requestId)
  const draft = q.status === "draft"
  const data = draft ? await renderQuotation(crm, q) : (await ensureIssuedPdf(crm, q, nowOf(deps))).data
  log.info("quotation pdf served", { quotationId: id.toHexString(), draft, bytes: data.length })
  const filename = draft ? "Quotation-draft-preview.pdf" : quoteFilename((q.quoteNumber as string | null) ?? null, Number(q.version ?? 1))
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "x-request-id": requestId,
    },
  })
})

const IDEM = /^[\w:.\-]{8,128}$/

/**
 * POST /api/crm/quotations/:id/send {channel: "whatsapp"|"email", idempotencyKey, to?} — crm.quotes.send.
 * WhatsApp: document in the window, fog_quote_document template outside it. Email: PDF attached.
 */
export const sendQuotationHandler = route("quotations.send", ["crm.quotes.send"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 8 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const fields: Record<string, string> = {}
  const channel = body.channel === "whatsapp" || body.channel === "email" ? body.channel : null
  if (!channel) fields.channel = "invalid_enum"
  const key = typeof body.idempotencyKey === "string" && IDEM.test(body.idempotencyKey) ? body.idempotencyKey : null
  if (!key) fields.idempotencyKey = "invalid"
  const to = body.to === undefined || body.to === null ? null : typeof body.to === "string" && body.to.length <= 254 ? body.to : undefined
  if (to === undefined || (to !== null && channel !== "email")) fields.to = "invalid"
  if (Object.keys(fields).length || !channel || !key || to === undefined) return crmError(400, "validation", requestId, { fields })
  const env = deps.env ?? readCrmEnv()
  const crm = await deps.getDb()
  const r = await sendQuotation(crm, actor, leadScopeOf(actor), id, { channel, clientKey: key, to }, {
    allowList: env.waPhoneNumberIds,
    graph: graphConfigFrom(env, deps.fetch),
    requestId,
    now: deps.now,
    log,
    ...auditCtx(request),
    ...(deps.sendEmail ? { sendEmail: deps.sendEmail } : {}),
    env: { growthSync: env.growthSync },
  })
  if (!r.ok) {
    // Validation answers use top-level `fields`, like every other CRM endpoint.
    const fields = r.error === "validation" && r.detail && typeof r.detail.fields === "object" ? (r.detail.fields as Record<string, string>) : null
    return crmError(r.status, r.error, requestId, fields ? { fields } : r.detail ? { detail: r.detail } : {})
  }
  log.info("quotation sent", { quotationId: id.toHexString(), channel: r.channel, deduped: r.deduped })
  return crmJson({ deduped: r.deduped, channel: r.channel, quotation: quotationView(r.quotation) }, requestId, r.deduped ? 200 : 201)
})
