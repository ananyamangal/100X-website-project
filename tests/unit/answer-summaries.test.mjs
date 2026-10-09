// Run: node --import ./tests/support/register.mjs --test tests/unit/answer-summaries.test.mjs
// E3 (2026-10): answer-first summaries.
import test from "node:test"
import assert from "node:assert/strict"
import { ANSWER_SUMMARIES, getAnswerSummary, wordCount, formatUpdated } from "../../lib/seo/answer-summaries.ts"

test("every summary is 40-60 words with a valid date", () => {
  for (const [path, e] of Object.entries(ANSWER_SUMMARIES)) {
    const n = wordCount(e.summary)
    assert.ok(n >= 40 && n <= 60, `${path}: ${n} words`)
    assert.match(e.updated, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(path.startsWith("/") && !path.endsWith("/"), path)
  }
})

test("summaries make no claim FACTS.md rules out", () => {
  for (const [path, e] of Object.entries(ANSWER_SUMMARIES)) {
    assert.doesNotMatch(e.summary, /ISO|\bCE\b|certified|BIS approved|2014|10\+ years|best\b/i, path)
    // ISI is owner-confirmed only for the two HDPE models.
    if (/\bISI\b/.test(e.summary)) {
      assert.ok(/100XHM20|100XHBL22/.test(e.summary), `${path} mentions ISI without the confirmed models`)
    }
  }
})

test("key pages are covered", () => {
  for (const p of [
    "/gem-approved-fogging-machine-oem",
    "/is-14855-fogging-machine",
    "/thermal-vs-cold-fogging-machine",
    "/fogging-machine-government-procurement",
    "/thermal-and-cold-fogging-machine-100xtfs50",
    "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  ]) assert.ok(getAnswerSummary(p), p)
  // Each of the 9 fogger models has a summary that names it.
  for (const m of ["100XTFS50", "100XSSMA20", "100XMCF42", "100XHM20", "100XDB400", "100XHBL22", "100XULV22", "100XULVSS10", "100XBF102"]) {
    assert.ok(Object.values(ANSWER_SUMMARIES).some((e) => e.summary.includes(`The ${m}`)), m)
  }
  assert.equal(getAnswerSummary("/is-14855-fogging-machine/"), ANSWER_SUMMARIES["/is-14855-fogging-machine"])
})

test("date formatting is locale-independent", () => {
  assert.equal(formatUpdated("2026-10-09"), "9 October 2026")
})
