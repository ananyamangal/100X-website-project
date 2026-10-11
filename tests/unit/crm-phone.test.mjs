// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-phone.test.mjs
// Spec: docs/crm/DATA_MODEL.md section 2.
import test from "node:test"
import assert from "node:assert/strict"
import { fromWaId, fromHumanInput } from "../../lib/crm/phone.ts"

const ok = (phoneE164, phoneKind) => ({ ok: true, phoneE164, waId: phoneE164.slice(1), phoneKind })
const bad = reason => ({ ok: false, reason })

test("fromWaId: identity mapping, no India heuristic", () => {
  const cases = [
    ["919876543210", ok("+919876543210", "mobile")],
    ["911234567890", ok("+911234567890", "mobile")], // +91 prefix => mobile kind, no further India validation
    ["14155550123", ok("+14155550123", "international")],       // NANP 1xxxxxxxxxx
    ["6591234567", ok("+6591234567", "international")],         // 10-digit foreign: must NOT become +91
    ["4915112345678", ok("+4915112345678", "international")],
    ["+919876543210", ok("+919876543210", "mobile")],           // one leading + tolerated
    ["  919876543210  ", ok("+919876543210", "mobile")],
    ["12345678", ok("+12345678", "international")],             // 8 digits ok (lower bound)
    ["123456789012345", ok("+123456789012345", "international")], // 15 digits ok (upper bound)
    ["0123456789", ok("+0123456789", "international")], // length check only, no heuristics
  ]
  for (const [input, want] of cases) assert.deepEqual(fromWaId(input), want, input)
})

test("fromWaId: never prefixes 91 or strips leading digits", () => {
  for (const id of ["6591234567", "9876543210", "0091987654321", "09876543210", "1234567890"]) {
    const r = fromWaId(id)
    assert.equal(r.ok, true, id)
    assert.equal(r.phoneE164, "+" + id, id)
    assert.equal(r.waId, id)
    if (!id.startsWith("91")) assert.equal(r.phoneKind, "international", id)
  }
})

test("fromWaId: too short / too long / garbage / empty", () => {
  for (const id of ["1234567", "1", "1234567890123456", "12345678901234567890", "98765 43210", "98765-43210", "abc", "91987654321a", "++919876543210", "+", "+ 919876543210", "٩٨٧٦٥٤٣٢١٠"]) {
    assert.deepEqual(fromWaId(id), bad("invalid_phone"), JSON.stringify(id))
  }
  for (const id of ["", "   ", null, undefined]) assert.deepEqual(fromWaId(id), bad("empty"), String(id))
  assert.deepEqual(fromWaId(919876543210), bad("empty")) // non-string input is not trusted
})

test("fromWaId then fromWaId round trip: waId = phoneE164.slice(1)", () => {
  for (const id of ["919876543210", "14155550123", "6591234567"]) {
    const r = fromWaId(id)
    assert.equal(r.waId, r.phoneE164.slice(1))
    assert.deepEqual(fromWaId(r.waId), r)
  }
})

test("fromHumanInput: Indian mobiles in every documented shape", () => {
  const want = ok("+919876543210", "mobile")
  for (const input of [
    "9876543210", "98765 43210", "98765-43210", "(98765) 43210", "[98765]43210", "98765.43210",
    "09876543210", "0 98765 43210",
    "+91 98765 43210", "+91-98765-43210", "+919876543210", "+91 (98765) 43210",
    "91 98765 43210", "919876543210", "91-9876543210",
    "0091 98765 43210", "00919876543210",
    "091 9876543210", "0919876543210",
    "+91 0 98765 43210", "+91 09876543210", "+910 9876543210",
    "  9876543210  ", 9876543210, 919876543210,
  ]) assert.deepEqual(fromHumanInput(input), want, JSON.stringify(input))
})

