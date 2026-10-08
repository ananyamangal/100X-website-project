// Run: node --import ./tests/support/register.mjs --test tests/unit/facts.test.mjs
// Pins lib/facts.ts to docs/FACTS.md.
import test from "node:test"
import assert from "node:assert/strict"
import {
  FOUNDED_YEAR,
  yearsInBusiness,
  FOGGER_MODEL_COUNT,
  VERIFIED_STATES,
  VERIFIED_STATE_COUNT,
  SPARE_PARTS_CLAIM,
  RESPONSE_PROMISE,
  SPARE_DISPATCH,
  GOV_BUYERS_LISTED,
  CASE_STUDY_COUNT,
} from "../../lib/facts.ts"

test("founding year is 2020 and years in business is computed from the given date", () => {
  assert.equal(FOUNDED_YEAR, 2020)
  assert.equal(yearsInBusiness(new Date("2026-10-08T00:00:00Z")), 6)
  assert.equal(yearsInBusiness(new Date("2030-01-01T12:00:00Z")), 10)
})

test("fact constants match docs/FACTS.md", () => {
  assert.equal(FOGGER_MODEL_COUNT, 9)
  assert.equal(VERIFIED_STATE_COUNT, 12)
  assert.equal(VERIFIED_STATES.length, 12)
  assert.equal(new Set(VERIFIED_STATES).size, 12)
  assert.equal(SPARE_PARTS_CLAIM, "120+")
  assert.equal(RESPONSE_PROMISE, "within 24 hours on working days")
  assert.equal(SPARE_DISPATCH, "24-48 hours")
  assert.equal(GOV_BUYERS_LISTED, 23)
  assert.equal(CASE_STUDY_COUNT, 24)
})
