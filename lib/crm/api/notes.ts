/** /api/crm/contacts/:id/notes — the ONLY read path for internal-note text (crm.notes.view / crm.notes.create). */
import { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { COLL } from "../model"
import { crmError, crmJson, leadScopeOf, userRefOf, type CrmActor } from "./auth"
import { isHexId, readJsonObject } from "../validate"
import { contactVisible, parseBefore } from "../leads/query"
import { createInternalNote, listInternalNotes, toNoteText } from "../notes"
import { logCrmAction } from "../audit"
import { auditCtx, idParam, nowOf, route } from "./route"

async function visibleContactOr404(crm: CrmDb, actor: CrmActor, id: ObjectId) {
  const scope = leadScopeOf(actor)
  const contact = await crm.collection(COLL.contacts).findOne({ _id: id }, { projection: { assignedTo: 1 } })
  if (!contact || !(await contactVisible(crm, scope, contact))) return null
  return contact
}

/** GET /api/crm/contacts/:id/notes — crm.view + crm.notes.view. */
export const listNotesHandler = route("notes.list", ["crm.notes.view"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const sp = new URL(request.url).searchParams
  const before = parseBefore(sp.get("before"))
  if (before === null) return crmError(400, "validation", requestId, { fields: { before: "invalid_date" } })
  const crm = await deps.getDb()
  if (!(await visibleContactOr404(crm, actor, id))) return crmError(404, "not_found", requestId)
  return crmJson(await listInternalNotes(crm, id, { before }), requestId)
})

/** POST /api/crm/contacts/:id/notes {text, dealId?} — crm.view + crm.notes.create. */
export const createNoteHandler = route("notes.create", ["crm.notes.create"], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request, 32 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const t = toNoteText(body.text)
  if (!t.ok) return crmError(400, "validation", requestId, { fields: { text: t.reason === "empty" ? "required" : t.reason } })
  if (body.dealId !== undefined && body.dealId !== null && !isHexId(body.dealId)) return crmError(400, "validation", requestId, { fields: { dealId: "invalid_id" } })
  const crm = await deps.getDb()
  if (!(await visibleContactOr404(crm, actor, id))) return crmError(404, "not_found", requestId)
  let dealId: ObjectId | null = null
  if (isHexId(body.dealId)) {
    const d = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(body.dealId), contactId: id }, { projection: { _id: 1 } })
    if (!d) return crmError(400, "validation", requestId, { fields: { dealId: "not_on_contact" } })
    dealId = d._id as ObjectId
  } else {
    const open = await crm.collection(COLL.deals).findOne({ contactId: id, isOpen: true }, { projection: { _id: 1 } })
    dealId = (open?._id as ObjectId | undefined) ?? null
  }
  const me = userRefOf(actor)
  const note = await createInternalNote(crm, { contactId: id, dealId, author: me, text: t.text, now: nowOf(deps) })
  await logCrmAction(crm, me, "note.create", { type: "note", id: note.id }, { after: { contactId: id.toHexString(), dealId: dealId ? dealId.toHexString() : null }, ...auditCtx(request) })
  log.info("note created", { contactId: id.toHexString(), noteId: note.id })
  return crmJson({ note }, requestId, 201)
})
