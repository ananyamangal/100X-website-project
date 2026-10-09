// Run: node --import ./tests/support/register.mjs --test tests/unit/faq-visible.test.mjs
// B1: visible FAQ blocks are built from the page's own FAQPage JSON-LD.
import test from "node:test"
import assert from "node:assert/strict"
import { faqPairsFromJsonLd } from "../../lib/seo/faqVisible.ts"

const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Q one?", acceptedAnswer: { "@type": "Answer", text: "A one." } },
    { "@type": "Question", name: "Q two?", acceptedAnswer: { "@type": "Answer", text: "A two." } },
    { "@type": "Question", name: "Broken?", acceptedAnswer: null },
  ],
}

test("returns every schema pair verbatim, in order", () => {
  assert.deepEqual(faqPairsFromJsonLd(schema), [
    { q: "Q one?", a: "A one." },
    { q: "Q two?", a: "A two." },
  ])
})

test("exclude skips questions already shown verbatim elsewhere", () => {
  assert.deepEqual(faqPairsFromJsonLd(schema, ["Q one?"]), [{ q: "Q two?", a: "A two." }])
})

test("non-FAQPage input gives no pairs", () => {
  assert.deepEqual(faqPairsFromJsonLd(null), [])
  assert.deepEqual(faqPairsFromJsonLd({ "@type": "Article" }), [])
})
