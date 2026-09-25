// Run: node --test tests/unit/knowledge-sync-build.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  classifySensitivity,
  buildBlogDigest,
  buildTrackRecord,
  buildCaseStudyIndex,
  buildProductPage,
  productModelCode,
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

test("sensitivity: guidance on dosing, mixing, application, chemical choice, toxicity or safety/PPE holds a page", () => {
  for (const text of [
    "Recommended dosage per hectare",
    "Mix at a 1:20 dilution ratio",
    "Diesel mixed with chemical kills mosquitoes",
    "Apply 500 ml per hectare",
    "Use malathion for adult mosquitoes",
    "What types of chemicals can be used in this machine?",
    "Best chemical for mosquito fogging",
    "Mosquito fogging chemicals used in India",
    "Always wear PPE and a respirator",
    "Safety tips for operators",
    "Is it safe to use indoors?",
    "Cold fog: no heat, safe for occupied spaces",
    "Side effects of fogging",
    "Handling of chemicals on site",
  ]) {
    assert.equal(classifySensitivity(text).sensitive, true, text)
  }
})

test("sensitivity: naming a component or spec, or a bare mention of chemical/safety, does not hold a page", () => {
  for (const text of [
    "Chemical Tank Capacity | 100 litres",
    "Tank Capacity: 6 litre chemical tank",
    "Chemical Tank + Water Tank | 7 litres + 7 litres",
    "Chemical Output | 2.5 L / hr",
    "Chemical Tank Material | PE",
    "Chemical Compatibility | Water-based and oil-based formulations",
    "Fuel tank: 1.2 L",
    "Chemical inlet valve: brass",
    "Updated chemical circuit and reinforced frame",
    "Designed for smooth and safe handling of luggage",
    "Safety risks rise if parts degrade under pressure",
    "Disinfectant fogging machine uses in hospitals",
    "Fleet planning, fuel type and running cost for cities",
  ]) {
    assert.equal(classifySensitivity(text).sensitive, false, text)
  }
  assert.equal(classifySensitivity(undefined, null, "").sensitive, false)
  assert.deepEqual(classifySensitivity("dosage and PPE").reasons.sort(), ["dosing", "safety guidance"])
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
    { ...BENIGN, title: "Which Chemicals to Use in a Fogger" },
    { ...BENIGN, category: "Safety Tips" },
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
  assert.equal(article.title, "Key points: Best (Fogger) 2026 guide")
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

const PRODUCT = {
  _id: "p1", name: "Thermal &amp; Cold Fogging Machine-100XTFS50", slug: "thermal-cold-fogging-machine-100xtfs50-90602f", category: "Fogging Machines",
  shortDescription: "<p>AVAILABLE&nbsp;ON&nbsp;GEM with OEM authorization.</p>", detailedDescription: "<p>Pulse jet&nbsp;engine machine for municipal use.</p>",
  features: [{ title: "Engine", value: "Pulse jet", order: 1 }, { title: "Start", value: "Electric", order: 0 }],
  specifications: [{ label: "Weight", value: "9 kg", order: 1 }, { label: "Machine type", value: "Pulse jet", order: 0 }, { label: "", value: "orphan value" }],
  applications: [{ title: "Municipal fogging", description: "Cities and towns" }], warrantyPeriod: "6 months ",
  updatedAt: "2026-07-30T11:10:58.432Z", createdAt: "2025-10-07T14:19:38.000Z",
}
const PSRC = "https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50"

test("product: model code comes from the name first, then the slug, upper-cased; none means null", () => {
  assert.equal(productModelCode({ name: "Mini Fogger- 100XBF102" }), "100XBF102")
  assert.equal(productModelCode({ name: "Plain name", slug: "thing-100xulvss10-5e46c5" }), "100XULVSS10")
  assert.equal(productModelCode({ name: "Two 100XAAA1 and 100XBBB2" }), "100XAAA1")
  assert.equal(productModelCode({ name: "Unnamed", slug: "unnamed" }), null)
})

test("product page: description, ordered features with bold lead-ins, ordered spec table, applications, warranty, link to the product page", () => {
  const { article, sync } = buildProductPage(PRODUCT, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  assert.equal(article.title, "Thermal & Cold Fogging Machine-100XTFS50: Specifications and Features")
  assert.equal(article.blocks[0].text, "AVAILABLE ON GEM with OEM authorization.")
  const list = article.blocks.filter((b) => b.type === "list")
  assert.deepEqual(list[0].items, ["**Start:** Electric", "**Engine:** Pulse jet"])
  const table = article.blocks.find((b) => b.type === "table")
  assert.deepEqual(table.rows, [["Machine type", "Pulse jet"], ["Weight", "9 kg"]], "ordered; the row with no label is dropped")
  assert.deepEqual(list[1].items, ["**Municipal fogging:** Cities and towns"])
  assert.ok(article.blocks.some((b) => b.type === "callout" && b.label === "Warranty" && b.text === "6 months"))
  const link = article.blocks.at(-1)
  assert.equal(link.text, "[Thermal & Cold Fogging Machine-100XTFS50](/thermal-and-cold-fogging-machine-100xtfs50)")
  assert.equal(article.canonicalUrl, PSRC)
  assert.equal(sync.source, "products")
  assert.equal(sync.sourceId, "p1")
  assert.deepEqual(article.tags, ["Product", "100XTFS50", "Fogging Machines"])
  assert.equal(article.isPublished, true)
})

test("product page: JSON-LD is an Article about a Thing (no Product node, so no Product-snippet validation); no price, rating or offers", () => {
  const { article } = buildProductPage(PRODUCT, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  assert.deepEqual(article.structuredData.about, { "@type": "Thing", name: "Thermal & Cold Fogging Machine-100XTFS50 (100XTFS50)", url: PSRC })
  assert.equal(JSON.stringify(article.structuredData).includes("\"Product\""), false)
  assert.equal(/offers|aggregateRating|price|rating/i.test(JSON.stringify(article)), false)
})

test("product page: a chemical / dosing / safety mention anywhere on the page holds the WHOLE page as a draft", () => {
  for (const extra of [
    { specifications: [...PRODUCT.specifications, { label: "Dosage", value: "5 ml per litre" }] },
    { features: [{ title: "Tank", value: "Mix 50 ml insecticide with 1 litre of diesel" }] },
    { applications: [{ title: "Dosage guidance", description: "" }] },
    { detailedDescription: "<p>Includes PPE and safety kit.</p>" },
  ]) {
    const { article, sync } = buildProductPage({ ...PRODUCT, ...extra }, "100XTFS50", PSRC, ctx("product-100xtfs50"))
    assert.equal(article.isPublished, false, JSON.stringify(extra).slice(0, 60))
    assert.equal(sync.policy, "draft-review")
  }
})

test("product page: only what the record's page fields say is used (FAQs, price, ratings ignored even if present)", () => {
  const dirty = { ...PRODUCT, priceRange: "SECRET PRICE", rating: 4.6, reviewsCount: 36, productFaqs: [{ q: "SECRET FAQ", a: "dose 5 ml per litre" }] }
  const clean = buildProductPage(PRODUCT, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  const withExtras = buildProductPage(dirty, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  assert.deepEqual(withExtras.article, clean.article)
  assert.equal(withExtras.sync.hash, clean.sync.hash)
})

test("blog digest: title, H1 and meta description never equal the source post's (no collision with the page it canonicals to)", () => {
  for (const post of [BENIGN, { ...BENIGN, content: "" }, { ...BENIGN, excerpt: "" }]) {
    const { article } = buildBlogDigest(post, "s", ctx("blog-s"))
    assert.notEqual(article.title, post.title)
    assert.notEqual(article.h1, post.title)
    assert.notEqual(article.metaTitle.replace(/ \| 100X Circle$/, ""), post.title)
    assert.notEqual(article.metaDescription, post.excerpt)
    assert.equal(article.metaDescription.includes(post.excerpt || "\u0000"), false)
    assert.ok(article.metaDescription.length >= 40 && article.metaDescription.length <= 155)
  }
  const { article } = buildBlogDigest(BENIGN, "s", ctx("blog-s"))
  assert.equal(article.metaDescription, "Covers Fleet planning; Fuel types. Read the full guide for details.")
  assert.equal(article.structuredData.headline, "Key points: Why Municipal Corporations Choose Thermal Foggers")
})

test("product page: meta description is generated and never the product's own short description", () => {
  const { article } = buildProductPage(PRODUCT, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  assert.equal(article.metaDescription, "Specifications, key features and applications of the Thermal & Cold Fogging Machine-100XTFS50.")
  assert.notEqual(article.metaDescription, "AVAILABLE ON GEM with OEM authorization.")
})

test("product page: a spec sheet that only names components (chemical tank, output, compatibility) publishes", () => {
  const spec = { ...PRODUCT, specifications: [
    { label: "Chemical Tank Capacity", value: "7 litres" }, { label: "Chemical Output", value: "2.5 L / hr" },
    { label: "Chemical Compatibility", value: "Water-based and oil-based formulations" }, { label: "Fuel Tank", value: "1.2 L" },
  ] }
  const { article, sync } = buildProductPage(spec, "100XTFS50", PSRC, ctx("product-100xtfs50"))
  assert.equal(article.isPublished, true)
  assert.deepEqual(sync.reasons, [])
})
