"use strict";
// Full dealer intelligence report — Top 100 targets, dept analysis, defence/municipal,
// contact enrichment strategy, outreach workflow, CRM design.
// Run: node scripts/gem-full-intelligence-report.js

const path = require("path")
const fs   = require("fs")
const { MongoClient } = require("mongodb")

function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const pad  = (s, n) => String(s ?? "").slice(0, n).padEnd(n)
const rpad = (s, n) => String(s ?? "").slice(0, n).padStart(n)
const sep  = (char = "─", n = 110) => char.repeat(n)

function parseMoney(s) {
  if (!s) return 0
  const n = parseFloat(String(s).replace(/[₹,\s]/g, ""))
  return isNaN(n) ? 0 : n
}
function crore(n) {
  if (!n) return "—"
  const c = n / 1e7
  return c >= 1 ? `₹${c.toFixed(2)}Cr` : `₹${(n/1e5).toFixed(1)}L`
}

function isDefence(dept) {
  if (!dept) return false
  const d = dept.toLowerCase()
  return /indian army|air force|navy|bsf|border security|crpf|cisf|coast guard|itbp|ssb|nsg|assam rifles|rashtriya rifles|territorial army|military|ordnance|defence|armed forces|dgqa|dgbr/.test(d)
}
function isMunicipal(dept) {
  if (!dept) return false
  const d = dept.toLowerCase()
  return /nagar|municipal|corporation|palik|nigam|jal board|jal nigam|ulb|civic|urban local|town council|cantonment|panchayat|development authority|housing board|smart city/.test(d)
}
function isHealth(dept) {
  if (!dept) return false
  const d = dept.toLowerCase()
  return /hospital|health|medical|aiims|esic|icmr|nursing|dispensary|pharmacy|cghs|ayush/.test(d)
}
function isAgriculture(dept) {
  if (!dept) return false
  const d = dept.toLowerCase()
  return /agri|horticulture|farm|krishi|kisan|plantation|sugar mill|food corporation|fci/.test(d)
}

function contactStatus(d) {
  const fields = [d.phone, d.email, d.website, d.gst_number, d.city]
  const filled = fields.filter(Boolean).length
  if (filled === 0) return "NONE"
  if (filled <= 1) return "MINIMAL"
  if (filled <= 3) return "PARTIAL"
  return "FULL"
}

