#!/usr/bin/env node
// Regenerates the locale-prefix and locale-managed-slug matcher lists from
// their live source of truth (i18n/routing.ts's routing.locales and
// lib/i18n/locale-routes.ts's LOCALE_MANAGED_SLUGS) and diffs them against
// the hardcoded array in middleware.ts's `config.matcher`.
//
// WHY hardcoded at all: Next.js statically analyzes `export const config =
// { matcher: [...] }` at build time and rejects spread operators / computed
// values in that array ("Unsupported spread operator in the Array
// Expression at config.matcher") — see the comment above config.matcher in
// middleware.ts for the full story. So the matcher entries can't just be
// generated at module-eval time the way they used to be; they have to be
// literal strings, kept in sync by hand and checked by this script.
//
// Run after any change to routing.locales or LOCALE_MANAGED_SLUGS:
//   node scripts/verify-locale-matchers.mjs
// Exits non-zero and prints a diff if middleware.ts has drifted.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function extractLocales() {
  const src = readFileSync(path.join(root, "i18n/routing.ts"), "utf8")
  const match = src.match(/locales:\s*\[([^\]]+)\]/)
  if (!match) throw new Error("Could not find `locales: [...]` in i18n/routing.ts")
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

function extractManagedSlugs() {
  const src = readFileSync(path.join(root, "lib/i18n/locale-routes.ts"), "utf8")
  const match = src.match(/LOCALE_MANAGED_SLUGS\s*=\s*new Set\(\[([^\]]+)\]/)
  if (!match) throw new Error("Could not find `LOCALE_MANAGED_SLUGS = new Set([...])` in lib/i18n/locale-routes.ts")
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

function expectedMatchers() {
  const locales = extractLocales()
  const slugs = extractManagedSlugs()
  const localeMatchers = locales.flatMap((locale) => [`/${locale}`, `/${locale}/:path*`])
  const slugMatchers = slugs.map((slug) => `/${slug}`)
  return { locales, slugs, localeMatchers, slugMatchers }
}

function actualMatchersInMiddleware() {
  const src = readFileSync(path.join(root, "middleware.ts"), "utf8")
  // Anchored to line start so the prose mention of "export const config = {"
  // inside the comment above (explaining why this array is hardcoded)
  // doesn't get matched instead of the real code.
  const configLineMatch = /^export const config = \{/m.exec(src)
  if (!configLineMatch) throw new Error("Could not find `export const config = {` at line start in middleware.ts")
  const configStart = configLineMatch.index
  const matcherStart = src.indexOf("matcher:", configStart)
  if (matcherStart === -1) throw new Error("Could not find `matcher:` in middleware.ts's config export")
  const bracketStart = src.indexOf("[", matcherStart)
  const bracketEnd = src.indexOf("]", bracketStart)
  if (bracketStart === -1 || bracketEnd === -1) throw new Error("Could not find matcher array brackets in middleware.ts")
  return [...src.slice(bracketStart, bracketEnd).matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

const { locales, slugs, localeMatchers, slugMatchers } = expectedMatchers()
const expected = new Set([...localeMatchers, ...slugMatchers])
const actual = new Set(actualMatchersInMiddleware())

const missing = [...expected].filter((m) => !actual.has(m))
const stale = [...localeMatchers, ...slugMatchers].length && [...actual].filter(
  (m) => (m.match(/^\/[a-z]{2}(\/:path\*)?$/) || slugMatchers.includes(m)) && !expected.has(m)
)

if (missing.length === 0 && stale.length === 0) {
  console.log(
    `OK: middleware.ts's hardcoded matcher array matches routing.locales (${locales.length} locales) ` +
      `and LOCALE_MANAGED_SLUGS (${slugs.length} slugs) as of this run.`
  )
  process.exit(0)
}

console.error("DRIFT DETECTED between middleware.ts's hardcoded matcher array and the live source of truth.")
if (missing.length) {
  console.error("\nMissing from middleware.ts config.matcher (present in routing.locales / LOCALE_MANAGED_SLUGS but not hardcoded):")
  missing.forEach((m) => console.error(`  + ${m}`))
}
if (stale.length) {
  console.error("\nStale in middleware.ts config.matcher (hardcoded but no longer in routing.locales / LOCALE_MANAGED_SLUGS):")
  stale.forEach((m) => console.error(`  - ${m}`))
}
console.error("\nRegenerate the locale-prefix and locale-managed-slug sections of config.matcher in middleware.ts to match.")
process.exit(1)
