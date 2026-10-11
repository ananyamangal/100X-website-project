// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-validate-proto.test.mjs
// Enum / alias lookups on user input must never resolve inherited Object.prototype keys
// ("constructor", "__proto__", "toString", ...) to a value (review fix, step 3d/3e).
import test from "node:test"
import assert from "node:assert/strict"
import { Checker, parseCustomerType, parseLeadSource } from "../../lib/crm/validate.ts"
import { parseDealPatch } from "../../lib/crm/leads/deal-patch.ts"
import { validateManualLead } from "../../lib/crm/leads/manual.ts"
import { autoDetectColumns, resolveColumnMap } from "../../lib/crm/dealers/import.ts"
import { parseLeadListParams } from "../../lib/crm/leads/query.ts"

const PROTO_KEYS = ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "__defineGetter__", "propertyIsEnumerable", "toLocaleString", "Constructor", " constructor "]

for (const k of PROTO_KEYS) {
  test(`parseCustomerType / parseLeadSource reject ${JSON.stringify(k)}`, () => {
    const c = new Checker()
    assert.equal(parseCustomerType(c, { customerType: k }), null)
    assert.equal(c.errors.customerType, "invalid_enum")
    const c2 = new Checker()
    assert.equal(parseLeadSource(c2, { leadSource: k }), null)
    assert.equal(c2.errors.leadSource, "invalid_enum")
  })

  test(`parseDealPatch({customerType: ${JSON.stringify(k)}}) is a validation error, never ok`, () => {
    const r = parseDealPatch({ customerType: k })
    assert.equal(r.ok, false)
    assert.equal(r.fields?.customerType, "invalid_enum")
  })

  test(`validateManualLead rejects leadSource/customerType ${JSON.stringify(k)}`, () => {
    const r = validateManualLead({ mobile: "9876543210", leadSource: k, customerType: k })
    assert.equal(r.ok, false)
    assert.equal(r.fields.leadSource, "invalid_enum")
    assert.equal(r.fields.customerType, "invalid_enum")
  })
}

test("valid aliases still resolve (labels and slugs)", () => {
  const c = new Checker()
  assert.equal(parseCustomerType(c, { customerType: "GeM supplier" }), "gem_supplier")
  assert.equal(parseCustomerType(c, { customerType: "dealer" }), "dealer")
  assert.equal(parseLeadSource(c, { leadSource: "Existing dealer" }), "existing_dealer")
  assert.equal(parseLeadSource(c, { leadSource: "Call" }), "call")
  assert.ok(c.ok)
  const r = parseDealPatch({ customerType: "Government dept" })
  assert.equal(r.ok, true)
  assert.equal(r.patch.customerType, "govt_dept")
})

test("CSV header auto-detect ignores prototype-named headers; columnMap rejects them", () => {
  const map = autoDetectColumns(["constructor", "__proto__", "toString", "Mobile"])
  assert.deepEqual(Object.keys(map), ["mobile"])
  assert.equal(Object.getPrototypeOf(map) === Object.prototype || Object.getPrototypeOf(map) === null, true)
  const r = resolveColumnMap(["Mobile", "Name"], JSON.parse('{"__proto__":"Name","constructor":"Name","toString":"Name"}'))
  assert.equal(r.ok, false)
  assert.equal(r.fields["columnMap.__proto__"], "unknown_field")
  assert.equal(r.fields["columnMap.constructor"], "unknown_field")
  assert.equal(r.fields["columnMap.toString"], "unknown_field")
})

test("lead list filters reject prototype-named enum values", () => {
  for (const k of ["constructor", "__proto__", "toString"]) {
    const r = parseLeadListParams(new URLSearchParams({ stage: k, source: k, customerType: k }))
    assert.equal(r.ok, false)
    assert.equal(r.fields.stage, "invalid_enum")
    assert.equal(r.fields.source, "invalid_enum")
    assert.equal(r.fields.customerType, "invalid_enum")
  }
})

// ── Review fix 2: logging a call never silently claims someone else's unassigned lead ──
import { after, before } from "node:test"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { INDEX_SPECS } from "../../lib/crm/model.ts"
import { createManualLead } from "../../lib/crm/leads/manual.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { await m?.stop() })

const EXEC = ["crm.view", "crm.leads.view_assigned", "crm.leads.create", "crm.leads.edit"]
const actorOf = (userId, perms, name = "U") => ({ userId, name, role: "x", permissions: new Set(perms) })
const input = (mobile, extra = {}) => {
  const r = validateManualLead({ mobile, leadSource: "call", ...extra })
  assert.equal(r.ok, true)
  return r.input
}

test("existing unassigned open deal: caller without crm.leads.assign who did not create it leaves it unassigned", async t => {
  if (!m.ok) return t.skip(m.skip)
  const crm = crmDbFrom(m.db, "fogging", { client: m.client })
  await crm.ensureIndexes(INDEX_SPECS)
  const creator = new ObjectId().toHexString(), other = new ObjectId().toHexString()
  const deps = { assignable: async () => [] }
  const first = await createManualLead(crm, actorOf(creator, EXEC), input("9811111111"), deps)
  // Simulate an unassigned lead (e.g. created by the webhook or unassigned by a manager).
  await crm.collection("crm_deals").updateOne({ _id: new ObjectId(first.dealId) }, { $set: { assignedTo: null } })
  await crm.collection("crm_contacts").updateOne({ _id: new ObjectId(first.contactId) }, { $set: { assignedTo: null } })

  const res = await createManualLead(crm, actorOf(other, EXEC), input("9811111111", { product: "BF-150" }), deps)
  assert.equal(res.ok, true)
  assert.equal(res.dealId, first.dealId)
  const deal = await crm.collection("crm_deals").findOne({ _id: new ObjectId(first.dealId) })
  assert.equal(deal.assignedTo, null)
  assert.equal(deal.productInterest.length, 1, "adding product interest is still fine")
  const contact = await crm.collection("crm_contacts").findOne({ _id: new ObjectId(first.contactId) })
  assert.equal(contact.assignedTo, null)

  // The deal's creator may claim it back.
  await createManualLead(crm, actorOf(creator, EXEC), input("9811111111"), deps)
  assert.equal((await crm.collection("crm_deals").findOne({ _id: new ObjectId(first.dealId) })).assignedTo.userId, creator)
})

test("existing unassigned open deal: a caller with crm.leads.assign claims it; a brand-new deal defaults to the caller", async t => {
  if (!m.ok) return t.skip(m.skip)
  const crm = crmDbFrom(m.db, "fogging", { client: m.client })
  const mgr = new ObjectId().toHexString(), exec = new ObjectId().toHexString()
  const deps = { assignable: async () => [] }
  const first = await createManualLead(crm, actorOf(exec, EXEC), input("9822222222"), deps)
  assert.equal((await crm.collection("crm_deals").findOne({ _id: new ObjectId(first.dealId) })).assignedTo.userId, exec)
  await crm.collection("crm_deals").updateOne({ _id: new ObjectId(first.dealId) }, { $set: { assignedTo: null } })
  await createManualLead(crm, actorOf(mgr, [...EXEC, "crm.leads.assign"]), input("9822222222"), deps)
  assert.equal((await crm.collection("crm_deals").findOne({ _id: new ObjectId(first.dealId) })).assignedTo.userId, mgr)
})
