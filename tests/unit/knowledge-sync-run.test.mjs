// Run: node --import ./tests/support/register.mjs --test tests/unit/knowledge-sync-run.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { FakeDb, writeGuard } from "../support/fake-db.mjs"
import { runKnowledgeSync } from "../../lib/knowledge/sync/run.ts"
import { startJob, finishJob, requestRerun, takeRerun, totalsOf, STALE_MS } from "../../lib/knowledge/sync/jobs.ts"
import { summarizeSource } from "../../lib/knowledge/sync/summary.ts"
import { mergeKnowledgeFeed } from "../../lib/knowledge/feed.ts"

const NOW = new Date("2026-09-25T10:00:00Z")
const blog = (id, title, extra = {}) => ({
  _id: id, title, excerpt: `${title}: an overview for buyers.`, content: `<h2>Overview of ${title}</h2><p>Body.</p>`,
  category: "Guides", isPublished: true, publishedAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-02T00:00:00Z", slug: id, ...extra,
})
const seed = () => ({
  blogs: [
    blog("fleet-planning", "Fleet Planning for Cities"),
    blog("chemical-names", "Common Fogging Chemical Names"), // sensitive: chemicals in the title
    blog("hidden-draft", "Unpublished post", { isPublished: false }),
  ],
  case_studies: [
    { _id: "c1", title: "Nagar Nigam Muzaffarpur", slug: "nn-muzaffarpur", customer: "Nagar Nigam", state: "Bihar", productUsed: "Double Barrel", published: true, isSample: false, testimonial: "PRIVATE QUOTE" },
    { _id: "c2", title: "Sample Only", slug: "sample", customer: "X", published: true, isSample: true },
    { _id: "c3", title: "Unpublished", slug: "unpub", published: false, isSample: false },
  ],
  gov_past_performance: [
    { _id: "p1", organization: "CRPF Kerala", department: "Defence", state: "Kerala", product: "Cold Fogger", orderYear: 2024, isPublic: true, notes: "PRIVATE NOTE", orderValue: 9, documents: [{ url: "x" }] },
    { _id: "p2", organization: "Hidden Org", isPublic: false },
  ],
  products: [
    { _id: "pr1", name: "Thermal Fogging Machine 100XTFS50", slug: "100xtfs50", category: "Fogging Machines", shortDescription: "<p>Pulse jet&nbsp;fogger.</p>", detailedDescription: "<p>Built for municipal fogging.</p>",
      features: [{ title: "Engine", value: "Pulse jet", order: 0 }], specifications: [{ label: "Tank capacity", value: "5 L", order: 1 }, { label: "Weight", value: "9 kg", order: 0 }],
      applications: [{ title: "Municipal use", description: "", order: 0 }], warrantyPeriod: "6 months", isPublished: true,
      priceRange: "SECRET PRICE", rating: 4.6, reviewsCount: 36, productFaqs: [{ q: "SECRET FAQ", a: "x" }] },
    { _id: "pr2", name: "Cold Fogger 100XMCF42", slug: "cold-fogger-100xmcf42-abc", specifications: [{ label: "Chemical tank", value: "3 L" }], isPublished: true },
    { _id: "pr3", name: "Unnamed accessory", slug: "accessory", isPublished: true },
    { _id: "pr4", name: "Draft Model 100XZZ99", slug: "zz", isPublished: false },
    { _id: "pr5", name: "Duplicate 100XTFS50", slug: "dup", isPublished: true },
  ],
  knowledge_articles: [],
})

const docs = (db) => db.collection("knowledge_articles").docs
const bySlug = (db, slug) => docs(db).find((d) => d.slug === slug)

test("first run: creates one page per published blog, one index per aggregate source; sensitive ones become drafts; nothing else is read", async () => {
  const db = new FakeDb(seed())
  const out = await runKnowledgeSync(db, { now: NOW })
  assert.deepEqual(out.results.map((r) => [r.source, r.scanned, r.created, r.published, r.drafted]), [
    ["blogs", 2, 2, 1, 1],
    ["case_studies", 1, 1, 1, 0],
    ["past_performance", 1, 1, 1, 0],
    ["products", 2, 2, 1, 1],
  ])
  assert.equal(bySlug(db, "blog-fleet-planning").isPublished, true)
  assert.equal(bySlug(db, "blog-chemical-names").isPublished, false)
  assert.equal(bySlug(db, "blog-chemical-names").sync.policy, "draft-review")
  assert.equal(bySlug(db, "blog-hidden-draft"), undefined)
  assert.ok(bySlug(db, "case-study-index") && bySlug(db, "government-supply-track-record"))
  assert.equal(out.totals.errors, 0)
})

