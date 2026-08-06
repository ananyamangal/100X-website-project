// Closes a gap found while building the Task C completeness gate: the
// original Phase 1/2 seed shape only ever captured hero.headline + hero.sub
// — hero.eyebrow and the two CTA button labels (primary.label,
// secondary.label) were never translated for ANY language, and pages whose
// English headline is a multi-part accent array (HeroHeadlinePart[]) only
// ever got the first part's text (or a flattened string), silently losing
// the rest.
//
// $sets individual dot-path sub-fields on the existing {slug,locale} row's
// overrides.hero — never touches overrides.hero.sub (already seeded),
// overrides.metadata/faqs/sections, or reviewed.
//
// Input JSON shape:
//   {
//     "locale": "<locale>",
//     "hero": {
//       "<slug>": {
//         "eyebrow": "...",
//         "headline": "..." | [{ "text": "...", "accent": "green" }, ...],  // same shape as en-baseline.json for that slug
//         "primary": { "label": "..." },
//         "secondary": { "label": "..." }  // omit if English has no secondary CTA
//       },
//       ... all 6 slugs
//     }
//   }
//
// Usage: node scripts/seed-i18n-hero-extra.mjs <locale> <path-to-hero-extra-json>

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
  console.error("Usage: node scripts/seed-i18n-hero-extra.mjs <locale> <path-to-hero-extra-json>")
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"))
if (data.locale !== locale) {
  console.error(`Data file locale "${data.locale}" does not match argument "${locale}"`)
  process.exit(1)
}
const missingSlugs = SLUGS.filter((s) => !data.hero?.[s])
if (missingSlugs.length) {
  console.error(`Missing hero-extra for slugs: ${missingSlugs.join(", ")}`)
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
      console.error(`  [skip] no row for ${slug} [${locale}] — seed metadata/hero/faqs first.`)
      continue
    }
    const h = data.hero[slug]
    const set = { heroExtraSeededAt: new Date().toISOString() }
    if (h.eyebrow !== undefined) set["overrides.hero.eyebrow"] = h.eyebrow
    if (h.headline !== undefined) set["overrides.hero.headline"] = h.headline
    if (h.primary?.label !== undefined) set["overrides.hero.primary.label"] = h.primary.label
    if (h.secondary?.label !== undefined) set["overrides.hero.secondary.label"] = h.secondary.label
    await col.updateOne({ slug, locale }, { $set: set })
    count++
    console.log(`  [hero-extra] upserted ${slug} [${locale}]`)
  }
  console.log(`Done — ${count}/${SLUGS.length} rows updated for locale "${locale}".`)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
