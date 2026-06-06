/**
 * gem-score-enrich.js
 *
 * Computes defence_l1, municipal_l1, health_l1, and opportunity_score for
 * every dealer in gem_dealers. Run this locally after any bulk harvest.
 *
 * Usage:
 *   node scripts/gem-score-enrich.js
 *
 * Requires: MONGODB_URI in .env.local (or set as env var)
 * Output: Updates gem_dealers in-place via bulkWrite. Idempotent.
 */

require("dotenv").config({ path: ".env.local" })
const { MongoClient } = require("mongodb")

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i
const HEALTH_RX    = /Hospital|Medical|Health|AIIMS|ESIC|CGHS|Dispensary|Nursing|Clinic|PHC|CHC/i

function canonicalize(name) {
  if (!name) return ""
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim()
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) { console.error("MONGODB_URI not set"); process.exit(1) }

  const client = new MongoClient(uri)
  await client.connect()
  console.log("Connected to MongoDB")

  const db        = client.db()
  const dealerCol = db.collection("gem_dealers")
  const bidCol    = db.collection("gem_awarded_bids")

  const [allDealers, allBids] = await Promise.all([
    dealerCol.find({}).toArray(),
    bidCol.find({}).toArray(),
  ])
  console.log(`Loaded ${allDealers.length} dealers, ${allBids.length} bids`)

  // O(1) bid lookup
  const bidMap = new Map()
  for (const bid of allBids) bidMap.set(bid.bid_number, bid)

  const ops = []
  let noWins = 0

  for (const dealer of allDealers) {
    const name     = dealer.canonical_name
    const bidNums  = dealer.bids ?? []

    let defence_l1 = 0, defence_l2 = 0, defence_l3 = 0
    let municipal_l1 = 0, municipal_l2 = 0, municipal_l3 = 0
    let health_l1 = 0

    for (const bidNo of bidNums) {
      const bid = bidMap.get(bidNo)
      if (!bid?.dept) continue

      const dept = bid.dept
      const c1   = canonicalize(bid.l1_name)
      const c2   = canonicalize(bid.l2_name)
      const c3   = canonicalize(bid.l3_name)
      const isL1 = c1 === name
      const isL2 = c2 === name
      const isL3 = c3 === name

      if (DEFENCE_RX.test(dept)) {
        if (isL1) defence_l1++
        else if (isL2) defence_l2++
        else if (isL3) defence_l3++
      }
      if (MUNICIPAL_RX.test(dept)) {
        if (isL1) municipal_l1++
        else if (isL2) municipal_l2++
        else if (isL3) municipal_l3++
      }
      if (HEALTH_RX.test(dept) && isL1) health_l1++
    }

    const l1_wins    = dealer.l1_wins    ?? 0
    const deptCount  = (dealer.departments ?? []).length
    const stateCount = (dealer.states ?? []).length

    // Opportunity score — composite of bid wins + segment exposure + geographic breadth
    const opportunity_score =
      (l1_wins      * 4) +
      (deptCount    * 2) +
      (stateCount   * 1) +
      (defence_l1   * 3) +
      (municipal_l1 * 2) +
      (health_l1    * 2)

    if (l1_wins === 0) noWins++

    ops.push({
      updateOne: {
        filter: { canonical_name: name },
        update: { $set: {
          defence_l1, defence_l2, defence_l3,
          municipal_l1, municipal_l2, municipal_l3,
          health_l1,
          opportunity_score,
          scores_updated_at: new Date(),
        }},
      },
    })
  }

  console.log(`Writing ${ops.length} updates (${noWins} dealers with 0 L1 wins)…`)
  const result = await dealerCol.bulkWrite(ops)
  console.log(`Done. Modified: ${result.modifiedCount} / ${allDealers.length}`)

  // Print top 10 by opportunity score as a sanity check
  const top10 = await dealerCol
    .find({ opportunity_score: { $exists: true } })
    .sort({ opportunity_score: -1 })
    .limit(10)
    .toArray()

  console.log("\nTop 10 by opportunity_score:")
  for (const d of top10) {
    console.log(
      `  ${d.canonical_name.slice(0, 40).padEnd(40)}` +
      `  opp=${d.opportunity_score}  l1=${d.l1_wins}  def_l1=${d.defence_l1}  mun_l1=${d.municipal_l1}`
    )
  }

  await client.close()
}

main().catch(e => { console.error(e); process.exit(1) })
