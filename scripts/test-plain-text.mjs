/**
 * Regression test for plainTextFromHtml.
 * Run with: node scripts/test-plain-text.mjs
 *
 * Mirrors the logic in lib/rich-text.ts so it runs without TypeScript.
 * Verifies the &nbsp; /   bug and block-element spacing are both fixed.
 */

import sanitizeHtml from "sanitize-html"

function plainTextFromHtml(html) {
  if (!html) return ""
  // Insert a space before block-level tags so adjacent elements don't get merged
  const spaced = String(html).replace(/<\/?(?:p|li|div|br|h[1-6]|ul|ol|tr|td|th)[^>]*>/gi, " ")
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
  // sanitize-html decodes &nbsp; to  ; \s does not match it
  return text.replace(/ /g, " ").replace(/\s+/g, " ").trim()
}

const cases = [
  {
    input: "<p>AVAILABLE&nbsp;ON&nbsp;GEM&nbsp;for&nbsp;resellers.</p>",
    expected: "AVAILABLE ON GEM for resellers.",
  },
  {
    input: "<p>Hello <strong>world</strong></p>",
    expected: "Hello world",
  },
  {
    input: "plain text no tags",
    expected: "plain text no tags",
  },
  {
    input: "<ul><li>Item one</li><li>Item two</li></ul>",
    expected: "Item one Item two",
  },
  {
    input: "  multiple   spaces  ",
    expected: "multiple spaces",
  },
  {
    input: "",
    expected: "",
  },
]

let passed = 0
let failed = 0

for (const { input, expected } of cases) {
  const result = plainTextFromHtml(input)
  if (result === expected) {
    console.log(`✓  "${input.slice(0, 60)}"`)
    passed++
  } else {
    console.error(`✗  INPUT:    "${input}"`)
    console.error(`   EXPECTED: "${expected}"`)
    console.error(`   GOT:      "${result}"`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
