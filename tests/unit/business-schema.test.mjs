// Run: node --import ./tests/support/register.mjs --test tests/unit/business-schema.test.mjs
// B3: one business identity in schema; /contact-us ContactPage + BreadcrumbList.
import test from "node:test"
import assert from "node:assert/strict"
import {
  businessPostalAddress,
  buildContactPageJsonLd,
  buildContactBreadcrumbJsonLd,
  FOUNDING_DATE,
  ORGANIZATION_ID,
  LOCAL_BUSINESS_ID,
} from "../../lib/seo/businessSchema.ts"
import { BUSINESS, SITE_URL } from "../../lib/seo/site-config.ts"

function urlsIn(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => urlsIn(n, out))
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if ((k === "url" || k === "item" || k === "@id") && typeof v === "string") out.push(v)
      else urlsIn(v, out)
    }
  }
  return out
}

test("founding date is 2020 and the address comes from BUSINESS", () => {
  assert.equal(FOUNDING_DATE, "2020")
  const a = businessPostalAddress()
  assert.equal(a["@type"], "PostalAddress")
  assert.equal(a.streetAddress, BUSINESS.streetAddress)
  assert.equal(a.postalCode, BUSINESS.postalCode)
  assert.equal(a.addressCountry, "IN")
})

test("ContactPage references the sitewide nodes and uses absolute URLs", () => {
  const page = JSON.parse(JSON.stringify(buildContactPageJsonLd()))
  assert.equal(page["@type"], "ContactPage")
  assert.equal(page.url, `${SITE_URL}/contact-us`)
  assert.deepEqual(page.about, { "@id": ORGANIZATION_ID })
  assert.deepEqual(page.mainEntity, { "@id": LOCAL_BUSINESS_ID })
  for (const u of urlsIn(page)) assert.match(u, /^https:\/\//)
})

test("BreadcrumbList is Home > Contact with absolute items", () => {
  const bc = JSON.parse(JSON.stringify(buildContactBreadcrumbJsonLd()))
  assert.equal(bc["@type"], "BreadcrumbList")
  assert.deepEqual(bc.itemListElement.map((i) => [i.position, i.name, i.item]), [
    [1, "Home", SITE_URL],
    [2, "Contact", `${SITE_URL}/contact-us`],
  ])
  assert.equal(buildContactPageJsonLd().breadcrumb["@id"], bc["@id"])
  const ids = [buildContactPageJsonLd()["@id"], bc["@id"]]
  assert.equal(new Set(ids).size, ids.length)
})
