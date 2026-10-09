// Run: node --import ./tests/support/register.mjs --test tests/unit/related-links.test.mjs
// B9: product <-> case study <-> guide links matched by machine type, capped, canonical URLs only.
import test from "node:test"
import assert from "node:assert/strict"
import {
  productKind,
  caseStudyKind,
  caseStudyLinks,
  productLinks,
  caseStudyLabel,
} from "../../lib/relatedLinks.ts"

const PRODUCTS = [
  { id: "1", slug: "thermal-cold-fogging-machine-100xtfs50-90602f", name: "Thermal & Cold Fogging Machine-100XTFS50", category: "Fogging Machines", order: 1 },
  { id: "2", slug: "double-barrel-thermal-fogging-machine-vehicle-mounted", name: "Double Barrel Thermal Fogging Machine | Vehicle Mountable| 100XDB400", category: "Fogging Machines", order: 2 },
  { id: "3", slug: "cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1", name: "Cold fogger machine with 2 stoke engine- 100XMCF42 ", category: "Cold fogger", order: 3 },
  { id: "4", slug: "100xulvss10-5e46c5", name: "100XULVSS10", category: "Cold fogger", order: 4 },
  { id: "5", slug: "passenger-baggage-trolleys-stainless-steel-with-brakes-100xats", name: "Passenger Baggage Trolleys Stainless steel with brakes-100XATS", category: "Trolleys", order: 5 },
  { id: "6", slug: "mini-fogger-100xbf102-2d9887", name: "Mini Fogger- 100XBF102", category: "Fogging Machines", order: 6 },
  { id: "7", slug: "100x-thermal-fogger-bf150", name: "100X Thermal Fogger BF-150", category: "Thermal Fogging Machines", order: 7 },
]
const CASES = [
  { slug: "a-vehicle", customer: "Nagar Panchayat Barun", state: "Bihar", productUsed: "Vehicle Mountable Fogging Machine", updatedAt: "2026-06-20T10:00:00Z" },
  { slug: "b-hand", customer: "NSG", state: "Haryana", productUsed: "Hand Carried Fogger", updatedAt: "2026-06-23T10:00:00Z" },
  { slug: "c-cold", customer: "164 Military Hospital", state: "West Bengal", productUsed: "Cold Fogger", updatedAt: "2026-06-23T11:00:00Z" },
  { slug: "Mixed-Case", customer: "Nagar Nigam Muzaffarpur, Bihar", state: "Bihar", productUsed: "100XDB600 Vehicle-Mounted Thermal Fogging Machine", updatedAt: "2026-06-21T10:00:00Z" },
]

test("machine type from DB names and categories", () => {
  assert.equal(productKind(PRODUCTS[0].name, PRODUCTS[0].category), "handheld")
  assert.equal(productKind(PRODUCTS[1].name, PRODUCTS[1].category), "vehicle")
  assert.equal(productKind(PRODUCTS[2].name, PRODUCTS[2].category), "cold")
  assert.equal(productKind(PRODUCTS[3].name, PRODUCTS[3].category), "cold")
  assert.equal(productKind(PRODUCTS[4].name, PRODUCTS[4].category), null)
  assert.equal(caseStudyKind("Hand Carried Fogger"), "handheld")
  assert.equal(caseStudyKind("Cold Fogger"), "cold")
  assert.equal(caseStudyKind("100XDB600 Vehicle-Mounted Thermal Fogging Machine"), "vehicle")
  assert.equal(caseStudyKind(undefined), null)
})

test("case-study links: same type, newest first, excludes already-shown, capped", () => {
  const v = caseStudyLinks(CASES, ["vehicle"], 3)
  assert.deepEqual(v.map((l) => l.href), ["/case-studies/Mixed-Case", "/case-studies/a-vehicle"])
  assert.deepEqual(caseStudyLinks(CASES, ["vehicle"], 3, ["Mixed-Case"]).map((l) => l.href), ["/case-studies/a-vehicle"])
  assert.equal(caseStudyLinks(CASES, ["vehicle", "handheld", "cold"], 2).length, 2)
  assert.equal(v[1].label, "Case study: Nagar Panchayat Barun, Bihar (Vehicle Mountable Fogging Machine)")
  assert.equal(caseStudyLabel(CASES[3]), "Case study: Nagar Nigam Muzaffarpur, Bihar (100XDB600 Vehicle-Mounted Thermal Fogging Machine)")
})

test("product links use canonical URLs, skip trolleys and the BF-150 404, never the current product", () => {
  const h = productLinks(PRODUCTS, ["handheld"], 4)
  assert.deepEqual(h.map((l) => l.href), ["/thermal-and-cold-fogging-machine-100xtfs50", "/products/mini-fogger-100xbf102-2d9887"])
  const v = productLinks(PRODUCTS, ["vehicle"], 3)
  assert.deepEqual(v, [{ href: "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400", label: "Double Barrel Thermal Fogging Machine, Vehicle Mountable, 100XDB400" }])
  assert.deepEqual(productLinks(PRODUCTS, ["cold"], 3, ["3"]).map((l) => l.href), ["/products/100xulvss10-5e46c5"])
  for (const l of productLinks(PRODUCTS, ["handheld", "vehicle", "cold"], 10)) {
    assert.notEqual(l.href, "/products/100x-thermal-fogger-bf150")
    assert.ok(!/trolley/i.test(l.href))
  }
})
