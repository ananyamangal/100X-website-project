// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-dealer-import.test.mjs
// Independent tests (3e): CSV parser, header detection, preview categories, confirm idempotency, API upload path.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { parseCsv, decodeCsvBytes, detectDelimiter } from "../../lib/crm/dealers/csv.ts"
import { autoDetectColumns, resolveColumnMap, previewDealerImport, confirmDealerImport, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, PREVIEW_ROWS_RETURNED } from "../../lib/crm/dealers/import.ts"
import { importPreviewHandler, importConfirmHandler, listDealersHandler } from "../../lib/crm/api/dealers.ts"
import { createLeadHandler } from "../../lib/crm/api/leads.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const OWNER = ROLE_PERMISSIONS.super_admin
const NOP = { params: Promise.resolve({}) }
const ME = { userId: "u-owner", name: "Owner" }
const NOW = new Date("2026-10-10T10:00:00Z")

// ───────────────────────── CSV parser ─────────────────────────
test("csv: BOM, CRLF/CR/LF, quoted commas, doubled quotes, newline inside quotes, blank lines", () => {
  const r = parseCsv("﻿Name,Mobile,Note\r\n\"Ravi, Sr\",9876543210,\"He said \"\"hi\"\"\"\r\n\r\n\"Multi\nLine\",9123456789,x\r\n,,\r\nLast,9000012345,y")
  assert.deepEqual(r.headers, ["Name", "Mobile", "Note"])
  assert.deepEqual(r.rows, [["Ravi, Sr", "9876543210", 'He said "hi"'], ["Multi\nLine", "9123456789", "x"], ["Last", "9000012345", "y"]])
  assert.equal(r.unterminatedQuote, false); assert.equal(r.delimiter, ",")
  assert.deepEqual(parseCsv("a,b\r1,2\r3,4").rows, [["1", "2"], ["3", "4"]])
  assert.deepEqual(parseCsv("a,b\n1,2\n\n\n").rows, [["1", "2"]])
  assert.deepEqual(parseCsv("").headers, [])
  assert.deepEqual(parseCsv("\n\n").rows, [])
  assert.equal(parseCsv('a,b\n"1,2').unterminatedQuote, true)
})

test("csv: semicolon and tab delimiters auto-detected (delimiters inside quotes ignored)", () => {
  const s = parseCsv("Name;Mobile;City\nRavi;9876543210;\"Pune; MH\"")
  assert.equal(s.delimiter, ";"); assert.deepEqual(s.rows, [["Ravi", "9876543210", "Pune; MH"]])
  const t = parseCsv("Name\tMobile\nRavi, Sr\t9876543210")
  assert.equal(t.delimiter, "\t"); assert.deepEqual(t.rows, [["Ravi, Sr", "9876543210"]])
  assert.equal(detectDelimiter("a,b;c,d"), ",")
  assert.equal(detectDelimiter('"a,b,c";d'), ";")
})

test("csv: UTF-16LE/BE with BOM, UTF-8 BOM, plain UTF-8 and invalid bytes never throw", () => {
  const text = "Name,Mobile\nRavi रवि,9876543210\n"
  const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")])
  const be = Buffer.from(le.subarray(2)); be.swap16()
  const beB = Buffer.concat([Buffer.from([0xfe, 0xff]), be])
  const u8 = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, "utf8")])
  for (const [n, b] of [["le", le], ["be", beB], ["u8bom", u8], ["u8", Buffer.from(text)]]) {
    const r = parseCsv(decodeCsvBytes(new Uint8Array(b)))
    assert.deepEqual(r.headers, ["Name", "Mobile"], n)
    assert.deepEqual(r.rows, [["Ravi रवि", "9876543210"]], n)
  }
  assert.doesNotThrow(() => decodeCsvBytes(new Uint8Array([0xff, 0x00, 0xc3, 0x28])))
  assert.doesNotThrow(() => decodeCsvBytes(new Uint8Array([])))
})

test("csv: Excel =\"0987...\" wrapper unwrapped; scientific notation is preserved verbatim for the importer to reject", () => {
  const r = parseCsv('Mobile\n="09876543210"\n="9876543210"\n9.8E+09\n"9.87654E+09"')
  assert.deepEqual(r.rows.map(x => x[0]), ["09876543210", "9876543210", "9.8E+09", "9.87654E+09"])
})