test("private source fields are never queried or stored", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  const pp = db.collection("gov_past_performance").finds.at(-1).projection
  for (const banned of ["notes", "documents", "orderValue", "images", "quantity"]) assert.equal(banned in pp, false, banned)
  const cs = db.collection("case_studies").finds.at(-1)
  assert.equal("testimonial" in (cs.projection ?? {}), false)
  assert.deepEqual(cs.filter, { published: true, isSample: { $ne: true } })
  const stored = JSON.stringify(docs(db))
  for (const secret of ["PRIVATE NOTE", "PRIVATE QUOTE", "Hidden Org", "Sample Only", "Unpublished"]) assert.equal(stored.includes(secret), false, secret)
})

test("second run with no source change writes nothing (content hash)", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  const writesBefore = db.collection("knowledge_articles").writes.length
  const out = await runKnowledgeSync(db, { now: new Date("2026-10-01T00:00:00Z") })
  assert.deepEqual(out.results.map((r) => [r.created, r.updated, r.unchanged]), [[0, 0, 2], [0, 0, 1], [0, 0, 1], [0, 0, 2]])
  assert.equal(db.collection("knowledge_articles").writes.length, writesBefore)
})

test("a changed source updates its page; a page that becomes sensitive flips to draft", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  const b = db.collection("blogs").docs.find((d) => d._id === "fleet-planning")
  b.title = "Fleet Planning: Dosage and PPE"
  const out = await runKnowledgeSync(db, { sources: ["blogs"], now: NOW })
  assert.equal(out.results[0].updated, 1)
  assert.equal(bySlug(db, "blog-fleet-planning").title, "Key points: Fleet Planning: Dosage and PPE")
  assert.equal(bySlug(db, "blog-fleet-planning").isPublished, false)
})

test("a hand-written article on the same slug is never overwritten; it is reported as an error", async () => {
  const s = seed()
  s.knowledge_articles = [{ _id: "h1", slug: "blog-fleet-planning", title: "HAND WRITTEN", isPublished: true }]
  const db = new FakeDb(s)
  const out = await runKnowledgeSync(db, { sources: ["blogs"], now: NOW })
  assert.equal(bySlug(db, "blog-fleet-planning").title, "HAND WRITTEN")
  assert.equal(out.results[0].errors.length, 1)
  assert.match(out.results[0].errors[0], /not generated by the blogs sync/)
  assert.equal(out.results[0].created, 1, "the other blog is still created")
})

test("an article an admin edited (locked) is left alone, including its published state", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  const held = bySlug(db, "blog-chemical-names")
  held.isPublished = true            // the owner reviewed and published it
  held.title = "Reviewed title"
  held.sync.locked = true            // what the admin PUT does on save
  const out = await runKnowledgeSync(db, { sources: ["blogs"], now: NOW })
  assert.equal(out.results[0].skippedLocked, 1)
  assert.equal(bySlug(db, "blog-chemical-names").isPublished, true)
  assert.equal(bySlug(db, "blog-chemical-names").title, "Reviewed title")
})

test("a source that disappears is taken offline (not deleted); locked pages stay", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  bySlug(db, "blog-chemical-names").sync.locked = true
  bySlug(db, "blog-chemical-names").isPublished = true
  db.collection("blogs").docs.splice(0, 2)            // both published blogs gone
  const out = await runKnowledgeSync(db, { sources: ["blogs"], now: NOW })
  assert.equal(out.results[0].unpublished, 1)          // only the unlocked one
  assert.equal(bySlug(db, "blog-fleet-planning").isPublished, false)
  assert.ok(bySlug(db, "blog-fleet-planning"), "not deleted")
  assert.equal(bySlug(db, "blog-chemical-names").isPublished, true)
})

test("an aggregate page is retired when its source becomes empty", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  db.collection("gov_past_performance").docs.forEach((d) => (d.isPublic = false))
  const out = await runKnowledgeSync(db, { sources: ["past_performance"], now: NOW })
  assert.equal(out.results[0].unpublished, 1)
  assert.equal(bySlug(db, "government-supply-track-record").isPublished, false)
  assert.equal(bySlug(db, "case-study-index").isPublished, true, "other sources untouched")
})

