/**
 * Funnel Distribution Report — Bucket classification + FUNNEL_B_DIRECT_BUYER mapping.
 *
 * BUCKET A — Deploy Now (Funnel B: Direct Buyer)
 *   Specific machine-intent queries. Exact/Phrase match candidates.
 *
 * BUCKET B — Observe Only
 *   High-volume generic product terms. Tracked, not deployed.
 *
 * BUCKET C — Reject
 *   Consumer / non-commercial / ambiguous terms. Negated.
 *
 * FUNNEL_A_DEALER   — dealer_acquisition, oem_authorization, gem_reseller (unchanged)
 * FUNNEL_B_DIRECT_BUYER — machine_purchase intent, product-specific landing pages
 *
 * Usage: node --env-file=.env.local scripts/funnel-distribution-report.mjs
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

// ── BUCKET DEFINITIONS ────────────────────────────────────────────────────────

// BUCKET A: Explicit query list + extension patterns
// These are the exact queries specified by user + any long-tail variants
const BUCKET_A_EXPLICIT = new Set([
  "thermal fogging machine",
  "mosquito fogging machine",
  "double barrel fogging machine",
  "portable fogging machine",
  "vehicle mounted fogging machine",
  "fogging machine manufacturer",
  "fogger machine manufacturers in india",
  "thermal fogging machine manufacturer",
])

// Bucket A extension: long-tail variants of the explicit set that are clearly commercial
const BUCKET_A_PATTERNS = [
  /^(portable|battery|electric|petrol|handheld|backpack|knapsack)\s+fogging\s+machine\b/i,
  /^(mosquito|vector\s*control|public\s*health|municipal|dengue|malaria)\s+fogging\s+machine\b/i,
  /\b(vehicle|truck|tractor|four\s*wheeler|suv|pickup)[\s-]mounted\s+fog/i,
  /\bthermal\s+fogging\s+machine\s+(manufacturer|supplier|company|brand)\b/i,
  /^fogging\s+machine\s+(manufacturer|supplier|company|brand|price\s*list)\b/i,
  /^fogger\s+(manufacturer|supplier|company)\s/i,
  /^(ulv|cold)\s+fogger?\s+(machine\s+)?(manufacturer|supplier|company)\b/i,
  /\bIS\s*14855\s+fogging\s+machine\b/i,
  /\bfogging\s+machine\s+market\b/i,
  /\bcommercial\s+mosquito\s+fogger\b/i,
  /\bgov(?:ernment)?\s+fogging\s+machine\b/i,
  /\bpublic\s+health\s+fogging\b/i,
  /\bvector\s+control\s+(machine|equipment|fogger)\b/i,
  /\bagricultural\s+fogger\b/i,
  /\bdouble\s+barrel\s+fog/i,
  /\bfogging\s+machine\s+for\s+(mosquito|pest\s*control|dengue|malaria|municipal)\b/i,
  /\bthermal\s+fog(?:ger|ging)\s+manufacturer\b/i,
]

// BUCKET B: Observe-only — exact bare-word generics
const BUCKET_B_EXPLICIT = new Set([
  "fogger machine",
  "fogging machine",
  "fogger",
])

// BUCKET B patterns: medium-generic product terms — high volume, ambiguous intent
const BUCKET_B_PATTERNS = [
  /^(thermal|cold|ulv|mist)\s+fog(?:ger|ging)$/i,    // "thermal fogger", "cold fogging" — bare form
  /^fogging\s+system$/i,
  /^fog(?:ger|ging)\s+kit$/i,
  /^fog(?:ger|ging)\s+machine$/i,
  /^thermal\s+fog(?:ger|ging)\s+machine$/i,            // handled in A via explicit — safety net
]

// BUCKET C: Reject — consumer / location / anti-fog / coating
const BUCKET_C_PATTERNS = [
  /\bnear\s*me\b/i,
  /\bnear(?:by)?\b/i,
  /\bfor\s+(home|room|indoor|domestic|household|personal|garden|bedroom|kitchen)\b/i,
  /\bhome\s+use\b/i,
  /\broom\s+fog(?:ger|ging)\b/i,
  /\banti[\s-]?fog(?:ging)?\b/i,
  /\bde[\s-]?fog(?:ging)?\b/i,
  /\banti[\s-]?mist\b/i,
  /\banti[\s-]?condensation\b/i,
  /\bfogging\s+agent\b/i,
  /\bfog(?:ging)?\s+(coating|film|spray|solution|chemical\s+only)\b/i,
  /\bwindshield\b|\bglass\s+coating\b/i,
  /\brent(?:al)?\b|\bhire\b|\bon\s+hire\b/i,
  /\bsecond[\s-]?hand\b|\bused\s+fog/i,
  /\brepair\b|\bservice\s+center\b|\bspare\s+part\b|\bmaintenance\b/i,
  /\bhow\s+to\s+use\b|\bmanual\b|\btutorial\b|\bvideo\b/i,
  /\breview\b|\bcompare\b|\bvs\b|\balternative\b/i,
  /\bpest\s*control\s+chemical\b|\binsecticide\b|\bpesticide\s+only\b/i,
  /\bfogger\s+for\s+(bed\s*bug|cockroach|ants|mosquito\s+spray\s+only)\b/i,
  /\bmini\s+fog/i,      // mini fogger = consumer product segment
  /\bsmall\s+fog/i,
  /\bfog(?:ger|ging)\s+outdoor$/i,   // bare "fogger outdoor" = consumer landscaping
  /\bfog(?:ger|ging)\s+spray$/i,     // fogger spray = consumer product
  /\bfog(?:ger|ging)\s+set$/i,       // fogger set = unqualified consumer
  /\bfogger\s+fogger\b/i,            // duplicate noise
  /\bfog(?:ger|ging)\s+system\s+for\s+room\b/i,
  /\bwater\s+fog(?:ger|ging)\s+machine\s+for\s+home\b/i,
  /\bwhat\s+is\b|\bmeaning\b|\bhow\s+does\b|\bwhat\s+does\b/i,
  /\bbuy\b|\bpurchase\b|\bamazon\b|\bflipcart\b|\bindiamart\b/i,
  /\bprice\b|\bcost\b|\brate\b|\bhow\s+much\b|\bmrp\b/i,
]

// ── FUNNEL ROUTING ────────────────────────────────────────────────────────────

// Existing Funnel A signals (unchanged from current production classifier)
const FUNNEL_A_INTENT_SIGNALS = {
  gem_reseller:       ["gem","gem portal","government e-marketplace","gem seller","gem reseller","gem vendor","gem registration","gem authorized","gem listed","gem portal seller"],
  oem_authorization:  ["oem","original equipment manufacturer","brand authorization","brand partner","manufacturer authorization","oem partnership","oem authorized","oem supplier","oem dealer"],
  dealer_acquisition: ["dealer","dealership","distributor","franchise","reseller","channel partner","become a dealer","stockist","dealership opportunity","sub-dealer","authorized dealer"],
}
const ANTI_FOG_INTENT_RE  = /\banti[\s-]?fog(?:ging)?\b|\bde[\s-]?fog(?:ging)?\b|\banti[\s-]?mist\b|\banti[\s-]?condensation\b|\bfogging\s+agent\b/i
const ANTI_FOG_MACHINE_RE = /\b(machine|fogger|foggers|thermal|ulv|mosquito|vector\s*control|municipal|gem|oem|distributor|dealer|manufacturer)\b/i
const isAntiFog = q => ANTI_FOG_INTENT_RE.test(q) && !ANTI_FOG_MACHINE_RE.test(q)

function classifyFunnelA(q) {
  for (const [intent, sigs] of Object.entries(FUNNEL_A_INTENT_SIGNALS)) {
    if (sigs.some(s => q.includes(s))) return intent
  }
  return null
}

// FUNNEL_B_DIRECT_BUYER landing page map
const FUNNEL_B_LANDING_PAGES = {
  "mosquito":           "/public-health-equipment",
  "vector control":     "/vector-control-equipment",
  "vehicle mounted":    "/vehicle-mounted-fogging-machine",
  "truck mounted":      "/vehicle-mounted-fogging-machine",
  "municipal":          "/municipal-fogging-programme",
  "public health":      "/public-health-equipment",
  "is 14855":           "/is-14855-fogging-machine",
  "agricultural":       "/products",
  "manufacturer":       "/make-in-india-fogging-machine",
  "supplier":           "/make-in-india-fogging-machine",
  "thermal fogging machine": "/products",
  "portable":           "/products",
  "default":            "/products",
}

function getBucketBLandingPage(q) {
  for (const [signal, page] of Object.entries(FUNNEL_B_LANDING_PAGES)) {
    if (q.includes(signal)) return page
  }
  return FUNNEL_B_LANDING_PAGES.default
}

function getSuggestedMatchType(q, bucket) {
  const wc = q.trim().split(/\s+/).length
  if (bucket === "A") {
    if (wc >= 5) return "EXACT"           // "vehicle mounted fogging machine" → EXACT
    if (wc >= 3 && /manufacturer|supplier|india/i.test(q)) return "PHRASE"  // manufacturer tails
    if (wc >= 3) return "EXACT"
    return "PHRASE"
  }
  if (bucket === "B") return "OBSERVE"    // not deployed
  return "NEGATIVE"
}

// Classify a query into A, B, C, FunnelA, or Other
function classify(q) {
  if (isAntiFog(q)) return { bucket: "C", reason: "anti-fog false positive" }

  // Bucket C check first — reject consumers before anything else
  for (const re of BUCKET_C_PATTERNS) {
    if (re.test(q)) return { bucket: "C", reason: `reject: ${re.source.slice(0,40)}` }
  }

  // Funnel A check — existing commercial intents
  const intentA = classifyFunnelA(q)
  if (intentA) return { bucket: "FUNNEL_A", intent: intentA }

  // Bucket A explicit
  if (BUCKET_A_EXPLICIT.has(q)) return { bucket: "A", matchType: getSuggestedMatchType(q,"A"), landing: getBucketBLandingPage(q) }

  // Bucket A patterns
  for (const re of BUCKET_A_PATTERNS) {
    if (re.test(q)) return { bucket: "A", matchType: getSuggestedMatchType(q,"A"), landing: getBucketBLandingPage(q) }
  }

  // Bucket B explicit
  if (BUCKET_B_EXPLICIT.has(q)) return { bucket: "B", reason: "high-volume generic — observe" }

  // Bucket B patterns
  for (const re of BUCKET_B_PATTERNS) {
    if (re.test(q)) return { bucket: "B", reason: "medium-generic — observe" }
  }

  // Remaining — neither commercial nor product match → Other (reject)
  return { bucket: "OTHER" }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db("100xDB")

  const allRows = await db.collection("gsc_query_rows")
    .find({}).sort({ impressions: -1 }).limit(5000).toArray()

  // Dedup queries (multiple date rows → aggregate)
  const seen = new Map()
  for (const row of allRows) {
    const q    = String(row.query ?? "").trim().toLowerCase()
    const impr = Number(row.impressions ?? 0)
    const clks = Number(row.clicks ?? 0)
    const pos  = Number(row.position ?? 0)
    if (!q || q.length < 3) continue
    if (seen.has(q)) {
      const ex = seen.get(q)
      seen.set(q, { q, impressions: ex.impressions + impr, clicks: ex.clicks + clks,
        position: ((ex.position * ex.rows) + pos) / (ex.rows + 1), rows: ex.rows + 1 })
    } else {
      seen.set(q, { q, impressions: impr, clicks: clks, position: pos, rows: 1 })
    }
  }
  const queries = Array.from(seen.values())

  // Classify each query
  const results = queries.map(row => ({ ...row, ...classify(row.q) }))

  // Group by bucket
  const bucketA    = results.filter(r => r.bucket === "A")
  const bucketB    = results.filter(r => r.bucket === "B")
  const bucketC    = results.filter(r => r.bucket === "C")
  const funnelA    = results.filter(r => r.bucket === "FUNNEL_A")
  const other      = results.filter(r => r.bucket === "OTHER")

  const totalImpr  = results.reduce((s,r) => s+r.impressions, 0)
  const totalClks  = results.reduce((s,r) => s+r.clicks, 0)
  const bImpr = b => b.reduce((s,r) => s+r.impressions, 0)
  const bClks = b => b.reduce((s,r) => s+r.clicks, 0)
  const pct   = (a,b) => b > 0 ? `${Math.round(a/b*100)}%` : "0%"

  const sep = "─".repeat(80)

  console.log("\n")
  console.log("═".repeat(80))
  console.log("  FUNNEL DISTRIBUTION REPORT — v2.4.0 Classifier Reclassification")
  console.log("  [No production changes — simulation only]")
  console.log("═".repeat(80))
  console.log(`  Total unique queries:  ${queries.length}`)
  console.log(`  Total impressions:     ${totalImpr}`)
  console.log(`  Total clicks:          ${totalClks}`)

  // ── OVERVIEW TABLE ─────────────────────────────────────────────────────────
  console.log(`\n  BUCKET OVERVIEW`)
  console.log("═".repeat(80))
  console.log(`  ${"Bucket".padEnd(28)}  ${"Queries".padStart(8)}  ${"Impr".padStart(7)}  ${"Impr%".padStart(6)}  ${"Clicks".padStart(7)}  ${"CTR".padStart(5)}  ${"Avg Pos".padStart(8)}`)
  console.log(`  ${sep}`)

  const printRow = (label, grp) => {
    const cnt  = grp.length
    const impr = bImpr(grp)
    const clks = bClks(grp)
    const avgP = grp.filter(r=>r.impressions>0).length > 0
      ? (grp.filter(r=>r.impressions>0).reduce((s,r)=>s+r.position,0)/grp.filter(r=>r.impressions>0).length).toFixed(1)
      : "—"
    const ctr  = impr > 0 ? ((clks/impr)*100).toFixed(2)+"%" : "0%"
    console.log(`  ${label.padEnd(28)}  ${String(cnt).padStart(8)}  ${String(impr).padStart(7)}  ${pct(impr,totalImpr).padStart(6)}  ${String(clks).padStart(7)}  ${ctr.padStart(5)}  ${String(avgP).padStart(8)}`)
  }

  printRow("BUCKET A — Deploy Now (Funnel B)", bucketA)
  printRow("BUCKET B — Observe Only",          bucketB)
  printRow("BUCKET C — Reject",                bucketC)
  printRow("FUNNEL A — Dealer/OEM/GeM",        funnelA)
  printRow("OTHER (rejected / no match)",       other)
  console.log(`  ${sep}`)
  printRow("TOTAL",                             results)

  // ── BUCKET A DETAIL ────────────────────────────────────────────────────────
  console.log(`\n  BUCKET A — DEPLOY NOW (Funnel B: Direct Buyer)`)
  console.log("═".repeat(80))
  console.log(`  Intent: machine_purchase → adGroupTheme: direct_buyer`)
  console.log()
  console.log(`  ${"#".padStart(3)}  ${"Query".padEnd(50)}  ${"Impr".padStart(5)}  ${"Clks".padStart(4)}  ${"Pos".padStart(5)}  ${"MT".padEnd(6)}  Landing Page`)
  console.log(`  ${sep}`)

  const aSorted = [...bucketA].sort((a,b) => b.impressions - a.impressions)
  for (let i = 0; i < aSorted.length; i++) {
    const r  = aSorted[i]
    const qt = r.q.length > 49 ? r.q.slice(0,46)+"..." : r.q
    console.log(`  ${String(i+1).padStart(3)}  ${qt.padEnd(50)}  ${String(r.impressions).padStart(5)}  ${String(r.clicks).padStart(4)}  ${r.position.toFixed(1).padStart(5)}  ${(r.matchType||"—").padEnd(6)}  ${r.landing||"—"}`)
  }
  console.log(`\n  BUCKET A Summary:  ${bucketA.length} queries | ${bImpr(bucketA)} impressions | ${bClks(bucketA)} clicks`)

  // ── BUCKET B DETAIL ────────────────────────────────────────────────────────
  console.log(`\n  BUCKET B — OBSERVE ONLY (strategic category terms)`)
  console.log("═".repeat(80))
  console.log(`  Status: DO NOT DEPLOY. Track impressions + position trend weekly.`)
  console.log(`  Trigger for Funnel B graduation: CTR > 0.5% for 14 days OR position < 5.`)
  console.log()
  console.log(`  ${"#".padStart(3)}  ${"Query".padEnd(35)}  ${"Impr".padStart(5)}  ${"Clks".padStart(4)}  ${"Pos".padStart(5)}  ${"CTR".padStart(6)}  Status`)
  console.log(`  ${sep}`)

  const bSorted = [...bucketB].sort((a,b) => b.impressions - a.impressions)
  for (let i = 0; i < bSorted.length; i++) {
    const r   = bSorted[i]
    const qt  = r.q.length > 34 ? r.q.slice(0,31)+"..." : r.q
    const ctr = r.impressions > 0 ? ((r.clicks/r.impressions)*100).toFixed(2)+"%" : "0.00%"
    const trigger = r.impressions > 200 && r.clicks === 0 ? "⚠ 0 clicks despite volume — investigate" : "Watching"
    console.log(`  ${String(i+1).padStart(3)}  ${qt.padEnd(35)}  ${String(r.impressions).padStart(5)}  ${String(r.clicks).padStart(4)}  ${r.position.toFixed(1).padStart(5)}  ${ctr.padStart(6)}  ${trigger}`)
  }
  console.log(`\n  BUCKET B Summary:  ${bucketB.length} queries | ${bImpr(bucketB)} impressions | ${bClks(bucketB)} clicks`)

  // ── BUCKET C DETAIL (top rejections) ──────────────────────────────────────
  console.log(`\n  BUCKET C — REJECT`)
  console.log("═".repeat(80))
  console.log(`  These become negative keywords. Top 30 by impressions:`)
  console.log()
  console.log(`  ${"#".padStart(3)}  ${"Query".padEnd(44)}  ${"Impr".padStart(5)}  ${"Clks".padStart(4)}  Reject reason`)
  console.log(`  ${sep}`)

  const cSorted = [...bucketC].sort((a,b) => b.impressions - a.impressions).slice(0,30)
  for (let i = 0; i < cSorted.length; i++) {
    const r  = cSorted[i]
    const qt = r.q.length > 43 ? r.q.slice(0,40)+"..." : r.q
    const rs = (r.reason||"").slice(0,40)
    console.log(`  ${String(i+1).padStart(3)}  ${qt.padEnd(44)}  ${String(r.impressions).padStart(5)}  ${String(r.clicks).padStart(4)}  ${rs}`)
  }
  console.log(`\n  BUCKET C Summary:  ${bucketC.length} queries | ${bImpr(bucketC)} impressions rejected`)

  // ── FUNNEL A DETAIL ────────────────────────────────────────────────────────
  console.log(`\n  FUNNEL A — DEALER/OEM/GeM (existing, unchanged)`)
  console.log("═".repeat(80))
  const byIntent = {}
  for (const r of funnelA) {
    const i = r.intent ?? "unknown"
    if (!byIntent[i]) byIntent[i] = []
    byIntent[i].push(r)
  }
  for (const [intent, grp] of Object.entries(byIntent)) {
    console.log(`  ${intent.padEnd(25)}  ${grp.length} queries  |  ${bImpr(grp)} impr  |  ${bClks(grp)} clicks`)
    const top3 = [...grp].sort((a,b)=>b.impressions-a.impressions).slice(0,3)
    for (const r of top3) {
      console.log(`     > "${r.q}"  [impr:${r.impressions} pos:${r.position.toFixed(1)}]`)
    }
  }

  // ── FUNNEL DISTRIBUTION REPORT ─────────────────────────────────────────────
  console.log(`\n`)
  console.log("═".repeat(80))
  console.log("  FUNNEL DISTRIBUTION — After Reclassification")
  console.log("═".repeat(80))

  const fBImpr = bImpr(bucketA) + bImpr(bucketB)   // all product intent impressions
  const fAImpr = bImpr(funnelA)

  console.log(`
  FUNNEL A — DEALER ACQUISITION  (search campaigns — Funnel A only)
  ─────────────────────────────────────────────────────────────────
  Queries:     ${funnelA.length}
  Impressions: ${fAImpr}  (${pct(fAImpr, totalImpr)} of GSC total)
  Clicks:      ${bClks(funnelA)}
  Sub-funnels: Dealer Acquisition | OEM Authorization | GeM Reseller
  Landing:     /become-a-dealer  /dealer-application  /gem-oem-authorization
  Match type:  EXACT (primary) + PHRASE (tail variants)
  Status:      UNCHANGED — no reclassification applied

  FUNNEL B — DIRECT BUYER  [NEW — not yet deployed]
  ─────────────────────────────────────────────────────────────────
  ACTIVE (Bucket A):
    Queries:     ${bucketA.length}
    Impressions: ${bImpr(bucketA)}  (${pct(bImpr(bucketA), totalImpr)} of GSC total)
    Clicks:      ${bClks(bucketA)}
    Landing:     /products  /public-health-equipment  /vehicle-mounted-fogging-machine
    Match type:  EXACT (≥3 words specific)  |  PHRASE (manufacturer tail)
    Status:      READY TO DEPLOY — awaiting approval

  OBSERVE (Bucket B):
    Queries:     ${bucketB.length}
    Impressions: ${bImpr(bucketB)}  (${pct(bImpr(bucketB), totalImpr)} of GSC total)
    Clicks:      ${bClks(bucketB)}
    Status:      NOT DEPLOYED — tracking impressions + position trend
    Graduation:  CTR > 0.5% for 14 days → move to Funnel B active

  REJECTED (Bucket C + Other):
    Queries:     ${bucketC.length + other.length}
    Impressions: ${bImpr(bucketC) + bImpr(other)}  (${pct(bImpr(bucketC)+bImpr(other), totalImpr)} of GSC total)
    Clicks:      ${bClks(bucketC) + bClks(other)}
    Action:      Bucket C → PHRASE match negatives in both funnels
                 Other → no action (low-signal / informational)
`)

  console.log("─".repeat(80))
  console.log("  IMPRESSION SHARE BY FUNNEL")
  console.log("─".repeat(80))

  const sections = [
    { label: "Funnel A (Dealer/OEM/GeM)",   impr: fAImpr },
    { label: "Funnel B active (Bucket A)",    impr: bImpr(bucketA) },
    { label: "Funnel B observe (Bucket B)",   impr: bImpr(bucketB) },
    { label: "Rejected (Bucket C + Other)",   impr: bImpr(bucketC) + bImpr(other) },
  ]
  const maxI = Math.max(...sections.map(s => s.impr))
  const BAR  = 40
  for (const s of sections) {
    const bar = "█".repeat(Math.round((s.impr / (totalImpr||1)) * BAR))
    const ip  = pct(s.impr, totalImpr).padStart(4)
    console.log(`  ${s.label.padEnd(34)}  ${ip}  ${bar}  ${s.impr}`)
  }

  // ── DEPLOYMENT CHECKLIST ───────────────────────────────────────────────────
  console.log(`\n  DEPLOYMENT CHECKLIST — Before Funnel B goes live`)
  console.log("═".repeat(80))
  console.log(`
  [ ] 1. Add Funnel B campaign in Google Ads (separate from Funnel A)
  [ ] 2. Set Funnel B budget separately (no auto-increase)
  [ ] 3. Add Bucket A keywords as EXACT/PHRASE per match-type column above
  [ ] 4. Add Bucket C terms as PHRASE negatives in BOTH funnels
  [ ] 5. Set destination URLs per landing page column above
  [ ] 6. Configure Funnel B ad copies (product-focus, not dealer-focus)
  [ ] 7. Do NOT add Bucket B keywords — observe organic only
  [ ] 8. Weekly: check Bucket B CTR/position, graduate if threshold met
  [ ] 9. Human approval required before any spend on Funnel B
  [ ] 10. Funnel A campaigns: unchanged
`)

  console.log("═".repeat(80))
  console.log("  Report complete. [No production changes made]")
  console.log("═".repeat(80) + "\n")

} finally {
  await client.close()
}
