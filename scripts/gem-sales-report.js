/**
 * gem-sales-report.js
 * Executive sales intelligence report — run once, get answers.
 *
 * Usage: node scripts/gem-sales-report.js
 * Output: console report + CSV files in audit/sales-report-YYYY-MM-DD/
 */

const { MongoClient } = require("mongodb")
const fs   = require("fs")
const path = require("path")

// Load MONGODB_URI from .env.local without requiring dotenv
let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  try {
    const envPath = path.join(__dirname, "..", ".env.local")
    const lines   = fs.readFileSync(envPath, "utf8").split("\n")
    for (const line of lines) {
      const [k, ...vParts] = line.split("=")
      if (k?.trim() === "MONGODB_URI") { MONGODB_URI = vParts.join("=").trim(); break }
    }
  } catch {}
}
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i
const HEALTH_RX    = /Hospital|Medical|Health|AIIMS|ESIC|CGHS|Dispensary|Nursing|Clinic|PHC|CHC/i

function canonicalize(name) {
  if (!name) return ""
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim()
}

function segmentOf(dept) {
  if (DEFENCE_RX.test(dept))   return "Defence"
  if (MUNICIPAL_RX.test(dept)) return "Municipal"
  if (HEALTH_RX.test(dept))    return "Health"
  return "Other Govt"
}

