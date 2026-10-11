/**
 * STEP 3d — manual call entry (POST /api/crm/leads). DATA_MODEL §3 "Manual call entry: the same
 * rules as the website, with leadSource from the form".
 *
 * Flow: validate → fromHumanInput(mobile) → captureLead (dedupe on contacts [primary + altPhones]
 * and the dealer directory; deal policy "always": open deal → attach, else new / repeat_enquiry)
 * → product/customerType/assignee on the deal → the form's notes go to crm_internal_notes via
 * lib/crm/notes (never to the timeline, activity data or audit) → audit.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { captureLead } from "../capture"
import { fromHumanInput } from "../phone"
import { COLL, type CustomerType, type LeadSource, type UserRef } from "../model"
import { Checker, parseCustomerType, parseLeadSource, type FieldErrors } from "../validate"
import { createInternalNote, toNoteText } from "../notes"
import { can, userRefOf, type CrmActor } from "../api/auth"
import { logCrmAction } from "../audit"

export interface ManualLeadInput {
  phone: { phoneE164: string; waId: string; phoneKind: "mobile" | "unverified_mobile" | "international" }
  name: string | null
  company: string | null
  customerType: CustomerType | null
  leadSource: LeadSource
  state: string | null
  city: string | null
  product: string | null
  quantity: number | null
  assignedTo: string | null
  /** Raw notes text (validated); stored only as an internal note. */
  notes: string | null
}

export type ManualLeadValidation = { ok: true; input: ManualLeadInput } | { ok: false; fields: FieldErrors }

export function validateManualLead(body: Record<string, unknown>): ManualLeadValidation {
  const c = new Checker()
  const mobileRaw = c.str(body, "mobile", 40, { required: true })
  let phone: ManualLeadInput["phone"] | null = null
  if (mobileRaw !== null) {
    const p = fromHumanInput(mobileRaw)
    if (p.ok) phone = { phoneE164: p.phoneE164, waId: p.waId, phoneKind: p.phoneKind }
    else c.fail("mobile", p.reason === "empty" ? "required" : "invalid_phone")
  }
  const name = c.str(body, "name", 120)
  const company = c.str(body, "company", 160)
  const customerType = parseCustomerType(c, body)
  const leadSource = parseLeadSource(c, body)
  const state = c.str(body, "state", 80)
  const city = c.str(body, "city", 80)
  const product = c.str(body, "product", 160)
  const quantity = c.int(body, "quantity", 1, 1_000_000)
  const assignedTo = c.oid(body, "assignedTo")
  let notes: string | null = null
  if (body.notes !== undefined && body.notes !== null && body.notes !== "") {
    const n = toNoteText(body.notes)
    if (n.ok) notes = n.text
    else if (n.reason !== "empty") c.fail("notes", n.reason)
  }
  if (quantity !== null && product === null) c.fail("product", "required_with_quantity")
  if (!c.ok || !phone || !leadSource) return { ok: false, fields: c.errors }
  return { ok: true, input: { phone, name, company, customerType, leadSource, state, city, product, quantity, assignedTo, notes } }
}

export interface AssigneeLookup {
  (): Promise<{ id: string; name: string }[]>
}

export type ManualLeadResult =
  | {
      ok: true
      contactId: string
      dealId: string | null
      /** true when a new contact was created (false = existing contact by mobile/alt phone). */
      created: boolean
      dealCreated: boolean
      dealOutcome: string
      existingDealer: boolean
      noteId: string | null
    }
  | { ok: false; status: 400 | 403; error: string; fields?: FieldErrors; required?: string[] }

const SOURCE_LABEL: Record<LeadSource, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  website: "Website",
  gem: "GeM",
  referral: "Referral",
  existing_dealer: "Existing dealer",
}

const sameUser = (a: unknown, id: string) => !!a && typeof a === "object" && String((a as { userId?: unknown }).userId) === id

