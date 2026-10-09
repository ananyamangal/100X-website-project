// Run: node --import ./tests/support/register.mjs --test tests/unit/sitemap-case-studies.test.mjs
// B6: case-study detail pages in the sitemap with honest lastmod; GeM OEM page listed once.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { toCaseStudySitemapRows } from "../../lib/caseStudySitemapRows.ts"

test("published rows only, lastmod from updatedAt then createdAt, never invented", () => {
  const rows = toCaseStudySitemapRows([
    { slug: "a", published: true, updatedAt: new Date("2026-06-23T11:53:26.904Z"), createdAt: new Date("2026-06-20T09:04:41.630Z") },
    { slug: "b", published: true, createdAt: "2026-05-31T06:11:08.755Z" },
    { slug: "c", published: true },
    { slug: "d", published: false, updatedAt: new Date() },
    { slug: "e", published: true, isSample: true },
    { slug: "", published: true },
    { slug: "a", published: true },
  ])
  assert.deepEqual(rows, [
    { slug: "a", lastModified: "2026-06-23T11:53:26.904Z" },
    { slug: "b", lastModified: "2026-05-31T06:11:08.755Z" },
    { slug: "c", lastModified: undefined },
  ])
})

test("sitemap lists /gem-approved-fogging-machine-oem only via the landing registry", () => {
  const src = readFileSync(new URL("../../app/sitemap.ts", import.meta.url), "utf8")
  assert.equal(/\{\s*path:\s*"\/gem-approved-fogging-machine-oem"/.test(src), false)
  const reg = readFileSync(new URL("../../lib/seo/landing-pages.ts", import.meta.url), "utf8")
  assert.match(reg, /slug:\s*"gem-approved-fogging-machine-oem"/)
})

test("case-study entries never fall back to the current time", () => {
  const src = readFileSync(new URL("../../app/sitemap.ts", import.meta.url), "utf8")
  const block = src.slice(src.indexOf("for (const cs of caseStudies)"))
  assert.ok(block.includes("cs.lastModified ?"))
  assert.equal(/lastModified:\s*now/.test(block.slice(0, block.indexOf("return entries"))), false)
})