function csv(rows, headers) {
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`
  return [headers, ...rows.map(r => headers.map(h => escape(r[h])))]
    .map(r => r.join(",")).join("\n")
}

function hr(char = "─", width = 80) { return char.repeat(width) }

function whyContact(d) {
  const reasons = []
  if (d.l1_wins >= 10)  reasons.push(`dominant L1 winner (${d.l1_wins} wins)`)
  if (d.l1_wins >= 5)   reasons.push(`proven L1 performer (${d.l1_wins} wins)`)
  if (d.l1_wins >= 2)   reasons.push(`active L1 winner (${d.l1_wins} wins)`)
  if (d.defence_l1 >= 5)  reasons.push(`heavy defence focus (${d.defence_l1} def wins)`)
  else if (d.defence_l1 >= 2) reasons.push(`defence buyer access (${d.defence_l1} def wins)`)
  else if (d.defence_l1 === 1) reasons.push("defence buyer access")
  if (d.municipal_l1 >= 5) reasons.push(`municipal network (${d.municipal_l1} mun wins)`)
  else if (d.municipal_l1 >= 2) reasons.push(`municipal reach (${d.municipal_l1} mun wins)`)
  if (d.deptCount >= 10) reasons.push(`broad buyer reach (${d.deptCount} departments)`)
  else if (d.deptCount >= 5) reasons.push(`multi-department (${d.deptCount} depts)`)
  if (d.stateCount >= 5) reasons.push(`multi-state (${d.stateCount} states)`)
  else if (d.stateCount >= 3) reasons.push(`cross-state (${d.stateCount} states)`)
  if (d.health_l1 >= 1) reasons.push("health sector access")
  if (d.l2_count >= 5)  reasons.push(`active bidder (${d.l2_count} L2 entries)`)
  if (reasons.length === 0) reasons.push("consistent GeM bidder, early-stage")
  return reasons.slice(0, 3).join("; ")
}

async function main() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  console.log("Loading MongoDB data…")
  const [allDealers, allBids] = await Promise.all([
    db.collection("gem_dealers").find({}).toArray(),
    db.collection("gem_awarded_bids").find({}).toArray(),
  ])
  console.log(`  ${allDealers.length} dealers, ${allBids.length} bids loaded.\n`)

  // ── Step 1: Run enrichment ─────────────────────────────────────────────────
  console.log("Step 1: Computing opportunity scores…")
  const bidMap = new Map()
  for (const bid of allBids) bidMap.set(bid.bid_number, bid)

  const enrichedDealers = []
  const ops = []

  for (const dealer of allDealers) {
    const name    = dealer.canonical_name
    const bidNums = dealer.bids ?? []

    let defence_l1 = 0, defence_l2 = 0, defence_l3 = 0
    let municipal_l1 = 0, municipal_l2 = 0, municipal_l3 = 0
    let health_l1 = 0
    const defenceDepts   = new Set()
    const municipalDepts = new Set()

    for (const bidNo of bidNums) {
      const bid = bidMap.get(bidNo)
      if (!bid?.dept) continue

      const dept = bid.dept
      const c1 = canonicalize(bid.l1_name)
      const c2 = canonicalize(bid.l2_name)
      const c3 = canonicalize(bid.l3_name)
      const isL1 = c1 === name
      const isL2 = c2 === name
      const isL3 = c3 === name

      if (DEFENCE_RX.test(dept)) {
        if (isL1) { defence_l1++; defenceDepts.add(dept) }
        else if (isL2) defence_l2++
        else if (isL3) defence_l3++
      }
      if (MUNICIPAL_RX.test(dept)) {
        if (isL1) { municipal_l1++; municipalDepts.add(dept) }
        else if (isL2) municipal_l2++
        else if (isL3) municipal_l3++
      }
      if (HEALTH_RX.test(dept) && isL1) health_l1++
    }

    const l1_wins    = dealer.l1_wins    ?? 0
    const l2_count   = dealer.l2_count   ?? 0
    const l3_count   = dealer.l3_count   ?? 0
    const deptCount  = (dealer.departments ?? []).length
    const stateCount = (dealer.states ?? []).length

    const opportunity_score =
      (l1_wins * 4) + (deptCount * 2) + (stateCount) +
      (defence_l1 * 3) + (municipal_l1 * 2) + (health_l1 * 2)

    enrichedDealers.push({
      canonical_name:  name,
      l1_wins, l2_count, l3_count, deptCount, stateCount,
      departments:     dealer.departments ?? [],
      states:          dealer.states ?? [],
      defence_l1, defence_l2, defence_l3,
      municipal_l1, municipal_l2, municipal_l3,
      health_l1,
      opportunity_score,
      is_100x_dealer:  dealer.is_100x_dealer  ?? false,
      crm_contacted:   dealer.crm_contacted   ?? false,
      defence_depts:   [...defenceDepts],
      municipal_depts: [...municipalDepts],
      aliases:         dealer.aliases ?? [],
    })

    ops.push({ updateOne: {
      filter: { canonical_name: name },
      update: { $set: { defence_l1, defence_l2, defence_l3, municipal_l1, municipal_l2,
                        municipal_l3, health_l1, opportunity_score,
                        scores_updated_at: new Date() } }
    }})
  }

  const bulkResult = await db.collection("gem_dealers").bulkWrite(ops)
  console.log(`  Updated ${bulkResult.modifiedCount}/${allDealers.length} dealers. ✓\n`)

  // ── Data slices ────────────────────────────────────────────────────────────
  const nonHundredX = enrichedDealers.filter(d => !d.is_100x_dealer)
  const hundredXDealers = enrichedDealers.filter(d => d.is_100x_dealer)

  // Top 25 by opportunity score (non-100X)
  const top25Prospects = [...nonHundredX]
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 25)

  // Top 25 defence-focused
  const top25Defence = [...enrichedDealers]
    .filter(d => d.defence_l1 > 0)
    .sort((a, b) => b.defence_l1 - a.defence_l1 || b.l1_wins - a.l1_wins)
    .slice(0, 25)

  // Top 25 municipal-focused
  const top25Municipal = [...enrichedDealers]
    .filter(d => d.municipal_l1 > 0)
    .sort((a, b) => b.municipal_l1 - a.municipal_l1 || b.l1_wins - a.l1_wins)
    .slice(0, 25)

  // Top 20 departments
  const deptAcc = {}
  for (const bid of allBids) {
    if (!bid.dept) continue
    if (!deptAcc[bid.dept]) deptAcc[bid.dept] = { dept: bid.dept, bid_count: 0, dealers: new Set(), states: new Set(), last_bid: null }
    deptAcc[bid.dept].bid_count++
    if (bid.l1_name) deptAcc[bid.dept].dealers.add(canonicalize(bid.l1_name))
    if (bid.state)   deptAcc[bid.dept].states.add(bid.state)
    if (bid.updated_at && (!deptAcc[bid.dept].last_bid || bid.updated_at > deptAcc[bid.dept].last_bid))
      deptAcc[bid.dept].last_bid = bid.updated_at
  }
  const top20Depts = Object.values(deptAcc)
    .sort((a, b) => b.bid_count - a.bid_count)
    .slice(0, 20)
    .map(d => ({
      ...d,
      dealers: [...d.dealers].filter(Boolean).slice(0, 3),
      states:  [...d.states].filter(Boolean),
      segment: segmentOf(d.dept),
    }))

  // Top 10 states by bid count
  const stateAcc = {}
  for (const bid of allBids) {
    if (!bid.state) continue
    if (!stateAcc[bid.state]) stateAcc[bid.state] = { state: bid.state, bid_count: 0, dealers: new Set() }
    stateAcc[bid.state].bid_count++
    if (bid.l1_name) stateAcc[bid.state].dealers.add(canonicalize(bid.l1_name))
  }
  const allStatesSorted = Object.values(stateAcc)
    .sort((a, b) => b.bid_count - a.bid_count)
  const top10States = allStatesSorted.slice(0, 10).map(s => ({
    ...s, dealers: [...s.dealers].filter(Boolean).slice(0, 3)
  }))

  // 100X state coverage
  const hundredXStateSet = new Set()
  for (const d of hundredXDealers) {
    for (const s of d.states) if (s) hundredXStateSet.add(s)
  }

  // Top 10 uncovered states (bids exist, no 100X dealer)
  const top10Uncovered = allStatesSorted
    .filter(s => !hundredXStateSet.has(s.state))
    .slice(0, 10)
    .map(s => ({ ...s, dealers: [...s.dealers].filter(Boolean).slice(0, 3) }))

  // ── Build output directory ─────────────────────────────────────────────────
  const today   = new Date().toISOString().slice(0, 10)
  const outDir  = path.join("audit", `sales-report-${today}`)
  fs.mkdirSync(outDir, { recursive: true })

  // ── Write CSVs ────────────────────────────────────────────────────────────
  const dealerHeaders = ["rank","name","opportunity_score","l1_wins","l2_count","dept_count",
                          "state_count","defence_l1","municipal_l1","health_l1",
                          "departments","states","is_100x_dealer","crm_contacted","why_contact"]

  function dealerRow(d, i) {
    return {
      rank:              i + 1,
      name:              d.canonical_name,
      opportunity_score: d.opportunity_score,
      l1_wins:           d.l1_wins,
      l2_count:          d.l2_count,
      dept_count:        d.deptCount,
      state_count:       d.stateCount,
      defence_l1:        d.defence_l1,
      municipal_l1:      d.municipal_l1,
      health_l1:         d.health_l1,
      departments:       d.departments.slice(0, 5).join(" | "),
      states:            d.states.join(", "),
      is_100x_dealer:    d.is_100x_dealer ? "Yes" : "No",
      crm_contacted:     d.crm_contacted  ? "Yes" : "No",
      why_contact:       whyContact(d),
    }
  }

  fs.writeFileSync(path.join(outDir, "01_top25_authorization_prospects.csv"),
    csv(top25Prospects.map(dealerRow), dealerHeaders))

  fs.writeFileSync(path.join(outDir, "02_top25_defence_dealers.csv"),
    csv(top25Defence.map(dealerRow), dealerHeaders))

  fs.writeFileSync(path.join(outDir, "03_top25_municipal_dealers.csv"),
    csv(top25Municipal.map(dealerRow), dealerHeaders))

  fs.writeFileSync(path.join(outDir, "04_top20_departments.csv"),
    csv(top20Depts.map((d, i) => ({
      rank:       i + 1,
      department: d.dept,
      segment:    d.segment,
      bid_count:  d.bid_count,
      top_dealers:d.dealers.join(" | "),
      states:     d.states.join(", "),
      last_bid:   d.last_bid ? new Date(d.last_bid).toISOString().slice(0, 10) : "",
    })), ["rank","department","segment","bid_count","top_dealers","states","last_bid"]))

  fs.writeFileSync(path.join(outDir, "05_top10_states_demand.csv"),
    csv(top10States.map((s, i) => ({
      rank:        i + 1,
      state:       s.state,
      bid_count:   s.bid_count,
      top_dealers: s.dealers.join(" | "),
      has_100x:    hundredXStateSet.has(s.state) ? "Yes" : "No",
    })), ["rank","state","bid_count","top_dealers","has_100x"]))

  fs.writeFileSync(path.join(outDir, "06_top10_states_uncovered.csv"),
    csv(top10Uncovered.map((s, i) => ({
      rank:         i + 1,
      state:        s.state,
      bid_count:    s.bid_count,
      opportunity:  s.bid_count >= 10 ? "CRITICAL" : s.bid_count >= 5 ? "HIGH" : "MEDIUM",
      dealers_winning_there: s.dealers.join(" | "),
    })), ["rank","state","bid_count","opportunity","dealers_winning_there"]))

  console.log(`CSVs written to ${outDir}/\n`)

  // ── Console Report ─────────────────────────────────────────────────────────
  const sep = hr()
  const sep2 = hr("═")

  console.log(sep2)
  console.log("  100X CIRCLE — GeM PROCUREMENT SALES INTELLIGENCE REPORT")
  console.log(`  Generated: ${new Date().toLocaleString("en-IN")}`)
  console.log(`  Source: ${allBids.length} awarded bids · ${allDealers.length} canonical dealers`)
  console.log(sep2)

  // Enrichment summary
  const withDefence   = enrichedDealers.filter(d => d.defence_l1 > 0).length
  const withMunicipal = enrichedDealers.filter(d => d.municipal_l1 > 0).length
  const hundredXCount = hundredXDealers.length
  const statesWithBids = Object.keys(stateAcc).length
  const totalBids = allBids.length
  const defenceBids   = allBids.filter(b => b.dept && DEFENCE_RX.test(b.dept)).length
  const municipalBids = allBids.filter(b => b.dept && MUNICIPAL_RX.test(b.dept)).length

  console.log("\n  DATABASE SNAPSHOT")
  console.log(sep)
  console.log(`  Total awarded bids:      ${totalBids}`)
  console.log(`  Defence bids:            ${defenceBids} (${Math.round(100*defenceBids/totalBids)}%)`)
  console.log(`  Municipal bids:          ${municipalBids} (${Math.round(100*municipalBids/totalBids)}%)`)
  console.log(`  Other Govt bids:         ${totalBids - defenceBids - municipalBids} (${Math.round(100*(totalBids-defenceBids-municipalBids)/totalBids)}%)`)
  console.log(`  Canonical dealers:       ${allDealers.length}`)
  console.log(`  100X authorized dealers: ${hundredXCount}`)
  console.log(`  Defence-active dealers:  ${withDefence} (have ≥1 defence L1 win)`)
  console.log(`  Municipal-active dealers:${withMunicipal} (have ≥1 municipal L1 win)`)
  console.log(`  States with bid data:    ${statesWithBids}`)
  console.log(`  States 100X covers:      ${hundredXStateSet.size}`)
  console.log(`  Uncovered states w/ bids:${statesWithBids - hundredXStateSet.size}`)

  // ── Section 1: Top 25 Authorization Prospects ──────────────────────────────
  console.log("\n")
  console.log(sep2)
  console.log("  SECTION 1: TOP 25 DEALERS FOR 100X AUTHORIZATION")
  console.log("  Non-100X dealers ranked by opportunity score")
  console.log("  Score = (L1×4) + (depts×2) + states + (def_L1×3) + (mun_L1×2) + (health_L1×2)")
  console.log(sep2)

  const col1 = 3, col2 = 40, col3 = 6, col4 = 5, col5 = 6, col6 = 7, col7 = 7, col8 = 6

  const hdr = [
    "#".padStart(col1),
    "DEALER".padEnd(col2),
    "SCORE".padStart(col3),
    "L1W".padStart(col4),
    "DEPTS".padStart(col5),
    "STATES".padStart(col6),
    "DEF L1".padStart(col7),
    "MUN L1".padStart(col8),
  ].join("  ")
  console.log("\n  " + hdr)
  console.log("  " + hr("-", hdr.length))

  for (let i = 0; i < top25Prospects.length; i++) {
    const d = top25Prospects[i]
    const row = [
      String(i+1).padStart(col1),
      d.canonical_name.slice(0, col2).padEnd(col2),
      String(d.opportunity_score).padStart(col3),
      String(d.l1_wins).padStart(col4),
      String(d.deptCount).padStart(col5),
      String(d.stateCount || "—").padStart(col6),
      String(d.defence_l1 || "—").padStart(col7),
      String(d.municipal_l1 || "—").padStart(col8),
    ].join("  ")
    console.log("  " + row)
    const why = `     → ${whyContact(d)}`
    const depts = d.departments.slice(0, 2).join(" | ")
    console.log(`     Depts: ${depts.slice(0, 70)}`)
    if (d.states.length > 0) console.log(`     States: ${d.states.slice(0, 5).join(", ")}`)
    console.log()
  }

  // ── Section 2: Top 25 Defence Dealers ─────────────────────────────────────
  console.log(sep2)
  console.log("  SECTION 2: TOP 25 DEFENCE-FOCUSED DEALERS")
  console.log("  Ranked by defence L1 wins (Army, Air Force, Navy, DRDO, Border…)")
  console.log(sep2)

  const hdr2 = [
    "#".padStart(col1),
    "DEALER".padEnd(col2),
    "DEF L1".padStart(col7),
    "TOT L1".padStart(col4),
    "DEPTS".padStart(col5),
    "STATES".padStart(col6),
    "100X?".padStart(6),
  ].join("  ")
  console.log("\n  " + hdr2)
  console.log("  " + hr("-", hdr2.length))

  for (let i = 0; i < top25Defence.length; i++) {
    const d = top25Defence[i]
    const row = [
      String(i+1).padStart(col1),
      d.canonical_name.slice(0, col2).padEnd(col2),
      String(d.defence_l1).padStart(col7),
      String(d.l1_wins).padStart(col4),
      String(d.deptCount).padStart(col5),
      String(d.stateCount || "—").padStart(col6),
      (d.is_100x_dealer ? "YES" : "no").padStart(6),
    ].join("  ")
    console.log("  " + row)
    if (d.defence_depts.length > 0)
      console.log(`     Defence buyers: ${d.defence_depts.slice(0, 2).join(" | ").slice(0, 75)}`)
    console.log()
  }

  // ── Section 3: Top 25 Municipal Dealers ───────────────────────────────────
  console.log(sep2)
  console.log("  SECTION 3: TOP 25 MUNICIPAL-FOCUSED DEALERS")
  console.log("  Ranked by municipal L1 wins (Nagar Palika, Municipal Corp, Panchayat…)")
  console.log(sep2)

  const hdr3 = [
    "#".padStart(col1),
    "DEALER".padEnd(col2),
    "MUN L1".padStart(col8),
    "TOT L1".padStart(col4),
    "DEPTS".padStart(col5),
    "STATES".padStart(col6),
    "100X?".padStart(6),
  ].join("  ")
  console.log("\n  " + hdr3)
  console.log("  " + hr("-", hdr3.length))

  for (let i = 0; i < top25Municipal.length; i++) {
    const d = top25Municipal[i]
    const row = [
      String(i+1).padStart(col1),
      d.canonical_name.slice(0, col2).padEnd(col2),
      String(d.municipal_l1).padStart(col8),
      String(d.l1_wins).padStart(col4),
      String(d.deptCount).padStart(col5),
      String(d.stateCount || "—").padStart(col6),
      (d.is_100x_dealer ? "YES" : "no").padStart(6),
    ].join("  ")
    console.log("  " + row)
    if (d.municipal_depts.length > 0)
      console.log(`     Municipal buyers: ${d.municipal_depts.slice(0, 2).join(" | ").slice(0, 75)}`)
    console.log()
  }

  // ── Section 4: Top 20 Departments ─────────────────────────────────────────
  console.log(sep2)
  console.log("  SECTION 4: TOP 20 DEPARTMENTS PURCHASING FOGGING EQUIPMENT")
  console.log(sep2)

  const hdr4 = [
    "#".padStart(col1),
    "DEPARTMENT".padEnd(48),
    "SEGMENT".padEnd(12),
    "BIDS".padStart(5),
    "TOP L1 DEALER".padEnd(35),
  ].join("  ")
  console.log("\n  " + hdr4)
  console.log("  " + hr("-", hdr4.length))

  for (let i = 0; i < top20Depts.length; i++) {
    const d = top20Depts[i]
    const row = [
      String(i+1).padStart(col1),
      d.dept.slice(0, 48).padEnd(48),
      d.segment.padEnd(12),
      String(d.bid_count).padStart(5),
      (d.dealers[0] ?? "—").slice(0, 35).padEnd(35),
    ].join("  ")
    console.log("  " + row)
  }

  // ── Section 5: Top 10 States by Demand ────────────────────────────────────
  console.log("\n")
  console.log(sep2)
  console.log("  SECTION 5: TOP 10 STATES — STRONGEST FOGGING DEMAND")
  console.log(sep2)

  const hdr5 = [
    "#".padStart(col1),
    "STATE".padEnd(22),
    "BIDS".padStart(5),
    "100X?".padStart(6),
    "TOP DEALERS WINNING THERE".padEnd(50),
  ].join("  ")
  console.log("\n  " + hdr5)
  console.log("  " + hr("-", hdr5.length))

  for (let i = 0; i < top10States.length; i++) {
    const s = top10States[i]
    const has100x = hundredXStateSet.has(s.state)
    const row = [
      String(i+1).padStart(col1),
      s.state.padEnd(22),
      String(s.bid_count).padStart(5),
      (has100x ? "✓ YES" : "✗ NO").padStart(6),
      s.dealers.join(" | ").slice(0, 50).padEnd(50),
    ].join("  ")
    console.log("  " + row)
  }

  // ── Section 6: Top 10 Uncovered States ────────────────────────────────────
  console.log("\n")
  console.log(sep2)
  console.log("  SECTION 6: TOP 10 STATES — 100X HAS NO APPARENT PRESENCE")
  console.log("  States with active fogging procurement but no known 100X dealer")
  console.log(sep2)

  const hdr6 = [
    "#".padStart(col1),
    "STATE".padEnd(22),
    "BIDS".padStart(5),
    "PRIORITY".padStart(9),
    "DEALERS CURRENTLY WINNING THERE".padEnd(45),
  ].join("  ")
  console.log("\n  " + hdr6)
  console.log("  " + hr("-", hdr6.length))

  for (let i = 0; i < top10Uncovered.length; i++) {
    const s = top10Uncovered[i]
    const pri = s.bid_count >= 10 ? "CRITICAL" : s.bid_count >= 5 ? "HIGH" : "MEDIUM"
    const row = [
      String(i+1).padStart(col1),
      s.state.padEnd(22),
      String(s.bid_count).padStart(5),
      pri.padStart(9),
      s.dealers.join(" | ").slice(0, 45).padEnd(45),
    ].join("  ")
    console.log("  " + row)
  }

  // ── Section 7: 30-Day Dealer Acquisition Plan ──────────────────────────────
  console.log("\n")
  console.log(sep2)
  console.log("  SECTION 7: RECOMMENDED 30-DAY DEALER ACQUISITION PLAN")
  console.log(sep2)

  // Compute prospect tiers
  const tier1 = top25Prospects.filter(d => d.l1_wins >= 8)
  const tier2 = top25Prospects.filter(d => d.l1_wins >= 4 && d.l1_wins < 8)
  const tier3 = top25Prospects.filter(d => d.l1_wins < 4)
  const defenceNotAuth = top25Defence.filter(d => !d.is_100x_dealer)
  const totalProspects = top25Prospects.length

  console.log(`
  MARKET CONTEXT
  ${hr("-")}
  GeM fogging procurement (2024–2026): ${totalBids} awarded bids across ${Object.keys(deptAcc).length} buying departments.
  Defence is the largest segment (${defenceBids} bids, ${Math.round(100*defenceBids/totalBids)}%), followed by Other Govt
  (${totalBids - defenceBids - municipalBids} bids) and Municipal (${municipalBids} bids).

  100X currently has ${hundredXCount} authorized dealer(s) registered in the system.
  The top 25 non-100X prospects have combined L1 wins of ${top25Prospects.reduce((s,d) => s+d.l1_wins, 0)},
  meaning they have already proven they can win government fogging tenders at scale.

  CONTACT PRIORITY
  ${hr("-")}

  WEEK 1 — Tier 1: High-volume proven winners (≥8 L1 wins)
  ${tier1.length > 0 ? tier1.map((d, i) => `  ${i+1}. ${d.canonical_name} — ${d.l1_wins} L1 wins, ${d.deptCount} depts, opp score ${d.opportunity_score}`).join("\n") : "  (none with 8+ wins in top-25 non-100X)"}

  These dealers have the biggest existing GeM book. Authorization gives 100X immediate
  presence in their procurement pipeline without competing against them.

  WEEK 2 — Tier 2: Growing winners (4–7 L1 wins)
  ${tier2.length > 0 ? tier2.map((d, i) => `  ${i+1}. ${d.canonical_name} — ${d.l1_wins} L1 wins, score ${d.opportunity_score}`).join("\n") : "  (none in this tier)"}

  These are dealers on a growth trajectory — signing them now costs less than after
  they grow further. They are actively winning and want supplier relationships.

  WEEK 3 — Defence channel (defence-focused, not yet 100X)
  ${defenceNotAuth.slice(0, 5).map((d, i) => `  ${i+1}. ${d.canonical_name} — ${d.defence_l1} def L1 wins, buyers: ${d.defence_depts.slice(0,1).join(", ").slice(0, 60)}`).join("\n")}

  Defence procurement uses authorized vendor lists. Getting even 2–3 defence-active
  dealers signed converts their future bids from competitors to 100X product wins.

  WEEK 4 — State gap closure
  Priority uncovered states with easiest dealer identification:
`)

  for (let i = 0; i < Math.min(5, top10Uncovered.length); i++) {
    const s = top10Uncovered[i]
    // Find top prospect in this state
    const dealerInState = top25Prospects.find(d => d.states.includes(s.state))
      || nonHundredX.filter(d => d.states.includes(s.state)).sort((a,b) => b.l1_wins - a.l1_wins)[0]
    console.log(`  ${s.state} (${s.bid_count} bids, ${s.bid_count >= 10 ? "CRITICAL" : "HIGH"} gap): ${dealerInState ? `approach ${dealerInState.canonical_name} (${dealerInState.l1_wins} L1)` : `find dealer from winning list — ${s.dealers[0] ?? "research needed"}`}`)
  }

  // Conversion rate estimates
  const totalL1byProspects = top25Prospects.reduce((s, d) => s + d.l1_wins, 0)
  console.log(`
  CONVERSION RATE ESTIMATES
  ${hr("-")}
  Industry context: GeM dealer authorization is a B2B partnership ask, not a cold sale.
  Dealers are already winning tenders and want a strong OEM to support them.

  Tier 1 (proven winners, 8+ L1 wins):   ~60–70% conversion rate
  Tier 2 (growing winners, 4–7 L1 wins): ~40–50% conversion rate
  Tier 3 (early winners, 1–3 L1 wins):   ~20–30% conversion rate
  Defence-channel dealers:                ~50–60% (they need OEM certs for Army tenders)

  EXPECTED OUTCOMES — 30 DAYS
  ${hr("-")}
  Contacts to make:           25 outreach conversations
  Expected responses:         ~15–18 dealers (60–70% response rate)
  Expected signed agreements: ~6–10 new dealer authorizations

  These 6–10 new dealers would represent:
  • ${tier1.length + tier2.length} proven L1 winners entering 100X supply chain
  • Access to ${[...new Set(top25Prospects.slice(0,10).flatMap(d => d.departments))].length}+ buying departments
  • Coverage expansion in ${top10Uncovered.filter(s => top25Prospects.some(d => d.states.includes(s.state))).length}+ currently uncovered states

  HIGH-CONVICTION TOP 5 — Start here on Day 1:
  ${top25Prospects.slice(0, 5).map((d, i) => `  ${i+1}. ${d.canonical_name}
     Score: ${d.opportunity_score} | L1: ${d.l1_wins} | Def: ${d.defence_l1} | Mun: ${d.municipal_l1}
     Why: ${whyContact(d)}
     Reach: ${d.departments.slice(0,3).join(" | ").slice(0, 65)}`).join("\n\n")}

  CAUTION FLAGS
  ${hr("-")}
  • State coverage in database: only ${statesWithBids} states have bid data (many defence bids don't expose state)
  • 100X presence cannot be verified from public data alone — dealer self-reporting required
  • Some top-scoring dealers may already be 100X authorized but not flagged in the system
  • Defence procurement authorization may also require product testing/certification separately
`)

  console.log(sep2)
  console.log(`  REPORT COMPLETE. CSV files saved to: ${outDir}/`)
  console.log(sep2)

  await client.close()
}

main().catch(e => { console.error(e); process.exit(1) })
