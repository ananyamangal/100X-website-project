// Run: node --import ./tests/support/register.mjs --test tests/unit/knowledge-feed-v2.test.mjs
// E2 (2026-10): /api/ai/knowledge item shape.
import test from "node:test"
import assert from "node:assert/strict"
import { buildKnowledgeFeedV2, FEED_PRODUCTS } from "../../lib/knowledge/feed-v2.ts"

const S = "https://s"
const CURATED = [
  { title: "Curated A", url: `${S}/knowledge/a`, summary: "a" },
  { title: "Curated B", url: `${S}/knowledge/b`, summary: "b" },
]
const art = (slug, extra = {}) => ({
  slug,
  title: `T ${slug}`,
  metaTitle: "",
  metaDescription: `desc ${slug}`,
  isPublished: true,
  order: 0,
  datePublished: "2026-09-01T00:00:00.000Z",
  dateModified: "2026-09-20T10:00:00.000Z",
  ...extra,
})

const DB = [
  art("a"), // covered by curated: ignored
  art("blog-x", { canonicalUrl: `${S}/blog/x` }), // mirror of a blog post: kept, marked
  art("product-100xhm20", { canonicalUrl: `${S}/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde` }), // mirror of a product page in the feed: dropped
  art("product-100xats", { canonicalUrl: `${S}/products/passenger-baggage-trolleys-stainless-steel-with-brakes-100xats` }), // trolley: kept, marked
  art("plain", { dateModified: "2026-09-25" }),
]

test("every item has type, canonical_url and a YYYY-MM-DD date_modified", () => {
  const { items } = buildKnowledgeFeedV2(CURATED, DB, S, "2026-05-29")
  for (const i of items) {
    assert.ok(["article", "product", "page", "guide", "faq"].includes(i.type), i.url)
    assert.match(i.date_modified, /^\d{4}-\d{2}-\d{2}$/, i.url)
    assert.ok(i.canonical_url.startsWith(S), i.url)
    assert.ok(i.title && i.url && i.summary, i.url)
  }
})

test("curated items keep their wording and get the curated date; DB items get their own dates", () => {
  const { items } = buildKnowledgeFeedV2(CURATED, DB, S, "2026-05-29")
  const a = items.find((i) => i.url === `${S}/knowledge/a`)
  assert.equal(a.summary, "a")
  assert.equal(a.date_modified, "2026-05-29")
  const plain = items.find((i) => i.url === `${S}/knowledge/plain`)
  assert.equal(plain.date_modified, "2026-09-25")
  assert.equal(plain.date_published, "2026-09-01")
  assert.equal(plain.is_mirror, undefined)
})

test("mirrors are marked with their canonical URL, or dropped when the original is listed", () => {
  const { items } = buildKnowledgeFeedV2(CURATED, DB, S, "2026-05-29")
  const blog = items.find((i) => i.url === `${S}/knowledge/blog-x`)
  assert.equal(blog.is_mirror, true)
  assert.equal(blog.canonical_url, `${S}/blog/x`)
  assert.ok(!items.some((i) => i.url === `${S}/knowledge/product-100xhm20`), "HM20 mirror should be dropped")
  const ats = items.find((i) => i.url === `${S}/knowledge/product-100xats`)
  assert.equal(ats.type, "product")
  assert.equal(ats.is_mirror, true)
  // No canonical URL appears twice among non-FAQ items.
  const canon = items.filter((i) => i.type !== "faq").map((i) => i.canonical_url)
  assert.equal(new Set(canon).size, canon.length)
})

test("covers all nine fogger models (incl. MCF42, ULV22, ULVSS10), GeM, IS 14855, guides and FAQs", () => {
  const { items } = buildKnowledgeFeedV2(CURATED, [], S, "2026-05-29")
  const models = items.filter((i) => i.type === "product").map((i) => i.model)
  for (const m of ["100XMCF42", "100XULV22", "100XULVSS10"]) assert.ok(models.includes(m), m)
  assert.equal(models.length, FEED_PRODUCTS.length)
  const urls = items.map((i) => i.url)
  assert.ok(urls.includes(`${S}/gem-approved-fogging-machine-oem`))
  assert.ok(urls.includes(`${S}/is-14855-fogging-machine`))
  assert.ok(urls.includes(`${S}/fogging-machine-tender-specification-checklist`))
  const faqs = items.filter((i) => i.type === "faq")
  assert.ok(faqs.length >= 8)
  for (const f of faqs) {
    assert.ok(f.question && f.answer)
    assert.doesNotMatch(f.answer, /\]\(/, "markdown links must be stripped")
  }
})

test("no stale founding year in added items", () => {
  const { items } = buildKnowledgeFeedV2([], [], S, "2026-05-29")
  assert.doesNotMatch(JSON.stringify(items), /2014/)
})

test("last_updated is the newest item date", () => {
  const f = buildKnowledgeFeedV2(CURATED, DB, S, "2026-05-29")
  assert.equal(f.lastUpdated, "2026-10-09")
})
