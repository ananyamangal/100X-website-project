// Run: node --import ./tests/support/register.mjs --test tests/unit/product-seo-overrides.test.mjs
// B4 (2026-10): product title / meta description fixes applied in code.
import test from "node:test"
import assert from "node:assert/strict"
import { PRODUCT_SEO_OVERRIDES, resolveProductSeoOverride } from "../../lib/seo/product-seo-overrides.ts"
import { LANDING_PAGES, getLandingDisplayName } from "../../lib/seo/landing-pages.ts"

const HBL22 = "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75"
const HM20 = "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde"
// /products/<slug> URLs that returned 200 on the live site on 2026-10-09.
const LIVE_PRODUCT_SLUGS = [
  HBL22,
  HM20,
  "ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv", // the 100XULV22 record (slug says mcf42-copy; unchanged)
  "100xulvss10-5e46c5",
  "cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1",
  "passenger-baggage-trolleys-stainless-steel-with-brakes-100xats",
]

test("every override title carries its model number and stays about 60 characters", () => {
  for (const [slug, o] of Object.entries(PRODUCT_SEO_OVERRIDES)) {
    if (o.title) {
      assert.ok(o.title.includes(o.model), `${slug}: title must contain ${o.model}`)
      assert.ok(o.title.length <= 62, `${slug}: title is ${o.title.length} chars`)
    }
    if (o.description) {
      assert.ok(o.description.includes(o.model), `${slug}: description must contain ${o.model}`)
      assert.ok(o.description.length <= 160, `${slug}: description is ${o.description.length} chars`)
    }
    // Slug keys are live URL segments (checked 2026-10-09); never invent one.
    assert.ok(LIVE_PRODUCT_SLUGS.includes(slug), `${slug} is not a known live product slug`)
  }
})

test("no two products share a title or a description any more", () => {
  const titles = Object.values(PRODUCT_SEO_OVERRIDES).map((o) => o.title).filter(Boolean)
  const descs = Object.values(PRODUCT_SEO_OVERRIDES).map((o) => o.description).filter(Boolean)
  assert.equal(new Set(titles).size, titles.length)
  assert.equal(new Set(descs).size, descs.length)
})

test("HBL22 no longer shows the HM20 model in its title or description", () => {
  const stored = PRODUCT_SEO_OVERRIDES[HBL22]
  const r = resolveProductSeoOverride(HBL22, stored.replacesTitle, stored.replacesDescription)
  assert.ok(r.title.includes("100XHBL22"))
  assert.ok(!r.title.includes("HM20") && !r.description.includes("HM20"))
  // Existing ranking words are kept.
  assert.match(r.title, /ISI Marked Thermal Fogging Machine/)
  assert.notEqual(r.title, resolveProductSeoOverride(HM20, PRODUCT_SEO_OVERRIDES[HM20].replacesTitle, "").title)
})

test("override applies only while the DB still holds the defective value (admin edits win)", () => {
  const o = PRODUCT_SEO_OVERRIDES[HM20]
  // Whitespace differences in the stored value do not matter.
  assert.equal(resolveProductSeoOverride(HM20, `  ${o.replacesTitle}  `, o.replacesDescription).title, o.title)
  assert.deepEqual(resolveProductSeoOverride(HM20, "Edited in admin", "Edited too"), {})
  assert.deepEqual(resolveProductSeoOverride("unknown-slug", "x", "y"), {})
})

test("ULVSS10 empty stored fields get the fix", () => {
  const r = resolveProductSeoOverride("100xulvss10-5e46c5", "", "")
  assert.ok(r.title.includes("100XULVSS10"))
  assert.ok(r.description.includes("100XULVSS10"))
})

test("DB400 and SSMA20 landing titles gain the model, labels stay the same", () => {
  const db = "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400"
  const ss = "thermal-fogging-machine-with-stainless-steel-tank-100xssma20"
  assert.ok(LANDING_PAGES[db].metadata.title.includes("100XDB400"))
  assert.ok(LANDING_PAGES[ss].metadata.title.includes("100XSSMA20"))
  assert.ok(LANDING_PAGES[db].metadata.title.length <= 60)
  assert.ok(LANDING_PAGES[ss].metadata.title.length <= 60)
  assert.equal(getLandingDisplayName(db), "Buy Double Barrel Thermal Fogging Machine")
  assert.equal(getLandingDisplayName(ss), "Buy Stainless Steel Tank Thermal Fogger")
})
