// Run: node --import ./tests/support/register.mjs --test tests/unit/honeypot.test.mjs
// Pins the owner-approved honeypot (A7): every public lead form renders <HoneypotField />
// and sends its value; every receiving route answers a filled one exactly like a success,
// logs one line (timestamp, route, page path; no lead data) and neither saves nor e-mails
// it. A real submission without the field (old cached clients) or with it empty still
// saves. The routes run against in-memory fakes (tests/support/route-fakes): no database,
// no mailer.
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { register } from "node:module"
import {
  HONEYPOT_FIELD,
  HONEYPOT_FIELDS,
  isHoneypotFilled,
  withoutHoneypot,
  honeypotPagePath,
  honeypotLogLine,
  decoyId,
} from "../../lib/honeypot.ts"

register("../support/route-fakes/hooks.mjs", import.meta.url)
const { state, resetRouteFakes, flushAfter } = await import("../support/route-fakes/state.mjs")
const routes = {
  submissions: await import("../../app/api/submissions/route.ts"),
  rfqSubmit: await import("../../app/api/rfq-submit/route.ts"),
  brochureLeads: await import("../../app/api/brochure-leads/route.ts"),
  oemLeads: await import("../../app/api/oem-leads/route.ts"),
  rfq: await import("../../app/api/rfq/route.ts"),
  rfqPopup: await import("../../app/api/rfq-popup/submit/route.ts"),
}

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8")

const post = (path, body, headers = {}) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })

function captureConsole() {
  const lines = { warn: [], error: [], log: [] }
  const orig = { log: console.log, error: console.error, warn: console.warn }
  for (const k of Object.keys(orig)) console[k] = (...a) => lines[k].push(a.map(String).join(" "))
  return { lines, restore: () => Object.assign(console, orig) }
}

/** Runs a route handler with fresh fakes; returns status, JSON, writes, e-mails and log lines. */
async function run(handler, request) {
  resetRouteFakes()
  const c = captureConsole()
  try {
    const res = await handler(request)
    await flushAfter()
    const json = await res.json()
    const writes = Object.values(state.db.cols).flatMap((col) => col.writes.map((w) => `${col.name}.${w}`))
    const docs = Object.fromEntries(Object.entries(state.db.cols).map(([n, col]) => [n, col.docs]))
    return { status: res.status, json, writes, docs, emails: state.emails, lines: c.lines }
  } finally {
    c.restore()
  }
}

// ---------------------------------------------------------------- lib/honeypot

test("field name is unremarkable, has no 'company' for autofill to match, and is one the server checks", () => {
  assert.equal(HONEYPOT_FIELD, "website")
  assert.ok(!/company|organi[sz]ation|business|name|email|phone|tel|address/i.test(HONEYPOT_FIELD))
  assert.ok(HONEYPOT_FIELDS.includes(HONEYPOT_FIELD))
  assert.ok(HONEYPOT_FIELDS.includes("company_website"), "pre-A7 decoy name still trips")
})

test("isHoneypotFilled: only a non-blank string counts; absent, empty, blank and non-strings do not", () => {
  assert.equal(isHoneypotFilled({ name: "A" }), false)
  assert.equal(isHoneypotFilled({ website: "" }), false)
  assert.equal(isHoneypotFilled({ website: "   " }), false)
  assert.equal(isHoneypotFilled({ website: null }), false)
  assert.equal(isHoneypotFilled(null), false)
  assert.equal(isHoneypotFilled("website"), false)
  for (const k of HONEYPOT_FIELDS) assert.equal(isHoneypotFilled({ [k]: "http://spam.example" }), true, k)
})

test("withoutHoneypot drops every honeypot key and nothing else", () => {
  const out = withoutHoneypot({ name: "A", website: "", company_website: "x", hp: "", url: "y", phone: "1" })
  assert.deepEqual(out, { name: "A", phone: "1" })
})