test("csv: maxRows stops reading early (does not parse a huge file to the end)", () => {
  const body = Array.from({ length: 50 }, (_, i) => "r" + i).join("\n")
  const r = parseCsv("h\n" + body, { maxRows: 10 })
  assert.ok(r.rows.length > 10 && r.rows.length <= 12)
})

// ───────────────────────── header detection ─────────────────────────
test("header auto-detect: common names; override merges; unknown header / field / missing mobile rejected", () => {
  assert.deepEqual(autoDetectColumns(["Dealer Name", "Firm", "Mobile", "State", "City"]), { name: "Dealer Name", company: "Firm", mobile: "Mobile", state: "State", city: "City" })
  assert.deepEqual(autoDetectColumns(["Name", "Phone No", "Company Name", "Alt Mobile", "GSTIN", "Remarks"]), { name: "Name", mobile: "Phone No", company: "Company Name", altPhone: "Alt Mobile", gst: "GSTIN", notes: "Remarks" })
  assert.equal(autoDetectColumns(["Contact", "Town"]).mobile, "Contact")
  assert.equal(autoDetectColumns(["MOBILE NO.", "  state  "]).mobile, "MOBILE NO.")
  assert.equal(autoDetectColumns(["Mobile Number", "Whatsapp Number"]).mobile, "Mobile Number")
  assert.equal(autoDetectColumns(["Name", "Phone"]).altPhone, undefined)
  assert.deepEqual(autoDetectColumns(["x", "y"]), {})
  const h = ["A", "B", "C"]
  assert.deepEqual(resolveColumnMap(h, { mobile: "B", name: "A" }), { ok: true, map: { mobile: "B", name: "A" } })
  // cosmetic finding: when the only mobile mapping is an unknown header, "required" overwrites "unknown_header"
  assert.ok(["unknown_header", "required"].includes(resolveColumnMap(h, { mobile: "Nope" }).fields["columnMap.mobile"]))
  assert.equal(resolveColumnMap(["Mobile", "X"], { name: "Nope" }).fields["columnMap.name"], "unknown_header")
  assert.equal(resolveColumnMap(h, { bogus: "A", mobile: "A" }).fields["columnMap.bogus"], "unknown_field")
  assert.equal(resolveColumnMap(h, {}).fields["columnMap.mobile"], "required")
  assert.equal(resolveColumnMap(h, []).fields.columnMap, "invalid_map")
  assert.equal(resolveColumnMap(["Mobile", "X"], { mobile: null }).ok, false, "null clears the mapping")
  assert.deepEqual(resolveColumnMap(["Name", "Mobile"], { name: "" }).map, { mobile: "Mobile" })
})

// ───────────────────────── preview categories ─────────────────────────
async function seedExisting(crm) {
  const now = new Date()
  await crm.collection(COLL.dealerDirectory).insertOne({ phoneE164: "+919811100003", name: "Orig Name", company: "Orig Co", state: "Orig", city: null, createdAt: now })
  await crm.collection(COLL.contacts).insertMany([
    { phoneE164: "+919811100004", waId: "919811100004", phoneKind: "mobile", name: "C4", existingDealer: null, mergedInto: null, customerType: null, createdAt: now, updatedAt: now },
    { phoneE164: "+919811100099", waId: "919811100099", phoneKind: "mobile", name: "C5", altPhones: ["+919811100005"], existingDealer: null, mergedInto: null, customerType: "b2c", createdAt: now, updatedAt: now },
  ])
}
const CSV = [
  "Dealer Name,Firm,Mobile,Alt Phone,State,City,GST",
  "Ravi,Ravi Traders,98111 00001,,Gujarat,Surat,24AAA",       // 1 new
  "Sam,Sam Co,09811100002,9811100010,Delhi,,",                 // 2 new (+alt)
  "Ravi Dup,Dup Co,+91 98111-00001,,Gujarat,Surat,",           // 3 duplicate_in_batch
  "Bad,Bad Co,12345,,,,",                                      // 4 invalid
  "Sci,Sci Co,9.8E+09,,,,",                                    // 5 invalid (excel)
  "Empty,Empty Co,,,,,",                                       // 6 invalid (empty)
  "InDir,Dir Co,9811100003,,Changed,,",                        // 7 duplicate_existing_dealer
  "Cont,Cont Co,9811100004,,,,",                               // 8 duplicate_existing_contact
  "AltC,AltC Co,9811100005,,,,",                               // 9 duplicate_existing_contact (via altPhones)
  "AltKey,AltKey Co,,98111 00006,,,",                          // 10 alt becomes key: new
  "Intl,Intl Co,+1 415 555 2671,,,,",                          // 11 new (international)
  "\"Quoted, Name\",Q Co,=\"09811100007\",,,,",                // 12 new via Excel wrapper
].join("\r\n")

