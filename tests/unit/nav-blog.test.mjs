// Run: node --import ./tests/support/register.mjs --test tests/unit/nav-blog.test.mjs
// Pins lib/navBlog.ts (header Blog menu data) and the getNavBlogPosts() reader
// contract: published only (same rule as lib/blogsQuery.ts), newest first, capped,
// canonical /blog/<blogPostSlug> URLs, small Cloudinary thumbnails, [] on failure.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { shapeNavBlogPosts, NAV_BLOG_LIMIT } from "../../lib/navBlog.ts"
import { blogPostSlug } from "../../lib/blogSlug.ts"

const CLD = "https://res.cloudinary.com/demo/image/upload/v1/cover.jpg"
const post = (i, extra = {}) => ({ _id: `64aa0000000000000000000${i}`, title: `Post ${i}`, slug: `post-${i}`, publishedAt: `2026-0${i}-01T00:00:00.000Z`, ...extra })

test("published or legacy (no flag) only; untitled dropped", () => {
  const items = shapeNavBlogPosts([
    post(1),
    post(2, { isPublished: true }),
    post(3, { isPublished: false }),
    post(4, { title: "  " }),
  ])
  assert.deepEqual(items.map((p) => p.title).sort(), ["Post 1", "Post 2"])
})

test(`newest first and capped at ${NAV_BLOG_LIMIT}`, () => {
  const docs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => post(i))
  const items = shapeNavBlogPosts(docs)
  assert.equal(items.length, NAV_BLOG_LIMIT)
  assert.deepEqual(items.map((p) => p.title), ["Post 9", "Post 8", "Post 7", "Post 6", "Post 5", "Post 4"])
})

test("createdAt is the fallback date; undated posts sort last", () => {
  const items = shapeNavBlogPosts([
    { _id: "a", title: "Undated", slug: "u" },
    { _id: "b", title: "Created", slug: "c", createdAt: "2026-03-05T10:00:00.000Z" },
  ])
  assert.deepEqual(items.map((p) => p.title), ["Created", "Undated"])
  assert.equal(items[0].date, "5 Mar 2026")
  assert.equal(items[1].date, null)
})

test("href is the canonical blog URL (explicit slug, else the legacy title+id slug)", () => {
  const legacy = { _id: "64aa000000000000001234ab", title: "Fogging Guide 2026", publishedAt: "2026-01-01" }
  const [a, b] = shapeNavBlogPosts([post(2), legacy])
  assert.equal(a.href, "/blog/post-2")
  assert.equal(b.href, `/blog/${blogPostSlug(legacy)}`)
  assert.match(b.href, /^\/blog\/fogging-guide-2026-1234ab$/)
})

test("cover becomes a ~160 px Cloudinary rendition; others → placeholder", () => {
  const [a, b] = shapeNavBlogPosts([post(2, { topImage: CLD }), post(1, { topImage: "/local.jpg" })])
  assert.match(a.thumb, /\/upload\/f_auto,q_auto,w_160,h_160,c_fill\/v1\/cover\.jpg$/)
  assert.equal(b.thumb, null)
})

test("getNavBlogPosts: published query, no body in the projection, both cache tags, [] on failure", () => {
  const src = readFileSync(new URL("../../lib/layoutData.ts", import.meta.url), "utf8")
  const block = src.slice(src.indexOf("const fetchNavBlogPosts"))
  assert.match(block, /\$or: \[\{ isPublished: true \}, \{ isPublished: \{ \$exists: false \} \}\]/)
  const projection = block.match(/projection: \{([^}]*)\}/)[1]
  assert.doesNotMatch(projection, /content|body|excerpt/)
  assert.match(block, /tags: \[LAYOUT_DATA_TAG, BLOGS_CACHE_TAG\]/)
  assert.match(block, /export const getNavBlogPosts = cache\(async \(\)[^]*?catch \{\s*return \[\]/)
})