test("page path: body path first, else URL path, else Referer; never a query string", () => {
  assert.equal(honeypotPagePath({ form_page_path: "/contact" }), "/contact")
  assert.equal(honeypotPagePath({ pagePath: "/products/x" }), "/products/x")
  assert.equal(honeypotPagePath({ form_page_url: "https://www.100xcircle.com/gem?utm_source=a&phone=9" }), "/gem")
  assert.equal(honeypotPagePath({ pageUrl: "https://www.100xcircle.com/b#frag" }), "/b")
  assert.equal(honeypotPagePath({}, "https://www.100xcircle.com/dealer-program?x=1"), "/dealer-program")
  assert.equal(honeypotPagePath({ form_page_path: "/a?email=x@y.z" }), "/a")
  assert.equal(honeypotPagePath({ form_page_path: "/a\nFAKE LOG LINE" }), "/aFAKELOGLINE")
  assert.equal(honeypotPagePath({ form_page_path: "javascript:alert(1)" }), "unknown")
  assert.equal(honeypotPagePath({}), "unknown")
})

test("log line: ISO timestamp, route and page only", () => {
  const line = honeypotLogLine("/api/submissions", "/contact", new Date("2026-10-09T01:02:03.000Z"))
  assert.equal(line, "[honeypot] discarded submission at=2026-10-09T01:02:03.000Z route=/api/submissions page=/contact")
})

test("decoyId is ObjectId-shaped", () => {
  assert.match(decoyId(), /^[0-9a-f]{24}$/)
})

// ---------------------------------------------------------------- forms

const FORMS = [
  "app/(site)/dealer-program/DealerApplicationForm.tsx",
  "components/BrochureLeadModal.tsx",
  "components/ContactSection.tsx",
  "components/cta/QuoteModal.tsx",
  "components/forms/RFQForm.tsx",
  "components/gov-procurement/GovRFQForm.tsx",
  "components/gov-procurement/TenderPackLeadCapture.tsx",
  "components/landing/LandingFormBlock.tsx",
  "components/oem/OemAuthForm.tsx",
  "components/oem/PartnerApplyForm.tsx",
  "components/rfq/RfqForm.tsx",
  "components/RFQPopup.tsx",
]

