// Run: node --import ./tests/support/register.mjs --test tests/unit/nav-performance.test.mjs
// Pins lib/navPerformance.ts (header Performance menu data) and the getNavCaseStudies()
// reader contract in lib/layoutData.ts: published only, detail URLs, newest first,
// small Cloudinary thumbnails or a placeholder, [] on failure.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { shapeNavCaseStudies } from "../../lib/navPerformance.ts"

const CLD = "https://res.cloudinary.com/demo/image/upload/v1/site.jpg"

test("only published case studies with a slug are listed", () => {
  const items = shapeNavCaseStudies([
    { slug: "a", title: "A", published: true },
    { slug: "draft", title: "Draft", published: false },
    { slug: "unset", title: "Unset" },
    { title: "No slug", published: true },
    { slug: "untitled", published: true },
  ])
  assert.deepEqual(items.map((i) => i.href), ["/case-studies/a"])
})

test("label prefers the customer, falls back to the title; state is optional", () => {
  const [a, b] = shapeNavCaseStudies([
    { slug: "a", title: "Long title A", customer: "Nagar Nigam X", state: "Bihar", published: true, createdAt: "2026-02-01T00:00:00Z" },
    { slug: "b", title: "Title B", published: true, createdAt: "2026-01-01T00:00:00Z" },
  ])
  assert.deepEqual(a, { label: "Nagar Nigam X", state: "Bihar", href: "/case-studies/a", thumb: null })
  assert.equal(b.label, "Title B")
  assert.equal(b.state, null)
})

test("newest first, like the /case-studies grid", () => {
  const items = shapeNavCaseStudies([
    { slug: "old", title: "Old", published: true, createdAt: "2025-01-01T00:00:00Z" },
    { slug: "new", title: "New", published: true, createdAt: "2026-01-01T00:00:00Z" },
    { slug: "undated", title: "Undated", published: true },
  ])
  assert.deepEqual(items.map((i) => i.href.split("/").pop()), ["new", "old", "undated"])
})

test("first photo becomes a ~160 px Cloudinary rendition; no photo → null placeholder", () => {
  const [withImg, without] = shapeNavCaseStudies([
    { slug: "p", title: "P", published: true, images: [CLD, "https://res.cloudinary.com/demo/image/upload/v1/other.jpg"], createdAt: "2026-02-01" },
    { slug: "q", title: "Q", published: true, images: [], createdAt: "2026-01-01" },
  ])
  assert.equal(withImg.thumb, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160,h_160,c_fill/v1/site.jpg")
  assert.equal(without.thumb, null)
})

test("getNavCaseStudies: published query, minimal projection, LAYOUT_DATA_TAG + 60 s, [] on failure", () => {
  const src = readFileSync(new URL("../../lib/layoutData.ts", import.meta.url), "utf8")
  const block = src.slice(src.indexOf("const fetchNavCaseStudies"))
  assert.match(block, /\.find\(\s*\{ published: true \}/)
  assert.match(block, /images: \{ \$slice: 1 \}/)
  assert.match(block, /tags: \[LAYOUT_DATA_TAG\], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS/)
  assert.match(block, /export const getNavCaseStudies = cache\(async \(\)[^]*?catch \{\s*return \[\]/)
})
