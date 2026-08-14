#!/usr/bin/env node
// Seeds the one manually-requested redirect from Issue 4: the bare
// /mini-fogger-100xbf102-2d9887 URL (missing the /products/ prefix) →
// /products/mini-fogger-100xbf102-2d9887. This exact case is ALSO covered
// automatically by middleware.ts's /products/ prefix fallback (the product
// is published with that slug), so this manual row is redundant-but-explicit
// insurance, not load-bearing — it keeps working even if the product is ever
// unpublished/renamed and someone wants the old URL to keep resolving.
//
// Idempotent: safe to re-run, skips insert if the rule already exists.
// Usage: node scripts/seed-mini-fogger-redirect.mjs

import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI is not set in the environment.")
  process.exit(1)
}

const SOURCE = "/mini-fogger-100xbf102-2d9887"
const DESTINATION = "/products/mini-fogger-100xbf102-2d9887"

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  try {
    const db = client.db()

    const product = await db.collection("products").findOne({ slug: "mini-fogger-100xbf102-2d9887" })
    if (!product) {
      console.error(`Refusing to seed: no product found with slug "mini-fogger-100xbf102-2d9887". Confirm the destination is still correct before re-running.`)
      process.exit(1)
    }

    const existing = await db.collection("url_redirects").findOne({ sourcePath: SOURCE })
    if (existing) {
      console.log(`Already exists (id ${existing._id}): ${SOURCE} -> ${existing.destinationPath} (${existing.active ? "active" : "inactive"})`)
      return
    }

    const now = new Date()
    const result = await db.collection("url_redirects").insertOne({
      sourcePath: SOURCE,
      destinationPath: DESTINATION,
      redirectType: 301,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Inserted redirect ${result.insertedId}: ${SOURCE} -> ${DESTINATION} (301)`)
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