test("every public lead form renders <HoneypotField />, reads it and sends it in the POST body", () => {
  for (const f of FORMS) {
    const src = read(f)
    assert.ok(src.includes("<HoneypotField />"), `${f}: renders the shared field`)
    assert.ok(/const honeypot = readHoneypot\(/.test(src), `${f}: reads the value`)
    const sends = src.match(/\[HONEYPOT_FIELD\]: honeypot/g) ?? []
    const posts = src.match(/JSON\.stringify\(/g) ?? []
    assert.ok(sends.length >= 1, `${f}: sends the value`)
    assert.ok(!src.includes('name="company_website"'), `${f}: old decoy input removed`)
    assert.ok(!/if \(honeypot\)/.test(src), `${f}: no client-side rejection; the server decides`)
    assert.ok(posts.length >= 1)
  }
})

test("no other public form file is missed", () => {
  const walk = (dir) =>
    fs.readdirSync(new URL(`../../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(`${dir}/${d.name}`) : d.name.endsWith(".tsx") ? [`${dir}/${d.name}`] : [],
    )
  const posting = [...walk("components"), ...walk("app")]
    .filter((f) => !/\(admin\)|\/admin\//.test(f))
    .filter((f) => /fetch\(["'`]\/api\/(submissions|rfq-submit|rfq|oem-leads|brochure-leads|rfq-popup\/submit)["'`]/.test(read(f)))
    .filter((f) => /method:\s*["']POST["']/.test(read(f)))
  assert.deepEqual(posting.sort(), [...FORMS].sort())
})

test("the shared field: off-screen (not display:none), aria-hidden, tabIndex -1, autocomplete off, no text", () => {
  const src = read("components/forms/HoneypotField.tsx")
  assert.ok(src.includes("name={HONEYPOT_FIELD}"))
  assert.ok(src.includes("tabIndex={-1}"))
  assert.ok(src.includes('autoComplete="off"'))
  assert.equal((src.match(/aria-hidden="true"/g) ?? []).length, 2)
  assert.ok(src.includes('left: "-10000px"'))
  const jsx = src.slice(src.indexOf("return ("))
  assert.ok(!/display|className="hidden"|visibility/.test(jsx))
  assert.ok(!/<label|placeholder=/.test(jsx))
  // No text nodes between tags in the JSX.
  assert.ok(!/>\s*[A-Za-z][^<{]*</.test(jsx), "no visible text content")
})

// ---------------------------------------------------------------- routes

const PAGE = { form_page_url: "https://www.100xcircle.com/contact?utm_source=x", form_page_path: "/contact" }
const LEAD = { name: "Asha Rao", phone: "9876543210", email: "asha@example.in", organization: "Municipal Corp", type: "contact", ...PAGE }
const RFQ = { product: "Thermal Fogger", name: "Asha Rao", phone: "9876543210", email: "asha@example.in", organization: "Municipal Corp", ...PAGE }

function assertDiscarded(r, route, page = "/contact") {
  assert.deepEqual(r.writes, [], "nothing written")
  assert.equal(r.emails.length, 0, "nothing e-mailed")
  assert.equal(r.lines.warn.length, 1, "exactly one warn line")
  const line = r.lines.warn[0]
  assert.match(line, new RegExp(`^\\[honeypot\\] discarded submission at=\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z route=${route.replace(/\//g, "\\/")} page=${page.replace(/\//g, "\\/")}$`))
  for (const pii of ["Asha", "9876543210", "asha@example.in", "Municipal", "spam", "utm_source"]) {
    assert.ok(!line.includes(pii), `log line leaks ${pii}`)
  }
}

// /api/submissions

test("/api/submissions: filled honeypot -> 201 success shape, no insert, no e-mail, one log line", async () => {
  const r = await run(routes.submissions.POST, post("/api/submissions", { ...LEAD, website: "http://spam.example" }))
  assert.equal(r.status, 201)
  assert.match(String(r.json._id), /^[0-9a-f]{24}$/)
  assert.equal(typeof r.json.createdAt, "string")
  assert.equal(r.json.error, undefined)
  assertDiscarded(r, "/api/submissions")
})

test("/api/submissions: legacy company_website filled -> also discarded silently", async () => {
  const r = await run(routes.submissions.POST, post("/api/submissions", { ...LEAD, company_website: "spam" }))
  assert.equal(r.status, 201)
  assertDiscarded(r, "/api/submissions")
})

test("/api/submissions: real submission WITHOUT the field (old cached client) -> saves and e-mails", async () => {
  const r = await run(routes.submissions.POST, post("/api/submissions", LEAD))
  assert.equal(r.status, 201)
  assert.deepEqual(r.writes, ["submissions.insertOne"])
  assert.equal(r.docs.submissions[0].name, "Asha Rao")
  assert.equal(r.emails.length, 1)
  assert.equal(r.lines.warn.length, 0)
})

test("/api/submissions: real submission with the field EMPTY -> saves, field not stored", async () => {
  const r = await run(routes.submissions.POST, post("/api/submissions", { ...LEAD, website: "" }))
  assert.equal(r.status, 201)
  assert.deepEqual(r.writes, ["submissions.insertOne"])
  assert.equal("website" in r.docs.submissions[0], false)
  assert.equal(r.emails.length, 1)
  assert.equal(r.lines.warn.length, 0)
})

// /api/rfq-submit

test("/api/rfq-submit: filled honeypot -> 200 {ok:true}, no insert, no e-mail, one log line", async () => {
  const r = await run(routes.rfqSubmit.POST, post("/api/rfq-submit", { ...RFQ, website: "http://spam.example" }))
  assert.equal(r.status, 200)
  assert.equal(r.json.ok, true)
  assert.equal(r.json.dbStatus, "saved")
  assert.match(String(r.json.dbId), /^[0-9a-f]{24}$/)
  assertDiscarded(r, "/api/rfq-submit")
})

test("/api/rfq-submit: real RFQ WITHOUT the field -> saves and e-mails", async () => {
  const r = await run(routes.rfqSubmit.POST, post("/api/rfq-submit", RFQ))
  assert.equal(r.status, 200)
  assert.equal(r.json.ok, true)
  assert.equal(r.json.dbStatus, "saved")
  assert.equal(r.writes[0], "submissions.insertOne")
  assert.equal(r.docs.submissions[0].product, "Thermal Fogger")
  assert.equal(r.emails.length, 1)
  assert.equal(r.lines.warn.length, 0)
})

test("/api/rfq-submit: real RFQ with the field EMPTY -> saves, field not stored", async () => {
  const r = await run(routes.rfqSubmit.POST, post("/api/rfq-submit", { ...RFQ, website: "" }))
  assert.equal(r.json.ok, true)
  assert.equal(r.writes[0], "submissions.insertOne")
  assert.equal("website" in r.docs.submissions[0], false)
  assert.equal(r.emails.length, 1)
})

// The other public lead routes

const BROCHURE = { name: "Asha Rao", phone: "9876543210", email: "asha@example.in", organization: "Municipal Corp", pageUrl: "https://www.100xcircle.com/products/x?utm_source=x" }
const OEM = { name: "Asha Rao", company: "Municipal Corp", mobile: "9876543210", email: "asha@example.in", state: "Bihar", product: "Thermal Fogger" }
const RFQ_LEAD = { name: "Asha Rao", mobile: "9876543210", email: "asha@example.in", organization: "Municipal Corp" }
const POPUP = { answers: { "Your name": "Asha Rao", Phone: "9876543210" }, pagePath: "/products/x", pageUrl: "https://www.100xcircle.com/products/x" }

const OTHER = [
  ["/api/brochure-leads", routes.brochureLeads, BROCHURE, "/products/x", "brochure_leads", (j) => j.ok === true && typeof j.score === "number"],
  ["/api/oem-leads", routes.oemLeads, OEM, "/oem", "oem_leads", (j) => j.success === true && typeof j.id === "string" && j.id.length > 0],
  ["/api/rfq", routes.rfq, RFQ_LEAD, "/oem", "rfq_leads", (j) => j.success === true],
  ["/api/rfq-popup/submit", routes.rfqPopup, POPUP, "/products/x", "rfq_popup_leads", (j) => j.ok === true && typeof j.savedId === "string"],
]

for (const [path, mod, body, page, collection, okShape] of OTHER) {
  test(`${path}: filled honeypot -> 200 success shape, nothing saved or e-mailed, one log line`, async () => {
    const r = await run(mod.POST, post(path, { ...body, website: "http://spam.example" }, { referer: "https://www.100xcircle.com/oem?ref=1" }))
    assert.equal(r.status, 200)
    assert.ok(okShape(r.json), JSON.stringify(r.json))
    assertDiscarded(r, path, page)
  })

  test(`${path}: real lead without / with an empty field -> saves`, async () => {
    for (const b of [body, { ...body, website: "" }]) {
      const r = await run(mod.POST, post(path, b, { referer: "https://www.100xcircle.com/oem" }))
      assert.equal(r.status, 200, JSON.stringify(r.json))
      assert.ok(okShape(r.json), JSON.stringify(r.json))
      assert.equal(r.docs[collection].length, 1)
      assert.equal("website" in r.docs[collection][0], false)
      assert.equal(r.lines.warn.length, 0)
    }
  })
}
