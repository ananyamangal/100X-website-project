// Run: node --import ./tests/support/register.mjs --test tests/unit/procurement-guides.test.mjs
// E5 (2026-10): new procurement guide pages.
import test from "node:test"
import assert from "node:assert/strict"
import {
  PROCUREMENT_GUIDES,
  guideWordCount,
  guideLinks,
  procurementGuideSitemapEntries,
} from "../../lib/seo/procurement-guides.ts"
import { wordCount } from "../../lib/seo/answer-summaries.ts"
import { getLandingPage } from "../../lib/seo/landing-pages.ts"

// Paths that ranked in any agency window must never be re-used for a new page.
const PROTECTED_SAMPLE = [
  "/thermal-vs-cold-fogging-machine",
  "/is-14855-fogging-machine",
  "/gem-approved-fogging-machine-oem",
  "/knowledge/government-procurement-guide",
  "/fogging-machine-buying-guide",
]

test("each guide is 600-1,000 words with a 40-60 word summary", () => {
  for (const g of PROCUREMENT_GUIDES) {
    const n = guideWordCount(g)
    assert.ok(n >= 600 && n <= 1000, `${g.path}: ${n} words`)
    const s = wordCount(g.summary)
    assert.ok(s >= 40 && s <= 60, `${g.path} summary: ${s} words`)
  }
})

test("titles and descriptions fit, paths are new and do not collide", () => {
  const paths = new Set()
  for (const g of PROCUREMENT_GUIDES) {
    assert.ok(g.title.length <= 60, `${g.path} title ${g.title.length}`)
    assert.ok(g.description.length <= 160, `${g.path} description ${g.description.length}`)
    assert.ok(!PROTECTED_SAMPLE.includes(g.path))
    assert.equal(getLandingPage(g.path.slice(1)), undefined, `${g.path} collides with a landing slug`)
    assert.ok(!paths.has(g.path))
    paths.add(g.path)
  }
})

test("FAQs are present and unique; every answer is plain enough for FAQPage", () => {
  for (const g of PROCUREMENT_GUIDES) {
    assert.ok(g.faqs.length >= 4)
    assert.equal(new Set(g.faqs.map((f) => f.q)).size, g.faqs.length)
  }
})

test("links point to existing site paths, and each guide links to the protected page on its topic", () => {
  const [spec, delivery] = PROCUREMENT_GUIDES
  for (const g of PROCUREMENT_GUIDES) {
    for (const l of guideLinks(g)) assert.match(l, /^\/[a-z0-9\-/]*$/, l)
  }
  assert.ok(guideLinks(spec).includes("/is-14855-fogging-machine"))
  assert.ok(guideLinks(spec).includes("/thermal-vs-cold-fogging-machine"))
  assert.ok(guideLinks(delivery).includes("/knowledge/government-procurement-guide"))
  assert.ok(guideLinks(delivery).includes("/gem-approved-fogging-machine-oem"))
  assert.ok(guideLinks(delivery).includes("/thermal-vs-cold-fogging-machine"))
})

test("no stale founding year or superlatives", () => {
  for (const g of PROCUREMENT_GUIDES) {
    const text = JSON.stringify(g)
    assert.doesNotMatch(text, /2014|best\b/i, g.path)
  }
})

test("sitemap rows carry the guide's own date, not 'now'", () => {
  const rows = procurementGuideSitemapEntries("https://www.100xcircle.com")
  assert.equal(rows.length, PROCUREMENT_GUIDES.length)
  for (const r of rows) assert.equal(r.lastModified.toISOString().slice(0, 10), "2026-10-09")
})