test("preview: categories, counts, normalised phones; writes only the import row (no directory rows, no contacts touched)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedExisting(crm)
  const dirBefore = await count(crm, COLL.dealerDirectory)
  const res = await previewDealerImport(crm, ME, { text: "﻿" + CSV, fileName: "dealers.csv" }, { now: NOW })
  assert.equal(res.ok, true)
  assert.deepEqual(res.columnMap, { name: "Dealer Name", company: "Firm", mobile: "Mobile", altPhone: "Alt Phone", state: "State", city: "City", gst: "GST" })
  assert.equal(res.total, 12)
  assert.deepEqual(res.summary, { new: 5, duplicate_existing_contact: 2, duplicate_existing_dealer: 1, duplicate_in_batch: 1, invalid_phone: 3 })
  const by = i => res.rows[i - 1]
  assert.equal(by(1).phoneE164, "+919811100001"); assert.equal(by(1).category, "new")
  assert.equal(by(2).phoneE164, "+919811100002"); assert.equal(by(2).altPhoneE164, "+919811100010")
  assert.equal(by(3).category, "duplicate_in_batch")
  assert.equal(by(4).category, "invalid_phone"); assert.equal(by(4).phoneE164, null)
  assert.equal(by(5).category, "invalid_phone"); assert.equal(by(5).reason, "excel_scientific"); assert.equal(by(5).phoneE164, null)
  assert.equal(by(6).category, "invalid_phone"); assert.equal(by(6).reason, "empty")
  assert.equal(by(7).category, "duplicate_existing_dealer")
  assert.equal(by(8).category, "duplicate_existing_contact"); assert.equal(by(9).category, "duplicate_existing_contact")
  assert.equal(by(10).category, "new"); assert.equal(by(10).phoneE164, "+919811100006")
  assert.equal(by(11).phoneE164, "+14155552671")
  assert.equal(by(12).phoneE164, "+919811100007"); assert.equal(by(12).raw.name, "Quoted, Name")
  assert.equal(Object.values(res.summary).reduce((a, b) => a + b, 0), res.total)
  assert.equal(res.truncated, false)
  assert.equal(await count(crm, COLL.dealerDirectory), dirBefore)
  assert.equal((await all(crm, COLL.contacts)).filter(c => c.existingDealer).length, 0)
  const imp = await crm.collection(COLL.imports).findOne({ _id: new ObjectId(res.importId) })
  assert.equal(imp.status, "previewed"); assert.ok(imp.expireAt instanceof Date)
  assert.equal(imp.expireAt.getTime() - NOW.getTime(), 7 * 86400000)
  // audit: counts only
  const aud = await all(crm, COLL.audit, { action: "import.preview" })
  assert.equal(aud.length, 1)
  const s = JSON.stringify(aud[0])
  for (const bad of ["98111", "Ravi", "Traders", "dealers.csv"]) assert.ok(!s.includes(bad), bad)
})