test("fromHumanInput: first digit 6-9 is mobile, 1-5 is unverified_mobile (not rejected)", () => {
  for (const d of ["6", "7", "8", "9"]) assert.equal(fromHumanInput(d + "123456789").phoneKind, "mobile", d)
  for (const d of ["1", "2", "3", "4", "5"]) {
    const r = fromHumanInput(d + "123456789")
    assert.deepEqual(r, ok("+91" + d + "123456789", "unverified_mobile"), d)
  }
  // landline-ish via other shapes
  assert.deepEqual(fromHumanInput("011 2345 6789"), ok("+911123456789", "unverified_mobile"))   // 11 digits, trunk 0
  assert.deepEqual(fromHumanInput("+91 11 2345 6789"), ok("+911123456789", "unverified_mobile"))
  assert.deepEqual(fromHumanInput("91 1123456789"), ok("+911123456789", "unverified_mobile"))
  assert.deepEqual(fromHumanInput("0 0 0"), bad("invalid_phone"))
})

test("fromHumanInput: leading 0 after trunk handling is rejected", () => {
  assert.deepEqual(fromHumanInput("0123456789"), bad("invalid_phone")) // 10 digits starting 0
  assert.deepEqual(fromHumanInput("+91 0123456789"), bad("invalid_phone")) // +91 then 10 digits starting 0
  assert.deepEqual(fromHumanInput("910076543210"), bad("invalid_phone"))
})

test("fromHumanInput: international (+ or 00) is kept, length-checked only", () => {
  assert.deepEqual(fromHumanInput("+1 415 555 0123"), ok("+14155550123", "international"))
  assert.deepEqual(fromHumanInput("001 415 555 0123"), ok("+14155550123", "international"))
  assert.deepEqual(fromHumanInput("+65 9123 4567"), ok("+6591234567", "international"))
  assert.deepEqual(fromHumanInput("0065 9123 4567"), ok("+6591234567", "international"))
  assert.deepEqual(fromHumanInput("+44 7911 123456"), ok("+447911123456", "international"))
  assert.deepEqual(fromHumanInput("+12345678"), ok("+12345678", "international"))
  assert.deepEqual(fromHumanInput("+123456789012345"), ok("+123456789012345", "international"))
  assert.deepEqual(fromHumanInput("+1234567"), bad("invalid_phone"))
  assert.deepEqual(fromHumanInput("+1234567890123456"), bad("invalid_phone"))
  assert.deepEqual(fromHumanInput("+91 98765"), bad("invalid_phone")) // +91 needs a 10-digit remainder
  assert.deepEqual(fromHumanInput("+91 987654321012"), bad("invalid_phone"))
})

test("fromHumanInput: a bare 10-digit foreign number without + is read as Indian (heuristic applies only here)", () => {
  assert.equal(fromHumanInput("6591234567").phoneE164, "+916591234567")
  assert.notEqual(fromWaId("6591234567").phoneE164, fromHumanInput("6591234567").phoneE164)
})

test("fromHumanInput: garbage -> invalid_phone, blank -> empty", () => {
  for (const g of ["abc", "98765", "987654321", "98765432101234", "12345678901234567", "98765 4321a0 extra 1", "+", "+abc", "000", "99999999999999999999", "9876543210 / 9123456780"]) {
    const r = fromHumanInput(g)
    assert.equal(r.ok, false, g)
    assert.ok(r.reason === "invalid_phone" || r.reason === "empty", g)
  }
  assert.equal(fromHumanInput("abc").ok, false) // letters only: no digits at all
  assert.deepEqual(fromHumanInput("98765"), bad("invalid_phone"))
  assert.deepEqual(fromHumanInput("987654321"), bad("invalid_phone"))      // 9 digits (spec reject)
  assert.deepEqual(fromHumanInput("98765432101234567"), bad("invalid_phone")) // 17 digits
  assert.deepEqual(fromHumanInput("+"), bad("invalid_phone"))
  for (const e of ["", "   ", "\t\n", null, undefined]) assert.deepEqual(fromHumanInput(e), bad("empty"), JSON.stringify(e))
})

test("fromHumanInput: result invariants", () => {
  for (const input of ["9876543210", "+14155550123", "11 2345 6789", "00 65 9123 4567"]) {
    const r = fromHumanInput(input)
    assert.equal(r.ok, true, input)
    assert.match(r.phoneE164, /^\+\d{8,15}$/)
    assert.equal(r.waId, r.phoneE164.slice(1))
    assert.deepEqual(fromWaId(r.waId), { ...r, phoneKind: r.phoneE164.startsWith("+91") ? "mobile" : "international" })
  }
})
