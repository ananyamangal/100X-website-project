// Task B-infra — extends the i18n seed pipeline to write the `sections`
// override (benefits-grid, process-timeline, case-studies, trust-strip,
// form/cta-band copy, comparison-table, rich-text — whichever a page has).
//
// lib/seo/get-merged-landing-page.ts already accepts `sections` as a generic
// passthrough override (full-array replace, same merge path as
// hero/faqs/metadata) — this script is the missing write side. It only
// $sets the `sections` key on the existing {slug, locale} row, leaving
// metadata/hero/faqs (written by seed-i18n-translations.mjs /
// seed-i18n-phase2.mjs) and `reviewed` completely untouched. Row must
// already exist (seeded by one of those two scripts first).
//
// Input JSON shape:
//   { "locale": "<locale>", "sections": { "<slug>": [ <LandingSection>, ... ], ... 6 entries } }
//
// Usage: node scripts/seed-i18n-sections.mjs <locale> <path-to-sections-json>

import { MongoClient } from "mongodb"
import fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
const uriLine = envText.split("\n").find((l) => l.startsWith("MONGODB_URI="))
const uri = uriLine.slice("MONGODB_URI=".length).trim()

const SLUGS = [
  "gem-approved-fogging-machine-oem",
  "fogging-machine-supplier-in-uttar-pradesh",
  "fogging-machine-supplier-in-bihar",
  "dengue-control-fogging-machine",
  "thermal-vs-cold-fogging-machine",
  "fogging-machine-buying-guide",
]

const [, , locale, dataPath] = process.argv
if (!locale || !dataPath) {
  console.error("Usage: node scripts/seed-i18n-sections.mjs <locale> <path-to-sections-json>")
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"))
if (data.locale !== locale) {
  console.error(`Data file locale "${data.locale}" does not match argument "${locale}"`)
  process.exit(1)
}
const missingSlugs = SLUGS.filter((s) => !data.sections?.[s])
if (missingSlugs.length) {
  console.error(`Missing sections for slugs: ${missingSlugs.join(", ")}`)
  process.exit(1)
}

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  const col = db.collection("landing_page_translations")

  let count = 0
  for (const slug of SLUGS) {
    const existing = await col.findOne({ slug, locale })
    if (!existing) {
      console.error(`  [skip] no row for ${slug} [${locale}] — seed metadata/hero/faqs first via seed-i18n-translations.mjs / seed-i18n-phase2.mjs`)
      continue
    }
    await col.updateOne(
      { slug, locale },
      { $set: { "overrides.sections": data.sections[slug], sectionsSeededAt: new Date().toISOString() } },
    )
    count++
    console.log(`  [sections] upserted ${slug} [${locale}] — ${data.sections[slug].length} section(s), reviewed flag untouched`)
  }
  console.log(`Done — ${count}/${SLUGS.length} rows updated for locale "${locale}".`)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
