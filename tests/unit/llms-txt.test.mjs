// Run: node --import ./tests/support/register.mjs --test tests/unit/llms-txt.test.mjs
// E1 (2026-10): public/llms.txt content checks (offline; live status checked separately with curl).
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { getLandingPage } from "../../lib/seo/landing-pages.ts"
import { PROCUREMENT_GUIDES } from "../../lib/seo/procurement-guides.ts"

const txt = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8")
const urls = [...new Set(txt.match(/https:\/\/www\.100xcircle\.com[^\s)]*/g) ?? [])]

// Every URL of the previous llms.txt that returned 200 on live on 2026-10-09 must stay listed.
const KEPT_FROM_PREVIOUS = [
  "", "/about", "/ai/dealer-authorization", "/api/ai/capabilities", "/api/ai/certifications", "/api/ai/company",
  "/api/ai/factory", "/api/ai/government-supplies", "/api/ai/products", "/api/mcp", "/become-a-dealer", "/blog",
  "/case-studies", "/compare", "/contact-us", "/dealer-application", "/dealers-and-government",
  "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400", "/factory", "/fogging-machine-for-nagar-panchayat",
  "/gem-oem-authorization", "/gem-reverse-auction-fogging", "/gem-tender-support", "/is-14855-fogging-machine", "/knowledge",
  "/knowledge/fogging-machine-for-pest-control-business", "/knowledge/gem-oem-authorization-process",
  "/knowledge/gem-reseller-guide", "/make-in-india-fogging-machine", "/municipal-fogging-programme", "/nhm-fogging-machine",
  "/nvbdcp-fogging-machine", "/products", "/products/100xulvss10-5e46c5",
  "/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1",
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75",
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde",
  "/products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv", "/public-health-equipment",
  "/thermal-and-cold-fogging-machine-100xtfs50", "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "/vector-control-equipment", "/vehicle-mounted-fogging-machine",
]

// Dropped because they 404 or redirect on live (2026-10-09).
const DEAD = [
  "/products/100x-thermal-fogger-bf150", "/products/100x-thermal-fogger-bf200", "/products/100x-heavy-duty-thermal-fogger-bf400",
  "/products/100x-minisuper-2000-gold-classic", "/products/100x-minisuper-2000-gold-new",
]

test("every previously valid URL is still listed", () => {
  for (const p of KEPT_FROM_PREVIOUS) assert.ok(urls.includes(`https://www.100xcircle.com${p}`), p || "/")
})

test("no dead or redirecting URL, no trailing punctuation", () => {
  for (const p of DEAD) assert.ok(!urls.includes(`https://www.100xcircle.com${p}`), p)
  for (const u of urls) assert.doesNotMatch(u, /[.,;:]$/, u)
})

test("GeM path, new guides and the 9 fogger models are listed", () => {
  for (const p of [
    "/gem-approved-fogging-machine-oem", "/oem-authorization-letter", "/gem-oem-authorization",
    "/past-performance-government", "/spare-parts", "/case-studies",
    ...PROCUREMENT_GUIDES.map((g) => g.path),
  ]) assert.ok(urls.includes(`https://www.100xcircle.com${p}`), p)
  for (const m of ["100XTFS50", "100XSSMA20", "100XMCF42", "100XHM20", "100XDB400", "100XHBL22", "100XULV22", "100XULVSS10", "100XBF102"]) {
    assert.match(txt, new RegExp(`### ${m} `), m)
  }
  // Landing-page URLs listed must exist in the registry or as app routes (spot check of registry ones).
  assert.ok(getLandingPage("gem-approved-fogging-machine-oem"))
})

test("facts: 2020, last updated date, FAQ, contact; no 2014 / ISO / CE / export claims", () => {
  assert.match(txt, /since 2020/)
  assert.match(txt, /^Last updated: \d{4}-\d{2}-\d{2}$/m)
  assert.match(txt, /^## FAQ$/m)
  assert.match(txt, /^## Contact$/m)
  assert.match(txt, /within 24 hours on working days/)
  assert.match(txt, /GeM Seller ID is optional/)
  assert.doesNotMatch(txt, /2014|ISO 9001|CE Marking|CE-marked|Export|Instafog|13 thermal/i)
  assert.match(txt, /agricultur/i, "agriculture wording must stay")
})