export async function createManualLead(
  crm: CrmDb,
  actor: CrmActor,
  input: ManualLeadInput,
  deps: { assignable: AssigneeLookup; now?: Date; ip?: string | null; userAgent?: string | null },
): Promise<ManualLeadResult> {
  const now = deps.now ?? new Date()
  const me = userRefOf(actor)

  // Assignee: default = the person logging the call. Anyone else needs crm.leads.assign.
  const explicit = input.assignedTo !== null
  const wantId = input.assignedTo ?? actor.userId
  if (wantId !== actor.userId && !can(actor, "crm.leads.assign")) {
    return { ok: false, status: 403, error: "forbidden", required: ["crm.leads.assign"] }
  }
  let assignee: UserRef
  if (wantId === actor.userId) {
    assignee = me
  } else {
    const hit = (await deps.assignable()).find(u => u.id === wantId)
    if (!hit) return { ok: false, status: 400, error: "validation", fields: { assignedTo: "unknown_user" } }
    assignee = { userId: hit.id, name: hit.name }
  }

  const cap = await captureLead(crm, {
    channel: input.leadSource,
    phone: input.phone as Parameters<typeof captureLead>[1]["phone"],
    profile: { name: input.name, company: input.company, state: input.state, city: input.city },
    createdBy: me,
    dealPolicy: "always",
    activity: {
      kind: "call_log",
      summary: `Lead logged by ${me.name} (source: ${SOURCE_LABEL[input.leadSource]})`,
      // Whitelisted, non-note fields only. The notes text is NEVER placed here.
      data: {
        leadSource: input.leadSource,
        customerType: input.customerType,
        product: input.product,
        quantity: input.quantity,
        hasInternalNote: input.notes !== null,
        manual: true,
      },
    },
    now,
  })

  const contactOid = new ObjectId(cap.contactId)
  const contacts = crm.collection(COLL.contacts)
  const deals = crm.collection(COLL.deals)
  const activities = crm.collection(COLL.activities)

  // Contact: fill customerType / assignee only when empty (a human edit goes through PATCH).
  const contact = await contacts.findOne({ _id: contactOid }, { projection: { customerType: 1, assignedTo: 1, createdBy: 1 } })
  const cSet: Document = {}
  if (input.customerType && !contact?.customerType) cSet.customerType = input.customerType
  // Same claim rule as the deal below: a new contact gets the default assignee; an existing unassigned
  // contact only when the caller may assign or created it (contact assignment grants visibility).
  const mayClaimContact = cap.contactCreated || can(actor, "crm.leads.assign") || sameUser(contact?.createdBy, actor.userId)
  if (!contact?.assignedTo && mayClaimContact) cSet.assignedTo = assignee
  if (Object.keys(cSet).length) await contacts.updateOne({ _id: contactOid }, { $set: { ...cSet, updatedAt: now } })
  const effectiveType: CustomerType | null = (cSet.customerType as CustomerType | undefined) ?? (contact?.customerType as CustomerType | null) ?? null

  let reassignedFrom: UserRef | null = null
  if (cap.dealId) {
    const dealOid = new ObjectId(cap.dealId)
    const deal = await deals.findOne({ _id: dealOid }, { projection: { assignedTo: 1, customerType: 1, isOpen: 1, createdBy: 1 } })
    const dSet: Document = { updatedAt: now }
    const update: Document = { $set: dSet }
    if (input.product) update.$push = { productInterest: { productSlug: null, label: input.product, qty: input.quantity } }
    if (deal && !deal.customerType && effectiveType) dSet.customerType = effectiveType
    const created = cap.dealOutcome === "created"
    // New deal → default assignee (the caller unless another assignee was allowed above). An existing
    // UNASSIGNED open deal is only claimed when the caller may assign leads or created that deal;
    // otherwise it stays unassigned (logging a call is not a claim on someone else's lead).
    const mayClaim = can(actor, "crm.leads.assign") || sameUser(deal?.createdBy, actor.userId)
    if (deal && (created || (!deal.assignedTo && mayClaim))) {
      dSet.assignedTo = assignee
    } else if (deal && explicit && can(actor, "crm.leads.assign") && !sameUser(deal.assignedTo, assignee.userId)) {
      // Explicit re-assignment of an already-assigned open deal: crm.leads.assign only. Without it
      // (incl. a self-assignment) the existing assignee is kept; nothing is written before this point
      // that a refusal would have to undo.
      reassignedFrom = (deal.assignedTo as UserRef | null) ?? null
      dSet.assignedTo = assignee
    }
    await deals.updateOne({ _id: dealOid }, update)
    if (dSet.assignedTo) {
      await activities.insertOne({
        contactId: contactOid,
        dealId: dealOid,
        kind: "assignment",
        at: now,
        by: me,
        summary: `Assigned to ${assignee.name}`,
        data: { from: reassignedFrom ? reassignedFrom.userId : null, to: assignee.userId },
      })
    }
  }

  let noteId: string | null = null
  if (input.notes) {
    const t = toNoteText(input.notes)
    if (t.ok) {
      const note = await createInternalNote(crm, {
        contactId: contactOid,
        dealId: cap.dealId ? new ObjectId(cap.dealId) : null,
        author: me,
        text: t.text,
        now,
      })
      noteId = note.id
    }
  }

  await logCrmAction(
    crm,
    me,
    "lead.manual_create",
    { type: "contact", id: cap.contactId },
    {
      after: {
        contactCreated: cap.contactCreated,
        dealId: cap.dealId,
        dealOutcome: cap.dealOutcome,
        leadSource: input.leadSource,
        assignedTo: assignee.userId,
        reassignedFrom: reassignedFrom ? reassignedFrom.userId : null,
        existingDealer: cap.existingDealer,
        noteId,
      },
      ip: deps.ip ?? null,
      userAgent: deps.userAgent ?? null,
    },
  )

  return {
    ok: true,
    contactId: cap.contactId,
    dealId: cap.dealId,
    created: cap.contactCreated,
    dealCreated: cap.dealOutcome === "created",
    dealOutcome: cap.dealOutcome,
    existingDealer: cap.existingDealer,
    noteId,
  }
}
