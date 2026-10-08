// Run: node --import ./tests/support/register.mjs --test tests/unit/nav-spare-parts.test.mjs
// Pins lib/navSpareParts.ts (header Spare Parts menu data), lib/sparePartUrl.ts
// (shared with /spare-parts) and the getNavSpareParts() reader contract.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { shapeNavSpareParts, NAV_SPARE_PARTS_LIMIT } from "../../lib/navSpareParts.ts"
import { buildPartUrl } from "../../lib/sparePartUrl.ts"

const part = (name, machine, extra = {}) => ({
  name, slug: name.toLowerCase().replace(/\s+/g, "-"), isPublished: true,
  compatibleProductNames: machine ? [machine] : [], ...extra,
})

test("published parts with a name and slug only", () => {
  const groups = shapeNavSpareParts([
    part("Nozzle", "M1"),
    part("Draft", "M1", { isPublished: false }),
    part("Unflagged", "M1", { isPublished: undefined }),
    part("No slug", "M1", { slug: "" }),
  ])
  assert.deepEqual(groups.flatMap((g) => g.parts.map((p) => p.name)), ["Nozzle"])
})

test("hrefs equal the /spare-parts page rule (machine slug, category fallback)", () => {
  const withMachine = part("Fuel Tank", "Double Barrel | 100XDB400")
  const noMachine = part("Washer", null, { category: "Body & Frame" })
  assert.equal(buildPartUrl(withMachine), "/spare-parts/double-barrel-100xdb400/fuel-tank")
  assert.equal(buildPartUrl(noMachine), "/spare-parts/body-frame/washer")
  const groups = shapeNavSpareParts([withMachine, noMachine])
  assert.deepEqual(groups.flatMap((g) => g.parts.map((p) => p.href)).sort(), [buildPartUrl(noMachine), buildPartUrl(withMachine)].sort())
  assert.equal(groups.find((g) => g.parts[0].name === "Washer").machine, "Other parts")
})

test(`capped at ${NAV_SPARE_PARTS_LIMIT}, round-robin across machines, bigger machines first`, () => {
  const docs = [
    ...Array.from({ length: 20 }, (_, i) => part(`Big ${String(i).padStart(2, "0")}`, "Big machine", { order: i })),
    ...Array.from({ length: 3 }, (_, i) => part(`Mid ${i}`, "Mid machine", { order: i })),
    part("Solo", "Small machine"),
  ]
  const groups = shapeNavSpareParts(docs)
  assert.equal(groups.reduce((n, g) => n + g.parts.length, 0), NAV_SPARE_PARTS_LIMIT)
  assert.deepEqual(groups.map((g) => g.machine), ["Big machine", "Mid machine", "Small machine"])
  assert.equal(groups[2].parts.length, 1)
  assert.equal(groups[1].parts.length, 3)
  assert.equal(groups[0].parts.length, 8)
  assert.deepEqual(groups[0].parts.slice(0, 3).map((p) => p.name), ["Big 00", "Big 01", "Big 02"])
})

test("page order inside a machine: order ascending (missing first), then name", () => {
  const groups = shapeNavSpareParts([
    part("B", "M", { order: 2 }), part("A", "M", { order: 2 }), part("Z", "M"), part("C", "M", { order: 1 }),
  ])
  assert.deepEqual(groups[0].parts.map((p) => p.name), ["Z", "C", "A", "B"])
})

test("thumbnail is a ~160 px Cloudinary rendition, else null", () => {
  const [g] = shapeNavSpareParts([
    part("A", "M", { order: 1, images: ["https://res.cloudinary.com/demo/image/upload/v1/a.png"] }),
    part("B", "M", { order: 2 }),
  ])
  assert.match(g.parts[0].thumb, /w_160,h_160,c_fill\/v1\/a\.png$/)
  assert.equal(g.parts[1].thumb, null)
})

test("getNavSpareParts: published query, minimal projection, LAYOUT_DATA_TAG + 60 s, [] on failure", () => {
  const src = readFileSync(new URL("../../lib/layoutData.ts", import.meta.url), "utf8")
  const block = src.slice(src.indexOf("const fetchNavSpareParts"))
  assert.match(block, /\.find\(\s*\{ isPublished: true \}/)
  assert.match(block, /images: \{ \$slice: 1 \}/)
  assert.doesNotMatch(block.match(/projection: \{([^\n]*)\}/)[1], /description|specs/)
  assert.match(block, /tags: \[LAYOUT_DATA_TAG\], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS/)
  assert.match(block, /export const getNavSpareParts = cache\(async \(\)[^]*?catch \{\s*return \[\]/)
})
