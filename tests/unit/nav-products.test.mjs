// Run: node --import ./tests/support/register.mjs --test tests/unit/nav-products.test.mjs
// Pins lib/navProducts.ts (header Products menu data): published only, grouping and
// order, canonical URLs identical to the product cards / sitemap, small Cloudinary
// thumbnails, and lib/layoutData.ts getNavProducts() returning [] when the read fails.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { shapeNavProducts, navThumbUrl, navProductHref, NAV_THUMB_PX } from "../../lib/navProducts.ts"
import { PRODUCT_LANDING_MAP, getProductCanonicalUrl } from "../../lib/seo/product-landing-map.ts"

const CLD = "https://res.cloudinary.com/demo/image/upload/v1/abc.jpg"
const landingSlug = Object.keys(PRODUCT_LANDING_MAP).find((k) => !/^[0-9a-f]{24}$/.test(k))
const landingId = Object.keys(PRODUCT_LANDING_MAP).find((k) => /^[0-9a-f]{24}$/.test(k))

test("only published, named products are listed", () => {
  const groups = shapeNavProducts([
    { _id: "a1", name: "Live", slug: "live", category: "Foggers" },
    { _id: "a2", name: "Explicit", slug: "explicit", category: "Foggers", isPublished: true },
    { _id: "a3", name: "Draft", slug: "draft", category: "Foggers", isPublished: false },
    { _id: "a4", name: "   ", slug: "blank", category: "Foggers" },
    { _id: "a5", slug: "no-name", category: "Foggers" },
  ])
  const names = groups.flatMap((g) => g.products.map((p) => p.name))
  assert.deepEqual(names.sort(), ["Explicit", "Live"])
})

test("groups by category in order of first product; products keep listing order (order asc, newest first)", () => {
  const groups = shapeNavProducts([
    { _id: "1", name: "B-late", slug: "b-late", category: "Sprayers", order: 5 },
    { _id: "2", name: "A-first", slug: "a-first", category: "Foggers", order: 1 },
    { _id: "3", name: "B-early", slug: "b-early", category: "Sprayers", order: 2 },
    { _id: "4", name: "No-order-old", slug: "o", category: "Foggers", createdAt: "2024-01-01T00:00:00Z" },
    { _id: "5", name: "No-order-new", slug: "n", category: "Foggers", createdAt: "2025-01-01T00:00:00Z" },
    { _id: "6", name: "Uncategorised", slug: "u", order: 3 },
  ])
  assert.deepEqual(groups.map((g) => g.category), ["Foggers", "Sprayers", "Other"])
  assert.deepEqual(groups[0].products.map((p) => p.name), ["A-first", "No-order-new", "No-order-old"])
  assert.deepEqual(groups[1].products.map((p) => p.name), ["B-early", "B-late"])
})

test("hrefs match the product-card canonical rule, and landing pages are linked directly", () => {
  assert.equal(navProductHref("plain-slug", "64aa00000000000000000001"), getProductCanonicalUrl("plain-slug"))
  assert.equal(navProductHref(undefined, "64aa00000000000000000001"), "/products/64aa00000000000000000001")
  assert.equal(navProductHref(landingSlug, "64aa00000000000000000002"), `/${PRODUCT_LANDING_MAP[landingSlug]}`)
  // Sitemap rule: a slug without a mapping still goes to the landing page when the id is mapped.
  assert.equal(navProductHref("unmapped-slug", landingId), `/${PRODUCT_LANDING_MAP[landingId]}`)
  const [g] = shapeNavProducts([{ _id: "64aa00000000000000000003", name: "X", slug: landingSlug, category: "C" }])
  assert.equal(g.products[0].href, `/${PRODUCT_LANDING_MAP[landingSlug]}`)
})

test("thumbnails are small Cloudinary renditions; anything else becomes a placeholder (null)", () => {
  assert.equal(navThumbUrl(CLD), `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_${NAV_THUMB_PX},h_${NAV_THUMB_PX},c_fill/v1/abc.jpg`)
  assert.equal(navThumbUrl("/placeholder.svg"), null)
  assert.equal(navThumbUrl("https://example.com/big.jpg"), null)
  assert.equal(navThumbUrl(undefined), null)
  const [g] = shapeNavProducts([
    { _id: "1", name: "First image wins", slug: "f", category: "C", imageUrls: [CLD, "https://res.cloudinary.com/demo/image/upload/v1/other.jpg"] },
    { _id: "2", name: "Legacy imageUrl", slug: "l", category: "C", imageUrl: CLD },
    { _id: "3", name: "No image", slug: "n", category: "C" },
  ])
  assert.match(g.products[0].thumb, /abc\.jpg$/)
  assert.match(g.products[1].thumb, /w_160,h_160,c_fill/)
  assert.equal(g.products[2].thumb, null)
})

test("output is small and serialisable (name, href, thumb only)", () => {
  const groups = shapeNavProducts([{ _id: "1", name: "N", slug: "n", category: "C", description: "long", specs: [1, 2] }])
  assert.deepEqual(Object.keys(groups[0].products[0]).sort(), ["href", "name", "thumb"])
  assert.deepEqual(JSON.parse(JSON.stringify(groups)), groups)
})

test("empty input → no groups (Navbar falls back to the plain Products link)", () => {
  assert.deepEqual(shapeNavProducts([]), [])
})

test("getNavProducts: cached reader filters published in the query and returns [] on failure", () => {
  // layoutData.ts imports next/cache + mongodb, so pin its contract at source level.
  const src = readFileSync(new URL("../../lib/layoutData.ts", import.meta.url), "utf8")
  const block = src.slice(src.indexOf("const fetchNavProducts"))
  assert.match(block, /isPublished: \{ \$ne: false \}/)
  assert.match(block, /tags: \[LAYOUT_DATA_TAG\], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS/)
  assert.match(block, /export const getNavProducts = cache\(async \(\)[^]*?catch \{\s*return \[\]/)
})
