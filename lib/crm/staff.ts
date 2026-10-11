/**
 * Team members' own WhatsApp numbers (crm_settings.staff; STEP 7). A contact whose number belongs
 * to a team member carries `staffUserId`: it receives task pushes (fog_team_task) and, when the
 * teammate writes to the business number, never opens a deal — so staff never show up as leads
 * (the lead list is deal-based).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "./db"
import { isDuplicateKeyError } from "./capture"
import { COLL } from "./model"

export interface StaffEntry {
  userId: string
  name: string
  waE164: string | null
  pushTasks: boolean
}

export async function staffList(crm: CrmDb): Promise<StaffEntry[]> {
  const s = await crm.collection<{ _id: string; staff?: StaffEntry[] }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { staff: 1 } })
  return Array.isArray(s?.staff) ? s.staff : []
}

export async function staffUserIdForPhone(crm: CrmDb, phoneE164: string): Promise<string | null> {
  const hit = (await staffList(crm)).find(s => s.waE164 === phoneE164)
  return hit ? String(hit.userId) : null
}

/** The staff member's contact row (created or marked), used as the recipient of task pushes. */
export async function ensureStaffContact(crm: CrmDb, staff: StaffEntry, now: Date): Promise<Document> {
  const phone = staff.waE164 as string
  const contacts = crm.collection(COLL.contacts)
  const existing = await contacts.findOne({ phoneE164: phone, mergedInto: null })
  if (existing) {
    if (existing.staffUserId !== staff.userId) await contacts.updateOne({ _id: existing._id }, { $set: { staffUserId: String(staff.userId), updatedAt: now } })
    return { ...existing, staffUserId: String(staff.userId) }
  }
  const doc: Document = {
    _id: new ObjectId(), phoneE164: phone, waId: phone.slice(1), notOnWhatsApp: null, phoneKind: "mobile", altPhones: [], name: staff.name,
    waProfileName: null, company: null, customerType: null, state: null, city: null, email: null, language: "en_US", interestTags: [],
    suggestions: [], existingDealer: null, assignedTo: null, marketingOptOut: null, amcDueAt: null, lastActivityAt: now,
    origin: { channel: "staff" }, mergedInto: null, staffUserId: String(staff.userId), createdBy: { system: "staff_push" }, createdAt: now, updatedAt: now,
  }
  try {
    await contacts.insertOne(doc)
    return doc
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e
    const raced = await contacts.findOne({ phoneE164: phone })
    if (!raced) throw e
    return raced
  }
}

