// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-api-gaps.test.mjs
// Frontend gaps: (1) PATCH /api/crm/deals/:id rejectSuggestion / acceptSuggestion,
// (2) dealer import preview returns the parsed headers when the mobile column is not detected.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm } from "./crm/helpers/wa-harness.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { parseDealPatch } from "../../lib/crm/leads/deal-patch.ts"
import { patchDealHandler } from "../../lib/crm/api/contacts.ts"
import { importPreviewHandler } from "../../lib/crm/api/dealers.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { await m?.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const OWNER = ROLE_PERMISSIONS.super_admin
const VIEW_ONLY = ["crm.view", "crm.leads.view_all"]
const NOW = new Date("2026-10-10T10:00:00Z")
const NOP = { params: Promise.resolve({}) }
const deps = (crm, perms = OWNER) => ({
  getDb: async () => crm,
  auth: { getUser: async () => ({ sub: "u-owner", name: "Owner", role: "super_admin" }), resolvePermissions: async () => perms },
  assignable: async () => [],
  now: () => NOW,
})
const patch = (crm, dealId, body, perms) =>
  patchDealHandler(new Request("http://x/api/crm/deals/" + dealId, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: dealId }) }, deps(crm, perms))

const sugg = (field, value, status = "pending") => ({ field, value, keyword: "kw", fromMessageId: null, status, at: NOW })

async function seed(crm, { isOpen = true } = {}) {
  const contactId = new ObjectId(), dealId = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({
    _id: contactId, phoneE164: "+9198" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"), name: "Asha Verma", company: "Secret Co",
    customerType: null, interestTags: ["existing"], assignedTo: null, existingDealer: null, mergedInto: null,
    suggestions: [sugg("customerType", "dealer"), sugg("customerType", "gem_supplier"), sugg("interestTag", "tender"), sugg("interestTag", "amc")],
    lastActivityAt: NOW, createdAt: NOW, updatedAt: NOW,
  })
  await crm.collection(COLL.deals).insertOne({ _id: dealId, contactId, stage: isOpen ? "new" : "closed_lost", isOpen, assignedTo: null, customerType: null, productInterest: [], createdAt: NOW, updatedAt: NOW })
  return { contactId, dealId: dealId.toHexString() }
}
const contactOf = (crm, id) => crm.collection(COLL.contacts).findOne({ _id: id })

// ── parse ──
test("parseDealPatch: suggestion ops validate kind/value; prototype keys and bad shapes are rejected", () => {
  assert.deepEqual(parseDealPatch({ rejectSuggestion: { kind: "customerType", value: "dealer" } }), { ok: true, patch: { rejectSuggestion: { kind: "customerType", value: "dealer" } } })
  assert.deepEqual(parseDealPatch({ acceptSuggestion: { kind: "interestTag", value: " Tender " } }).patch, { acceptSuggestion: { kind: "interestTag", value: "Tender" } })
  for (const bad of [
    { rejectSuggestion: { kind: "constructor", value: "x" } },
    { rejectSuggestion: { kind: "__proto__", value: "x" } },
    { rejectSuggestion: { kind: "toString", value: "x" } },
    { rejectSuggestion: { kind: "customerType", value: "constructor" } },
    { rejectSuggestion: { kind: "customerType", value: "__proto__" } },
    { rejectSuggestion: { kind: "interestTag", value: "" } },
    { rejectSuggestion: { kind: "interestTag", value: "x".repeat(81) } },
    { rejectSuggestion: { kind: "interestTag" } },
    { rejectSuggestion: "dealer" },
    { rejectSuggestion: { kind: "interestTag", value: "a", extra: 1 } },
    { acceptSuggestion: { kind: "customerType", value: "dealer" } }, // customerType is confirmed via the customerType field
    { acceptSuggestion: { kind: "interestTag", value: { $ne: 1 } } },
  ]) {
    const r = parseDealPatch(bad)
    assert.equal(r.ok, false, JSON.stringify(bad))
    assert.equal(r.status, 400)
  }
})

// ── reject ──
test("rejectSuggestion customerType: only the matching pending suggestion flips to rejected; audited without PII", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { contactId, dealId } = await seed(crm)
  const r = await patch(crm, dealId, { rejectSuggestion: { kind: "customerType", value: "dealer" } })
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json()))
  const c = await contactOf(crm, contactId)
  assert.deepEqual(c.suggestions.map(s => [s.field, s.value, s.status]), [
    ["customerType", "dealer", "rejected"], ["customerType", "gem_supplier", "pending"], ["interestTag", "tender", "pending"], ["interestTag", "amc", "pending"],
  ])
  assert.equal(c.suggestions[0].decidedBy.userId, "u-owner")
  assert.equal(c.customerType, null, "rejecting never sets the customer type")
  const audit = await crm.collection(COLL.audit).find({}).toArray()
  assert.equal(audit.length, 1)
  assert.equal(audit[0].action, "contact.suggestion_reject")
  assert.deepEqual(audit[0].after, { kind: "customerType", value: "dealer", dealId, contactId: contactId.toHexString() })
  const s = JSON.stringify(audit)
  for (const pii of ["Asha", "Secret Co", "+9198"]) assert.ok(!s.includes(pii), pii)
})

