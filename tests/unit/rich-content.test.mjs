// Run: node --test tests/unit/rich-content.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { sanitizeRichHtml } from "../../lib/rich-text.ts"
import { enhanceTables } from "../../lib/richTables.ts"

const publish = (html) => enhanceTables(sanitizeRichHtml(html))

// Quill 2 table output: no thead/th, data-row attributes, <temporary> UI node.
const QUILL_TABLE =
  '<p>Compare:</p><table><colgroup><col><col></colgroup><tbody>' +
  '<tr><td data-row="row-a"><strong>Plan</strong></td><td data-row="row-a">Interval</td></tr>' +
  '<tr><td data-row="row-b">Weekly</td><td data-row="row-b"><a href="https://x.test/a">7 days</a></td></tr>' +
  '</tbody></table><p>After</p>'

test("body images survive: https src kept, alt/lazy defaults added", () => {
  const out = publish('<p>a</p><img src="https://res.cloudinary.com/x/y.png"><p>b</p>')
  assert.match(out, /<img[^>]*src="https:\/\/res\.cloudinary\.com\/x\/y\.png"/)
  assert.match(out, /alt=""/)
  assert.match(out, /loading="lazy"/)
  // position preserved: image sits between the two paragraphs
  assert.ok(out.indexOf("<p>a</p>") < out.indexOf("<img") && out.indexOf("<img") < out.indexOf("<p>b</p>"))
})

test("author alt/width/height are kept", () => {
  const out = publish('<img src="https://a.test/i.jpg" alt="Thermal fogger" width="300" height="200">')
  assert.match(out, /alt="Thermal fogger"/)
  assert.match(out, /width="300"/)
  assert.match(out, /height="200"/)
})

test("unsafe image sources are dropped whole", () => {
  for (const src of ["http://a.test/i.png", "data:image/png;base64,AAAA", "/relative.png", "javascript:alert(1)", "//a.test/i.png"]) {
    assert.doesNotMatch(publish(`<p>x</p><img src="${src}">`), /<img/, src)
  }
})

test("event-handler and style attributes are stripped", () => {
  const out = publish('<img src="https://a.test/i.png" onerror="alert(1)" style="x:y">')
  assert.doesNotMatch(out, /onerror|style=/)
})

test("table: first row becomes thead/th scope=col, rest stay in tbody", () => {
  const out = publish(QUILL_TABLE)
  assert.match(out, /<thead><tr><th scope="col"><strong>Plan<\/strong><\/th><th scope="col">Interval<\/th><\/tr><\/thead>/)
  assert.match(out, /<tbody><tr><td>Weekly<\/td><td><a href="https:\/\/x\.test\/a">7 days<\/a><\/td><\/tr><\/tbody>/)
  assert.doesNotMatch(out, /data-row/)
})

test("table is wrapped in a scroll container and surrounding content is untouched", () => {
  const out = publish(QUILL_TABLE)
  assert.match(out, /<div class="rich-table-scroll"><table>/)
  assert.match(out, /<\/table><\/div><p>After<\/p>/)
  assert.ok(out.startsWith("<p>Compare:</p>"))
})

test("single-row table is not promoted to a header", () => {
  const out = publish("<table><tbody><tr><td>only</td></tr></tbody></table>")
  assert.doesNotMatch(out, /<thead|<th/)
  assert.match(out, /rich-table-scroll/)
})

test("content without a table is returned byte-identical by enhanceTables", () => {
  const html = "<h2>Hi</h2><p>no tables here &amp; more</p>"
  assert.equal(enhanceTables(html), html)
})

test("bold and links inside cells work; scripts inside cells do not", () => {
  const out = publish('<table><tbody><tr><td>h</td></tr><tr><td><em>i</em><script>alert(1)</script></td></tr></tbody></table>')
  assert.match(out, /<em>i<\/em>/)
  assert.doesNotMatch(out, /<script/)
})

test("FAQ accordion still works alongside images and tables", async () => {
  const { wrapFaqAccordion } = await import("../../lib/faqAccordion.ts")
  const html = '<p>x</p><table><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table>' +
    '<h2>Frequently Asked Questions</h2><h3>Q1?</h3><p>A1</p>'
  const out = wrapFaqAccordion(publish(html))
  assert.match(out, /<details/)
  assert.match(out, /rich-table-scroll/)
})
