// Task C — automated completeness gate.
//
// For one locale, checks all 6 real-content landing slugs: every translatable
// string (hero, faqs, metadata, and every section field listed in
// scripts/i18n-section-fields.mjs) must be present in the translation row's
// `overrides` AND differ from the English baseline (scripts/i18n-data/en-baseline.json)
// AND be non-empty. A page passes only if 100% of its translatable leaves pass.
// A locale qualifies for publish only if ALL 6 pages pass.
//
// This is a fast, mechanical "did translation actually happen" check — it
// does NOT judge translation quality/accuracy. That distinction is reported
// explicitly in the summary so it's never mistaken for a manual review.
//
// Usage:
//   node scripts/check-i18n-completeness.mjs <locale>            -- one locale, human table
//   node scripts/check-i18n-completeness.mjs <locale> --json     -- machine-readable
//   node scripts/check-i18n-completeness.mjs --all               -- every Phase-2 locale
//
// Exit code 0 = locale passes gate on all 6 pages, 1 = fails (or errors).

import { MongoClient } from "mongodb"
import fs from "fs"
import { SECTION_TRANSLATABLE_PATHS, TOP_LEVEL_TRANSLATABLE_PATHS } from "./i18n-section-fields.mjs"

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

const ALL_LOCALES = ["hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa", "as"]

const enBaseline = JSON.parse(fs.readFileSync("scripts/i18n-data/en-baseline.json", "utf8"))

function getByPath(obj, path) {
  const segs = path.split(".")
  let nodes = [obj]
  for (const seg of segs) {
    const isArray = seg.endsWith("[]")
    const key = isArray ? seg.slice(0, -2) : seg
    const next = []
    for (const n of nodes) {
      if (n == null) continue
      const v = key ? n[key] : n
      if (isArray) {
        if (Array.isArray(v)) next.push(...v)
      } else {
        next.push(v)
      }
    }
    nodes = next
  }
  return nodes
}

// Mirrors applyOverride()'s per-field-undefined semantics closely enough for
// gate purposes: hero/metadata are field-merged onto English; faqs/sections
// are full-array-replace when the override key is present at all.
function mergeForCheck(enPage, overrides) {
  const merged = JSON.parse(JSON.stringify(enPage))
  if (overrides?.metadata) Object.assign(merged.metadata, overrides.metadata)
  if (overrides?.hero) {
    merged.hero = { ...merged.hero, ...overrides.hero }
    if (overrides.hero.primary) merged.hero.primary = { ...merged.hero.primary, ...overrides.hero.primary }
    if (overrides.hero.secondary) merged.hero.secondary = { ...merged.hero.secondary, ...overrides.hero.secondary }
  }
  if (overrides?.faqs !== undefined) merged.faqs = overrides.faqs
  if (overrides?.sections !== undefined) merged.sections = overrides.sections
  return merged
}

function headlineTexts(headline) {
  if (typeof headline === "string") return [headline]
  if (Array.isArray(headline)) return headline.map((p) => p?.text).filter(Boolean)
  return []
}

function checkLeaf(enVal, trVal) {
  if (typeof enVal !== "string" || enVal.length === 0) return null // not applicable
  if (typeof trVal !== "string" || trVal.trim().length === 0) return "missing/empty"
  if (trVal === enVal) return "identical to English (untranslated)"
  return "ok"
}

