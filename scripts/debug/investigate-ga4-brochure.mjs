#!/usr/bin/env node
// Investigate whether GA4 data synced into Mongo can cross-reference
// brochure_download / generate_lead event volume against the 16 saved
// brochure_leads documents. Read-only.
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const db = client.db()

async function sample(name, filter = {}, limit = 3) {
  const count = await db.collection(name).countDocuments(filter)
  const docs = await db.collection(name).find(filter).limit(limit).toArray()
  console.log(`\n=== ${name} === (matching filter: ${count})`)
  docs.forEach((d) => console.log(JSON.stringify(d, null, 2).slice(0, 1500)))
}

await sample("ga4_settings", {}, 5)
await sample("ga4_syncs", {}, 3)
await sample("ga4_overview_rows", {}, 3)
await sample("ga4_landing_rows", {}, 3)
await sample("ga4_source_rows", {}, 3)
await sample("analytics_events", {}, 3)
await sample("ads_conversion_rows", {}, 3)
await sample("revenue_attribution", {}, 3)

await client.close()