test("preview: columnMap override (renamed headers), missing mobile column, empty file, unterminated quote, row cap", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  let r = await previewDealerImport(crm, ME, { text: "Col1,Col2\nRavi,9876500001", fileName: "a.csv" })
  assert.equal(r.ok, false); assert.equal(r.status, 400); assert.deepEqual(r.fields, { "columnMap.mobile": "required" })
  r = await previewDealerImport(crm, ME, { text: "Col1,Col2\nRavi,9876500001", fileName: "a.csv", columnMap: { mobile: "Col2", name: "Col1" } })
  assert.equal(r.ok, true); assert.equal(r.summary.new, 1); assert.equal(r.rows[0].raw.name, "Ravi")
  r = await previewDealerImport(crm, ME, { text: "Col1,Col2\nRavi,9876500001", fileName: "a.csv", columnMap: { mobile: "Nope" } })
  assert.equal(r.ok, false); assert.ok(["unknown_header", "required"].includes(r.fields["columnMap.mobile"]))
  r = await previewDealerImport(crm, ME, { text: "  \n\n", fileName: "a.csv" })
  assert.deepEqual([r.ok, r.status, r.error], [false, 400, "empty_file"])
  r = await previewDealerImport(crm, ME, { text: 'Mobile\n"9876500001', fileName: "a.csv" })
  assert.deepEqual([r.ok, r.status, r.error], [false, 400, "malformed_csv"])
  const rows = n => "Mobile\n" + Array.from({ length: n }, (_, i) => "9" + String(800000000 + i)).join("\n")
  r = await previewDealerImport(crm, ME, { text: rows(IMPORT_MAX_ROWS + 1), fileName: "big.csv" })
  assert.deepEqual([r.ok, r.status, r.error], [false, 413, "too_many_rows"])
  assert.equal(await count(crm, COLL.imports, { fileName: "big.csv" }), 0)
  r = await previewDealerImport(crm, ME, { text: rows(IMPORT_MAX_ROWS), fileName: "max.csv" })
  assert.equal(r.ok, true); assert.equal(r.total, IMPORT_MAX_ROWS); assert.equal(r.summary.new, IMPORT_MAX_ROWS)
  assert.equal(r.rows.length, PREVIEW_ROWS_RETURNED); assert.equal(r.truncated, true)
})

// ───────────────────────── confirm ─────────────────────────
test("confirm: inserts new + existing-contact rows, flags contacts once, idempotent sequentially and concurrently", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedExisting(crm)
  const prev = await previewDealerImport(crm, ME, { text: CSV, fileName: "dealers.csv" }, { now: NOW })
  const id = new ObjectId(prev.importId)
  const c1 = await confirmDealerImport(crm, ME, id, { now: NOW })
  assert.equal(c1.ok, true); assert.equal(c1.alreadyConfirmed, false)
  // new(5) + duplicate_existing_contact(2) inserted; the existing directory row is untouched
  assert.deepEqual(c1.counts, { inserted: 7, alreadyInDirectory: 1, contactsFlagged: 2, skippedInvalid: 3, skippedDuplicateInBatch: 1 })
  assert.equal(await count(crm, COLL.dealerDirectory), 8)
  const orig = await crm.collection(COLL.dealerDirectory).findOne({ phoneE164: "+919811100003" })
  assert.equal(orig.name, "Orig Name"); assert.equal(orig.state, "Orig")
  const d2 = await crm.collection(COLL.dealerDirectory).findOne({ phoneE164: "+919811100002" })
  assert.equal(d2.extra.altPhoneE164, "+919811100010"); assert.equal(d2.company, "Sam Co"); assert.equal(d2.importId, prev.importId)
  assert.equal((await crm.collection(COLL.dealerDirectory).findOne({ phoneE164: "+919811100001" })).extra.gst, "24AAA")
  for (const p of ["+919811100010", "+919811100006"]) assert.equal(await count(crm, COLL.dealerDirectory, { phoneE164: p }), p.endsWith("10") ? 0 : 1)
  // contacts flagged, with exactly one activity each
  const flagged = await all(crm, COLL.contacts, { existingDealer: { $ne: null } })
  assert.deepEqual(flagged.map(c => c.phoneE164).sort(), ["+919811100004", "+919811100099"])
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 2)
  const c4 = flagged.find(c => c.phoneE164 === "+919811100004"), c99 = flagged.find(c => c.phoneE164 === "+919811100099")
  assert.equal(c4.suggestions.filter(s => s.field === "customerType" && s.value === "dealer" && s.status === "pending").length, 1)
  assert.ok(!(c99.suggestions || []).some(s => s.value === "dealer"), "contact with a customerType gets no dealer suggestion")
  // repeat sequentially and concurrently: same stored counts, no new rows
  const again = await confirmDealerImport(crm, ME, id, { now: NOW })
  assert.equal(again.alreadyConfirmed, true); assert.deepEqual(again.counts, c1.counts)
  const conc = await Promise.all(Array.from({ length: 5 }, () => confirmDealerImport(crm, ME, id, { now: NOW })))
  assert.ok(conc.every(r => r.ok))
  assert.equal(await count(crm, COLL.dealerDirectory), 8)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 2)
  const c4after = await crm.collection(COLL.contacts).findOne({ phoneE164: "+919811100004" })
  assert.equal(c4after.suggestions.length, 1)
  assert.equal(await count(crm, COLL.audit, { action: "import.confirm" }), 1, "one confirm audit row")
  const imp = await crm.collection(COLL.imports).findOne({ _id: id })
  assert.equal(imp.status, "confirmed"); assert.equal(imp.expireAt, null)
})

