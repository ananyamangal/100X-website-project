#!/usr/bin/env node
// Seeds manual redirects for two confirmed 404 gaps found in the SEO 404
// investigation (fix/seo-404-investigation, follow-up after merge 4306101):
// the auto-fallback middleware has nothing to redirect to for either path
// because no product exists at that exact bare slug — both have a real
// published product at a *different* slug, so these are genuine manual
// redirects, not something the structural fallback can infer.
//
//   /double-barrel-thermal-fogging-machine
//     -> /double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400
//        (root-level SEO landing page, confirmed live 200)
//
//   /isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20
//     -> /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde
//        (canonical product page carries a "-fcbbde" suffix the old URL lacks,
//        confirmed live 200)
//
// Idempotent: safe to re-run, skips any source that already has a redirect.
// Usage: node scripts/seed-404-redirects.mjs

import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI is not set in the environment.")
  process.exit(1)
}

const REDIRECTS = [
  {
    source: "/double-barrel-thermal-fogging-machine",
    destination: "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  },
  {
    source: "/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20",
    destination: "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde",
  },
]

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  try {
    const db = client.db()
    const collection = db.collection("url_redirects")

    for (const { source, destination } of REDIRECTS) {
      const existing = await collection.findOne({ sourcePath: source })
      if (existing) {
        console.log(`Already exists (id ${existing._id}): ${source} -> ${existing.destinationPath} (${existing.active ? "active" : "inactive"})`)
        continue
      }

      // Chain prevention, mirroring app/api/admin/redirects/route.ts: refuse
      // if the destination is itself the source of another active redirect,
      // or if the source is already used as someone else's destination.
      const chainViaDestination = await collection.findOne({ sourcePath: destination, active: true })
      if (chainViaDestination) {
        console.error(`Refusing to seed ${source}: destination "${destination}" is itself the source of another active redirect (-> ${chainViaDestination.destinationPath}).`)
        continue
      }
      const chainViaSource = await collection.findOne({ destinationPath: source, active: true })
      if (chainViaSource) {
        console.error(`Refusing to seed ${source}: it's already used as the destination of another active redirect (from ${chainViaSource.sourcePath}).`)
        continue
      }

      const now = new Date()
      const result = await collection.insertOne({
        sourcePath: source,
        destinationPath: destination,
        redirectType: 301,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      console.log(`Inserted redirect ${result.insertedId}: ${source} -> ${destination} (301)`)
    }
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
