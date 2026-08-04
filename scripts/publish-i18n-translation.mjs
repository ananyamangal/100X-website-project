// Explicit publish/unpublish for one landing-page translation row.
// This is the ONLY intended way unreviewed seeded content (reviewed: false,
// written by scripts/seed-i18n-translations.mjs) becomes live — flipping
// reviewed: true is a deliberate, one-row-at-a-time action, not automatic.
//
// Usage:
//   node scripts/publish-i18n-translation.mjs <slug> <locale>              -- publish (reviewed: true)
//   node scripts/publish-i18n-translation.mjs --unpublish <slug> <locale>  -- revert (reviewed: false)
//   node scripts/publish-i18n-translation.mjs --list                      -- list all rows + reviewed status
//   node scripts/publish-i18n-translation.mjs --list-unreviewed           -- list only unreviewed rows

import { MongoClient } from "mongodb"
import fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
const uriLine = envText.split("\n").find((l) => l.startsWith("MONGODB_URI="))
const uri = uriLine.slice("MONGODB_URI=".length).trim()

const args = process.argv.slice(2)

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  const col = db.collection("landing_page_translations")

  if (args[0] === "--list" || args[0] === "--list-unreviewed") {
    const filter = args[0] === "--list-unreviewed" ? { reviewed: { $ne: true } } : {}
    const rows = await col
      .find(filter, { projection: { slug: 1, locale: 1, reviewed: 1, seededAt: 1, _id: 0 } })
      .sort({ slug: 1, locale: 1 })
      .toArray()
    console.table(rows.map((r) => ({ slug: r.slug, locale: r.locale, reviewed: !!r.reviewed, seededAt: r.seededAt })))
    await client.close()
    return
  }

  const unpublish = args[0] === "--unpublish"
  const [slug, locale] = unpublish ? args.slice(1) : args

  if (!slug || !locale) {
    console.error(
      "Usage:\n" +
        "  node scripts/publish-i18n-translation.mjs <slug> <locale>\n" +
        "  node scripts/publish-i18n-translation.mjs --unpublish <slug> <locale>\n" +
        "  node scripts/publish-i18n-translation.mjs --list\n" +
        "  node scripts/publish-i18n-translation.mjs --list-unreviewed",
    )
    await client.close()
    process.exit(1)
  }

  const existing = await col.findOne({ slug, locale })
  if (!existing) {
    console.error(`No row found for slug="${slug}" locale="${locale}" — seed it first.`)
    await client.close()
    process.exit(1)
  }

  const reviewed = !unpublish
  await col.updateOne({ slug, locale }, { $set: { reviewed } })
  console.log(`${reviewed ? "Published" : "Unpublished"}: slug="${slug}" locale="${locale}" -> reviewed=${reviewed}`)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