test("confirm: concurrent FIRST confirms on a fresh preview never duplicate directory rows or flags", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedExisting(crm)
  const prev = await previewDealerImport(crm, ME, { text: CSV, fileName: "dealers.csv" }, { now: NOW })
  const id = new ObjectId(prev.importId)
  const rs = await Promise.all(Array.from({ length: 6 }, () => confirmDealerImport(crm, ME, id, { now: NOW })))
  assert.ok(rs.every(r => r.ok), JSON.stringify(rs.filter(r => !r.ok)))
  assert.equal(await count(crm, COLL.dealerDirectory), 8)
  const phones = (await all(crm, COLL.dealerDirectory)).map(d => d.phoneE164)
  assert.equal(new Set(phones).size, phones.length)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 2)
  // a second import of the same file: everything is now a duplicate, nothing inserted
  const p2 = await previewDealerImport(crm, ME, { text: CSV, fileName: "again.csv" }, { now: NOW })
  assert.equal(p2.summary.new, 0)
  assert.equal(p2.summary.duplicate_existing_dealer, 8 - 0 - 0, "all 8 valid unique rows are now in the directory")
  const c2 = await confirmDealerImport(crm, ME, new ObjectId(p2.importId), { now: NOW })
  assert.equal(c2.counts.inserted, 0); assert.equal(c2.counts.contactsFlagged, 0)
  assert.equal(await count(crm, COLL.dealerDirectory), 8)
})

test("confirm: expired / unknown preview -> 404, discarded -> 409, wrong kind ignored, bad id 400", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const prev = await previewDealerImport(crm, ME, { text: "Mobile\n9876500001", fileName: "a.csv" }, { now: NOW })
  const id = new ObjectId(prev.importId)
  assert.deepEqual(await confirmDealerImport(crm, ME, new ObjectId()), { ok: false, status: 404, error: "import_not_found_or_expired" })
  await crm.collection(COLL.imports).deleteOne({ _id: id }) // what the TTL index does after expireAt
  const r = await confirmDealerImport(crm, ME, id)
  assert.equal(r.ok, false); assert.equal(r.status, 404)
  assert.equal(await count(crm, COLL.dealerDirectory), 0)
  // TTL index is on expireAt and previews carry it
  const idx = await crm.collection(COLL.imports).indexes?.().catch(() => null)
  void idx
  const p2 = await previewDealerImport(crm, ME, { text: "Mobile\n9876500002", fileName: "a.csv" })
  await crm.collection(COLL.imports).updateOne({ _id: new ObjectId(p2.importId) }, { $set: { status: "discarded" } })
  const d = await confirmDealerImport(crm, ME, new ObjectId(p2.importId))
  assert.deepEqual([d.ok, d.status, d.error], [false, 409, "import_discarded"])
  const cOK = await importConfirmHandler(new Request("http://x", { method: "POST", body: JSON.stringify({ importId: "nope" }) }), NOP, mkDeps(crm))
  assert.equal(cOK.status, 400)
  const c404 = await importConfirmHandler(new Request("http://x", { method: "POST", body: JSON.stringify({ importId: new ObjectId().toHexString() }) }), NOP, mkDeps(crm))
  assert.equal(c404.status, 404)
  // the TTL index exists on expireAt
  const raw = await m.client.db(crm.databaseName).collection(COLL.imports).indexes()
  assert.ok(raw.some(i => i.expireAfterSeconds === 0 && i.key.expireAt === 1), JSON.stringify(raw.map(i => i.name)))
})