test("rejectSuggestion interestTag works; a non-pending or unknown suggestion → 404 suggestion_not_found", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { contactId, dealId } = await seed(crm)
  let r = await patch(crm, dealId, { rejectSuggestion: { kind: "interestTag", value: "amc" } })
  assert.equal(r.status, 200)
  assert.equal((await contactOf(crm, contactId)).suggestions[3].status, "rejected")
  r = await patch(crm, dealId, { rejectSuggestion: { kind: "interestTag", value: "amc" } })
  assert.equal(r.status, 404); assert.equal((await r.json()).error, "suggestion_not_found")
  r = await patch(crm, dealId, { rejectSuggestion: { kind: "customerType", value: "b2c" } })
  assert.equal(r.status, 404)
})

// ── accept ──
test("acceptSuggestion interestTag: marks accepted and adds the tag once", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { contactId, dealId } = await seed(crm)
  const r = await patch(crm, dealId, { acceptSuggestion: { kind: "interestTag", value: "tender" } })
  assert.equal(r.status, 200)
  const c = await contactOf(crm, contactId)
  assert.deepEqual(c.interestTags, ["existing", "tender"])
  assert.equal(c.suggestions[2].status, "accepted")
  assert.equal(c.suggestions[3].status, "pending", "other tag suggestions untouched")
  const audit = await crm.collection(COLL.audit).find({}).toArray()
  assert.equal(audit[0].action, "contact.suggestion_accept")
  const acts = await crm.collection(COLL.activities).find({ contactId }).toArray()
  assert.equal(acts.length, 1)
  assert.equal(acts[0].kind, "field_change")
})

// ── perms / state ──
test("suggestion ops need crm.leads.edit; they work on a closed deal's contact; never touch other contacts", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await seed(crm)
  const b = await seed(crm, { isOpen: false })
  let r = await patch(crm, a.dealId, { rejectSuggestion: { kind: "customerType", value: "dealer" } }, VIEW_ONLY)
  assert.equal(r.status, 403); assert.deepEqual((await r.json()).required, ["crm.leads.edit"])
  r = await patch(crm, b.dealId, { rejectSuggestion: { kind: "customerType", value: "dealer" } })
  assert.equal(r.status, 200)
  assert.equal((await contactOf(crm, a.contactId)).suggestions[0].status, "pending")
  // A field edit on the closed deal is still refused.
  r = await patch(crm, b.dealId, { nextFollowUpAt: "2026-11-01T00:00:00Z" })
  assert.equal(r.status, 409)
})

// ── import preview headers ──
test("preview without a detectable mobile column returns 400 with the parsed headers (BOM stripped, trimmed)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const f = new FormData()
  f.append("file", new File([Buffer.from("﻿ Dealer , Firm,Numero ,City\nRavi,R Co,9811100001,Patna\n")], "d.csv", { type: "text/csv" }))
  let r = await importPreviewHandler(new Request("http://x/p", { method: "POST", body: f }), NOP, deps(crm))
  let b = await r.json()
  assert.equal(r.status, 400)
  assert.equal(b.fields["columnMap.mobile"], "required")
  assert.deepEqual(b.headers, ["Dealer", "Firm", "Numero", "City"])
  // JSON body too; and the headers come back on an unknown-header override as well.
  r = await importPreviewHandler(new Request("http://x/p", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A,B\n1,2", columnMap: { mobile: "Z" } }) }), NOP, deps(crm))
  b = await r.json()
  assert.equal(r.status, 400); assert.deepEqual(b.headers, ["A", "B"])
  // With the right override the same file previews.
  r = await importPreviewHandler(new Request("http://x/p", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A,B\nRavi,9811100002", columnMap: { mobile: "B" } }) }), NOP, deps(crm))
  assert.equal(r.status, 201)
})

test("parseDealPatch rejects suggestion ops combined with field changes", () => {
  for (const body of [
    { rejectSuggestion: { kind: "customerType", value: "dealer" }, assignedTo: null },
    { acceptSuggestion: { kind: "interestTag", value: "gem" }, nextFollowUpAt: null },
  ]) {
    assert.deepEqual(parseDealPatch(body), { ok: false, status: 400, error: "combined_patch_not_supported" })
  }
})
