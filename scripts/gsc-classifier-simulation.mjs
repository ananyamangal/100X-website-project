/**
 * GSC Classifier Expansion Simulation — SIMULATION ONLY, no DB writes.
 *
 * Runs the proposed PRODUCT_INTENT classifier against all 858 gsc_query_rows.
 * Compares old vs new classification, identifies promoted queries, flags
 * low-quality consumer queries, and projects new source contribution.
 *
 * Classification rules (proposed):
 *   1. PRODUCT_INTENT    — product pattern, no dealer/OEM/GeM context
 *   2. MANUFACTURER_INTENT — product + manufacturer/factory/OEM/supplier
 *   3. DEALER_INTENT     — product + dealer/distributor/dealership
 *   4. GEM_INTENT        — product + GeM/tender/procurement
 *
 * Usage: node --env-file=.env.local scripts/gsc-classifier-simulation.mjs
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

// ── SHARED: Anti-fog guard + expansion constants ──────────────────────────────

const ANTI_FOG_INTENT_RE  = /\banti[\s-]?fog(?:ging)?\b|\bde[\s-]?fog(?:ging)?\b|\banti[\s-]?mist\b|\banti[\s-]?condensation\b|\bfogging\s+agent\b/i
const ANTI_FOG_MACHINE_RE = /\b(machine|fogger|foggers|thermal|ulv|mosquito|vector\s*control|municipal|gem|oem|distributor|dealer|manufacturer)\b/i
const isAntiFog = q => ANTI_FOG_INTENT_RE.test(q) && !ANTI_FOG_MACHINE_RE.test(q)

const SOURCE_PRIORITY = { gsc:100, ads_search_terms:90, gem_demand:80, ai_search:70, competitor:60, indiamart:50, expansion:10 }
const EVIDENCE_BONUS  = { gsc:18, ads_search_terms:25, gem_demand:15, ai_search:10, competitor:8, indiamart:5, expansion:0 }
const MAX_PER_GROUP   = 12

// ── OLD CLASSIFIER (current production) ───────────────────────────────────────

const OLD_INTENT_SIGNALS = {
  gem_reseller:      ["gem","gem portal","government e-marketplace","gem seller","gem reseller","gem vendor","gem registration","gem authorized","gem listed","gem portal seller"],
  oem_authorization: ["oem","original equipment manufacturer","brand authorization","brand partner","manufacturer authorization","oem partnership","oem authorized","oem supplier","oem dealer"],
  dealer_acquisition:["dealer","dealership","distributor","franchise","reseller","channel partner","become a dealer","agent","stockist","dealership opportunity","sub-dealer","authorized dealer"],
  informational:     ["price","cost","how to","what is","review","comparison","vs","specification","spec","manual","repair","service","youtube","video","tutorial","home use","domestic"],
}

function oldClassify(q) {
  if (isAntiFog(q)) return null
  for (const [intent, sigs] of Object.entries(OLD_INTENT_SIGNALS)) {
    if (sigs.some(s => q.includes(s))) return intent
  }
  return null  // commercial_general → rejected
}

// ── NEW CLASSIFIER (proposed) ─────────────────────────────────────────────────

// Product patterns — all 18 specified by user
const PRODUCT_PATTERNS = [
  /\bfogging\s+machine\b/i,
  /\bfogger\s+machine\b/i,
  /\bfogger\b/i,
  /\bthermal\s+fogging\s+machine\b/i,
  /\bportable\s+fogging\s+machine\b/i,
  /\bmosquito\s+fogging\s+machine\b/i,
  /\bmosquito\s+control\s+machine\b/i,
  /\bvector\s+control\s+equipment\b/i,
  /\bvector\s+control\s+machine\b/i,
  /\bULV\s+fogger\b/i,
  /\bthermal\s+fogger\b/i,
  /\bvehicle[\s-]+mounted\s+fogging\b/i,
  /\btruck[\s-]+mounted\s+fogging\b/i,
  /\bfogging\s+machine\s+manufacturer\b/i,
  /\bfogger\s+manufacturer\b/i,
  /\bthermal\s+fogging\s+machine\s+manufacturer\b/i,
  /\bmosquito\s+fogging\s+equipment\b/i,
  /\bpublic\s+health\s+fogging\b/i,
  // Also catch "fogging system", "thermal fogging", "cold fogging" as valid product queries
  /\bthermal\s+fogging\b/i,
  /\bcold\s+fog(?:ging)?\b/i,
  /\bfogging\s+system\b/i,
]
const FOGGING_PRODUCT_RE = new RegExp(PRODUCT_PATTERNS.map(r => r.source).join("|"), "i")

const MANUFACTURER_RE = /\b(manufacturer|manufacturers|factory|production\s*house|made\s*in\s*india|make\s*in\s*india|msme|brand\s*owner|oem\s*manufacturer|original\s*manufacturer|company|supplier|brand)\b/i
const DEALER_CTX_RE   = /\b(dealer|dealership|distributors?|authorized\s*dealer|franchise|reseller|channel\s*partner|stockist|agent)\b/i
const GEM_CTX_RE      = /\b(gem|government\s*e.?marketplace|tender|procurement|government\s*supply|rate\s*contract|l1\s*rate|gem\s*portal)\b/i

// Guard against informational / consumer searches slipping through
const INFORMATIONAL_GUARD = /\b(price|cost|how\s*much|rate\b|review|compare|how\s*to|what\s*is|manual|tutorial|video|buy\b|purchase|amazon|flipkart|indiamart\b|hire|rent|home\s*use|domestic|personal\s*use|second\s*hand|used\b|repair|service\b|refurbished)\b/i

function newClassify(q) {
  if (isAntiFog(q)) return null

  // First check old classifier — keep all existing classifications intact
  const oldResult = oldClassify(q)
  if (oldResult) return oldResult

  // Informational guard — don't promote pure info queries
  if (INFORMATIONAL_GUARD.test(q)) return null

  // Product pattern gate
  if (!FOGGING_PRODUCT_RE.test(q)) return null

  // Sub-intent by context
  if (GEM_CTX_RE.test(q))          return "gem_reseller"
  if (MANUFACTURER_RE.test(q))     return "oem_authorization"
  if (DEALER_CTX_RE.test(q))       return "dealer_acquisition"
  return "dealer_acquisition"      // PRODUCT_INTENT → dealer theme (commercial fogging)
}

function intentToTheme(intent) {
  if (intent === "dealer_acquisition") return "dealer"
  if (intent === "oem_authorization")  return "oem"
  if (intent === "gem_reseller")       return "gem"
  return null
}

// Determine which pathway promoted a query
function classifyPathway(q) {
  if (isAntiFog(q)) return null
  if (INFORMATIONAL_GUARD.test(q)) return null
  if (!FOGGING_PRODUCT_RE.test(q)) return null
  if (GEM_CTX_RE.test(q))         return "gem_intent"
  if (MANUFACTURER_RE.test(q))    return "manufacturer_intent"
  if (DEALER_CTX_RE.test(q))      return "dealer_intent"
  return "product_intent"
}

// Intent score for ranking in the report (impressions × score)
const PATHWAY_SCORE = { gem_intent:4, manufacturer_intent:3, dealer_intent:2, product_intent:1 }

// Low-quality consumer query heuristics
function consumerRiskScore(q) {
  const words = q.trim().split(/\s+/)
  let risk = 0
  if (words.length <= 2) risk += 3              // very short queries are often consumer
  if (/\bnear\s*me\b/i.test(q)) risk += 2       // "fogger near me" = buyer
  if (/\bfor\s*(home|garden|room|indoor)\b/i.test(q)) risk += 3
  if (/\bmini\b|\bsmall\b|\bportable\b/i.test(q) && words.length <= 3) risk += 1  // "mini fogger" could be consumer
  if (/\bpest\b|\bbed\s*bug\b|\bcockroach\b|\bant\b/i.test(q)) risk += 3          // pest control = consumer
  if (/\bwhat\b|\bwhich\b|\bbest\b/i.test(q)) risk += 1                           // research intent
  return risk   // 0=clean commercial, 1-2=low risk, 3+=consumer/mixed
}

// ── Simulation helpers (mirror demand-signal-validate.mjs) ────────────────────

function assignMatchType(query, intent, confidence, source) {
  const wc = query.trim().split(/\s+/).length
  const isSpec = ["dealer_acquisition","oem_authorization","gem_reseller"].includes(intent)
  if (confidence >= 80 && isSpec) return "EXACT"
  if (wc >= 4 && confidence >= 70 && isSpec) return "EXACT"
  if (["gsc","gem_demand","ai_search","ads_search_terms"].includes(source) && confidence >= 60 && wc >= 2) return "PHRASE"
  if (wc <= 2 && confidence >= 60) return "PHRASE"
  if (source === "expansion" && confidence < 65) return "BROAD"
  return "PHRASE"
}

function leadQuality(intent, mt, conf) {
  const top = ["dealer_acquisition","oem_authorization"].includes(intent)
  if (top && mt === "EXACT" && conf >= 75) return "high"
  if (["dealer_acquisition","oem_authorization","gem_reseller"].includes(intent) && mt !== "BROAD" && conf >= 60) return "medium"
  return "low"
}

function computeEffectiveScore(kw) {
  const eb = EVIDENCE_BONUS[kw.source] ?? 0
  let qb = 0
  if (kw.usabilityScore !== undefined) {
    if (kw.usabilityScore >= 90) qb = 8
    else if (kw.usabilityScore >= 75) qb = 5
    else if (kw.usabilityScore >= 60) qb = 3
  }
  return kw.confidence + eb + qb
}

function deduplicate(kws) {
  const seen = new Map()
  for (const kw of kws) {
    const key = `${kw.adGroupTheme}:${kw.text}`
    const ex  = seen.get(key)
    if (!ex || (kw.effectiveScore ?? 0) > (ex.effectiveScore ?? 0)) seen.set(key, kw)
  }
  return Array.from(seen.values())
}

function selectBest(all, theme) {
  const cmp = (a,b) => (b.effectiveScore ?? b.confidence) - (a.effectiveScore ?? a.confidence)
  const group  = all.filter(k => k.adGroupTheme === theme)
  const exact  = group.filter(k => k.matchType === "EXACT").sort(cmp)
  const phrase = group.filter(k => k.matchType === "PHRASE").sort(cmp)
  const broad  = group.filter(k => k.matchType === "BROAD").sort(cmp)
  const sel = []
  if (exact.length)  sel.push(exact[0])
  if (phrase.length) sel.push(phrase[0])
  const rest = [...exact.slice(1), ...phrase.slice(1), ...broad].filter(k => !sel.includes(k)).sort(cmp)
  sel.push(...rest.slice(0, MAX_PER_GROUP - sel.length))
  return sel
}

// Expansion engine (static — matches current production)
const PRODUCT_BASES = ["fogging machine","thermal fogging machine","thermal fogger","ulv fogger"]
const EXPANSION_SPECS = {
  dealer:[
    {modifier:"dealership",intent:"dealer_acquisition",confidence:75},
    {modifier:"dealer",intent:"dealer_acquisition",confidence:70},
    {modifier:"distributor",intent:"dealer_acquisition",confidence:70},
    {modifier:"franchise",intent:"dealer_acquisition",confidence:60},
    {modifier:"reseller",intent:"dealer_acquisition",confidence:65},
    {modifier:"dealership opportunity",intent:"dealer_acquisition",confidence:65},
    {modifier:"authorized dealer",intent:"dealer_acquisition",confidence:72},
    {modifier:"distributor india",intent:"dealer_acquisition",confidence:63},
  ],
  oem:[
    {modifier:"oem",intent:"oem_authorization",confidence:72},
    {modifier:"oem authorization",intent:"oem_authorization",confidence:78},
    {modifier:"oem authorized",intent:"oem_authorization",confidence:78},
    {modifier:"oem supplier",intent:"oem_authorization",confidence:68},
    {modifier:"oem partnership",intent:"oem_authorization",confidence:65},
    {modifier:"brand authorization",intent:"oem_authorization",confidence:70},
  ],
  gem:[
    {modifier:"gem reseller",intent:"gem_reseller",confidence:78},
    {modifier:"gem seller",intent:"gem_reseller",confidence:75},
    {modifier:"gem vendor",intent:"gem_reseller",confidence:70},
    {modifier:"gem portal reseller",intent:"gem_reseller",confidence:72},
    {modifier:"gem authorized reseller",intent:"gem_reseller",confidence:75},
    {modifier:"government reseller",intent:"gem_reseller",confidence:60},
  ],
}
function generateExpansions() {
  const kws = []
  for (const [theme, specs] of Object.entries(EXPANSION_SPECS)) {
    for (const spec of specs) {
      const bases = spec.confidence >= 70 ? PRODUCT_BASES : PRODUCT_BASES.slice(0,2)
      for (const base of bases) {
        const text = `${base} ${spec.modifier}`
        const mt = assignMatchType(text, spec.intent, spec.confidence, "expansion")
        kws.push({ text, source:"expansion", adGroupTheme:theme, intent:spec.intent,
          confidence:spec.confidence, matchType:mt,
          expectedLeadQuality:leadQuality(spec.intent,mt,spec.confidence),
          effectiveScore:spec.confidence })
      }
    }
  }
  return kws
}

// ── Main ──────────────────────────────────────────────────────────────────────

const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db("100xDB")

  // Pull all gsc_query_rows — no limit, all data
  const allRows = await db.collection("gsc_query_rows")
    .find({}).sort({ impressions: -1 }).limit(5000).toArray()

  console.log(`\nGSC rows fetched: ${allRows.length}`)
  console.log("=" + "═".repeat(79))
  console.log("  GSC CLASSIFIER EXPANSION — SIMULATION REPORT")
  console.log("  [SIMULATION ONLY — no production changes]")
  console.log("═".repeat(80))

  // ── Classify all queries under both classifiers ───────────────────────────
  const old_included = []   // classified by OLD classifier
  const new_only     = []   // classified ONLY by NEW classifier (promoted)
  const still_rejected = [] // rejected by both
  const antiFogBlocked = [] // removed by anti-fog guard

  // Dedup queries (gsc has duplicate rows by date)
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
  console.log(`Unique queries (deduped): ${queries.length}`)

  for (const row of queries) {
    const { q, impressions, clicks, position } = row

    if (isAntiFog(q)) {
      antiFogBlocked.push({ ...row })
      continue
    }

    const oldIntent = oldClassify(q)
    const newIntent = newClassify(q)
    const pathway   = newIntent && !oldIntent ? classifyPathway(q) : null

    if (oldIntent && intentToTheme(oldIntent)) {
      old_included.push({ q, impressions, clicks, position, intent: oldIntent,
        theme: intentToTheme(oldIntent), pathway: "existing" })
    } else if (newIntent && intentToTheme(newIntent)) {
      const theme = intentToTheme(newIntent)
      const risk  = consumerRiskScore(q)
      new_only.push({ q, impressions, clicks, position, intent: newIntent,
        theme, pathway, risk })
    } else {
      still_rejected.push({ q, impressions, clicks, position })
    }
  }

  // ── A. CURRENT INCLUDED COUNT ─────────────────────────────────────────────
  console.log(`\n  A. CURRENT INCLUDED COUNT (old classifier)`)
  console.log("─".repeat(50))
  console.log(`  GSC queries included:  ${old_included.length}`)
  console.log(`  GSC queries rejected:  ${queries.length - antiFogBlocked.length - old_included.length}`)
  console.log(`  Anti-fog blocked:      ${antiFogBlocked.length}`)

  // ── B. NEW INCLUDED COUNT ─────────────────────────────────────────────────
  const total_new = old_included.length + new_only.length
  console.log(`\n  B. NEW INCLUDED COUNT (with product intent classifier)`)
  console.log("─".repeat(50))
  console.log(`  GSC queries included:  ${total_new}  (+${new_only.length} newly promoted)`)
  console.log(`  GSC queries rejected:  ${still_rejected.length}`)

  // ── C. QUERIES PROMOTED BY PATHWAY ───────────────────────────────────────
  const byPathway = {}
  for (const pw of ["product_intent","manufacturer_intent","dealer_intent","gem_intent"]) {
    byPathway[pw] = new_only.filter(r => r.pathway === pw)
  }

  console.log(`\n  C. QUERIES PROMOTED BY PATHWAY`)
  console.log("─".repeat(50))
  for (const [pw, rows] of Object.entries(byPathway)) {
    const imprSum = rows.reduce((s,r) => s + r.impressions, 0)
    const clkSum  = rows.reduce((s,r) => s + r.clicks, 0)
    console.log(`  ${pw.padEnd(25)}  ${String(rows.length).padStart(4)} queries  ${String(imprSum).padStart(6)} impr  ${String(clkSum).padStart(4)} clicks`)
  }

  // ── D. TOP 50 NEWLY PROMOTED QUERIES ─────────────────────────────────────
  const promotedRanked = [...new_only]
    .sort((a,b) => {
      const scoreA = a.impressions * (PATHWAY_SCORE[a.pathway] ?? 1)
      const scoreB = b.impressions * (PATHWAY_SCORE[b.pathway] ?? 1)
      return scoreB - scoreA
    })

  console.log(`\n  D. TOP 50 NEWLY PROMOTED QUERIES  [ranked by impressions × intent_score]`)
  console.log("═".repeat(80))
  console.log(`${"#".padStart(3)}  ${"Query".padEnd(48)}  ${"Impr".padStart(5)}  ${"Clks".padStart(4)}  ${"Pos".padStart(5)}  ${"Pathway".padEnd(22)}  ${"Risk".padStart(4)}`)
  console.log("─".repeat(120))

  const top50 = promotedRanked.slice(0, 50)
  for (let i = 0; i < top50.length; i++) {
    const r   = top50[i]
    const qTx = r.q.length > 47 ? r.q.slice(0,44)+"..." : r.q
    const riskLabel = r.risk >= 3 ? "HIGH" : r.risk >= 1 ? "MED" : "LOW"
    console.log(`${String(i+1).padStart(3)}  ${qTx.padEnd(48)}  ${String(r.impressions).padStart(5)}  ${String(r.clicks).padStart(4)}  ${r.position.toFixed(1).padStart(5)}  ${(r.pathway??"-").padEnd(22)}  ${riskLabel.padStart(4)}`)
  }

  // ── E. INCREMENTAL DEMAND CAPTURED ───────────────────────────────────────
  const newImpr = new_only.reduce((s,r) => s + r.impressions, 0)
  const newClks = new_only.reduce((s,r) => s + r.clicks, 0)
  const newPositions = new_only.filter(r => r.impressions > 0)
  const avgPos  = newPositions.length > 0
    ? (newPositions.reduce((s,r) => s + r.position, 0) / newPositions.length).toFixed(1)
    : "—"

  const highRisk  = new_only.filter(r => r.risk >= 3)
  const medRisk   = new_only.filter(r => r.risk >= 1 && r.risk < 3)
  const lowRisk   = new_only.filter(r => r.risk === 0)

  console.log(`\n  E. INCREMENTAL DEMAND CAPTURED`)
  console.log("─".repeat(50))
  console.log(`  Newly promoted queries:   ${new_only.length}`)
  console.log(`  Total new impressions:    ${newImpr}`)
  console.log(`  Total new clicks:         ${newClks}`)
  console.log(`  Average position:         ${avgPos}`)
  console.log(`\n  Consumer/Low-quality risk breakdown:`)
  console.log(`  LOW risk  (clean commercial):  ${lowRisk.length} queries  (${newImpr > 0 ? Math.round(lowRisk.reduce((s,r)=>s+r.impressions,0)/newImpr*100) : 0}% of new impressions)`)
  console.log(`  MED risk  (mixed intent):      ${medRisk.length} queries`)
  console.log(`  HIGH risk (consumer likely):   ${highRisk.length} queries`)

  if (highRisk.length > 0) {
    console.log(`\n  HIGH RISK queries (review before deploying):`)
    for (const r of highRisk.sort((a,b) => b.impressions - a.impressions).slice(0,20)) {
      let riskReason = []
      if (r.q.split(/\s+/).length <= 2)    riskReason.push("short query")
      if (/\bnear\s*me\b/i.test(r.q))      riskReason.push("near me")
      if (/\bbest\b|\bwhich\b/i.test(r.q)) riskReason.push("evaluation intent")
      if (/\bmini\b|\bsmall\b/i.test(r.q) && r.q.split(/\s+/).length <= 3) riskReason.push("small/mini = likely consumer")
      if (/\bpest\b|\bbed\s*bug\b|\bcockroach\b/i.test(r.q)) riskReason.push("pest control = consumer")
      console.log(`    ⚠ "${r.q}"  [impr:${r.impressions} clks:${r.clicks} pos:${r.position.toFixed(1)}]  ${riskReason.join(", ")}`)
    }
  }

  if (medRisk.length > 0) {
    console.log(`\n  MEDIUM RISK queries (monitor after deploy):`)
    for (const r of medRisk.sort((a,b) => b.impressions - a.impressions).slice(0,15)) {
      console.log(`    ~ "${r.q}"  [impr:${r.impressions} pos:${r.position.toFixed(1)}]`)
    }
  }

  // ── F. PROJECTED SOURCE CONTRIBUTION ─────────────────────────────────────
  // Simulate full keyword intelligence run with new GSC keywords

  // Build new GSC keyword set
  const allGSCKws = []
  for (const row of [...old_included, ...new_only]) {
    const impr = row.impressions
    const conf = impr >= 100 ? 90 : impr >= 10 ? 75 : 60
    const mt   = assignMatchType(row.q, row.intent, conf, "gsc")
    const kw   = {
      text: row.q, source: "gsc", adGroupTheme: row.theme,
      intent: row.intent, confidence: conf, matchType: mt,
      expectedLeadQuality: leadQuality(row.intent, mt, conf),
      impressions: impr,
    }
    kw.effectiveScore = computeEffectiveScore(kw)
    allGSCKws.push(kw)
  }

  // Static AI search keywords (current)
  const AI_TARGET_QUERIES = [
    { text:"oem authorization letter fogging machine india", theme:"oem", intent:"oem_authorization", conf:68 },
    { text:"gem dealer authorization fogging machine",       theme:"gem", intent:"gem_reseller",      conf:62 },
    { text:"make in india fogging machine oem",              theme:"oem", intent:"oem_authorization", conf:62 },
  ]
  const aiKws = AI_TARGET_QUERIES.map(q => {
    const kw = { ...q, source:"ai_search", adGroupTheme:q.theme, confidence:q.conf,
      matchType:"PHRASE", expectedLeadQuality:"medium" }
    kw.effectiveScore = computeEffectiveScore(kw)
    return kw
  })

  // Static GeM keywords (current — 2 normalized)
  const gemKws = [
    { text:"portable fogging machine",    source:"gem_demand", adGroupTheme:"dealer", intent:"dealer_acquisition", confidence:68, matchType:"PHRASE", expectedLeadQuality:"medium", usabilityScore:100 },
    { text:"disinfectant fogging machine",source:"gem_demand", adGroupTheme:"dealer", intent:"dealer_acquisition", confidence:68, matchType:"PHRASE", expectedLeadQuality:"medium", usabilityScore:100 },
  ].map(kw => ({ ...kw, effectiveScore: computeEffectiveScore(kw) }))

  const expKws = generateExpansions()
  const allCandidates = deduplicate([...allGSCKws, ...aiKws, ...gemKws, ...expKws])

  const simSelected = {
    dealer: selectBest(allCandidates, "dealer"),
    oem:    selectBest(allCandidates, "oem"),
    gem:    selectBest(allCandidates, "gem"),
  }
  const simFlat = [...simSelected.dealer, ...simSelected.oem, ...simSelected.gem]
  const simTotal = simFlat.length

  const SOURCES = ["gsc","ads_search_terms","gem_demand","ai_search","competitor","indiamart","expansion"]
  const simContrib = {}
  for (const s of SOURCES) {
    const cnt = simFlat.filter(k => k.source === s).length
    simContrib[s] = { count: cnt, pct: simTotal > 0 ? Math.round(cnt/simTotal*100) : 0 }
  }

  const simExpPct = simContrib.expansion.pct
  const simMeets  = simExpPct < 30

  console.log(`\n  F. PROJECTED SOURCE CONTRIBUTION (simulated keyword intelligence run)`)
  console.log("═".repeat(80))
  console.log(`  [Using all ${total_new} new GSC keywords + existing GeM + AI Search + Expansion]`)
  console.log()
  console.log(`  ${"Source".padEnd(20)} ${"Current".padStart(9)} ${"Projected".padStart(11)}  Change`)
  console.log("  " + "─".repeat(55))

  const currentContrib = { gsc:"19%", gem_demand:"6%", ai_search:"8%", expansion:"69%", ads_search_terms:"0%", competitor:"0%", indiamart:"0%" }
  for (const s of SOURCES) {
    const { count, pct } = simContrib[s]
    const cur = currentContrib[s] ?? "0%"
    const arrow = pct > parseInt(cur) ? "▲" : pct < parseInt(cur) ? "▼" : "→"
    const change = pct !== parseInt(cur) ? ` ${arrow} ${Math.abs(pct - parseInt(cur))}pp` : " (no change)"
    console.log(`  ${s.padEnd(20)} ${cur.padStart(9)} ${(pct+"%").padStart(11)} ${change}`)
  }

  console.log(`\n  TOTAL keywords in selected set: ${simTotal}`)
  console.log(`  Expansion contribution: ${simExpPct}%  →  Success criterion (< 30%): ${simMeets ? "✓ PASS" : "✗ FAIL"}`)
  console.log()

  // Top 20 GSC keywords in new selected set by effectiveScore
  console.log(`  Top 20 GSC keywords entering selected set under new classifier:`)
  console.log(`  ${"#".padStart(3)}  ${"Keyword".padEnd(48)}  ${"Impr".padStart(5)}  ${"Eff".padStart(4)}  ${"MT".padEnd(6)}  ${"Intent".padEnd(22)}  Pathway`)
  console.log("  " + "─".repeat(125))
  const gscInSelected = simFlat.filter(k => k.source === "gsc").sort((a,b) => (b.effectiveScore??0)-(a.effectiveScore??0))
  for (let i = 0; i < Math.min(20, gscInSelected.length); i++) {
    const k = gscInSelected[i]
    const kTx = k.text.length > 47 ? k.text.slice(0,44)+"..." : k.text
    const pw = old_included.find(r => r.q === k.text) ? "existing" : (new_only.find(r => r.q === k.text)?.pathway ?? "existing")
    const eff = k.effectiveScore ?? computeEffectiveScore(k)
    console.log(`  ${String(i+1).padStart(3)}  ${kTx.padEnd(48)}  ${String(k.impressions??0).padStart(5)}  ${String(eff).padStart(4)}  ${k.matchType.padEnd(6)}  ${k.intent.padEnd(22)}  ${pw}`)
  }

  // ── DEPLOYMENT RECOMMENDATION ─────────────────────────────────────────────
  console.log(`\n  DEPLOYMENT RECOMMENDATION`)
  console.log("═".repeat(80))

  const cleanPromo = new_only.filter(r => r.risk === 0)
  const riskPromo  = new_only.filter(r => r.risk >= 3)

  console.log(`
  Promoted queries: ${new_only.length} total
    LOW risk (safe to deploy):   ${cleanPromo.length}
    HIGH risk (consumer likely): ${riskPromo.length}

  Recommended deploy strategy:
  ─────────────────────────────────────────────────────────────────────────
  Phase A (immediate — low risk):
    Deploy product_intent / manufacturer_intent / dealer_intent pathways
    with impressions ≥ 10 AND risk = LOW.
    Estimated: ${cleanPromo.filter(r=>r.impressions>=10).length} queries, ~${cleanPromo.filter(r=>r.impressions>=10).reduce((s,r)=>s+r.impressions,0)} impressions added.

  Phase B (after review — medium risk):
    Deploy remaining queries AFTER reviewing high-risk list above.
    Add "near me" and "mini fogger"-type terms to negatives first,
    or deploy only as BROAD match with tight negative list.

  Phase C (monitor — after 7 days):
    Check Search Terms report for consumer queries showing up.
    Add high-impression consumer terms to negative list.

  Key negatives to add before deploying product_intent pathway:
    "fogger near me", "fogger price", "fogger for home", "mini fogger"
    (Add as PHRASE match negatives in Funnel A campaign)
`)

  console.log("═".repeat(80))
  console.log("  Simulation complete. [No production changes made]")
  console.log("═".repeat(80) + "\n")

} finally {
  await client.close()
}