test("dry run reports the plan and writes nothing", async () => {
  const db = new FakeDb(seed())
  const out = await runKnowledgeSync(db, { dryRun: true, now: NOW })
  assert.equal(out.totals.created, 6)
  assert.equal(docs(db).length, 0)
  assert.equal(db.collection("knowledge_articles").writes.length, 0)
})

test("new synced pages sort after hand-written ones (order starts at 1000)", async () => {
  const s = seed()
  s.knowledge_articles = [{ _id: "h", slug: "how-thermal-fogging-works", isPublished: true, order: 1 }]
  const db = new FakeDb(s)
  await runKnowledgeSync(db, { now: NOW })
  const orders = docs(db).filter((d) => d.sync).map((d) => d.order)
  assert.ok(orders.every((o) => o >= 1000))
  assert.equal(new Set(orders).size, orders.length, "distinct")
})

// ── jobs ─────────────────────────────────────────────────────────────────────

test("jobs: a second start while one runs is a conflict; a stale one is taken over", async () => {
  const db = new FakeDb()
  const a = await startJob(db, { sources: ["blogs"], trigger: "manual", now: NOW })
  assert.ok("job" in a)
  const b = await startJob(db, { sources: ["blogs"], trigger: "auto", now: new Date(NOW.getTime() + 1000) })
  assert.ok("conflict" in b)
  const c = await startJob(db, { sources: ["blogs"], trigger: "manual", now: new Date(NOW.getTime() + STALE_MS + 1000) })
  assert.ok("job" in c, "presumed-dead job no longer blocks")
  const old = db.collection("knowledge_sync_jobs").docs[0]
  assert.equal(old.status, "failed")
  assert.match(old.error, /no heartbeat/)
})

test("jobs: finish computes success / partial / failed and the totals", async () => {
  const mk = (errors) => ({ source: "blogs", scanned: 3, created: 2, updated: 1, unchanged: 0, published: 2, drafted: 1, skippedLocked: 0, unpublished: 0, errors })
  for (const [errs, err, want] of [[[], undefined, "success"], [["x"], undefined, "partial"], [[], "boom", "failed"]]) {
    const db = new FakeDb()
    const s = await startJob(db, { sources: ["blogs"], trigger: "manual", now: NOW })
    const fin = await finishJob(db, s.job._id, { results: [mk(errs)], error: err })
    assert.equal(fin.status, want)
  }
  assert.deepEqual(totalsOf([mk(["a"]), mk([])]).errors, 1)
})

test("jobs: a save during a running job requests a re-run of just that source, read once", async () => {
  const db = new FakeDb()
  const s = await startJob(db, { sources: ["blogs", "case_studies"], trigger: "manual", now: NOW })
  assert.equal(await requestRerun(db, ["blogs"]), true)
  assert.equal(await requestRerun(db, ["blogs"]), true)
  assert.deepEqual(await takeRerun(db, s.job._id), ["blogs"])
  assert.deepEqual(await takeRerun(db, s.job._id), [])
  await finishJob(db, s.job._id, { results: [] })
  assert.equal(await requestRerun(db, ["blogs"]), false, "nothing running")
})

// ── summary text + feed ──────────────────────────────────────────────────────

test("summary: reads like the report the owner asked for", () => {
  const r = { source: "blogs", scanned: 42, created: 42, updated: 0, unchanged: 0, published: 34, drafted: 8, skippedLocked: 0, unpublished: 0, errors: [] }
  assert.equal(summarizeSource(r, "Blog posts"), "42 blog posts synced: 34 published, 8 held as drafts for review · 0 errors")
  assert.match(summarizeSource({ ...r, errors: ["a"] }, "Blog posts"), /· 1 error$/)
})

const CURATED = [
  { title: "Curated A", url: "https://s/knowledge/a", summary: "curated summary A" },
  { title: "Curated B", url: "https://s/knowledge/b", summary: "curated summary B" },
]
const art = (slug, extra = {}) => ({ slug, title: `T ${slug}`, metaDescription: `desc ${slug}`, isPublished: true, order: 1000, dateModified: "2026-09-01", ...extra })

test("feed: curated items keep their exact wording and order; DB copies of the same slug are ignored", () => {
  const f = mergeKnowledgeFeed(CURATED, [art("a", { metaDescription: "DB WORDING" }), art("blog-x", { canonicalUrl: "https://s/blog/x" })], "https://s", "2026-05-29")
  assert.deepEqual(f.items.slice(0, 2), CURATED)
  assert.equal(f.items.length, 3)
  assert.deepEqual(f.items[2], { title: "T blog-x", url: "https://s/knowledge/blog-x", summary: "desc blog-x", source_url: "https://s/blog/x" })
})

