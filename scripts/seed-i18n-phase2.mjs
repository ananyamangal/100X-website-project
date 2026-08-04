// Phase 2 seed: 11 Indian regional languages (bn, mr, te, ta, gu, ur, kn, or,
// ml, pa, as) — full content (metadata/hero/faqs) on the same 6 real-content
// landing slugs as Phase 1, plus title/excerpt-only translations for all 29
// blog posts (full blog-body translation is explicitly deferred — see
// .claude-session-status.md).
//
// Run per language, one language at a time, so each can be verified and
// committed independently:
//   node scripts/seed-i18n-phase2.mjs <locale> <path-to-translated-json>
//
// The translated JSON is produced by a translation pass (see
// .claude-session-status.md for how this run generated it) and must match:
//   {
//     "locale": "<locale>",
//     "landing": [ { slug, metadata: {title, description}, hero: {headline, sub}, faqs: [{q,a}] }, ... 6 entries ],
//     "blog": [ { _id, title, excerpt, metaTitle, metaDescription }, ... 29 entries ]
//   }
//
// Landing rows go into landing_page_translations — same gate as Phase 1:
// reviewed defaults to false via $setOnInsert, and reseeding an existing
// row never resets an already-reviewed row's flag (see the fix in
// seed-i18n-translations.mjs for why unconditional $set was a hazard).
//
// Blog rows go into `translations` (contentType: "blog") — status defaults
// to "pending" via the same $setOnInsert pattern, for the same reason.
// metaTitle/metaDescription are written into `fields` for completeness, but
// note: app/[locale]/blog/[slug]/page.tsx's generateMetadata() does not yet
// read translated metaTitle/metaDescription (only translated title/excerpt)
// — it falls back to the English blog doc's metaTitle/metaDescription
// regardless of locale. Tracked as a known gap, not fixed by this script.
import { MongoClient } from "mongodb"
import fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
const uriLine = envText.split("\n").find((l) => l.startsWith("MONGODB_URI="))
const uri = uriLine.slice("MONGODB_URI=".length).trim()

const [, , locale, dataPath] = process.argv
if (!locale || !dataPath) {
  console.error("Usage: node scripts/seed-i18n-phase2.mjs <locale> <path-to-translated-json>")
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"))
if (data.locale !== locale) {
  console.error(`Data file locale "${data.locale}" does not match argument "${locale}"`)
  process.exit(1)
}
if (!Array.isArray(data.landing) || data.landing.length !== 6) {
  console.error(`Expected 6 landing entries, got ${data.landing?.length}`)
  process.exit(1)
}
if (!Array.isArray(data.blog) || data.blog.length !== 29) {
  console.error(`Expected 29 blog entries, got ${data.blog?.length}`)
  process.exit(1)
}

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  const landingCol = db.collection("landing_page_translations")
  const blogCol = db.collection("translations")

  let landingCount = 0
  for (const entry of data.landing) {
    const overrides = { metadata: entry.metadata, hero: entry.hero, faqs: entry.faqs }
    await landingCol.updateOne(
      { slug: entry.slug, locale },
      {
        $set: { slug: entry.slug, locale, overrides, seededAt: new Date().toISOString() },
        $setOnInsert: { reviewed: false },
      },
      { upsert: true },
    )
    landingCount++
    console.log(`  [landing] upserted ${entry.slug} [${locale}]`)
  }

  let blogCount = 0
  for (const entry of data.blog) {
    const fields = { title: entry.title, excerpt: entry.excerpt }
    if (entry.metaTitle) fields.metaTitle = entry.metaTitle
    if (entry.metaDescription) fields.metaDescription = entry.metaDescription
    await blogCol.updateOne(
      { contentType: "blog", contentId: entry._id, locale },
      {
        $set: {
          contentType: "blog",
          contentId: entry._id,
          locale,
          fields,
          generatedAt: new Date().toISOString(),
        },
        $setOnInsert: { status: "pending" },
      },
      { upsert: true },
    )
    blogCount++
  }
  console.log(`  [blog] upserted ${blogCount} posts [${locale}]`)

  console.log(`Done — ${landingCount} landing rows, ${blogCount} blog rows for locale "${locale}".`)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