function checkPage(enPage, trPage) {
  const results = { topLevel: [], sections: [] }

  // hero/faqs/metadata
  for (const path of TOP_LEVEL_TRANSLATABLE_PATHS) {
    if (path === "hero.headline") {
      const enTexts = headlineTexts(enPage.hero?.headline)
      const trTexts = headlineTexts(trPage.hero?.headline)
      enTexts.forEach((enVal, i) => {
        const status = checkLeaf(enVal, trTexts[i])
        if (status) results.topLevel.push({ path: `hero.headline[${i}]`, status })
      })
      continue
    }
    const enVals = getByPath(enPage, path)
    const trVals = getByPath(trPage, path)
    enVals.forEach((enVal, i) => {
      const status = checkLeaf(enVal, trVals[i])
      if (status) results.topLevel.push({ path: `${path}[${i}]`, status })
    })
  }

  // sections, matched positionally by index + kind
  const enSections = enPage.sections || []
  const trSections = trPage.sections || []
  enSections.forEach((enSec, idx) => {
    const trSec = trSections[idx]
    const leaves = []
    if (!trSec || trSec.kind !== enSec.kind) {
      leaves.push({ path: `sections[${idx}] (${enSec.kind})`, status: trSec ? `kind mismatch: expected ${enSec.kind}, got ${trSec.kind}` : "missing section" })
    } else {
      const paths = SECTION_TRANSLATABLE_PATHS[enSec.kind] || []
      for (const path of paths) {
        const enVals = getByPath(enSec, path)
        const trVals = getByPath(trSec, path)
        enVals.forEach((enVal, i) => {
          const status = checkLeaf(enVal, trVals[i])
          if (status) leaves.push({ path: `sections[${idx}].${path}[${i}]`, status })
        })
      }
    }
    results.sections.push({ kind: enSec.kind, index: idx, failures: leaves })
  })

  const allFailures = [...results.topLevel, ...results.sections.flatMap((s) => s.failures)]
  return { pass: allFailures.length === 0, failureCount: allFailures.length, results }
}

async function checkLocale(db, locale, { json }) {
  const col = db.collection("landing_page_translations")
  const pageResults = []
  for (const slug of SLUGS) {
    const enPage = enBaseline[slug]
    const row = await col.findOne({ slug, locale }, { projection: { overrides: 1, _id: 0 } })
    if (!row) {
      pageResults.push({ slug, pass: false, failureCount: -1, reason: "no row seeded" })
      continue
    }
    const trPage = mergeForCheck(enPage, row.overrides || {})
    const { pass, failureCount, results } = checkPage(enPage, trPage)
    pageResults.push({ slug, pass, failureCount, results })
  }
  const localePass = pageResults.every((p) => p.pass)

  if (json) {
    console.log(JSON.stringify({ locale, pass: localePass, pages: pageResults }, null, 2))
  } else {
    console.log(`\n=== ${locale} — ${localePass ? "PASS (qualifies for publish)" : "FAIL (stays reviewed:false)"} ===`)
    for (const p of pageResults) {
      if (p.pass) {
        console.log(`  ✓ ${p.slug}`)
      } else if (p.failureCount === -1) {
        console.log(`  ✗ ${p.slug} — ${p.reason}`)
      } else {
        console.log(`  ✗ ${p.slug} — ${p.failureCount} untranslated leaf field(s):`)
        for (const s of p.results.sections) {
          if (s.failures.length) console.log(`      section[${s.index}] (${s.kind}): ${s.failures.length} field(s) — e.g. ${s.failures[0].path}: ${s.failures[0].status}`)
        }
        for (const t of p.results.topLevel) {
          console.log(`      ${t.path}: ${t.status}`)
        }
      }
    }
  }
  return { locale, pass: localePass, pageResults }
}

async function main() {
  const args = process.argv.slice(2)
  const asJson = args.includes("--json")
  const runAll = args.includes("--all")
  const locale = args.find((a) => !a.startsWith("--"))

  if (!runAll && !locale) {
    console.error("Usage: node scripts/check-i18n-completeness.mjs <locale> [--json] | --all")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()

  const locales = runAll ? ALL_LOCALES : [locale]
  const summary = []
  for (const loc of locales) {
    summary.push(await checkLocale(db, loc, { json: asJson && !runAll }))
  }
  await client.close()

  if (runAll) {
    console.log("\n=== SUMMARY (mechanical completeness only — not a quality/accuracy check) ===")
    for (const s of summary) console.log(`  ${s.pass ? "PASS" : "FAIL"}  ${s.locale}`)
  }

  const overallPass = summary.every((s) => s.pass)
  process.exit(overallPass ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
