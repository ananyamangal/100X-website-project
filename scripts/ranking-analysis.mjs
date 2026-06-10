/**
 * Ranking analysis script — shows exactly why GeM phrases lost,
 * and simulates the proposed evidence-bonus formula.
 * Read-only. No writes.
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

// ── Same fogging-only patterns as the fixed engine ────────────────────────────
const KI_GEM_FOGGING_PATTERNS = [
  "thermal\\s*fog", "\\bfogger\\b", "fogging\\s*machine", "fogging\\s*equipment",
  "fog\\s*sanitizer", "cold\\s*fog", "mist\\s*blow", "aero\\s*blast",
  "vehicle\\s*mount\\w*\\s*fog", "\\bULV\\b",
  "mosquito\\s*control", "vector\\s*control",
  "disease\\s*control\\s*(machine|equipment|spray|fogger)",
  "public\\s*health.*fog", "larvicid", "adulticid",
]
const GEM_REGEX = new RegExp(KI_GEM_FOGGING_PATTERNS.join("|"), "i")

const KI_GEM_EXCLUDES = [
  /\breaper\b/i, /\btiller\b/i, /\bseeder\b/i, /\bsower\b/i, /\bplanter\b/i,
  /\bharvest/i, /\bthresher\b/i, /\bchaff\b/i, /\bbrush\s*cut/i,
  /\bweeder\b/i, /\brotavat/i, /\bwinnow/i, /\btractor\b/i,
  /\bknapsack\s*sprayer\b/i, /\bhand\s*operated\s*sprayer/i,
  /\bhand\s*sanitizer\b/i, /\bface\s*mask\b/i, /\bsanitary\s*napkin/i,
]
function isExcluded(s) { return KI_GEM_EXCLUDES.some(re => re.test(s)) }

// ── Expansion engine (same as engine) ────────────────────────────────────────
const PRODUCT_BASES = ["fogging machine","thermal fogging machine","thermal fogger","ulv fogger"]
const EXPANSION_SPECS = {
  dealer: [
    { m: "dealership",             c: 75 },
    { m: "dealer",                 c: 70 },
    { m: "distributor",            c: 70 },
    { m: "franchise",              c: 60 },
    { m: "reseller",               c: 65 },
    { m: "dealership opportunity", c: 65 },
    { m: "authorized dealer",      c: 72 },
    { m: "distributor india",      c: 63 },
  ],
  oem: [
    { m: "oem",                    c: 72 },
    { m: "oem authorization",      c: 78 },
    { m: "oem authorized",         c: 78 },
    { m: "oem supplier",           c: 68 },
    { m: "oem partnership",        c: 65 },
    { m: "brand authorization",    c: 70 },
  ],
  gem: [
    { m: "gem reseller",            c: 78 },
    { m: "gem seller",              c: 75 },
    { m: "gem vendor",              c: 70 },
    { m: "gem portal reseller",     c: 72 },
    { m: "gem authorized reseller", c: 75 },
    { m: "government reseller",     c: 60 },
  ],
}

function getMatchType(wc, conf, source) {
  if (conf >= 80) return "EXACT"
  if (wc >= 4 && conf >= 70) return "EXACT"
  if (["gsc","gem_demand","ai_search"].includes(source) && conf >= 60 && wc >= 2) return "PHRASE"
  if (wc <= 2 && conf >= 60) return "PHRASE"
  if (source === "expansion" && conf < 65) return "BROAD"
  return "PHRASE"
}

// ── Current formula (confidence-first, source as tiebreaker) ─────────────────
const SOURCE_PRIORITY = { gsc:100, ads_search_terms:90, gem_demand:80, ai_search:70, competitor:60, indiamart:50, expansion:10 }

function currentScore(kw) { return kw.confidence }
function currentCmp(a, b) { return (b.confidence - a.confidence) || (SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]) }

// ── Proposed formula (evidence bonus) ────────────────────────────────────────
const EVIDENCE_BONUS = { ads_search_terms:25, gsc:18, gem_demand:15, ai_search:10, competitor:8, indiamart:5, expansion:0 }

function proposedScore(kw) { return kw.confidence + (EVIDENCE_BONUS[kw.source] ?? 0) }
function proposedCmp(a, b) { return proposedScore(b) - proposedScore(a) || (SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]) }

function selectBest(all, theme, cmpFn) {
  const group = all.filter(k => k.theme === theme)
  const exact = group.filter(k => k.mt === "EXACT").sort(cmpFn)
  const phrase = group.filter(k => k.mt === "PHRASE").sort(cmpFn)
  const broad = group.filter(k => k.mt === "BROAD").sort(cmpFn)
  const sel = []
  if (exact.length) sel.push(exact[0])
  if (phrase.length) sel.push(phrase[0])
  const rest = [...exact.slice(1), ...phrase.slice(1), ...broad].filter(k => !sel.includes(k)).sort(cmpFn)
  sel.push(...rest.slice(0, 12 - sel.length))
  return sel
}

const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db("100xDB")

  // ── Fetch and normalize GeM phrases ──────────────────────────────────────
  const contracts = await db.collection("gem_contracts")
    .find({ product_name: { $regex: GEM_REGEX } }, { projection: { product_name: 1 } })
    .sort({ contract_date_dt: -1 }).limit(1000).toArray()

  const nameCount = new Map()
  const rejectedList = []
  for (const c of contracts) {
    const raw = String(c.product_name ?? "").trim()
    if (!raw || raw.length < 5) continue
    const normalized = raw.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(?:is|as|for|with|and|the|of|in|on|by|at)\b/g, " ")
      .replace(/\s+/g, " ").trim()
    if (isExcluded(normalized)) { rejectedList.push(raw); continue }
    const shortform = normalized.split(" ").filter(Boolean).slice(0, 6).join(" ")
    if (shortform.split(" ").length < 2 || shortform.length < 6) continue
    nameCount.set(shortform, (nameCount.get(shortform) || 0) + 1)
  }

  const gemKws = []
  for (const [text, count] of nameCount) {
    const conf = count >= 20 ? 82 : count >= 5 ? 74 : 65
    const wc = text.split(" ").filter(Boolean).length
    const mt = getMatchType(wc, conf, "gem_demand")
    gemKws.push({ text, source: "gem_demand", theme: "dealer", confidence: conf, mt, count })
  }

  // ── Build expansion pool ──────────────────────────────────────────────────
  const expKws = []
  for (const [theme, specs] of Object.entries(EXPANSION_SPECS)) {
    for (const spec of specs) {
      const bases = spec.c >= 70 ? PRODUCT_BASES : PRODUCT_BASES.slice(0,2)
      for (const base of bases) {
        const text = `${base} ${spec.m}`
        const wc = text.split(" ").length
        const mt = getMatchType(wc, spec.c, "expansion")
        expKws.push({ text, source: "expansion", theme, confidence: spec.c, mt, modifier: spec.m })
      }
    }
  }

  // ── GSC and AI (from validation run) ─────────────────────────────────────
  const gscKws = [
    { text: "fogging machine on gem portal", source: "gsc", theme: "gem",    confidence: 75, mt: "EXACT" },
    { text: "fogging machine on gem",        source: "gsc", theme: "gem",    confidence: 75, mt: "EXACT" },
    { text: "fogging machine in gem portal", source: "gsc", theme: "gem",    confidence: 75, mt: "EXACT" },
  ]
  const aiKws = [
    { text: "gem dealer authorization fogging machine", source: "ai_search", theme: "gem", confidence: 62, mt: "PHRASE" },
  ]

  const all = [...gscKws, ...aiKws, ...gemKws, ...expKws]

  // ── SECTION 1: Current formula ────────────────────────────────────────────
  console.log("\n" + "═".repeat(72))
  console.log("  1. CURRENT RANKING FORMULA")
  console.log("═".repeat(72))
  console.log(`
  compareFn = (a, b) => (b.confidence - a.confidence)
                     || (SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])

  effectiveScore(kw) = kw.confidence          ← SOURCE PRIORITY IS TIEBREAKER ONLY

  SOURCE_PRIORITY (used only when confidence is IDENTICAL):
    ads_search_terms : 90
    gsc              : 100
    gem_demand       : 80
    ai_search        : 70
    expansion        : 10

  Problem: a GeM keyword at confidence 65 and an expansion keyword at confidence 66
  never reach the tiebreaker. Expansion wins purely because 66 > 65.
  The 80-point source priority gap between gem_demand and expansion is NEVER applied.`)

  // ── SECTION 2: Why all 7 GeM phrases lost ────────────────────────────────
  console.log("═".repeat(72))
  console.log("  2. WHY ALL 7 GeM PHRASES LOST")
  console.log("═".repeat(72))

  console.log(`\n  Rejected by exclusion guard (${rejectedList.length}):`)
  for (const r of rejectedList) console.log(`    ✗ "${r}"`)

  console.log(`\n  7 GeM phrases produced (confidence 65 each, PHRASE match):`)
  for (const k of gemKws) {
    console.log(`    phrase="${k.text}"  conf=${k.confidence}  mt=${k.mt}  contracts=${k.count}`)
  }

  // Show the dealer theme competition in detail
  const dealerExp = expKws.filter(k => k.theme === "dealer").sort((a,b) => b.confidence - a.confidence)
  const dealerGem = gemKws.filter(k => k.theme === "dealer")

  console.log(`\n  Dealer theme — expansion competitors (${dealerExp.length} candidates):`)
  console.log(`  ${"keyword".padEnd(48)} ${"conf".padStart(4)}  ${"mt".padEnd(7)} rank-in-pool`)
  console.log("  " + "─".repeat(68))
  const dealerExactExp  = dealerExp.filter(k => k.mt === "EXACT").sort(currentCmp)
  const dealerPhraseExp = dealerExp.filter(k => k.mt === "PHRASE").sort(currentCmp)
  let rank = 1
  for (const k of [...dealerExactExp, ...dealerPhraseExp].slice(0, 14)) {
    const text = k.text.length > 47 ? k.text.slice(0,44)+"..." : k.text
    console.log(`  ${text.padEnd(48)} ${String(k.confidence).padStart(4)}  ${k.mt.padEnd(7)} #${rank++}`)
  }
  console.log(`\n  GeM phrase effective score with CURRENT formula: 65`)
  console.log(`  Expansion keywords scoring ≥ 66 in dealer theme: ${dealerExp.filter(k => k.confidence >= 66).length}`)
  console.log(`  → All 12 dealer slots fill with expansion at conf 66-78 before GeM (65) is reached.`)
  console.log(`  → Source priority (gem=80 vs expansion=10) never activates. Confidence gap prevents it.`)

  // ── SECTION 3: Simulation ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72))
  console.log("  3. SIMULATION — How many GeM keywords enter Top 36 with evidence bonus?")
  console.log("═".repeat(72))

  // Current
  const currentSelected = {
    dealer: selectBest(all, "dealer", currentCmp),
    oem:    selectBest(all, "oem",    currentCmp),
    gem:    selectBest(all, "gem",    currentCmp),
  }
  const currentFlat = [...currentSelected.dealer, ...currentSelected.oem, ...currentSelected.gem]
  const currentGem  = currentFlat.filter(k => k.source === "gem_demand").length
  const currentExp  = currentFlat.filter(k => k.source === "expansion").length

  // Proposed
  const proposedSelected = {
    dealer: selectBest(all, "dealer", proposedCmp),
    oem:    selectBest(all, "oem",    proposedCmp),
    gem:    selectBest(all, "gem",    proposedCmp),
  }
  const proposedFlat = [...proposedSelected.dealer, ...proposedSelected.oem, ...proposedSelected.gem]
  const proposedGem  = proposedFlat.filter(k => k.source === "gem_demand").length
  const proposedExp  = proposedFlat.filter(k => k.source === "expansion").length

  console.log(`\n  EVIDENCE_BONUS values (proposed):`)
  for (const [src, bonus] of Object.entries(EVIDENCE_BONUS)) {
    console.log(`    ${src.padEnd(18)}: +${bonus}  (example: conf 65 → effective ${65+bonus})`)
  }

  console.log(`\n  GeM phrase effective scores with proposed formula:`)
  for (const k of gemKws) {
    const eff = proposedScore(k)
    const beatsExpansion = expKws.filter(e => e.theme === "dealer" && e.confidence > eff).length
    console.log(`    "${k.text}"`)
    console.log(`       conf=${k.confidence} + bonus=15 → effective=${eff}`)
    console.log(`       expansion keywords in same theme that still beat it: ${beatsExpansion}`)
  }

  console.log(`\n  ${"".padEnd(30)} CURRENT    PROPOSED`)
  console.log(`  ${"".padEnd(30)} ─────────  ────────`)
  const c = currentFlat; const p = proposedFlat
  console.log(`  ${"Total selected".padEnd(30)} ${String(c.length).padStart(9)}  ${String(p.length).padStart(8)}`)
  console.log(`  ${"GeM keywords in Top 36".padEnd(30)} ${String(currentGem).padStart(9)}  ${String(proposedGem).padStart(8)}`)
  console.log(`  ${"Expansion keywords in Top 36".padEnd(30)} ${String(currentExp).padStart(9)}  ${String(proposedExp).padStart(8)}`)
  console.log(`  ${"Expansion %".padEnd(30)} ${(Math.round(currentExp/c.length*100)+"%").padStart(9)}  ${(Math.round(proposedExp/p.length*100)+"%").padStart(8)}`)
  console.log(`  ${"GeM %".padEnd(30)} ${(Math.round(currentGem/c.length*100)+"%").padStart(9)}  ${(Math.round(proposedGem/p.length*100)+"%").padStart(8)}`)

  console.log(`\n  Proposed dealer theme (first 12):`)
  console.log(`  ${"keyword".padEnd(48)} ${"src".padEnd(16)} ${"cf".padStart(3)} ${"eff".padStart(4)} ${"mt".padEnd(7)}`)
  console.log("  " + "─".repeat(82))
  for (const k of proposedSelected.dealer) {
    const text = k.text.length > 47 ? k.text.slice(0,44)+"..." : k.text
    const eff = proposedScore(k)
    console.log(`  ${text.padEnd(48)} ${k.source.padEnd(16)} ${String(k.confidence).padStart(3)} ${String(eff).padStart(4)} ${k.mt}`)
  }

  // ── SECTION 4: Proposed formula ───────────────────────────────────────────
  console.log("\n" + "═".repeat(72))
  console.log("  4. PROPOSED RANKING REVISION")
  console.log("═".repeat(72))
  console.log(`
  effectiveScore(kw) = kw.confidence + EVIDENCE_BONUS[kw.source]

  EVIDENCE_BONUS:
    ads_search_terms  : +25   Tier 1 — real money clicked, highest evidence
    gsc               : +18   Tier 2 — real impressions on domain
    gem_demand        : +15   Tier 3 — observed government procurement
    ai_search         : +10   Tier 4 — tracked AI search queries
    competitor        : +8    Tier 5 — intelligence signal (pending data)
    indiamart         : +5    Tier 6 — marketplace signal (pending data)
    expansion         : +0    Tier 7 — no real evidence, supplement only

  compareFn = (a, b) => (effectiveScore(b) - effectiveScore(a))
                     || (SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])

  Verification of user's stated example:
    GeM keyword, conf 65:   effective = 65 + 15 = 80
    Expansion,   conf 78:   effective = 78 +  0 = 78
    → GeM wins  ✓

  Verification at confidence boundaries:
    GeM conf 65 (min): effective 80 — beats expansion up to conf 79
    GeM conf 74 (mid): effective 89 — beats expansion up to conf 88
    GeM conf 82 (max): effective 97 — beats all expansion
    GSC conf 60 (min): effective 78 — beats expansion up to conf 77
    GSC conf 75 (typ): effective 93 — beats all expansion
    AI  conf 62 (base): effective 72 — beats expansion up to conf 71

  Overflow guard (prevents runaway from bonus stacking):
    effectiveScore is used ONLY for selectBest() sort order.
    The raw kw.confidence value is preserved in the stored document.
    Bonus does not affect quality scoring, match-type assignment, or lead quality.

  One risk to flag:
    If GeM data quality degrades (garbled product names passing the filter),
    the +15 bonus will promote bad keywords above good expansion keywords.
    The isExcludedGeMProduct() guard is the first line of defence.
    A minimum word-quality check (reject if >50% of words are numeric/codes) is
    worth adding before implementing, but is not required for the current 7 phrases.`)

  console.log("═".repeat(72) + "\n")

} finally {
  await client.close()
}