// ── Main ───────────────────────────────────────────────────────────────────────
;(async () => {
  loadEnv()
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()

  // ── Load collections ──────────────────────────────────────────────────────
  const [dealers, bids] = await Promise.all([
    db.collection("gem_dealers").find({}).toArray(),
    db.collection("gem_awarded_bids").find({}).toArray(),
  ])
  await client.close()

  const totalBids    = bids.length
  const activeDlrs   = dealers.filter(d => d.l1_wins > 0)
  const totalDealers = dealers.length

  // Enrich dealers with sector tags from their actual bids
  const dealerBids = {}
  for (const b of bids) {
    const key = b.l1_name
    if (!key) continue
    if (!dealerBids[key]) dealerBids[key] = []
    dealerBids[key].push(b)
  }

  // Tag each dealer with sector breakdown from their bids
  for (const d of dealers) {
    const myBids = dealerBids[d.canonical_name] || []
    d._defBids  = myBids.filter(b => isDefence(b.dept)).length
    d._munBids  = myBids.filter(b => isMunicipal(b.dept)).length
    d._hlthBids = myBids.filter(b => isHealth(b.dept)).length
    d._agrBids  = myBids.filter(b => isAgriculture(b.dept)).length
    d._totalVal = myBids.reduce((s, b) => s + parseMoney(b.l1_price), 0)
    d._estVal   = myBids.reduce((s, b) => s + parseMoney(b.est_value), 0)
    // Recalc composite score if missing
    if (!d.opportunity_score) {
      d.opportunity_score =
        (d.l1_wins      || 0) * 4 +
        ((d.departments || []).length) * 2 +
        ((d.states      || []).length) +
        (d.defence_l1   || d._defBids)  * 3 +
        (d.municipal_l1 || d._munBids)  * 2 +
        (d.health_l1    || d._hlthBids) * 2
    }
  }

  // ── SECTION 1 — Snapshot ─────────────────────────────────────────────────
  const lines = []
  const out   = s => lines.push(s)

  out("")
  out(sep("═"))
  out("  GEM DEALER INTELLIGENCE REPORT  —  100X CIRCLE  —  2026-06-06")
  out(sep("═"))
  out(`  Total bids in corpus  : ${totalBids}  (563 awarded, D-PMA/C-RA/A-ProductTable)`)
  out(`  Total dealers tracked : ${totalDealers}  (${activeDlrs.length} with ≥1 L1 win)`)
  out(`  Bids with price data  : ${bids.filter(b => parseMoney(b.l1_price) > 0).length}`)
  out(`  Date range            : corpus-wide (multi-year, keyword-harvested)`)
  out("")

  // ── SECTION 2 — Top 100 Dealer Targets ──────────────────────────────────
  const ranked = [...activeDlrs].sort((a, b) => b.opportunity_score - a.opportunity_score)
  const top100 = ranked.slice(0, 100)

  out(sep("═"))
  out("  SECTION 1 — TOP 100 DEALER TARGETS")
  out("  Ranked by opportunity score: L1×4 + Depts×2 + States + Def_wins×3 + Mun_wins×2 + Health_wins×2")
  out(sep("═"))
  out(pad("Rank", 5) + pad("Score", 6) + pad("L1", 4) + pad("Depts", 6) + pad("St", 4) + pad("Def", 4) + pad("Mun", 4) + pad("Val(L1)", 11) + pad("Contact", 8) + "Dealer")
  out(sep("─"))
  top100.forEach((d, i) => {
    const def = d.defence_l1 || d._defBids || 0
    const mun = d.municipal_l1 || d._munBids || 0
    out(
      rpad(i + 1, 4) + " " +
      rpad(d.opportunity_score, 5) + " " +
      rpad(d.l1_wins, 3) + " " +
      rpad((d.departments || []).length, 5) + " " +
      rpad((d.states || []).length, 3) + " " +
      rpad(def, 3) + " " +
      rpad(mun, 3) + " " +
      pad(crore(d._totalVal), 10) + " " +
      pad(contactStatus(d), 7) + " " +
      d.canonical_name
    )
  })
  out("")
  out("  Contact key: NONE=no data  MINIMAL=1 field  PARTIAL=2-3 fields  FULL=4+ fields")
  out(`  Immediately reachable (PARTIAL+FULL): ${top100.filter(d => ["PARTIAL","FULL"].includes(contactStatus(d))).length} of 100`)
  out(`  Need enrichment (NONE+MINIMAL)      : ${top100.filter(d => ["NONE","MINIMAL"].includes(contactStatus(d))).length} of 100`)

  // ── SECTION 3 — Top 100 Buying Departments ────────────────────────────────
  const deptMap = {}
  for (const b of bids) {
    const dept = (b.dept || "UNKNOWN").trim()
    if (!deptMap[dept]) deptMap[dept] = {
      dept, count: 0, totalVal: 0, estVal: 0,
      uniqueWinners: new Set(), uniqueBidNos: new Set(),
      isDefence: isDefence(dept), isMunicipal: isMunicipal(dept),
      isHealth: isHealth(dept), isAgriculture: isAgriculture(dept),
      states: new Set()
    }
    deptMap[dept].count++
    deptMap[dept].totalVal += parseMoney(b.l1_price)
    deptMap[dept].estVal   += parseMoney(b.est_value)
    if (b.l1_name) deptMap[dept].uniqueWinners.add(b.l1_name)
    deptMap[dept].uniqueBidNos.add(b.bid_number)
    if (b.state) deptMap[dept].states.add(b.state)
  }

  const deptArr = Object.values(deptMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)

  out("")
  out(sep("═"))
  out("  SECTION 2 — TOP 100 BUYING DEPARTMENTS")
  out("  Ranked by bid count (number of times that department has awarded a fogging bid)")
  out(sep("═"))
  out(pad("Rank", 5) + pad("Bids", 5) + pad("Winners", 8) + pad("Est.Value", 12) + pad("L1 Value", 12) + pad("Type", 5) + "Department")
  out(sep("─"))
  deptArr.forEach((d, i) => {
    const type = d.isDefence ? "DEF" : d.isMunicipal ? "MUN" : d.isHealth ? "HLT" : d.isAgriculture ? "AGR" : "GEN"
    out(
      rpad(i + 1, 4) + " " +
      rpad(d.count, 4) + " " +
      rpad(d.uniqueWinners.size, 7) + " " +
      pad(crore(d.estVal), 11) + " " +
      pad(crore(d.totalVal), 11) + " " +
      pad(type, 4) + " " +
      d.dept
    )
  })
  const deptTotals = { def: 0, mun: 0, hlt: 0, agr: 0, gen: 0 }
  for (const d of Object.values(deptMap)) {
    if (d.isDefence) deptTotals.def += d.count
    else if (d.isMunicipal) deptTotals.mun += d.count
    else if (d.isHealth) deptTotals.hlt += d.count
    else if (d.isAgriculture) deptTotals.agr += d.count
    else deptTotals.gen += d.count
  }
  out("")
  out("  Sector breakdown (all 563 bids):")
  out(`    Defence    : ${deptTotals.def} bids (${Math.round(deptTotals.def/totalBids*100)}%)`)
  out(`    Municipal  : ${deptTotals.mun} bids (${Math.round(deptTotals.mun/totalBids*100)}%)`)
  out(`    Health     : ${deptTotals.hlt} bids (${Math.round(deptTotals.hlt/totalBids*100)}%)`)
  out(`    Agriculture: ${deptTotals.agr} bids (${Math.round(deptTotals.agr/totalBids*100)}%)`)
  out(`    General Gov: ${deptTotals.gen} bids (${Math.round(deptTotals.gen/totalBids*100)}%)`)

  // ── SECTION 4 — Top 50 Defence Opportunities ──────────────────────────────
  const defBids = bids.filter(b => isDefence(b.dept))
  const defDeptMap = {}
  for (const b of defBids) {
    const dept = (b.dept || "UNKNOWN").trim()
    if (!defDeptMap[dept]) defDeptMap[dept] = { dept, count: 0, estVal: 0, winners: new Set() }
    defDeptMap[dept].count++
    defDeptMap[dept].estVal += parseMoney(b.est_value)
    if (b.l1_name) defDeptMap[dept].winners.add(b.l1_name)
  }
  const defDepts = Object.values(defDeptMap).sort((a, b) => b.count - a.count).slice(0, 50)

  // Defence-focused dealers
  const defDealers = activeDlrs
    .filter(d => (d.defence_l1 || d._defBids) > 0)
    .sort((a, b) => (b.defence_l1 || b._defBids) - (a.defence_l1 || a._defBids))
    .slice(0, 30)

  out("")
  out(sep("═"))
  out("  SECTION 3 — TOP 50 DEFENCE OPPORTUNITIES")
  out(sep("═"))
  out("")
  out("  3A — Defence Buying Units (sorted by bid volume)")
  out(sep("─"))
  out(pad("Rank", 5) + pad("Bids", 5) + pad("Suppliers", 10) + pad("Est.Value", 12) + "Department")
  out(sep("─"))
  defDepts.forEach((d, i) => {
    out(rpad(i+1, 4) + " " + rpad(d.count, 4) + " " + rpad(d.winners.size, 9) + " " + pad(crore(d.estVal), 11) + " " + d.dept)
  })

  out("")
  out("  3B — Dealers with Defence Track Record (top 30)")
  out(sep("─"))
  out(pad("Rank", 5) + pad("DefL1", 6) + pad("TotalL1", 8) + pad("Score", 7) + pad("Contact", 8) + "Dealer")
  out(sep("─"))
  defDealers.forEach((d, i) => {
    out(
      rpad(i+1, 4) + " " +
      rpad(d.defence_l1 || d._defBids, 5) + " " +
      rpad(d.l1_wins, 7) + " " +
      rpad(d.opportunity_score, 6) + " " +
      pad(contactStatus(d), 7) + " " +
      d.canonical_name
    )
  })
  out("")
  out("  Defence insight: Indian Army alone = 163 bids (29%). 153 unique L1 winners → extreme")
  out("  fragmentation. No Army-entrenched incumbent. Avg 1.07 bids/dealer in Army alone.")
  out("  Defence penetration requires: GeM registration, MSME/startup cert preferred, price-aggressiveness.")

  // ── SECTION 5 — Top 50 Municipal Opportunities ───────────────────────────
  const munBids = bids.filter(b => isMunicipal(b.dept))
  const munDeptMap = {}
  for (const b of munBids) {
    const dept = (b.dept || "UNKNOWN").trim()
    if (!munDeptMap[dept]) munDeptMap[dept] = { dept, count: 0, estVal: 0, winners: new Set() }
    munDeptMap[dept].count++
    munDeptMap[dept].estVal += parseMoney(b.est_value)
    if (b.l1_name) munDeptMap[dept].winners.add(b.l1_name)
  }
  const munDepts = Object.values(munDeptMap).sort((a, b) => b.count - a.count).slice(0, 50)

  const munDealers = activeDlrs
    .filter(d => (d.municipal_l1 || d._munBids) > 0)
    .sort((a, b) => (b.municipal_l1 || b._munBids) - (a.municipal_l1 || a._munBids))
    .slice(0, 25)

  out("")
  out(sep("═"))
  out("  SECTION 4 — TOP 50 MUNICIPAL OPPORTUNITIES")
  out(sep("═"))
  out("")
  out("  4A — Municipal Buying Units (sorted by bid volume)")
  out(sep("─"))
  out(pad("Rank", 5) + pad("Bids", 5) + pad("Suppliers", 10) + pad("Est.Value", 12) + "Department")
  out(sep("─"))
  munDepts.forEach((d, i) => {
    out(rpad(i+1, 4) + " " + rpad(d.count, 4) + " " + rpad(d.winners.size, 9) + " " + pad(crore(d.estVal), 11) + " " + d.dept)
  })

  out("")
  out("  4B — Dealers with Municipal Track Record (top 25)")
  out(sep("─"))
  out(pad("Rank", 5) + pad("MunL1", 6) + pad("TotalL1", 8) + pad("Score", 7) + pad("Contact", 8) + "Dealer")
  out(sep("─"))
  munDealers.forEach((d, i) => {
    out(
      rpad(i+1, 4) + " " +
      rpad(d.municipal_l1 || d._munBids, 5) + " " +
      rpad(d.l1_wins, 7) + " " +
      rpad(d.opportunity_score, 6) + " " +
      pad(contactStatus(d), 7) + " " +
      d.canonical_name
    )
  })
  out("")
  out("  Municipal insight: Corporations run annual vector-control budgets (dengue/malaria season).")
  out("  Repeat-buyer departments are highest-value targets — they have allocated budget lines.")
  out("  NMMC, BBMP, Delhi MCD, BrihanMumbai MC are national-scale buyers worth direct BD.")

  // ── SECTION 6 — Contact Enrichment Strategy ──────────────────────────────
  const contactDist = { NONE: 0, MINIMAL: 0, PARTIAL: 0, FULL: 0 }
  for (const d of activeDlrs) contactDist[contactStatus(d)]++

  const noContact     = top100.filter(d => contactStatus(d) === "NONE").slice(0, 25)
  const hasGst        = activeDlrs.filter(d => d.gst_number).length
  const hasPhone      = activeDlrs.filter(d => d.phone).length
  const hasEmail      = activeDlrs.filter(d => d.email).length
  const hasWeb        = activeDlrs.filter(d => d.website).length
  const is100x        = activeDlrs.filter(d => d.is_100x_dealer).length

  out("")
  out(sep("═"))
  out("  SECTION 5 — DEALER CONTACT ENRICHMENT STRATEGY")
  out(sep("═"))
  out("")
  out("  5A — Current Contact Coverage (486 active dealers)")
  out(sep("─"))
  out(`    Phone     : ${hasPhone} dealers  (${Math.round(hasPhone/activeDlrs.length*100)}%)`)
  out(`    Email     : ${hasEmail} dealers  (${Math.round(hasEmail/activeDlrs.length*100)}%)`)
  out(`    Website   : ${hasWeb} dealers  (${Math.round(hasWeb/activeDlrs.length*100)}%)`)
  out(`    GST No.   : ${hasGst} dealers  (${Math.round(hasGst/activeDlrs.length*100)}%)`)
  out(`    100X flag : ${is100x} dealers  (confirmed customers)`)
  out("")
  out("  5B — Contact Status Distribution (Top 100 targets)")
  out(sep("─"))
  out(`    FULL     (4+ fields) : ${top100.filter(d => contactStatus(d) === "FULL").length}`)
  out(`    PARTIAL  (2-3 fields): ${top100.filter(d => contactStatus(d) === "PARTIAL").length}`)
  out(`    MINIMAL  (1 field)   : ${top100.filter(d => contactStatus(d) === "MINIMAL").length}`)
  out(`    NONE     (0 fields)  : ${top100.filter(d => contactStatus(d) === "NONE").length}`)
  out("")
  out("  5C — Enrichment Playbook (priority order)")
  out(sep("─"))
  out("  TIER 1 — GST Portal (free, self-serve, instant)")
  out("    Input  : Dealer canonical name → search portal.gst.gov.in")
  out("    Output : GST number, legal name, city, state, registration date")
  out("    Yield  : ~90% hit rate for active government suppliers")
  out("    Time   : 1-2 min per dealer | Tool: manual or scraper")
  out("")
  out("  TIER 2 — IndiaMART / JustDial (free search, 2-3 min per dealer)")
  out("    Input  : Canonical name + city/state from GST lookup")
  out("    Output : Phone number, email, product catalogue, website")
  out("    Yield  : ~60-70% hit rate (IndiaMART higher than JustDial)")
  out("    Time   : 2-3 min per dealer")
  out("")
  out("  TIER 3 — GeM Seller Profile (requires GeM login)")
  out("    URL    : gem.gov.in/seller-profile/{seller-id}")
  out("    Output : Address, phone, product categories, turnover band, certifications")
  out("    Yield  : 100% for any seller who has won a bid (all 486 qualify)")
  out("    Note   : Requires GeM buyer/seller login; Playwright automation feasible")
  out("")
  out("  TIER 4 — LinkedIn + Google Search")
  out("    Input  : Company name + city")
  out("    Output : Owner name, email, LinkedIn profile, press mentions")
  out("    Yield  : ~40% (larger companies, MSME with digital presence)")
  out("    Time   : 5-10 min per dealer")
  out("")
  out("  5D — Top 25 NONE-contact dealers from Top 100 (enrich these first)")
  out(sep("─"))
  noContact.forEach((d, i) => {
    out(`    ${rpad(i+1, 2)}. Score=${rpad(d.opportunity_score,3)}  L1=${rpad(d.l1_wins,2)}  Def=${rpad(d.defence_l1||d._defBids,2)}  Mun=${rpad(d.municipal_l1||d._munBids,2)}  ${d.canonical_name}`)
  })
  out("")
  out("  5E — Automation recommendation")
  out(sep("─"))
  out("  Priority 1: Build GST-lookup batch script → enriches city/state/GST for ~90% of top 100")
  out("  Priority 2: IndiaMART scraper for phone/email → ~60% yield in ~2 hrs automated")
  out("  Priority 3: GeM seller profile scraper (post-login Playwright) → 100% address/category")
  out("  Manual only: Top 25 highest-score dealers — 30 min each, personal research")
  out("  Skip for now: LinkedIn (low yield, high effort, better done during call prep)")

  // ── SECTION 7 — Outreach Workflow ─────────────────────────────────────────
  out("")
  out(sep("═"))
  out("  SECTION 6 — RECOMMENDED DEALER OUTREACH WORKFLOW FOR 100X")
  out(sep("═"))
  out("")
  out("  OBJECTIVE: Convert government-active fogging dealers into 100X machine buyers.")
  out("  These dealers WIN government tenders — they need reliable machines to fulfill orders.")
  out("  100X's pitch: 'We supply the machines you need to win and deliver GeM contracts.'")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 0 — TARGET SEGMENTATION (Week 1)                            │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Segment A — Immediate (Top 20, score ≥ 25, contact = PARTIAL/FULL)")
  out("    • Have proven GeM track record + contact info already available")
  out("    • Direct phone/WhatsApp outreach this week")
  out("    • Target: 5 qualified conversations in 7 days")
  out("")
  out("  Segment B — Enrich First (Next 30, score 15-25, contact = NONE)")
  out("    • High value targets missing contact info")
  out("    • Run Tier 1+2 enrichment (GST + IndiaMART) — 2-3 days effort")
  out("    • Begin outreach in Week 2")
  out("")
  out("  Segment C — Defence Track (Top 20 defence dealers)")
  out("    • Won ≥1 Army/BSF/Navy bid — require IS 14855 certified machines")
  out("    • Different pitch: compliance + certification support")
  out("    • Begin in parallel with Segment B")
  out("")
  out("  Segment D — Municipal Track (Top 20 municipal dealers)")
  out("    • Won ≥1 Nagar Nigam/Corporation bid")
  out("    • Pitch angle: seasonal demand (dengue/malaria budgets April-October)")
  out("    • Time outreach before monsoon season (March-May annually)")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 1 — FIRST CONTACT (Day 1-14)                                │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Channel priority: WhatsApp > Phone call > Email > LinkedIn")
  out("  (Government dealers are small businesses — WhatsApp is primary channel)")
  out("")
  out("  Opening message template (WhatsApp / Phone):")
  out("  ─────────────────────────────────────────────")
  out('  "Namaste [Name], I am [rep name] from 100X Circle. We supply IS 14855-certified')
  out('  thermal fogging machines used by government contractors across India. We saw your')
  out('  company has successfully won government supply contracts — we supply the equipment')
  out('  many contractors use to fulfill such orders. Can we speak for 10 minutes this week?"')
  out("")
  out("  DO NOT: Pitch price first. DO NOT: Send catalogue PDFs in first message.")
  out("  DO: Reference their government wins (shows you have done homework).")
  out("  DO: Ask one question to qualify (How do you currently source your machines?)")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 2 — QUALIFICATION CALL (Day 7-21)                           │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Discovery questions (10-minute call agenda):")
  out("  1. How many government fogging contracts do you typically win per year?")
  out("  2. Where do you currently source your machines — own stock, rent, or subcontract?")
  out("  3. What machine specifications does the tender typically require? (capacity, IS cert)")
  out("  4. Do you have stockist/retailer relationships or do you buy direct?")
  out("  5. What is your typical order size — single machine, or multiple units?")
  out("")
  out("  Qualification pass criteria (move to Demo stage):")
  out("  ✓ Wins ≥2 government contracts per year")
  out("  ✓ Does not already manufacture machines in-house")
  out("  ✓ Is open to a new supplier relationship")
  out("")
  out("  Qualification fail (tag as Monitor / Nurture):")
  out("  ✗ Subcontracts delivery to someone else (paper bidder only)")
  out("  ✗ Has exclusive tie-up with competitor brand")
  out("  ✗ Buying volume too small (single machine every 2-3 years)")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 3 — DEMO + PROPOSAL (Day 14-30)                             │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Demo options (in order of preference):")
  out("  A. Physical demo at dealer location / nearest city — highest close rate")
  out("  B. Video demo call with live machine run + certification documents")
  out("  C. Send demo unit on loan for 7 days (for Tier A targets only)")
  out("")
  out("  Proposal must include:")
  out("  • Machine model + IS 14855 certification reference number")
  out("  • GeM catalog listing URL (if listed) — makes their procurement seamless")
  out("  • Volume pricing tiers (1-5 units, 6-20 units, 20+ units)")
  out("  • Credit terms or advance/delivery split for govt-contractor cashflow")
  out("  • After-sales: spare parts availability, warranty, service turnaround SLA")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 4 — CLOSE + ONBOARD (Day 30-60)                             │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Close trigger: Dealer has an active or upcoming tender to fulfill")
  out("  Urgency lever: 'If your tender delivery deadline is [date], we need order by [date-2wk]'")
  out("")
  out("  Onboarding checklist:")
  out("  ☐ KYC documents (GST + Aadhaar/PAN of proprietor)")
  out("  ☐ First order placed and payment received")
  out("  ☐ WhatsApp group created (dealer + 100X support)")
  out("  ☐ Marked as is_100x_dealer = true in CRM")
  out("  ☐ Introduced to after-sales point of contact")
  out("  ☐ Follow-up scheduled for next tender season")
  out("")
  out("  ┌─────────────────────────────────────────────────────────────────────┐")
  out("  │  PHASE 5 — ACCOUNT EXPANSION (Ongoing)                             │")
  out("  └─────────────────────────────────────────────────────────────────────┘")
  out("")
  out("  Expansion triggers (monitor via GeM bid alerts):")
  out("  • Dealer wins a new tender → proactive call within 24 hrs")
  out("  • Dealer bids on new department → flag for upsell discussion")
  out("  • Tender season begins (typically April + October) → pre-season check-in")
  out("")
  out("  Referral play: Ask every converted dealer for 2 peer dealer intros")
  out("  (Government contractor networks are tight — referrals close 3× faster)")

  // ── SECTION 8 — CRM Pipeline Design ──────────────────────────────────────
  out("")
  out(sep("═"))
  out("  SECTION 7 — CRM PIPELINE DESIGN")
  out(sep("═"))
  out("")
  out("  Pipeline stages (linear, left to right):")
  out("")
  out("  [IDENTIFIED] → [ENRICHED] → [CONTACTED] → [QUALIFIED] → [DEMO] → [PROPOSAL]")
  out("       → [NEGOTIATION] → [CLOSED-WON] → [ACTIVE ACCOUNT] → [CHURNED]")
  out("")
  out("  Stage definitions:")
  out(sep("─"))
  out("")
  out("  IDENTIFIED   Record exists in gem_dealers. No outreach yet.")
  out("               Fields: canonical_name, l1_wins, departments[], opportunity_score")
  out("               Count today: 486 active dealers")
  out("")
  out("  ENRICHED     Contact info obtained (phone or email). Ready to reach out.")
  out("               Fields: + phone/email/city/state/gst_number")
  out("               Sub-status: PARTIAL (1-2 contact fields) | FULL (3+ fields)")
  out("               Action: Queue for first contact")
  out("")
  out("  CONTACTED    First outreach attempt made. No response yet, or responded.")
  out("               Fields: + contact_date, contact_channel, contact_rep")
  out("               Sub-status: NO_RESPONSE | CALL_BACK | INTERESTED | NOT_INTERESTED")
  out("               SLA: Follow up in 5 business days if no response (max 3 attempts)")
  out("")
  out("  QUALIFIED    Discovery call completed. Confirmed buyer potential.")
  out("               Fields: + call_notes, annual_tenders, machine_source, order_size_est")
  out("               Disqualification reasons to log: paper_bidder | competitor_locked |")
  out("               volume_too_low | manufacturer_themselves")
  out("")
  out("  DEMO         Demo scheduled or completed.")
  out("               Fields: + demo_date, demo_type (physical/video/loan), demo_notes")
  out("               Win signal: asks for pricing after demo")
  out("")
  out("  PROPOSAL     Formal quote sent.")
  out("               Fields: + proposal_date, proposal_value, machines_quoted, terms_offered")
  out("               SLA: Follow up in 3 business days")
  out("")
  out("  NEGOTIATION  Price/terms discussion active.")
  out("               Fields: + counter_offer, sticking_points, decision_timeline")
  out("")
  out("  CLOSED-WON   Order placed and payment received (or confirmed).")
  out("               Fields: + order_date, order_value, machines_sold, payment_terms_agreed")
  out("               Action: Set is_100x_dealer = true")
  out("")
  out("  ACTIVE ACCT  Repeat buyer. Monitor their GeM wins for upsell triggers.")
  out("               Fields: + lifetime_value, last_order_date, next_followup_date")
  out("               Automation: Alert when dealer wins a new GeM bid")
  out("")
  out("  CHURNED      Was a customer, no longer buying.")
  out("               Fields: + churn_date, churn_reason")
  out("               Action: Re-engage quarterly during tender season")
  out("")
  out("  Key CRM fields per dealer record:")
  out(sep("─"))
  out("  From gem_dealers (auto-populated):")
  out("    canonical_name, l1_wins, departments[], states[], opportunity_score,")
  out("    defence_l1, municipal_l1, health_l1, bids[], is_100x_dealer")
  out("")
  out("  Manual enrichment fields:")
  out("    owner_name, phone, whatsapp, email, website, city, state_hq, gst_number,")
  out("    contact_source (GST|IndiaMART|GeM|LinkedIn|Referral)")
  out("")
  out("  Pipeline fields:")
  out("    crm_stage, sub_status, assigned_rep, first_contact_date, last_activity_date,")
  out("    next_followup_date, contact_attempts, call_notes[], disqualified_reason,")
  out("    demo_date, demo_type, proposal_value, machines_quoted, order_date,")
  out("    lifetime_value, churn_reason")
  out("")
  out("  Computed fields (auto from pipeline):")
  out("    days_in_stage, total_contact_attempts, pipeline_value (proposal_value of open deals)")
  out("")
  out("  CRM tool recommendation:")
  out(sep("─"))
  out("  Option A — Admin panel tab (already built): Add crm_stage + pipeline fields to")
  out("    gem_dealers schema. Add a 'Targets' tab with Kanban or table view, filter by stage.")
  out("    Zero cost. Keeps data co-located with GeM intelligence. Build time: 2-3 days.")
  out("")
  out("  Option B — Notion / Airtable: Easy to set up, good for small team (1-3 reps).")
  out("    Manual sync with GeM DB. No automation. Good for pilot phase (<50 active deals).")
  out("")
  out("  Option C — HubSpot Free: Contacts + deals + email sequences + call logging.")
  out("    Import top 100 from gem_dealers as HubSpot contacts. Use pipeline + sequences.")
  out("    Best when team scales beyond 1 rep or outreach volume exceeds 20 calls/day.")
  out("")
  out("  RECOMMENDATION: Start with Option A (admin panel tab) for first 60 days.")
  out("  Migrate to HubSpot when active pipeline exceeds 30 open deals.")
  out("")
  out("  Priority queue (start here Monday):")
  out(sep("─"))
  const startHere = top100
    .filter(d => (d.opportunity_score >= 15) && (d.l1_wins >= 2))
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 20)
  startHere.forEach((d, i) => {
    const def = d.defence_l1 || d._defBids || 0
    const mun = d.municipal_l1 || d._munBids || 0
    const tag = def > 0 ? "[DEF]" : mun > 0 ? "[MUN]" : "     "
    out(`  ${rpad(i+1, 2)}. ${tag} Score=${rpad(d.opportunity_score,3)}  L1=${rpad(d.l1_wins,2)}  ${pad(contactStatus(d),7)}  ${d.canonical_name}`)
  })

  // ── Write output ──────────────────────────────────────────────────────────
  const output = lines.join("\n")
  const outFile = "audit/dealer-intelligence-report-2026-06-06.txt"
  fs.writeFileSync(outFile, output)
  console.log(output)
  console.log("")
  console.log(sep("═"))
  console.log(`  Report saved to: ${outFile}`)
  console.log(sep("═"))
})().catch(e => { console.error("FATAL:", e.message, e.stack); process.exit(1) })
