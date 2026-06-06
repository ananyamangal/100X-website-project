import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i
const HEALTH_RX    = /Hospital|Medical|Health|AIIMS|ESIC|CGHS|Dispensary|Nursing|Clinic|PHC|CHC/i

function canonicalize(name: string | null | undefined): string {
  if (!name) return ""
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim()
}

// POST /api/admin/procurement/enrich-scores
// Computes defence_l1, municipal_l1, health_l1, opportunity_score for all dealers.
// Safe to re-run — idempotent. Runs in ~2–5s for 1222 dealers × 563 bids.
export async function POST() {
  try {
    const db = (await clientPromise).db()
    const bidCol    = db.collection("gem_awarded_bids")
    const dealerCol = db.collection("gem_dealers")

    const [allDealers, allBids] = await Promise.all([
      dealerCol.find({}).toArray(),
      bidCol.find({}).toArray(),
    ])

    // Build O(1) bid lookup by bid_number
    const bidMap = new Map<string, typeof allBids[0]>()
    for (const bid of allBids) bidMap.set(bid.bid_number as string, bid)

    const ops: object[] = []

    for (const dealer of allDealers) {
      const name      = dealer.canonical_name as string
      const bidNums   = (dealer.bids as string[]) ?? []

      let defence_l1 = 0, defence_l2 = 0, defence_l3 = 0
      let municipal_l1 = 0, municipal_l2 = 0, municipal_l3 = 0
      let health_l1 = 0

      for (const bidNo of bidNums) {
        const bid = bidMap.get(bidNo)
        if (!bid?.dept) continue

        const dept = bid.dept as string
        const c1   = canonicalize(bid.l1_name as string)
        const c2   = canonicalize(bid.l2_name as string)
        const c3   = canonicalize(bid.l3_name as string)
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

      const l1_wins    = (dealer.l1_wins as number)  ?? 0
      const deptCount  = ((dealer.departments as string[]) ?? []).length
      const stateCount = ((dealer.states as string[]) ?? []).length

      // opportunity_score: L1 wins × 4 + dept breadth × 2 + state breadth
      //   + defence bonus × 3 + municipal bonus × 2 + health bonus × 2
      const opportunity_score =
        (l1_wins     * 4) +
        (deptCount   * 2) +
        (stateCount  * 1) +
        (defence_l1  * 3) +
        (municipal_l1 * 2) +
        (health_l1   * 2)

      ops.push({
        updateOne: {
          filter: { canonical_name: name },
          update: {
            $set: {
              defence_l1, defence_l2, defence_l3,
              municipal_l1, municipal_l2, municipal_l3,
              health_l1,
              opportunity_score,
              scores_updated_at: new Date(),
            }
          }
        }
      })
    }

    const result = await dealerCol.bulkWrite(ops as Parameters<typeof dealerCol.bulkWrite>[0])

    return NextResponse.json({
      ok: true,
      dealers_processed: allDealers.length,
      bids_scanned: allBids.length,
      modified: result.modifiedCount,
    })
  } catch (err) {
    console.error("enrich-scores POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
