// Run: node --import ./tests/support/register.mjs --test tests/unit/knowledge-sync-run.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { FakeDb } from "../support/fake-db.mjs"
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
  assert.deepEqual(out.results.map((r) => [r.created, r.updated, r.unchanged]), [[0, 0, 2], [0, 0, 1], [0, 0, 1]])
  assert.equal(db.collection("knowledge_articles").writes.length, writesBefore)
})

test("a changed source updates its page; a page that becomes sensitive flips to draft", async () => {
  const db = new FakeDb(seed())
  await runKnowledgeSync(db, { now: NOW })
  const b = db.collection("blogs").docs.find((d) => d._id === "fleet-planning")
  b.title = "Fleet Planning: Dosage and PPE"
  const out = await runKnowledgeSync(db, { sources: ["blogs"], now: NOW })
  assert.equal(out.results[0].updated, 1)
  assert.equal(bySlug(db, "blog-fleet-planning").title, "Fleet Planning: Dosage and PPE")
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
  assert.equal(out.totals.created, 4)
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