test("after import, captureLead (manual call entry) for a directory phone flags existingDealer; only once", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const prev = await previewDealerImport(crm, ME, { text: "Name,Mobile,Firm\nRavi,98111 00001,Ravi Co", fileName: "a.csv" })
  await confirmDealerImport(crm, ME, new ObjectId(prev.importId))
  const deps = mkDeps(crm)
  const post = body => createLeadHandler(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), NOP, deps)
  const r = await post({ mobile: "9811100001", leadSource: "Call" })
  const b = await r.json()
  assert.equal(r.status, 201); assert.equal(b.existingDealer, true); assert.equal(b.created, true)
  const c = await crm.collection(COLL.contacts).findOne({ _id: new ObjectId(b.contactId) })
  assert.ok(c.existingDealer)
  const b2 = await (await post({ mobile: "+919811100001", leadSource: "WhatsApp" })).json()
  assert.equal(b2.existingDealer, true); assert.equal(b2.contactId, b.contactId)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 1)
  // a number NOT in the directory
  assert.equal((await (await post({ mobile: "9811100002", leadSource: "Call" })).json()).existingDealer, false)
})

// ───────────────────────── directory list ─────────────────────────
test("GET /api/crm/dealers: q by phone formats / name / city, state filter, pagination 50/page, validation", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const docs = Array.from({ length: 120 }, (_, i) => ({ phoneE164: "+9198000" + String(10000 + i), name: "Dealer " + i, company: i % 2 ? "Odd Co" : "Even Co", state: i < 60 ? "Gujarat" : "Delhi", city: i === 7 ? "Rajkot" : "Pune", createdAt: new Date() }))
  await crm.collection(COLL.dealerDirectory).insertMany(docs)
  const deps = mkDeps(crm)
  const list = async qs => { const r = await listDealersHandler(new Request("http://x/api/crm/dealers" + qs), NOP, deps); return { status: r.status, body: await r.json() } }
  let r = await list("")
  assert.equal(r.body.total, 120); assert.equal(r.body.items.length, 50); assert.equal(r.body.pageSize, 50)
  assert.equal((await list("?page=3")).body.items.length, 20)
  assert.equal((await list("?state=gujarat")).body.total, 60)
  assert.equal((await list("?q=rajkot")).body.total, 1)
  assert.equal((await list("?q=" + encodeURIComponent("98000 10007"))).body.items[0].phoneE164, "+919800010007")
  assert.equal((await list("?q=" + encodeURIComponent("+919800010007"))).body.total, 1)
  assert.equal((await list("?q=980001000")).body.total, 10)
  assert.equal((await list("?q=" + encodeURIComponent(".*"))).body.total, 0)
  assert.ok(r.body.items.every(i => i.id && !("_id" in i) && !("workspace" in i)))
  for (const qs of ["?page=0", "?page=1001", "?page=x", "?q=" + "x".repeat(101), "?state=" + "x".repeat(81)]) assert.equal((await list(qs)).status, 400, qs)
})

// ───────────────────────── API upload path ─────────────────────────
function mkDeps(crm, perms = OWNER) {
  return { getDb: async () => crm, auth: { getUser: async () => ({ sub: "u-owner", name: "Owner", role: "super_admin" }), resolvePermissions: async () => perms }, assignable: async () => [], now: () => NOW }
}
const mp = (bytes, name, extra = {}) => {
  const f = new FormData()
  f.append("file", new File([bytes], name, { type: "text/csv" }))
  for (const [k, v] of Object.entries(extra)) f.append(k, v)
  return new Request("http://x/api/crm/dealers/import/preview", { method: "POST", body: f })
}

