// Run: node --import ./tests/support/register.mjs --test tests/unit/nav-contact.test.mjs
// Pins the header Contact menu (components/NavMenus.tsx CONTACT_ITEMS): built only from
// BUSINESS constants and existing pages — no database or API read — and every internal
// link points at a page that exists in the app router.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"

const src = readFileSync(new URL("../../components/NavMenus.tsx", import.meta.url), "utf8")
const block = src.slice(src.indexOf("const CONTACT_ITEMS"), src.indexOf("export function contactPanel"))

test("contact links come from BUSINESS constants (tel, wa.me, mailto)", () => {
  assert.ok(block.includes("href: `tel:${BUSINESS.phonePrimary.replace(/\\s+/g, '')}`"), "tel: strips whitespace like the navbar icon")
  assert.match(block, /href: CONTACT_WA_HREF/)
  assert.match(src, /const CONTACT_WA_HREF = `https:\/\/wa\.me\/\$\{BUSINESS\.whatsappE164\}/)
  assert.match(block, /href: `mailto:\$\{BUSINESS\.email\}`/)
})

test("no phone number or e-mail address is rendered as text", () => {
  // labels/subs are plain words; the only BUSINESS value shown is the factory city
  const subs = [...block.matchAll(/label: [^,]+, sub: ([^,]+),/g)].map((m) => m[1].trim())
  assert.ok(subs.every((s) => /^'[^'@0-9+]*'$/.test(s) || s === "BUSINESS.addressLocality"), subs.join(" | "))
})

test("internal links point at existing pages", () => {
  const internal = [...block.matchAll(/href: '(\/[^']*)'/g)].map((m) => m[1])
  assert.deepEqual(internal, ["/contact-us", "/factory", "/become-a-dealer", "/fogging-machine-government-procurement"])
  for (const p of internal) {
    assert.ok(existsSync(new URL(`../../app/(site)${p}/page.tsx`, import.meta.url)), `missing page for ${p}`)
  }
  assert.ok(existsSync(new URL("../../public/nav-factory.webp", import.meta.url)))
})

test("NavMenus reads no data itself", () => {
  assert.doesNotMatch(src, /mongodb|clientPromise|fetch\(/)
})
