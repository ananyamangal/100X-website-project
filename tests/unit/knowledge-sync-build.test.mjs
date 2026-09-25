// Run: node --test tests/unit/knowledge-sync-build.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  classifySensitivity,
  buildBlogDigest,
  buildTrackRecord,
  buildCaseStudyIndex,
  inline,
  headingsOf,
} from "../../lib/knowledge/sync/build.ts"

const SITE = "https://www.100xcircle.com"
const ctx = (slug, now = new Date("2026-09-25T10:00:00Z")) => ({ slug, siteUrl: SITE, now, order: 1000 })

const BENIGN = {
  _id: "64f0aa11bb22cc33dd44ee55",
  title: "Why Municipal Corporations Choose Thermal Foggers",
  excerpt: "A look at fleet size, fuel type and running cost for city-wide fogging programmes.",
  content: "<h2>Fleet planning</h2><p>Plan the fleet.</p><h3>Fuel&nbsp;types</h3><p>Petrol or diesel.</p>",
  category: "Guides",
  publishedAt: "2026-03-10T00:00:00Z",
  updatedAt: "2026-04-02T00:00:00Z",
}

test("sensitivity: chemicals, dosing, dilution and safety all hold a page for review", () => {
  for (const text of [
    "Recommended dosage per hectare",
    "Mix at a 1:20 dilution ratio",
    "Use malathion for adult mosquitoes",
    "Always wear PPE and a respirator",
    "The insecticide must be approved",
    "Apply 500 ml per hectare",
    "Chemical names used in fogging",
  ]) {
    assert.equal(classifySensitivity(text).sensitive, true, text)
  }
})

test("sensitivity: an ordinary product/fleet text is not held, and reasons name what matched", () => {
  assert.equal(classifySensitivity("Fleet planning, fuel type and running cost for cities").sensitive, false)
  assert.equal(classifySensitivity(undefined, null, "").sensitive, false)
  const r = classifySensitivity("dosage and PPE")
  assert.deepEqual(r.reasons.sort(), ["dosing", "safety"])
})

test("blog digest: benign post auto-publishes, canonical + JSON-LD point at the right URLs", () => {
  const { article, sync } = buildBlogDigest(BENIGN, "why-municipal-corporations-choose-thermal-foggers", ctx("blog-why-municipal-corporations-choose-thermal-foggers"))
  assert.equal(article.isPublished, true)
  assert.equal(sync.policy, "auto")
  assert.deepEqual(sync.reasons, [])
  assert.equal(article.canonicalUrl, `${SITE}/blog/why-municipal-corporations-choose-thermal-foggers`)
  assert.equal(sync.sourceUrl, article.canonicalUrl)
  assert.equal(article.structuredData["@type"], "Article")
  assert.equal(article.structuredData.url, `${SITE}/knowledge/blog-why-municipal-corporations-choose-thermal-foggers`)
  assert.equal(article.structuredData.datePublished, "2026-03-10")
  assert.equal(article.structuredData.dateModified, "2026-04-02")
  assert.deepEqual(article.tags, ["Blog", "Guides"])
  assert.deepEqual(article.faqs, [])
})

test("blog digest: outline comes from the post's headings, NBSP folded, link callout points at the blog", () => {
  const { article } = buildBlogDigest(BENIGN, "slug-x", ctx("blog-slug-x"))
  const list = article.blocks.find((b) => b.type === "list")
  assert.deepEqual(list.items, ["Fleet planning", "Fuel types"])
  const callout = article.blocks.find((b) => b.type === "callout")
  assert.match(callout.text, /\]\(\/blog\/slug-x\)$/)
  assert.equal(JSON.stringify(article).includes(" "), false)
})

test("blog digest: classified on what the page says. A digest of a post with dosing in its body is published; body text is never copied", () => {
  const post = { ...BENIGN, content: BENIGN.content + "<p>Use a dosage of 500 ml per hectare.</p>" }
  const { article, sync } = buildBlogDigest(post, "s", ctx("blog-s"))
  assert.equal(article.isPublished, true)
  assert.equal(sync.policy, "auto")
  assert.equal(JSON.stringify(article).includes("500 ml"), false, "body text must not be copied into the digest")
})

test("blog digest: dosing/chemicals/safety in the excerpt, title, category or headings holds it as a draft, with the reasons", () => {
  const cases = [
    { ...BENIGN, excerpt: "The recommended dosage per hectare for every fogger." },
    { ...BENIGN, title: "Common Fogging Chemical Names" },
    { ...BENIGN, category: "Safety" },
    { ...BENIGN, content: "<h2>PPE and safe handling</h2><p>x</p>" },
  ]
  for (const post of cases) {
    const { article, sync } = buildBlogDigest(post, "s", ctx("blog-s"))
    assert.equal(article.isPublished, false, JSON.stringify(post).slice(0, 80))
    assert.equal(sync.policy, "draft-review")
    assert.ok(sync.reasons.length > 0)
  }
})

test("blog digest: holdOnSourceBody mode is the stricter switch: the whole post is classified", () => {
  const post = { ...BENIGN, content: BENIGN.content + "<p>Use a dosage of 500 ml per hectare.</p>" }
  const { article, sync } = buildBlogDigest(post, "s", { ...ctx("blog-s"), holdOnSourceBody: true })
  assert.equal(article.isPublished, false)
  assert.ok(sync.reasons.includes("dosing"))
})