test("feed: drafts never appear; last_updated is the newest date of what is listed, else the curated date", () => {
  const f = mergeKnowledgeFeed(CURATED, [art("d1", { isPublished: false, dateModified: "2099-01-01" }), art("p1", { dateModified: "2026-09-24" })], "https://s", "2026-05-29")
  assert.equal(f.lastUpdated, "2026-09-24")
  assert.equal(f.items.some((i) => i.url.endsWith("/d1")), false)
  assert.equal(mergeKnowledgeFeed(CURATED, [], "https://s", "2026-05-29").lastUpdated, "2026-05-29")
})

// ── products ─────────────────────────────────────────────────────────────────

test("products: published only, keyed by 100X code; a general spec page publishes, a chemical spec row drafts the whole page", async () => {
  const db = new FakeDb(seed())
  const out = await runKnowledgeSync(db, { sources: ["products"], now: NOW })
  const r = out.results[0]
  assert.deepEqual([r.scanned, r.created, r.published, r.drafted, r.errors.length], [2, 2, 1, 1, 0])
  assert.equal(bySlug(db, "product-100xtfs50").isPublished, true)
  const held = bySlug(db, "product-100xmcf42")
  assert.equal(held.isPublished, false)
  assert.equal(held.sync.policy, "draft-review")
  assert.ok(held.sync.reasons.includes("chemicals"))
  assert.equal(bySlug(db, "product-100xzz99"), undefined, "unpublished product is not synced")
})

test("products: no model code or a repeated code is skipped with a note (informational, not an error)", async () => {
  const db = new FakeDb(seed())
  const r = (await runKnowledgeSync(db, { sources: ["products"], now: NOW })).results[0]
  assert.equal(r.errors.length, 0)
  assert.equal(r.notes.length, 2)
  assert.match(r.notes.join("\n"), /"Unnamed accessory" has no 100X model code; skipped/)
  assert.match(r.notes.join("\n"), /"Duplicate 100XTFS50" repeats model code 100XTFS50/)
})

test("products: pricing, ratings, review counts and FAQs are never queried or stored", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { sources: ["products"], now: NOW })
  const proj = db.collection("products").finds.at(-1).projection
  for (const banned of ["priceRange", "rating", "reviewsCount", "productFaqs", "imageUrls"]) assert.equal(banned in proj, false, banned)
  assert.deepEqual(db.collection("products").finds.at(-1).filter, { isPublished: { $ne: false } })
  const stored = JSON.stringify(docs(db))
  for (const secret of ["SECRET PRICE", "SECRET FAQ", "4.6", "reviewsCount"]) assert.equal(stored.includes(secret), false, secret)
})

test("products: canonical follows the sitemap rule: landing page when one exists, else /products/<slug>", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { sources: ["products"], now: NOW })
  assert.equal(bySlug(db, "product-100xtfs50").canonicalUrl, "https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50")
  assert.equal(bySlug(db, "product-100xmcf42").canonicalUrl, "https://www.100xcircle.com/products/cold-fogger-100xmcf42-abc")
})

test("products: content is stable across runs; an unpublished product is taken offline", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { sources: ["products"], now: NOW })
  const again = (await runKnowledgeSync(db, { sources: ["products"], now: new Date("2026-11-01T00:00:00Z") })).results[0]
  assert.deepEqual([again.created, again.updated, again.unchanged], [0, 0, 2])
  // pr5 shares the code, so it would take the page over; unpublish both
  for (const id of ["pr1", "pr5"]) db.collection("products").docs.find((d) => d._id === id).isPublished = false
  const out = (await runKnowledgeSync(db, { sources: ["products"], now: NOW })).results[0]
  assert.equal(out.unpublished, 1)
  assert.equal(bySlug(db, "product-100xtfs50").isPublished, false)
})

// ── the sync can never write to source content ───────────────────────────────

