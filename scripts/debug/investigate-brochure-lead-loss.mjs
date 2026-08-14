#!/usr/bin/env node
// One-off investigation: how far back does the BrochureLeadModal
// fake-success honeypot bug go, and what does the saved-leads volume look
// like since. Read-only. Usage:
//   node --env-file=.env.local scripts/investigate-brochure-lead-loss.mjs

import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const db = client.db()

const total = await db.collection("brochure_leads").countDocuments({})
console.log("Total brochure_leads documents (all time):", total)

const first = await db.collection("brochure_leads").find({}).sort({ createdAt: 1 }).limit(1).toArray()
const last = await db.collection("brochure_leads").find({}).sort({ createdAt: -1 }).limit(1).toArray()
console.log("Earliest lead createdAt:", first[0]?.createdAt)
console.log("Latest lead createdAt:", last[0]?.createdAt)

const all = await db.collection("brochure_leads").find({}).project({ createdAt: 1, source: 1 }).toArray()
const byWeek = {}
for (const d of all) {
  const dt = new Date(d.createdAt)
  if (isNaN(dt.getTime())) continue
  const weekStart = new Date(dt)
  weekStart.setUTCDate(dt.getUTCDate() - dt.getUTCDay())
  const key = weekStart.toISOString().slice(0, 10)
  byWeek[key] = (byWeek[key] || 0) + 1
}
console.log("\nWeekly saved-lead counts:")
Object.keys(byWeek).sort().forEach((k) => console.log(`  ${k}: ${byWeek[k]}`))

const bySource = {}
for (const d of all) bySource[d.source || "(none)"] = (bySource[d.source || "(none)"] || 0) + 1
console.log("\nBy source:")
Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

const collections = await db.listCollections().toArray()
console.log("\nAll collections in this DB:")
collections.map((c) => c.name).sort().forEach((n) => console.log(`  ${n}`))

await client.close()
