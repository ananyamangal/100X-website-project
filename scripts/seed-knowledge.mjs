#!/usr/bin/env node
/**
 * Seed / re-import the `knowledge_articles` collection from the version-
 * controlled `lib/knowledge/seed-data.json`.
 *
 * Upserts by `slug` (idempotent): re-running overwrites the seeded fields but
 * preserves `_id`, `createdAt`, and sets `updatedAt`. It never deletes rows
 * that are not in the seed. Run it BEFORE the migration build so the SSG
 * `/knowledge/[slug]` route can prerender from the DB.
 *
 * Reads MONGODB_URI from .env.local. Run from the repo root:
 *   node scripts/seed-knowledge.mjs            # upsert all seed articles
 *   node scripts/seed-knowledge.mjs --dry-run  # print what would change
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const require = createRequire(join(root, "/"))
const { MongoClient } = require("mongodb")

const DRY = process.argv.includes("--dry-run")
const uri = readFileSync(join(root, ".env.local"), "utf8")
  .match(/^MONGODB_URI=(.+)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, "")
const articles = JSON.parse(readFileSync(join(root, "lib/knowledge/seed-data.json"), "utf8"))

const c = new MongoClient(uri, { serverSelectionTimeoutMS: 30000 })
await c.connect()
const col = c.db().collection("knowledge_articles")
const now = new Date()

let upserted = 0
for (const a of articles) {
  if (!a.slug) throw new Error("seed article missing slug")
  const existing = await col.findOne({ slug: a.slug }, { projection: { _id: 1 } })
  if (DRY) {
    console.log(`${existing ? "update" : "insert"}  ${a.slug}  (${a.faqs?.length ?? 0} faqs, ${a.blocks?.length ?? 0} blocks)`)
    continue
  }
  await col.updateOne(
    { slug: a.slug },
    { $set: { ...a, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  )
  upserted++
}
if (!DRY) {
  await col.createIndex({ slug: 1 }, { unique: true }).catch(() => {})
  console.log(`seeded ${upserted}/${articles.length} knowledge articles; collection now has ${await col.countDocuments({})} docs`)
} else {
  console.log(`dry run: ${articles.length} seed articles`)
}
await c.close()
