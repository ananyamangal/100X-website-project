// Run: node --import ./tests/support/register.mjs --test tests/unit/test-lead.test.mjs
// QA/test leads must never fire the real generate_lead conversion.
import test from "node:test"
import assert from "node:assert/strict"
import { isTestLead } from "../../lib/analytics/testLead.ts"

test("test leads are detected by name", () => {
  assert.equal(isTestLead({ name: "TEST - ignore" }), true)
  assert.equal(isTestLead({ name: " test-ignore " }), true)
  assert.equal(isTestLead({ name: "Test  -  IGNORE" }), true)
})

test("test leads are detected by utm_source qa-test", () => {
  assert.equal(isTestLead({ name: "Real Person", attribution: { utm_source: "qa-test" } }), true)
})

test("real leads are not flagged", () => {
  assert.equal(isTestLead({ name: "Testa Kumar" }), false)
  assert.equal(isTestLead({ name: "Test Engineer" }), false)
  assert.equal(isTestLead({ name: "test ignore" }), false)
  assert.equal(isTestLead({ name: "" }), false)
  assert.equal(isTestLead({}), false)
  assert.equal(isTestLead({ name: "A", attribution: { utm_source: "google" } }), false)
})
