// Run: node --import ./tests/support/register.mjs --test tests/unit/lead-email.test.mjs
// Pins lib/lead-email.ts: every saved field reaches the admin e-mail, in a stable order,
// HTML-escaped, with empty / honeypot / internal values skipped and long values capped.
import test from "node:test"
import assert from "node:assert/strict"
import { buildLeadEmail, leadRows, leadSubject, humanizeKey, MAX_VALUE_CHARS } from "../../lib/lead-email.ts"

const record = {
  _id: "should-not-appear",
  name: "Asha <b>Verma</b>",
  company: "Verma & Sons",
  mobile: "9876543210",
  email: "asha@example.test",
  state: "Bihar",
  intent: "buy",
  type: "contact",
  source: "landing:fogging-machine-supplier-in-bihar",
  message: "Need 5 units\nby March",
  quantity: 5,
  gemAuthRequired: true,
  dealerInquiry: false,
  someNewField: "custom value",
  emptyString: "",
  nothing: null,
  missing: undefined,
  emptyList: [],
  emptyObject: {},
  website: "http://bot.example",          // honeypot — skipped
  company_website: "spam",               // honeypot — skipped
  emailStatus: "pending",                // internal — skipped
  tags: ["gem", "bulk"],
  attribution: { utm_source: "google", utm_medium: "cpc", gclid: "abc123", empty: "" },
  form_page_url: "https://www.100xcircle.com/fogging-machine-supplier-in-bihar",
  form_page_path: "/fogging-machine-supplier-in-bihar",
  createdAt: "2026-10-07T13:45:51.000Z",
}

test("every non-empty field is present exactly once; skipped keys never appear", () => {
  const rows = leadRows(record, "6ac64d0f26fde7f9631d1534")
  const keys = rows.map((r) => r.key)
  for (const k of ["name", "company", "mobile", "email", "state", "intent", "type", "source", "message", "quantity", "gemAuthRequired", "dealerInquiry", "someNewField", "tags", "attribution.utm_source", "attribution.utm_medium", "attribution.gclid", "form_page_url", "form_page_path", "createdAt", "_id"]) {
    assert.equal(keys.filter((x) => x === k).length, 1, `expected exactly one row for ${k}`)
  }
  for (const k of ["emptyString", "nothing", "missing", "emptyList", "emptyObject", "website", "company_website", "emailStatus", "attribution.empty"]) {
    assert.ok(!keys.includes(k), `${k} must be skipped`)
  }
  assert.equal(rows.find((r) => r.key === "_id").value, "6ac64d0f26fde7f9631d1534")
  assert.equal(rows.find((r) => r.key === "gemAuthRequired").value, "Yes")
  assert.equal(rows.find((r) => r.key === "dealerInquiry").value, "No")
  assert.equal(rows.find((r) => r.key === "tags").value, "gem, bulk")
  assert.equal(rows.find((r) => r.key === "quantity").value, "5")
})

test("order: known contact fields first, then the rest, then metadata, then time and id", () => {
  const keys = leadRows(record, "id1").map((r) => r.key)
  const pos = (k) => keys.indexOf(k)
  assert.ok(pos("name") < pos("company") && pos("company") < pos("mobile") && pos("mobile") < pos("email"))
  assert.ok(pos("source") < pos("message") && pos("message") < pos("quantity"))
  assert.ok(pos("quantity") < pos("gemAuthRequired") && pos("gemAuthRequired") < pos("someNewField"))
  assert.ok(pos("someNewField") < pos("form_page_url"), "metadata comes after the unknown fields")
  assert.ok(pos("form_page_url") < pos("attribution.utm_source"))
  assert.equal(keys[keys.length - 2], "createdAt")
  assert.equal(keys[keys.length - 1], "_id")
})

test("createdAt is rendered in IST; labels are humanised", () => {
  const rows = leadRows(record)
  const created = rows.find((r) => r.key === "createdAt")
  assert.equal(created.label, "Submitted (IST)")
  assert.match(created.value, /07 Oct 2026, 19:15 IST$/)
  assert.equal(rows.find((r) => r.key === "someNewField").label, "Some new field")
  assert.equal(rows.find((r) => r.key === "attribution.utm_source").label, "Attribution · UTM source")
  assert.equal(rows.find((r) => r.key === "form_page_url").label, "Page URL")
  assert.equal(humanizeKey("gem_seller_id"), "GEM seller ID")
})

test("HTML is escaped in the html part and raw in the text part", () => {
  const { text, html } = buildLeadEmail({ title: "New lead <test>", record })
  assert.ok(html.includes("Asha &lt;b&gt;Verma&lt;/b&gt;"), "name must be escaped")
  assert.ok(!html.includes("<b>Verma</b>"), "raw tag must not survive")
  assert.ok(html.includes("Verma &amp; Sons"))
  assert.ok(html.includes("New lead &lt;test&gt;"), "title is escaped too")
  assert.ok(text.includes("Asha <b>Verma</b>"), "text part keeps the raw characters")
  assert.ok(text.includes("Need 5 units\n"), "multi-line values keep their line breaks in text")
  assert.ok(html.includes('<a href="https://www.100xcircle.com/fogging-machine-supplier-in-bihar">'), "URLs become links")
})

test("values are capped at MAX_VALUE_CHARS", () => {
  const long = "x".repeat(MAX_VALUE_CHARS + 500)
  const rows = leadRows({ message: long })
  assert.equal(rows[0].value.length, MAX_VALUE_CHARS)
  assert.ok(rows[0].value.endsWith("…"))
})

test("text and html carry the same rows", () => {
  const { text, rows } = buildLeadEmail({ title: "T", record })
  for (const r of rows) assert.ok(text.includes(`${r.label}:`), `text part is missing ${r.label}`)
})

test("subject: New lead — <name> (<company>) — <source/type>, dropping missing parts", () => {
  assert.equal(leadSubject("New lead", record), "New lead — Asha <b>Verma</b> (Verma & Sons) — landing:fogging-machine-supplier-in-bihar")
  assert.equal(leadSubject("New lead", { name: "Ravi", type: "contact" }), "New lead — Ravi — contact")
  assert.equal(leadSubject("New lead", { organization: "ABC Ltd" }), "New lead — website lead (ABC Ltd)")
  assert.equal(leadSubject("New RFQ", { name: "Ravi", organization: "ABC" }, "100XTFS50"), "New RFQ — Ravi (ABC) — 100XTFS50")
  assert.equal(leadSubject("New lead", {}), "New lead — website lead")
})

test("an empty record (the 2026-10-07 stray rows) still produces a valid e-mail with just time and id", () => {
  const { rows } = buildLeadEmail({ title: "T", record: { createdAt: "2026-10-07T13:45:51.197Z" }, id: "abc" })
  assert.deepEqual(rows.map((r) => r.key), ["createdAt", "_id"])
})