test("blog digest: markup and inline-markdown characters in source text cannot break the page", () => {
  const post = { ...BENIGN, title: "Best [Fogger] **2026** <b>guide</b>", excerpt: "<p>Read <em>this</em> [now](http://x)</p>" }
  const { article } = buildBlogDigest(post, "s", ctx("blog-s"))
  assert.equal(article.title, "Best (Fogger) 2026 guide")
  assert.equal(article.blocks[0].text, "Read this (now)(http://x)")
  assert.doesNotMatch(article.blocks[0].text, /[\[\]*<>]/)
})

test("hash: unchanged source gives the same hash on another day; changed source changes it", () => {
  const a = buildBlogDigest(BENIGN, "s", ctx("blog-s", new Date("2026-09-25T00:00:00Z"))).sync.hash
  const b = buildBlogDigest(BENIGN, "s", ctx("blog-s", new Date("2027-01-01T00:00:00Z"))).sync.hash
  const c = buildBlogDigest({ ...BENIGN, title: "A different title" }, "s", ctx("blog-s")).sync.hash
  assert.equal(a, b)
  assert.notEqual(a, c)
})

const RECORDS = [
  { organization: "Nagar Nigam Muzaffarpur", department: "Municipal", state: "Bihar", product: "Thermal Fogger", orderYear: 2024, quantity: 12, orderValue: 18.5, notes: "SECRET NOTE", documents: [{ url: "https://x/po.pdf" }], updatedAt: "2026-08-01T00:00:00Z" },
  { organization: "CRPF Kerala", department: "Defence", state: "Kerala", product: "Cold Fogger", orderYear: 2023, updatedAt: "2026-07-01T00:00:00Z" },
  { organization: "Nagar Palika X", department: "Municipal", state: "Bihar", product: "Thermal Fogger", orderYear: 2025 },
]

test("track record: counts are computed from the records; newest year first", () => {
  const { article } = buildTrackRecord(RECORDS, ctx("government-supply-track-record"))
  assert.match(article.blocks[0].text, /3 public government supply records across 2 states and 2 department types, ordered between 2023–2025/)
  const table = article.blocks.find((b) => b.type === "table")
  assert.deepEqual(table.rows.map((r) => r[4]), ["2025", "2024", "2023"])
  assert.equal(article.canonicalUrl, `${SITE}/past-performance-government`)
  assert.equal(article.isPublished, true)
})

test("track record: private fields never reach the generated page", () => {
  const { article, sync } = buildTrackRecord(RECORDS, ctx("government-supply-track-record"))
  const blob = JSON.stringify({ article, sync })
  for (const secret of ["SECRET NOTE", "18.5", "po.pdf", "quantity", "orderValue", "notes", "documents"]) {
    assert.equal(blob.includes(secret), false, secret)
  }
})

test("track record and case-study index: nothing to build from means no page", () => {
  assert.equal(buildTrackRecord([], ctx("x")), null)
  assert.equal(buildTrackRecord([{ state: "Bihar" }], ctx("x")), null)
  assert.equal(buildCaseStudyIndex([], ctx("x")), null)
})

test("case-study index: rows link to each case study; narrative and testimonial are not copied", () => {
  const studies = [
    { title: "Nagar Nigam Muzaffarpur — Double Barrel Fogger", slug: "nagar-nigam-muzaffarpur", customer: "Nagar Nigam Muzaffarpur", state: "Bihar", productUsed: "100X Double Barrel", problem: "SECRET PROBLEM", testimonial: "SECRET QUOTE", updatedAt: "2026-06-01T00:00:00Z" },
  ]
  const { article } = buildCaseStudyIndex(studies, ctx("case-study-index"))
  const table = article.blocks.find((b) => b.type === "table")
  assert.equal(table.rows[0][0], "[Nagar Nigam Muzaffarpur — Double Barrel Fogger](/case-studies/nagar-nigam-muzaffarpur)")
  assert.equal(article.canonicalUrl, `${SITE}/case-studies`)
  const blob = JSON.stringify(article)
  assert.equal(blob.includes("SECRET"), false)
  assert.equal(article.isPublished, true)
})

test("generated articles carry every field a real, hand-migrated article has", () => {
  const seed = JSON.parse(readFileSync(new URL("../../lib/knowledge/seed-data.json", import.meta.url), "utf8"))
  const real = (Array.isArray(seed) ? seed : seed.articles || Object.values(seed))[0]
  const optional = new Set(["ogTitle", "ogDescription", "heroCallout", "relatedArticles", "aboutAuthor", "faqHeading", "breadcrumbLabel"])
  const required = Object.keys(real).filter((k) => !optional.has(k))
  for (const built of [
    buildBlogDigest(BENIGN, "s", ctx("blog-s")).article,
    buildTrackRecord(RECORDS, ctx("t")).article,
    buildCaseStudyIndex([{ title: "T", slug: "t" }], ctx("c")).article,
  ]) {
    for (const k of required) assert.ok(k in built, `missing ${k}`)
    assert.match(built.byline.readTime, /^\d+ min read$/)
    assert.match(built.byline.updatedLabel, /^Updated [A-Z][a-z]+ \d{4}$/)
    assert.match(built.datePublished, /^\d{4}-\d{2}-\d{2}$/)
  }
})

test("helpers: inline() strips markup characters; headingsOf() de-duplicates and caps", () => {
  assert.equal(inline("a *b* [c]"), "a b (c)")
  assert.deepEqual(headingsOf("<h2>A</h2><h2>A</h2><h3>B</h3>"), ["A", "B"])
  assert.equal(headingsOf(Array.from({ length: 30 }, (_, i) => `<h2>H${i}</h2>`).join(""), 12).length, 12)
})
