"use strict";
/**
 * gem-rebuild-dealers.js
 *
 * Rebuilds computed fields in gem_dealers from the current (corrected) gem_awarded_bids.
 * Preserves manually entered fields: is_100x_dealer, phone, email, website,
 * gst_number, city, state_hq, notes.
 *
 * Run after gem-validate-l1.js --repair to recompute dealer stats.
 *
 * Usage:
 *   node scripts/gem-rebuild-dealers.js
 */

const { MongoClient } = require("mongodb")
const fs   = require("fs")
const path = require("path")

let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  const envPath = path.join(__dirname, "..", ".env.local")
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...v] = line.split("=")
    if (k?.trim() === "MONGODB_URI") { MONGODB_URI = v.join("=").trim(); break }
  }
}

function canonicalize(name) {
  if (!name) return null
  return name
    .toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function main() {
  if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  console.log("Connected to MongoDB")

  const db       = client.db()
  const bidCol   = db.collection("gem_awarded_bids")
  const dealerCol = db.collection("gem_dealers")

  const allBids = await bidCol.find({}).toArray()
  console.log(`Loaded ${allBids.length} bids`)

  // Build fresh dealer stats from corrected bids
  const dealerMap = new Map()  // canonical_name → { l1_wins, l2_count, l3_count, bids, depts, states, aliases }

  for (const bid of allBids) {
    const roles = [
      ["l1", bid.l1_name],
      ["l2", bid.l2_name],
      ["l3", bid.l3_name],
    ]
    for (const [role, rawName] of roles) {
      if (!rawName || !rawName.trim()) continue
      const canonical = canonicalize(rawName)
      if (!canonical) continue

      if (!dealerMap.has(canonical)) {
        dealerMap.set(canonical, {
          canonical_name: canonical,
          l1_wins: 0, l2_count: 0, l3_count: 0,
          bids: new Set(),
          departments: new Set(),
          states: new Set(),
          aliases: new Set(),
        })
      }
      const d = dealerMap.get(canonical)
      if (role === "l1") d.l1_wins++
      if (role === "l2") d.l2_count++
      if (role === "l3") d.l3_count++
      d.bids.add(bid.bid_number)
      if (bid.dept)  d.departments.add(bid.dept)
      if (bid.state) d.states.add(bid.state)
      d.aliases.add(rawName.trim())
    }
  }

  console.log(`Computed stats for ${dealerMap.size} unique canonical dealers`)

  // Fields to preserve from existing records
  const PRESERVE_FIELDS = [
    "is_100x_dealer", "phone", "email", "website", "gst_number",
    "city", "state_hq", "notes", "enrichment_status",
    "defence_l1", "defence_l2", "defence_l3",
    "municipal_l1", "municipal_l2", "municipal_l3",
    "health_l1", "opportunity_score", "scores_updated_at",
  ]

  // Fetch all existing dealers for preserving manual data
  const existing = await dealerCol.find({}).toArray()
  const existingMap = new Map(existing.map(d => [d.canonical_name, d]))
  console.log(`Found ${existing.length} existing dealer records`)

  // Build bulk ops
  const ops = []
  const now = new Date()

  for (const [canonical, stats] of dealerMap) {
    const ex = existingMap.get(canonical)
    const preserved = {}
    if (ex) {
      for (const f of PRESERVE_FIELDS) {
        if (ex[f] !== undefined) preserved[f] = ex[f]
      }
    } else {
      preserved.is_100x_dealer = false
    }

    ops.push({
      updateOne: {
        filter: { canonical_name: canonical },
        update: {
          $set: {
            canonical_name:  canonical,
            l1_wins:         stats.l1_wins,
            l2_count:        stats.l2_count,
            l3_count:        stats.l3_count,
            bids:            [...stats.bids],
            departments:     [...stats.departments],
            states:          [...stats.states],
            aliases:         [...stats.aliases],
            updated_at:      now,
            ...preserved,
          },
          $setOnInsert: {
            source: "gem_dealer_pipeline",
            created_at: now,
          },
        },
        upsert: true,
      },
    })
  }

  // Zero out dealers who no longer appear in any corrected bid
  // (ghost records from the wrong L1 data)
  const ghostNames = existing
    .map(d => d.canonical_name)
    .filter(n => !dealerMap.has(n))
  if (ghostNames.length > 0) {
    const zeroResult = await dealerCol.updateMany(
      { canonical_name: { $in: ghostNames } },
      { $set: { l1_wins: 0, l2_count: 0, l3_count: 0, bids: [], departments: [], states: [], aliases: [], updated_at: now } }
    )
    console.log(`Zeroed ${zeroResult.modifiedCount} ghost dealers (no longer in any bid)`)
  }

  console.log(`Writing ${ops.length} dealer updates…`)
  const result = await dealerCol.bulkWrite(ops, { ordered: false })
  console.log(`Done. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`)

  // Summary: top 10 by l1_wins
  const top10 = await dealerCol.find({ l1_wins: { $gt: 0 } }).sort({ l1_wins: -1 }).limit(10).toArray()
  console.log("\nTop 10 dealers by L1 wins (corrected):")
  for (const d of top10) {
    console.log(
      `  ${d.canonical_name.slice(0, 45).padEnd(45)}` +
      `  l1=${d.l1_wins}  depts=${(d.departments||[]).length}  states=${(d.states||[]).length}`
    )
  }

  const totalL1 = await dealerCol.countDocuments({ l1_wins: { $gt: 0 } })
  const total   = await dealerCol.countDocuments()
  console.log(`\nTotal dealers: ${total} (${totalL1} with ≥1 L1 win)`)

  await client.close()
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1) })