test("read-only source collections: the sync never writes to blogs / case_studies / gov_past_performance / products, in any scenario", async () => {
  const raw = new FakeDb(seed())
  const db = writeGuard(raw, new Set(["knowledge_articles", "knowledge_sync_jobs"]))
  const SOURCES = ["blogs", "case_studies", "gov_past_performance", "products"]
  const snap = () => JSON.stringify(SOURCES.map((n) => raw.collection(n).docs))
  const untouched = async (label, fn) => {
    const before = snap()
    await fn() // a write attempt on a source collection throws here and fails the test
    assert.equal(snap(), before, label + ": source collections must be byte-identical")
  }

  await untouched("first run", () => runKnowledgeSync(db, { now: NOW }))
  await untouched("second run", () => runKnowledgeSync(db, { now: NOW }))
  await untouched("dry run", () => runKnowledgeSync(db, { dryRun: true, now: NOW }))

  // admin edits a synced page (locks it) and publishes a draft
  const held = raw.collection("knowledge_articles").docs.find((d) => d.sync && !d.isPublished)
  held.isPublished = true; held.title = "Reviewed"; held.sync.locked = true
  await untouched("run after an admin edit of a synced page", () => runKnowledgeSync(db, { now: NOW }))
  assert.equal(held.title, "Reviewed")

  // an author edits a source post (that edit is the author's, made outside the sync), then the sync runs
  raw.collection("blogs").docs[0].excerpt = "Edited by the author."
  await untouched("run after a source edit", () => runKnowledgeSync(db, { now: NOW }))

  // a source disappears: the synced page goes offline, the source collections are still not written
  raw.collection("blogs").docs.splice(0, 1)
  raw.collection("gov_past_performance").docs.forEach((d) => (d.isPublic = false))
  raw.collection("products").docs.forEach((d) => (d.isPublished = false))
  await untouched("run after sources were removed", () => runKnowledgeSync(db, { now: NOW }))

  // hand-written article on a synced slug: reported, source untouched
  raw.collection("knowledge_articles").docs.push({ _id: "h", slug: "case-study-index-x", title: "hand", isPublished: true })

  // the job bookkeeping only touches knowledge_sync_jobs
  await untouched("job records", async () => {
    const s = await startJob(db, { sources: ["blogs"], trigger: "manual", now: NOW })
    await requestRerun(db, ["blogs"])
    await takeRerun(db, s.job._id)
    await finishJob(db, s.job._id, { results: [] })
  })

  // and the guard itself works: a direct write attempt on a source collection throws
  assert.throws(() => db.collection("blogs").updateOne({}, { $set: { x: 1 } }), /WRITE ATTEMPTED on read-only source collection "blogs"/)
  assert.throws(() => db.collection("products").bulkWrite([]), /WRITE ATTEMPTED on read-only source collection "products"/)
  assert.throws(() => db.collection("gov_past_performance").deleteMany({}), /WRITE ATTEMPTED/)
  assert.throws(() => db.collection("case_studies").insertOne({}), /WRITE ATTEMPTED/)
})

test("the only collections the sync code writes to are knowledge_articles and knowledge_sync_jobs (static check of the source)", async () => {
  const { readFileSync } = await import("node:fs")
  const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8")
  const run = read("lib/knowledge/sync/run.ts")
  const jobs = read("lib/knowledge/sync/jobs.ts")
  // run.ts: the only write handle is `col`, bound to the knowledge collection
  assert.match(run, /const col = db\.collection\(KNOWLEDGE_COLLECTION\)/)
  assert.equal((run.match(/const col =/g) || []).length, 1)
  // the source collections appear only in read chains (find), never with a write method
  for (const src of ["blogs", "case_studies", "gov_past_performance", "products"]) {
    const rx = new RegExp(`collection\\("${src}"\\)([\\s\\S]{0,600}?)\\.toArray\\(\\)`)
    const chain = run.match(rx)
    assert.ok(chain, src + " chain found")
    assert.match(chain[1], /\.find\(/)
    assert.doesNotMatch(chain[1], /\.(insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|bulkWrite|replaceOne|findOneAndUpdate|findOneAndDelete|drop)\(/)
  }
  // no delete operation exists anywhere in the sync
  for (const src of [run, jobs, read("lib/knowledge/sync/execute.ts"), read("lib/knowledge/sync/build.ts"), read("app/api/admin/knowledge/rebuild/route.ts")]) {
    assert.doesNotMatch(src, /deleteOne|deleteMany|findOneAndDelete|\.drop\(|dropDatabase/)
  }
  // jobs.ts writes only to the job collection
  assert.equal((jobs.match(/\.collection(<[A-Za-z]+>)?\(([A-Za-z_"]+)\)/g) || []).every((m) => m.includes("JOBS_COLLECTION")), true)
})
