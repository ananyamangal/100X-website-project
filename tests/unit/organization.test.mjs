// Run: node --import ./tests/support/register.mjs --test tests/unit/organization.test.mjs
// E4 (2026-10): one consistent Organization node.
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
  assert.deepEqual(o.areaServed, { "@type": "Country", name: "India" })
})

test("no unverified credential or claim is asserted (FACTS.md / OPEN_FACTS 11-13)", () => {
  const json = JSON.stringify(buildOrganizationNode())
  assert.doesNotMatch(json, /ISO 9001|CE Mark|UDYAM|2014|numberOfEmployees|TollFree/i)
})

test("sameAs lists only external profile URLs, no generic sites or own pages", () => {
  const same = organizationSameAs(DEFAULT_SOCIAL_LINKS)
  assert.ok(same.length > 0)
  for (const u of same) {
    assert.match(u, /^https:\/\//)
    assert.ok(!u.includes("100xcircle.com/"), u)
    assert.ok(!/gem\.gov\.in|udyamregistration/.test(u), u)
    assert.ok(!/wa\.me/.test(u), u)
  }
  // Empty or duplicate admin values are dropped.
  const links = structuredClone(DEFAULT_SOCIAL_LINKS)
  links.facebook.url = ""
  links.twitter.url = links.youtube.url
  const s2 = organizationSameAs(links)
  assert.equal(new Set(s2).size, s2.length)
  assert.ok(!s2.includes(""))
})
