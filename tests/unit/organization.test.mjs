// Run: node --import ./tests/support/register.mjs --test tests/unit/organization.test.mjs
// E4 (2026-10): one consistent Organization node = the previously published node + consistency fixes.
import test from "node:test"
import assert from "node:assert/strict"
import { buildOrganizationNode, organizationSameAs, ORGANIZATION_ID } from "../../lib/seo/organization.ts"
import { DEFAULT_SOCIAL_LINKS } from "../../lib/socialLinksShared.ts"

test("core fields are present and founding date is 2020", () => {
  const o = buildOrganizationNode()
  assert.equal(o["@id"], ORGANIZATION_ID)
  assert.equal(o.foundingDate, "2020")
  assert.equal(o.name, "100X Circle Pvt Ltd")
  assert.equal(o.url, "https://www.100xcircle.com")
  assert.ok(o.logo.url.endsWith("/logo-main.png"))
  assert.ok(o.contactPoint.length >= 1)
  assert.ok(o.areaServed.some((a) => a.name === "India"))
})

test("published values are kept (owner rule 2026-10-09); only TollFree is dropped", () => {
  const o = buildOrganizationNode()
  const json = JSON.stringify(o)
  for (const v of ["ISO 9001:2015", "CE Marking", "MSME / UDYAM Registration", "ISI Mark", "GeM Seller Registration"]) {
    assert.ok(json.includes(v), v)
  }
  assert.equal(o.areaServed.length, 4)
  assert.deepEqual(o.numberOfEmployees, { "@type": "QuantitativeValue", minValue: 25, maxValue: 100 })
  assert.equal(o.identifier.length, 3)
  for (const u of [
    "https://gem.gov.in",
    "https://udyamregistration.gov.in",
    "https://www.100xcircle.com/ai/about-100x",
    "https://www.100xcircle.com/ai/entity-graph",
  ]) assert.ok(o.sameAs.includes(u), u)
  assert.doesNotMatch(json, /TollFree|2014/)
})

test("social profile part of sameAs is de-duplicated and blank-free", () => {
  const same = organizationSameAs(DEFAULT_SOCIAL_LINKS)
  assert.ok(same.length > 0)
  for (const u of same) assert.match(u, /^https:\/\//)
  const links = structuredClone(DEFAULT_SOCIAL_LINKS)
  links.facebook.url = ""
  links.twitter.url = links.youtube.url
  const s2 = organizationSameAs(links)
  assert.equal(new Set(s2).size, s2.length)
  assert.ok(!s2.includes(""))
})