test("API preview: multipart UTF-16LE file, columnMap field, size limits, wrong extension, JSON text body, no mobile column", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const deps = mkDeps(crm)
  const text = "Name ,Cell\nRavi,98111 00001\nSam,9811100002\n"
  const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")])
  let r = await importPreviewHandler(mp(le, "d.csv"), NOP, deps)
  let b = await r.json()
  assert.equal(r.status, 201, JSON.stringify(b)); assert.equal(b.summary.new, 2); assert.equal(b.columnMap.mobile, "Cell"); assert.equal(b.fileName, "d.csv")
  // columnMap override as form field
  r = await importPreviewHandler(mp(Buffer.from("A,B\nRavi,9811100003"), "d.tsv", { columnMap: JSON.stringify({ mobile: "B" }) }), NOP, deps)
  assert.equal(r.status, 201)
  r = await importPreviewHandler(mp(Buffer.from("A,B\nRavi,9811100003"), "d.csv", { columnMap: "{bad" }), NOP, deps)
  assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { columnMap: "invalid_json" })
  r = await importPreviewHandler(mp(Buffer.from("A,B\nRavi,9811100003"), "d.xlsx"), NOP, deps)
  assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { file: "csv_only" })
  r = await importPreviewHandler(mp(Buffer.alloc(0), "e.csv"), NOP, deps)
  assert.equal(r.status, 400); assert.equal((await r.json()).error, "empty_file")
  r = await importPreviewHandler(new Request("http://x", { method: "POST", body: new FormData() }), NOP, deps)
  assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { file: "required" })
  // 2 MB limit
  const big = Buffer.alloc(IMPORT_MAX_BYTES + 1, "a")
  r = await importPreviewHandler(mp(big, "big.csv"), NOP, deps)
  assert.equal(r.status, 413); assert.equal((await r.json()).error, "file_too_large")
  r = await importPreviewHandler(new Request("http://x", { method: "POST", headers: { "content-type": "application/json", "content-length": String(IMPORT_MAX_BYTES + 70 * 1024) }, body: "{}" }), NOP, deps)
  assert.equal(r.status, 413)
  r = await importPreviewHandler(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Mobile\n" + "9".repeat(IMPORT_MAX_BYTES) }) }), NOP, deps)
  assert.equal(r.status, 413)
  // file just under the limit is accepted (a single long ignored column)
  const under = Buffer.from("Mobile,Pad\n9811100004," + "x".repeat(IMPORT_MAX_BYTES - 200))
  r = await importPreviewHandler(mp(under, "under.csv"), NOP, deps)
  assert.equal(r.status, 201)
  // JSON body
  r = await importPreviewHandler(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Mobile\n9811100005", fileName: "j.csv" }) }), NOP, deps)
  assert.equal(r.status, 201)
  for (const bad of [{}, { text: "" }, { text: 5 }, { text: "Mobile\n1", columnMap: [1] }]) {
    r = await importPreviewHandler(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bad) }), NOP, deps)
    assert.equal(r.status, 400, JSON.stringify(bad))
  }
  // no mobile column
  r = await importPreviewHandler(mp(Buffer.from("Name,City\nRavi,Pune"), "n.csv"), NOP, deps)
  assert.equal(r.status, 400); assert.equal((await r.json()).fields["columnMap.mobile"], "required")
  // import needs crm.import.run: sales_manager is refused, nothing written
  const before = await count(crm, COLL.imports)
  r = await importPreviewHandler(mp(le, "d.csv"), NOP, mkDeps(crm, ROLE_PERMISSIONS.sales_manager))
  assert.equal(r.status, 403); assert.deepEqual((await r.json()).required, ["crm.import.run"])
  assert.equal(await count(crm, COLL.imports), before)
})

test("API preview -> confirm end to end returns payload without ok flag, 201 then 200, idempotent", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedExisting(crm)
  const deps = mkDeps(crm)
  let r = await importPreviewHandler(mp(Buffer.from(CSV), "dealers.csv"), NOP, deps)
  const prev = await r.json()
  assert.equal(r.status, 201); assert.ok(!("ok" in prev)); assert.equal(prev.summary.duplicate_existing_contact, 2)
  const confirm = () => importConfirmHandler(new Request("http://x", { method: "POST", body: JSON.stringify({ importId: prev.importId }) }), NOP, deps)
  r = await confirm(); let c = await r.json()
  assert.equal(r.status, 200); assert.equal(c.alreadyConfirmed, false); assert.equal(c.counts.inserted, 7)
  r = await confirm(); c = await r.json()
  assert.equal(c.alreadyConfirmed, true); assert.equal(c.counts.inserted, 7)
  assert.equal(await count(crm, COLL.dealerDirectory), 8)
  // lead list reflects the flag
})
