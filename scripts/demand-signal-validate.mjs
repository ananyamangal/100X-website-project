/**
 * Phase 2A.5 Demand Signal Intelligence — live validation runner
 * Connects directly to MongoDB, runs all 6 signal sources, prints report.
 * Usage: node scripts/demand-signal-validate.mjs
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

// ── GeM KI filter: TIER_A fogging-only (mirrors fix in ads-keyword-intelligence.ts) ──
// NO TIER_B (reapers, tillers, seeders, brush cutters, harvesters).
// A false-positive keyword is more dangerous than a missed keyword.
const KI_GEM_FOGGING_PATTERNS = [
  "thermal\\s*fog", "\\bfogger\\b", "fogging\\s*machine", "fogging\\s*equipment",
  "fog\\s*sanitizer", "cold\\s*fog", "mist\\s*blow", "aero\\s*blast",
  "vehicle\\s*mount\\w*\\s*fog", "\\bULV\\b",
  "mosquito\\s*control", "vector\\s*control",
  "disease\\s*control\\s*(machine|equipment|spray|fogger)",
  "public\\s*health.*fog", "larvicid", "adulticid",
]
const GEM_REGEX = new RegExp(KI_GEM_FOGGING_PATTERNS.join("|"), "i")

// Secondary exclusion: reject agricultural / off-target products even if the
// fogging regex matched (e.g. "mist blower" matching a mist fan product name).
const KI_GEM_EXCLUDES = [
  /\breaper\b/i, /\btiller\b/i, /\btilling\b/i, /\bseeder\b/i, /\bseeding\b/i,
  /\bsower\b/i, /\bplanter\b/i, /\bharvest/i, /\bthresher\b/i, /\bchaff\b/i,
  /\bbrush\s*cut/i, /\bweeder\b/i, /\bweeding\b/i, /\brotavat/i, /\brotovat/i,
  /\bwinnow/i, /\bdrip\s*irrigat/i, /\bsprinkler\s*irrigat/i, /\bpump\s*set\b/i,
  /\bsubmersible\s*pump/i, /\btractor\b/i, /\bknapsack\s*sprayer\b/i,
  /\bhand\s*operated\s*sprayer/i, /\bknapsack\s*pump\b/i, /\bback\s*pack\s*sprayer/i,
  /\bsanitary\s*napkin/i, /\bhand\s*sanitizer\b/i, /\bface\s*mask\b/i,
]
function isExcluded(normalized) { return KI_GEM_EXCLUDES.some(re => re.test(normalized)) }

const TARGET_QUERIES = [
  "OEM authorization letter fogging machine India",
  "GeM dealer authorization fogging machine",
  "thermal fogging machine manufacturer India",
  "IS 14855 fogging machine",
  "municipal fogging machine GeM India",
  "NHM fogging machine procurement",
  "Make in India fogging machine OEM",
  "fogging machine for Nagar Panchayat",
  "vector control equipment GeM India",
  "MSME fogging machine manufacturer GeM",
]

const SOURCE_PRIORITY = {
  gsc: 100, ads_search_terms: 90, gem_demand: 80,
  ai_search: 70, competitor: 60, indiamart: 50, expansion: 10,
}

// Evidence Bonus — mirrors EVIDENCE_BONUS in ads-keyword-intelligence.ts v2.2.0
const EVIDENCE_BONUS = {
  ads_search_terms: 25,
  gsc:              18,
  gem_demand:       15,
  ai_search:        10,
  competitor:        8,
  indiamart:         5,
  expansion:         0,
}

function computeQualityBonus(usabilityScore) {
  if (usabilityScore === undefined || usabilityScore === null) return 0
  if (usabilityScore >= 90) return 8
  if (usabilityScore >= 75) return 5
  if (usabilityScore >= 60) return 3
  return 0
}

function computeEffectiveScore(kw) {
  return kw.confidence + (EVIDENCE_BONUS[kw.source] ?? 0) + computeQualityBonus(kw.usabilityScore)
}

function withEffectiveScores(kws) {
  return kws.map(kw => ({ ...kw, effectiveScore: computeEffectiveScore(kw) }))
}

const INTENT_SIGNALS = {
  gem_reseller: ["gem", "gem portal", "gem seller", "gem reseller", "gem vendor", "gem registration",
    "gem authorized", "gem listed", "gem portal seller", "government e-marketplace"],
  oem_authorization: ["oem", "original equipment manufacturer", "brand authorization",
    "brand partner", "manufacturer authorization", "oem partnership",
    "oem authorized", "oem supplier", "oem dealer"],
  dealer_acquisition: ["dealer", "dealership", "distributor", "franchise", "reseller",
    "channel partner", "become a dealer", "agent", "stockist",
    "dealership opportunity", "sub-dealer", "authorized dealer"],
  informational: ["price", "cost", "how to", "what is", "review", "comparison",
    "vs", "specification", "spec", "manual", "repair", "service",
    "youtube", "video", "tutorial", "home use", "domestic"],
}

function classifyIntent(q) {
  const ql = q.toLowerCase()
  for (const [intent, signals] of Object.entries(INTENT_SIGNALS)) {
    if (signals.some(s => ql.includes(s))) return intent
  }
  return "commercial_general"
}

function intentToTheme(intent) {
  if (intent === "dealer_acquisition") return "dealer"
  if (intent === "oem_authorization")  return "oem"
  if (intent === "gem_reseller")       return "gem"
  return null
}

function assignMatchType(query, intent, confidence, source) {
  const wc = query.trim().split(/\s+/).length
  const isSpecific = ["dealer_acquisition", "oem_authorization", "gem_reseller"].includes(intent)
  if (confidence >= 80 && isSpecific) return "EXACT"
  if (wc >= 4 && confidence >= 70 && isSpecific) return "EXACT"
  if (["gsc","gem_demand","ai_search","ads_search_terms"].includes(source) && confidence >= 60 && wc >= 2) return "PHRASE"
  if (wc <= 2 && confidence >= 60) return "PHRASE"
  if (source === "expansion" && confidence < 65) return "BROAD"
  return "PHRASE"
}

function leadQuality(intent, matchType, confidence) {
  const top = ["dealer_acquisition","oem_authorization"].includes(intent)
  if (top && matchType === "EXACT" && confidence >= 75) return "high"
  if (["dealer_acquisition","oem_authorization","gem_reseller"].includes(intent) && matchType !== "BROAD" && confidence >= 60) return "medium"
  return "low"
}

// ── Extract sources ───────────────────────────────────────────────────────────

async function extractGSC(db) {
  const rows = await db.collection("gsc_query_rows")
    .find({ impressions: { $gte: 1 } })
    .sort({ impressions: -1 })
    .limit(500)
    .toArray()

  const kws = []
  for (const row of rows) {
    const query = String(row.query ?? "").trim().toLowerCase()
    if (!query || query.length < 3) continue
    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    if (!theme) continue
    const impr = Number(row.impressions ?? 0)
    const conf = impr >= 100 ? 90 : impr >= 10 ? 75 : 60
    const mt = assignMatchType(query, intent, conf, "gsc")
    kws.push({ text: query, source: "gsc", discoveryMethod: impr >= 100 ? "gsc_high_impression" : "gsc_impression",
      intent, adGroupTheme: theme, confidence: conf, matchType: mt,
      expectedLeadQuality: leadQuality(intent, mt, conf), impressions: impr })
  }
  return kws
}

async function extractAdsSearchTerms(db) {
  const rows = await db.collection("ads_searchterm_rows").find({}).limit(200).toArray()
  const kws = []
  for (const row of rows) {
    const query = String(row.searchTerm ?? row.search_term ?? "").trim().toLowerCase()
    if (!query || query.length < 3) continue
    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    if (!theme) continue
    const clicks = Number(row.clicks ?? 0)
    const convs  = Number(row.conversions ?? 0)
    const conf = convs > 0 ? 88 : clicks >= 5 ? 80 : 75
    const mt = assignMatchType(query, intent, conf, "ads_search_terms")
    kws.push({ text: query, source: "ads_search_terms", discoveryMethod: convs > 0 ? "ads_search_term_conversion" : "ads_search_term_click",
      intent, adGroupTheme: theme, confidence: conf, matchType: mt,
      expectedLeadQuality: leadQuality(intent, mt, conf) })
  }
  return kws
}

// ── GeM 4-gate quality filter (mirrors checkGeMUsability in ads-keyword-intelligence.ts) ──

const USABILITY_THRESHOLD = 50
const GEM_FILLER_RE = /\b(unbranded|branded)\b/gi

const GEM_COMPANY_SUFFIXES = new Set([
  "enterprise", "enterprises", "industries", "industry",
  "corporation", "corp", "pvt", "ltd", "limited",
  "traders", "trader", "suppliers", "supplier",
  "agency", "agencies", "associates", "solutions",
  "services", "company",
])

function stripCompanySuffixes(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean)
  const drop  = new Set()
  for (let i = 0; i < words.length; i++) {
    if (GEM_COMPANY_SUFFIXES.has(words[i])) {
      drop.add(i)
      if (i > 0) drop.add(i - 1)
    }
  }
  return words.filter((_, i) => !drop.has(i)).join(" ")
}

const KI_STRONG_MACHINE_NOUNS = [
  /fogging\s+machine/i, /fogging\s+equipment/i,
  /\bfogger(s)?\b/i,
  /fog\s+(machine|equipment|sanitizer|unit)/i,
  /\bULV\s+(fogger|machine|equipment|unit)/i,
  /mist\s*blow(er)?/i, /aero\s*blast/i,
  /\bfogging\b/i,
  /vector\s*control\s+(machine|equipment|device)/i,
  /mosquito\s*control\s+(machine|equipment|device)/i,
]

const KI_CHEMICAL_TERMS = [
  /\bdeltamethrin\b/i, /\bcypermethrin\b/i, /\bmalathion\b/i,
  /\btemephos\b/i, /\bpermethrin\b/i, /\bfenitrothion\b/i,
  /\bpropoxur\b/i, /\bpyrethr/i,
  /\boils?\b/i, /\bseeds?\b/i, /\bchemical(s)?\b/i, /\bliquid\b/i,
  /\bpesticide(s)?\b/i, /\binsecticide(s)?\b/i, /\bformulation\b/i,
  /\blarvicidal\b/i, /\badulticidal\b/i, /\bfungicide\b/i,
  /\bherbicide\b/i, /\bconcentrate\b/i, /\bemulsifi/i,
  /\b(wp|ec|sc|gr|wdg|sl|dp)\b/i,
  /\d+(\.\d+)?\s*%/, /\d+(\.\d+)?\s*(wp|ec|sc|gr)\b/i,
]

const KI_DESIGNATION_PATTERNS = [
  /\bdrdo\b/i, /\bultrasonic\b/i, /\bultrasound\b/i, /\bnano\s*tech/i,
  /per\s*\d{3,}/i, /\b\d{4,}\b/,
  /\d+(\.\d+)?\s*(ml|litre|ltr|kg|gm|lit)\b/i,
]

function checkGeMUsability(phrase) {
  // Gate 1: machine noun → KEEP
  if (KI_STRONG_MACHINE_NOUNS.some(re => re.test(phrase))) {
    let score = 50
    const words = phrase.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4)  score += 25
    else if (words.length === 5)                  score += 15
    else if (words.length === 6)                  score += 5
    if (!/\d/.test(phrase))                        score += 15
    if (/fogging\s+machine|fogger/i.test(phrase))  score += 10
    return { score: Math.min(100, score), pass: true }
  }
  // Gate 2: chemical term → REJECT
  for (const re of KI_CHEMICAL_TERMS) {
    if (re.test(phrase)) {
      return { score: 0, pass: false, rejectClass: "chemical_intent",
        rejectReason: "Chemical or consumable product — not a fogging machine keyword" }
    }
  }
  // Gate 3: designation → REJECT
  for (const re of KI_DESIGNATION_PATTERNS) {
    if (re.test(phrase)) {
      return { score: 0, pass: false, rejectClass: "designation_intent",
        rejectReason: "Technology designation or spec code without machine noun context" }
    }
  }
  return { score: 20, pass: false, rejectClass: "no_machine_noun",
    rejectReason: "No fogging/vector-control machine noun found in phrase" }
}

async function extractGeM(db, gemRejections) {
  const contracts = await db.collection("gem_contracts")
    .find({ product_name: { $regex: GEM_REGEX } }, { projection: { product_name: 1 } })
    .sort({ contract_date_dt: -1 })
    .limit(1000)
    .toArray()

  const nameCount = new Map()
  let rejectedByExclusion = 0
  let rejectedByQuality   = 0
  let acceptedCount        = 0

  for (const c of contracts) {
    const raw = String(c.product_name ?? "").trim()
    if (!raw || raw.length < 5) continue

    // Step 1: normalize
    const normalized = raw.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(?:is|as|for|with|and|the|of|in|on|by|at)\b/g, " ")
      .replace(/\s+/g, " ").trim()

    // Step 2: agricultural exclusion guard
    if (isExcluded(normalized)) {
      rejectedByExclusion++
      gemRejections.push({ original: raw, normalized, rejectClass: "agricultural_filter",
        rejectReason: "Matches agricultural/off-target product exclusion pattern" })
      continue
    }

    // Step 3: strip filler words (unbranded/branded)
    const noFiller = normalized.replace(GEM_FILLER_RE, "").replace(/\s+/g, " ").trim()

    // Step 4: strip company suffixes (suffix word + preceding proper-name word)
    const stripped = stripCompanySuffixes(noFiller).replace(/\s+/g, " ").trim()

    // Step 5: take first 6 words → shortform
    const shortform = stripped.split(/\s+/).filter(Boolean).slice(0, 6).join(" ")
    if (shortform.split(/\s+/).length < 2 || shortform.length < 6) continue

    // Step 6: quality gate
    const result = checkGeMUsability(shortform)
    if (!result.pass || result.score < USABILITY_THRESHOLD) {
      rejectedByQuality++
      gemRejections.push({ original: raw, normalized: shortform,
        rejectClass: result.rejectClass ?? "no_machine_noun",
        rejectReason: result.rejectReason ?? "Below usability threshold" })
      continue
    }

    acceptedCount++
    const existing = nameCount.get(shortform)
    nameCount.set(shortform, {
      count: (existing?.count ?? 0) + 1,
      usabilityScore: result.score,
      originalSample: existing?.originalSample ?? raw,
      normalizedSample: stripped,
    })
  }

  console.log(`  GeM: ${contracts.length} contracts matched fogging regex`)
  console.log(`       → ${rejectedByExclusion} rejected by agricultural exclusion guard`)
  console.log(`       → ${rejectedByQuality} rejected by 4-gate quality filter`)
  console.log(`       → ${nameCount.size} unique phrases accepted`)

  const kws = []
  for (const [text, { count, usabilityScore }] of nameCount) {
    const intent = classifyIntent(text)
    const theme  = intentToTheme(intent) ?? "dealer"
    const resolvedIntent = intentToTheme(intent) ? intent : "dealer_acquisition"
    const conf = count >= 20 ? 82 : count >= 5 ? 74 : 65
    const mt = assignMatchType(text, resolvedIntent, conf, "gem_demand")
    kws.push({ text, source: "gem_demand", discoveryMethod: "gem_product_name",
      intent: resolvedIntent, adGroupTheme: theme, confidence: conf, matchType: mt,
      expectedLeadQuality: leadQuality(resolvedIntent, mt, conf), gemCount: count, usabilityScore })
  }
  return kws.sort((a,b) => b.confidence - a.confidence)
}

async function extractAISearch(db) {
  const citations = await db.collection("growth_os_citations").find({}).toArray()
  const citMap = new Map()
  for (const c of citations) {
    const q = String(c.query ?? "").trim()
    if (!q) continue
    const ex = citMap.get(q) || { mentioned: false, hasData: false }
    citMap.set(q, { mentioned: ex.mentioned || Boolean(c.mentioned), hasData: true })
  }

  const kws = []
  for (const query of TARGET_QUERIES) {
    const ql = query.toLowerCase().trim()
    if (!ql || ql.length < 5) continue
    const cit = citMap.get(query)
    const conf = cit?.mentioned ? 78 : cit?.hasData ? 68 : 62
    const intent = classifyIntent(ql)
    const theme  = intentToTheme(intent) ?? "dealer"
    const resolvedIntent = intentToTheme(intent) ? intent : "dealer_acquisition"
    const mt = assignMatchType(ql, resolvedIntent, conf, "ai_search")
    kws.push({ text: ql, source: "ai_search",
      discoveryMethod: cit?.mentioned ? "ai_query_mentioned" : "ai_query_tracked",
      intent: resolvedIntent, adGroupTheme: theme, confidence: conf, matchType: mt,
      expectedLeadQuality: leadQuality(resolvedIntent, mt, conf) })
  }
  return kws
}

// ── Expansion engine ──────────────────────────────────────────────────────────
const PRODUCT_BASES = ["fogging machine", "thermal fogging machine", "thermal fogger", "ulv fogger"]
const EXPANSION_SPECS = {
  dealer: [
    { modifier: "dealership", intent: "dealer_acquisition", confidence: 75 },
    { modifier: "dealer", intent: "dealer_acquisition", confidence: 70 },
    { modifier: "distributor", intent: "dealer_acquisition", confidence: 70 },
    { modifier: "franchise", intent: "dealer_acquisition", confidence: 60 },
    { modifier: "reseller", intent: "dealer_acquisition", confidence: 65 },
    { modifier: "dealership opportunity", intent: "dealer_acquisition", confidence: 65 },
    { modifier: "authorized dealer", intent: "dealer_acquisition", confidence: 72 },
    { modifier: "distributor india", intent: "dealer_acquisition", confidence: 63 },
  ],
  oem: [
    { modifier: "oem", intent: "oem_authorization", confidence: 72 },
    { modifier: "oem authorization", intent: "oem_authorization", confidence: 78 },
    { modifier: "oem authorized", intent: "oem_authorization", confidence: 78 },
    { modifier: "oem supplier", intent: "oem_authorization", confidence: 68 },
    { modifier: "oem partnership", intent: "oem_authorization", confidence: 65 },
    { modifier: "brand authorization", intent: "oem_authorization", confidence: 70 },
  ],
  gem: [
    { modifier: "gem reseller", intent: "gem_reseller", confidence: 78 },
    { modifier: "gem seller", intent: "gem_reseller", confidence: 75 },
    { modifier: "gem vendor", intent: "gem_reseller", confidence: 70 },
    { modifier: "gem portal reseller", intent: "gem_reseller", confidence: 72 },
    { modifier: "gem authorized reseller", intent: "gem_reseller", confidence: 75 },
    { modifier: "government reseller", intent: "gem_reseller", confidence: 60 },
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
        kws.push({ text, source: "expansion", discoveryMethod: "algorithmic_expansion",
          intent: spec.intent, adGroupTheme: theme, confidence: spec.confidence, matchType: mt,
          expectedLeadQuality: leadQuality(spec.intent, mt, spec.confidence) })
      }
    }
  }
  return kws
}

// ── Dedup + Select (Evidence Bonus ranking) ───────────────────────────────────
function deduplicate(kws) {
  const seen = new Map()
  for (const kw of kws) {
    const key = `${kw.adGroupTheme}:${kw.text}`
    const ex = seen.get(key)
    if (!ex || (kw.effectiveScore ?? 0) > (ex.effectiveScore ?? 0)) {
      seen.set(key, kw)
    }
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
  sel.push(...rest.slice(0, 12 - sel.length))
  return sel
}

// ── Business quality review ───────────────────────────────────────────────────
function qualityReview(kw) {
  const text = kw.text
  // Excellent: high conf, real source, specific intent, EXACT match
  if (kw.confidence >= 78 && kw.source !== "expansion" && kw.matchType === "EXACT") return "EXCELLENT"
  // Usable: good conf, specific intent, decent match
  if (kw.confidence >= 65 && ["dealer_acquisition","oem_authorization","gem_reseller"].includes(kw.intent)) return "USABLE"
  // Nonsense: long garbled strings, certification codes as keywords, pure product specs
  const words = text.split(" ").filter(Boolean)
  if (words.length >= 6 && /\b\d{4,}\b/.test(text)) return "WEAK"  // cert numbers in long phrases
  if (kw.source === "gem_demand" && words.length >= 5 && kw.confidence < 70) return "WEAK"
  if (kw.intent === "informational") return "WEAK"
  if (kw.intent === "commercial_general" && kw.confidence < 65 && kw.source === "expansion") return "WEAK"
  return "USABLE"
}

// ── Main ──────────────────────────────────────────────────────────────────────
const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db("100xDB")

  console.log("\n⏳ Running all 6 signal sources...\n")

  const gemRejections = []
  const [gscKws, adsKws, gemKws, aiKws] = await Promise.all([
    extractGSC(db),
    extractAdsSearchTerms(db),
    extractGeM(db, gemRejections),
    extractAISearch(db),
  ])
  const expKws = generateExpansions()

  console.log(`Raw signals: GSC=${gscKws.length}  Ads=${adsKws.length}  GeM=${gemKws.length}  AI=${aiKws.length}  Expansion=${expKws.length}`)

  const all = deduplicate(withEffectiveScores([...gscKws, ...adsKws, ...gemKws, ...aiKws, ...expKws]))

  const byTheme = {
    dealer: selectBest(all, "dealer"),
    oem:    selectBest(all, "oem"),
    gem:    selectBest(all, "gem"),
  }

  const flat = [...byTheme.dealer, ...byTheme.oem, ...byTheme.gem]
  const total = flat.length

  // ── 1. SOURCE CONTRIBUTION TABLE ──────────────────────────────────────────
  const sources = ["gsc","ads_search_terms","gem_demand","ai_search","competitor","indiamart","expansion"]
  const contrib = {}
  for (const s of sources) {
    const count = flat.filter(k => k.source === s).length
    contrib[s] = { count, pct: total > 0 ? Math.round(count/total*100) : 0 }
  }

  console.log("\n" + "═".repeat(70))
  console.log("  1. SOURCE CONTRIBUTION TABLE")
  console.log("═".repeat(70))
  console.log(`${"Source".padEnd(22)} ${"Count".padStart(6)}  ${"Pct".padStart(6)}  Status`)
  console.log("─".repeat(70))
  for (const s of sources) {
    const { count, pct } = contrib[s]
    const status = s === "competitor" || s === "indiamart" ? "PENDING DATA"
      : count === 0 ? "NO DATA"
      : "ACTIVE"
    const bar = "█".repeat(Math.round(pct/5))
    console.log(`${s.padEnd(22)} ${String(count).padStart(6)}  ${(pct+"%").padStart(6)}  ${status}  ${bar}`)
  }
  console.log("─".repeat(70))
  console.log(`${"TOTAL".padEnd(22)} ${String(total).padStart(6)}`)

  // ── 2. SUCCESS METRIC ─────────────────────────────────────────────────────
  const expansionPct = contrib.expansion.pct
  const discovered = flat.filter(k => k.source !== "expansion").length
  const discoveredPct = total > 0 ? Math.round(discovered/total*100) : 0
  const meets = expansionPct < 30

  console.log("\n" + "═".repeat(70))
  console.log("  2. SUCCESS METRIC")
  console.log("═".repeat(70))
  console.log(`  expansionContributionPct : ${expansionPct}%`)
  console.log(`  discoveredPct            : ${discoveredPct}%`)
  console.log(`  meetsSuccessCriterion    : ${meets ? "✓ PASS" : "✗ FAIL"} (threshold: expansion < 30%)`)
  if (!meets) console.log(`  → ${expansionPct - 29} percentage points above threshold. Need more live data.`)

  // ── 2B. GeM QUALITY FILTER REPORT ────────────────────────────────────────
  const agrRejections = gemRejections.filter(r => r.rejectClass === "agricultural_filter")
  const qualRejections = gemRejections.filter(r => r.rejectClass !== "agricultural_filter")

  console.log("\n" + "═".repeat(70))
  console.log("  2B. GeM QUALITY FILTER REPORT")
  console.log("═".repeat(70))
  console.log(`  Total GeM contracts matched fogging regex: ${agrRejections.length + qualRejections.length + gemKws.length} (est)`)
  console.log(`  Rejected by agricultural guard:   ${agrRejections.length}`)
  console.log(`  Rejected by 4-gate quality filter: ${qualRejections.length}`)
  console.log(`  Accepted phrases:                 ${gemKws.length}`)

  if (agrRejections.length > 0) {
    console.log(`\n  Agricultural rejections (sample):`)
    for (const r of agrRejections.slice(0, 5)) {
      console.log(`    ✗ "${r.original.slice(0, 70)}"`)
    }
  }

  if (qualRejections.length > 0) {
    const byClass = {}
    for (const r of qualRejections) {
      byClass[r.rejectClass] = (byClass[r.rejectClass] ?? 0) + 1
    }
    console.log(`\n  Quality rejections by class:`)
    for (const [cls, cnt] of Object.entries(byClass)) {
      console.log(`    ${cls.padEnd(20)} ${cnt}`)
    }
    console.log(`\n  Rejected phrase details:`)
    for (const r of qualRejections) {
      const orig = r.original.length > 55 ? r.original.slice(0, 52) + "..." : r.original
      const norm = r.normalized.length > 45 ? r.normalized.slice(0, 42) + "..." : r.normalized
      console.log(`    ✗ original:   "${orig}"`)
      console.log(`      normalized: "${norm}"`)
      console.log(`      reason:     [${r.rejectClass}] ${r.rejectReason}`)
      console.log()
    }
  }

  if (gemKws.length > 0) {
    console.log(`  Accepted phrases:`)
    for (const k of gemKws) {
      console.log(`    ✓ "${k.text}"  [conf:${k.confidence}  usability:${k.usabilityScore}  count:${k.gemCount}  theme:${k.adGroupTheme}]`)
    }
  } else {
    console.log(`\n  No GeM phrases passed the quality filter.`)
  }

  // ── 3. TOP 50 KEYWORDS (ranked by effectiveScore) ────────────────────────
  const sorted = [...flat].sort((a,b) => (b.effectiveScore ?? b.confidence) - (a.effectiveScore ?? a.confidence))
  const top50  = sorted.slice(0, 50)

  console.log("\n" + "═".repeat(70))
  console.log("  3. TOP 50 KEYWORDS  [ranked by effectiveScore = conf + evidenceBonus + qualityBonus]")
  console.log("═".repeat(70))
  console.log(`${"#".padStart(3)}  ${"Keyword".padEnd(40)} ${"Src".padEnd(16)} ${"Cf".padStart(3)} ${"Eff".padStart(4)} ${"MT".padEnd(7)} ${"Intent".padEnd(22)} ${"LQ".padEnd(7)} Discovery`)
  console.log("─".repeat(150))
  for (let i=0; i<top50.length; i++) {
    const k = top50[i]
    const kText = k.text.length > 39 ? k.text.slice(0,36)+"..." : k.text
    const eff = k.effectiveScore ?? computeEffectiveScore(k)
    console.log(
      `${String(i+1).padStart(3)}  ${kText.padEnd(40)} ${k.source.padEnd(16)} ${String(k.confidence).padStart(3)} ${String(eff).padStart(4)} ${k.matchType.padEnd(7)} ${k.intent.padEnd(22)} ${k.expectedLeadQuality.padEnd(7)} ${k.discoveryMethod}`
    )
  }

  // ── 3B. EFFECTIVE SCORE BREAKDOWN ─────────────────────────────────────────
  const allSources = ["gsc","ads_search_terms","gem_demand","ai_search","competitor","indiamart","expansion"]
  console.log("\n" + "═".repeat(70))
  console.log("  3B. EFFECTIVE SCORE BREAKDOWN  [Evidence Bonus ranking model v2.2.0]")
  console.log("═".repeat(70))
  console.log(`${"Source".padEnd(20)} ${"EvidBonus".padStart(10)} ${"Selected".padStart(9)} ${"Min Eff".padStart(8)} ${"Max Eff".padStart(8)}  Example keyword`)
  console.log("─".repeat(90))
  for (const src of allSources) {
    const selected = flat.filter(k => k.source === src)
    const eb = EVIDENCE_BONUS[src] ?? 0
    if (selected.length === 0) {
      const pending = src === "competitor" || src === "indiamart" ? "PENDING" : "NO DATA"
      console.log(`${src.padEnd(20)} ${("+"+eb).padStart(10)} ${"0".padStart(9)}           —           —  [${pending}]`)
    } else {
      const effs = selected.map(k => k.effectiveScore ?? computeEffectiveScore(k))
      const minE = Math.min(...effs)
      const maxE = Math.max(...effs)
      const ex   = selected.sort((a,b) => (b.effectiveScore??0)-(a.effectiveScore??0))[0]
      const exTxt = ex.text.length > 35 ? ex.text.slice(0,32)+"..." : ex.text
      console.log(`${src.padEnd(20)} ${("+"+eb).padStart(10)} ${String(selected.length).padStart(9)} ${String(minE).padStart(8)} ${String(maxE).padStart(8)}  "${exTxt}"`)
    }
  }

  // ── 3C. GeM KEYWORDS IN SELECTED SET ─────────────────────────────────────
  console.log("\n" + "═".repeat(70))
  console.log("  3C. GeM KEYWORDS ENTERING SELECTED SET")
  console.log("═".repeat(70))
  const gemSelected = flat.filter(k => k.source === "gem_demand")
  if (gemSelected.length === 0) {
    // Show GeM candidates that were generated but lost in ranking
    const gemCandidates = all.filter(k => k.source === "gem_demand")
    if (gemCandidates.length === 0) {
      console.log("  GeM: 0 keywords selected. No GeM candidates in deduped pool (all filtered by quality gate).")
    } else {
      console.log(`  GeM: 0 keywords selected. ${gemCandidates.length} candidate(s) generated but lost to higher-scoring keywords:`)
      for (const k of gemCandidates) {
        const eff = k.effectiveScore ?? computeEffectiveScore(k)
        // find the keyword that displaced it from its theme slot
        const themeSelected = flat.filter(x => x.adGroupTheme === k.adGroupTheme)
        const lowestSelected = themeSelected.sort((a,b) => (a.effectiveScore??0)-(b.effectiveScore??0))[0]
        const lowestEff = lowestSelected ? (lowestSelected.effectiveScore ?? computeEffectiveScore(lowestSelected)) : "—"
        console.log(`    GeM candidate: "${k.text}"`)
        console.log(`      conf=${k.confidence}  evidBonus=+${EVIDENCE_BONUS.gem_demand}  qualityBonus=+${computeQualityBonus(k.usabilityScore)}  effectiveScore=${eff}`)
        console.log(`      Lowest selected in ${k.adGroupTheme} theme: effectiveScore=${lowestEff}`)
        if (typeof lowestEff === "number" && eff < lowestEff) {
          console.log(`      ✗ Still below cut — needs higher confidence or more contracts to raise score`)
        } else if (typeof lowestEff === "number" && eff >= lowestEff) {
          console.log(`      ✓ SHOULD BE IN — check MAX_PER_GROUP or theme slot logic`)
        }
      }
    }
  } else {
    console.log(`  GeM: ${gemSelected.length} keyword(s) selected:`)
    for (const k of gemSelected) {
      const eff = k.effectiveScore ?? computeEffectiveScore(k)
      const qb  = computeQualityBonus(k.usabilityScore)
      const rank = sorted.indexOf(k) + 1
      console.log(`    ✓ "${k.text}"`)
      console.log(`      conf=${k.confidence}  +evidBonus=${EVIDENCE_BONUS.gem_demand}  +qualityBonus=${qb}  = effectiveScore ${eff}`)
      console.log(`      usabilityScore=${k.usabilityScore ?? "n/a"}  gemCount=${k.gemCount}  theme=${k.adGroupTheme}  rank=#${rank} in selected set`)
    }
  }

  // ── 4. BUSINESS QUALITY REVIEW ────────────────────────────────────────────
  const excellent = flat.filter(k => qualityReview(k) === "EXCELLENT")
  const usable    = flat.filter(k => qualityReview(k) === "USABLE")
  const weak      = flat.filter(k => qualityReview(k) === "WEAK")

  console.log("\n" + "═".repeat(70))
  console.log("  4. BUSINESS QUALITY REVIEW")
  console.log("═".repeat(70))

  console.log(`\n  EXCELLENT (${excellent.length}) — High confidence, real source, EXACT match:`)
  for (const k of excellent.slice(0,15)) {
    console.log(`    ✓ "${k.text}"  [${k.source} / ${k.confidence}% / ${k.adGroupTheme}]`)
  }
  if (excellent.length === 0) console.log("    (none)")

  console.log(`\n  USABLE (${usable.length}) — Good intent, deployable with normal campaign safeguards:`)
  for (const k of usable.slice(0,15)) {
    console.log(`    ○ "${k.text}"  [${k.source} / ${k.confidence}% / ${k.matchType}]`)
  }
  if (usable.length === 0) console.log("    (none)")

  console.log(`\n  WEAK (${weak.length}) — Low confidence, wrong intent, or garbled GeM text:`)
  for (const k of weak.slice(0,15)) {
    console.log(`    △ "${k.text}"  [${k.source} / ${k.confidence}% / intent:${k.intent}]`)
  }
  if (weak.length === 0) console.log("    (none)")

  // ── 5. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
  const highQualityCount = excellent.length + usable.length
  const gemHasData  = contrib.gem_demand.count > 0
  const aiHasData   = contrib.ai_search.count > 0
  const gscHasData  = contrib.gsc.count > 0

  console.log("\n" + "═".repeat(70))
  console.log("  5. EXECUTIVE SUMMARY")
  console.log("═".repeat(70))

  console.log(`
  A. Is the system currently discovering demand?
  ─────────────────────────────────────────────
  ${gscHasData || gemHasData || aiHasData ? "YES — partially." : "NO — all keywords are expansion-generated."}
  GSC contributing: ${gscHasData ? `YES (${contrib.gsc.count} keywords, ${contrib.gsc.pct}%)` : "NO — no GSC data in gsc_query_rows matching fogging/dealer intent"}
  Ads Search Terms: ${contrib.ads_search_terms.count > 0 ? `YES (${contrib.ads_search_terms.count} keywords, ${contrib.ads_search_terms.pct}%)` : "NO — no ads_searchterm_rows data"}
  GeM Demand:       ${gemHasData ? `YES (${contrib.gem_demand.count} keywords from government procurement contracts, ${contrib.gem_demand.pct}%)` : "NO — gem_contracts regex returned 0 matching product names"}
  AI Search:        ${aiHasData ? `YES (${contrib.ai_search.count} queries tracked, ${contrib.ai_search.pct}%)` : "NO — no citations data in growth_os_citations"}
  Competitor:       NO — pending (data source not built yet)
  IndiaMART:        NO — pending (governance: scraping freeze)

  B. What percentage of recommendations come from expansion?
  ──────────────────────────────────────────────────────────
  ${expansionPct}% of selected keywords are expansion-generated.
  Success criterion: < 30%. Current status: ${meets ? "✓ PASS" : "✗ FAIL — " + (expansionPct-29) + "pp above threshold."}
  ${discoveredPct}% come from real market signals.

  C. Would you trust these keywords with real money today?
  ────────────────────────────────────────────────────────
  ${highQualityCount >= 20 && meets
    ? `CONDITIONALLY YES. ${excellent.length} excellent keywords, ${usable.length} usable. Expansion is below 30%.
  Launch with ₹200–500/day test budget. Pause after 300 impressions and review CTR.`
    : excellent.length >= 5 && !meets
    ? `NOT YET — but close. ${excellent.length} excellent keywords exist. Problem is ${expansionPct}% expansion weight.
  The expansion keywords are not wrong — they are unvalidated. Connect GSC + Ads search terms
  to get real signal data. Once expansion drops below 30%, launch with a small test budget.`
    : `NO. Only ${excellent.length} excellent keyword${excellent.length !== 1?"s":""} in the set.
  The system is running mostly on expansion. Real discovery needs GSC data (sync Google Search
  Console) and Ads search terms (run a small discovery campaign first).`}

  D. Highest-ROI next improvement
  ────────────────────────────────
  ${!gscHasData
    ? `1. SYNC GSC DATA. Connect Google Search Console → run a data sync. Even 50 real queries
     will shift expansion contribution from ${expansionPct}% → likely below 30% immediately,
     because GSC queries with dealer intent score at 75–90 confidence and beat expansion in selectBest().`
    : gemHasData && contrib.gem_demand.pct < 20
    ? `1. IMPROVE GeM KEYWORD NORMALIZATION. ${contrib.gem_demand.count} GeM contract names are coming through
     but likely as 5–6 word technical phrases. Review weak keywords above — if GeM phrases appear there,
     shorten the normalization to 3–4 words for better match-type assignment.`
    : `1. CONNECT ADS SEARCH TERMS. Run a small ₹200/day discovery campaign using current keywords.
     After 1–2 weeks, Ads Search Terms report will populate ads_searchterm_rows with real clicked
     queries — these convert at 88–90 confidence and will displace expansion keywords.`}
`)

  console.log("═".repeat(70))
  console.log("  Run complete.")
  console.log("═".repeat(70) + "\n")

} finally {
  await client.close()
}
