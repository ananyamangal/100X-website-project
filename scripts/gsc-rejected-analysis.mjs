/**
 * Priority 1: Rejected GSC Query Analysis
 * Pulls ALL gsc_query_rows, runs each through the current classifier,
 * identifies rejected queries, applies enhanced classification, and
 * outputs a ranked report of queries worth promoting.
 *
 * Usage: node --env-file=.env.local scripts/gsc-rejected-analysis.mjs
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }

// ── Anti-fog false positive guard (mirrors ads-keyword-intelligence.ts) ───────
const ANTI_FOG_INTENT_RE  = /\banti[\s-]?fog(?:ging)?\b|\bde[\s-]?fog(?:ging)?\b|\banti[\s-]?mist\b|\banti[\s-]?condensation\b|\bfogging\s+agent\b/i
const ANTI_FOG_MACHINE_RE = /\b(machine|fogger|foggers|thermal|ulv|mosquito|vector\s*control|municipal|gem|oem|distributor|dealer|manufacturer)\b/i
function isAntiFogFalsePositive(query) {
  return ANTI_FOG_INTENT_RE.test(query) && !ANTI_FOG_MACHINE_RE.test(query)
}

// ── Current classifier (mirrors ads-keyword-intelligence.ts) ─────────────────

const INTENT_SIGNALS = {
  gem_reseller: ["gem", "gem portal", "government e-marketplace", "gem seller",
    "gem reseller", "gem vendor", "gem registration", "gem authorized",
    "gem listed", "gem portal seller"],
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

function classifyIntent(query) {
  const q = query.toLowerCase()
  for (const [intent, signals] of Object.entries(INTENT_SIGNALS)) {
    if (signals.some(s => q.includes(s))) return intent
  }
  return "commercial_general"
}

function intentToTheme(intent) {
  if (intent === "dealer_acquisition") return "dealer"
  if (intent === "oem_authorization")  return "oem"
  if (intent === "gem_reseller")       return "gem"
  return null
}

// ── Enhanced classifier — finds value in rejected queries ────────────────────

const FOGGING_PRODUCT_RE  = /\b(fogging|fogger|thermal\s*fog|ulv\s*fog|fog\s*machine|mist\s*blow|aero\s*blast|cold\s*fog)\b/i
const GOVT_CONTEXT_RE     = /\b(municipal|nagar\s*panchayat|panchayat|government|public\s*health|nhm|nvbdcp|health\s*depart|zila\s*parishad|corporation\s*ward|civic\s*body|gram\s*panchayat|mcd|bbmp|nmmc|dghs|district\s*health|block\s*level|phc|chc|tender|procurement|l1\s*rate|rate\s*contract|supply\s*order|gem\s*tender)\b/i
const MANUFACTURER_RE     = /\b(manufacturer|factory|production|made\s*in\s*india|make\s*in\s*india|msme|company|brand\s*owner|oem\s*manufacturer|original\s*manufacturer)\b/i
const DEALER_INDIRECT_RE  = /\b(distributor|wholesaler|stockist|authorized|channel\s*partner|sub\s*dealer|trade\s*inquiry|b2b|supply\s*to)\b/i
const PROCUREMENT_RE      = /\b(tender|quotation|bid|rfq|rate\s*contract|supply|purchase\s*order|gem\s*portal|e-?procurement)\b/i
const ANTI_FOG_RE         = /\b(anti.?fog|anti\s*fogging|de.?fog|defogging|fog\s*proof|anti.?mist|anti.?condensation)\b/i
const COMMERCIAL_FOG_RE   = /\b(fogging\s*for|fogging\s*in|fogging\s*at|fogging\s*service|mosquito\s*fog|dengue\s*fog|vector\s*fog|disease\s*control\s*fog|sanitation\s*fog|disinfection\s*fog)\b/i

function enhancedClassify(query) {
  const q = query.toLowerCase()

  const hasFogging     = FOGGING_PRODUCT_RE.test(q)
  const hasGovt        = GOVT_CONTEXT_RE.test(q)
  const hasMfr         = MANUFACTURER_RE.test(q)
  const hasDealerInd   = DEALER_INDIRECT_RE.test(q)
  const hasProcurement = PROCUREMENT_RE.test(q)
  const isAntiFog      = ANTI_FOG_RE.test(q)
  const isFogService   = COMMERCIAL_FOG_RE.test(q)

  // False positive: currently INCLUDED but should be excluded
  if (isAntiFog && !hasFogging) {
    return {
      action:       "REMOVE_FALSE_POSITIVE",
      promoteTo:    null,
      leadQuality:  "none",
      rationale:    "Anti-fogging coating/film query — wrong product. Included due to 'agent' matching dealer_acquisition. Add 'anti-fog' as negative.",
      priority:     "URGENT",
    }
  }

  if (hasFogging && hasGovt) {
    return {
      action:      "PROMOTE",
      promoteTo:   "dealer_acquisition",
      leadQuality: "HIGH",
      rationale:   "Government/municipal + fogging machine — institutional buyer context. Dealers need these queries.",
      priority:    "HIGH",
    }
  }

  if (hasFogging && hasProcurement) {
    return {
      action:      "PROMOTE",
      promoteTo:   "dealer_acquisition",
      leadQuality: "HIGH",
      rationale:   "Procurement/tender + fogging machine — government buyer actively sourcing. Very high dealer value.",
      priority:    "HIGH",
    }
  }

  if (hasFogging && hasMfr) {
    return {
      action:      "PROMOTE",
      promoteTo:   "oem_authorization",
      leadQuality: "MEDIUM",
      rationale:   "Manufacturer context + fogging machine — OEM authorization intent.",
      priority:    "MEDIUM",
    }
  }

  if (hasFogging && hasDealerInd) {
    return {
      action:      "PROMOTE",
      promoteTo:   "dealer_acquisition",
      leadQuality: "MEDIUM-HIGH",
      rationale:   "Indirect dealer signal + fogging machine — distributor/wholesaler intent.",
      priority:    "MEDIUM",
    }
  }

  if (isFogService && !hasFogging) {
    return {
      action:      "PROMOTE",
      promoteTo:   "dealer_acquisition",
      leadQuality: "MEDIUM",
      rationale:   "Fogging-as-a-service query — government/commercial buyers who need fogging. Dealers serve these clients.",
      priority:    "MEDIUM",
    }
  }

  if (hasFogging) {
    const q_lower = query.toLowerCase()
    const isInformational = /\b(price|cost|how\s*much|rate|review|compare|how\s*to|manual|spec|brochure|repair|hire|rent|buy|purchase|amazon|flipkart)\b/.test(q_lower)
    if (isInformational) {
      return {
        action:      "NEGATIVE_CANDIDATE",
        promoteTo:   null,
        leadQuality: "LOW",
        rationale:   "Fogging machine informational query — buyer or researcher, not dealer. Good negative keyword for Funnel A.",
        priority:    "LOW",
      }
    }
    return {
      action:      "PROMOTE",
      promoteTo:   "dealer_acquisition",
      leadQuality: "MEDIUM",
      rationale:   "Commercial fogging machine query — no specific dealer signal but relevant audience. Test with broad match.",
      priority:    "MEDIUM-LOW",
    }
  }

  return {
    action:      "KEEP_REJECTED",
    promoteTo:   null,
    leadQuality: "LOW",
    rationale:   "No fogging machine context — not relevant for dealer acquisition campaign.",
    priority:    "NONE",
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db("100xDB")

  // Pull ALL gsc_query_rows (not just 500 limit)
  const allRows = await db
    .collection("gsc_query_rows")
    .find({})
    .sort({ impressions: -1 })
    .limit(2000)
    .toArray()

  console.log(`\nTotal gsc_query_rows fetched: ${allRows.length}`)

  const included     = []  // currently in keyword set
  const rejected     = []  // not in keyword set — our analysis target
  const falsePosInc  = []  // currently included but are false positives

  for (const row of allRows) {
    const query = String(row.query ?? "").trim().toLowerCase()
    if (!query || query.length < 3) continue

    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    const impressions = Number(row.impressions ?? 0)
    const clicks      = Number(row.clicks ?? 0)
    const position    = Number(row.position ?? 0)

    const enhanced = enhancedClassify(query)

    const entry = { query, impressions, clicks, position, intent, theme, ...enhanced }

    // Anti-fog guard fires before classification — these never reach classifyIntent()
    if (isAntiFogFalsePositive(query)) {
      falsePosInc.push({ ...entry, action: "REMOVE_FALSE_POSITIVE",
        rationale: isAntiFogFalsePositive(query)
          ? "Removed by anti-fog guard: anti-fog intent without fogging machine context"
          : enhanced.rationale })
    } else if (enhanced.action === "REMOVE_FALSE_POSITIVE") {
      falsePosInc.push(entry)
    } else if (theme !== null) {
      included.push(entry)
    } else {
      rejected.push(entry)
    }
  }

  // Sort rejected by impressions desc
  rejected.sort((a, b) => b.impressions - a.impressions)

  // ── SECTION 1: TOP 100 REJECTED QUERIES ───────────────────────────────────
  console.log("\n" + "═".repeat(80))
  console.log("  PRIORITY 1: REJECTED GSC QUERY ANALYSIS")
  console.log("═".repeat(80))
  console.log(`\n  Total queries analyzed: ${allRows.length}`)
  console.log(`  Currently included:     ${included.length}`)
  console.log(`  Currently rejected:     ${rejected.length}`)
  console.log(`  False positives (included but shouldn't be): ${falsePosInc.length}`)

  console.log("\n" + "═".repeat(80))
  console.log("  1. TOP 100 REJECTED QUERIES")
  console.log("═".repeat(80))
  console.log(`${"#".padStart(3)}  ${"Impr".padStart(5)}  ${"Clks".padStart(4)}  ${"Pos".padStart(5)}  ${"Query".padEnd(50)}  ${"Current".padEnd(18)}  ${"Action".padEnd(35)}  LQ`)
  console.log("─".repeat(160))

  const top100 = rejected.slice(0, 100)
  for (let i = 0; i < top100.length; i++) {
    const r = top100[i]
    const qText = r.query.length > 49 ? r.query.slice(0, 46) + "..." : r.query
    const currentClass = r.intent === "commercial_general"
      ? "no funnel signal"
      : r.intent === "informational"
      ? "informational"
      : r.intent
    const actionShort = r.action === "PROMOTE"
      ? `→ ${r.promoteTo}`
      : r.action === "NEGATIVE_CANDIDATE"
      ? "→ negative list"
      : "keep rejected"
    console.log(
      `${String(i + 1).padStart(3)}  ${String(r.impressions).padStart(5)}  ${String(r.clicks).padStart(4)}  ${r.position.toFixed(1).padStart(5)}  ${qText.padEnd(50)}  ${currentClass.padEnd(18)}  ${actionShort.padEnd(35)}  ${r.leadQuality}`
    )
  }

  // ── SECTION 2: TOP 20 TO PROMOTE ──────────────────────────────────────────
  const promotable = rejected
    .filter(r => r.action === "PROMOTE")
    .sort((a, b) => {
      const prio = { "HIGH": 4, "MEDIUM-HIGH": 3, "MEDIUM": 2, "MEDIUM-LOW": 1, "LOW": 0 }
      const pa = prio[a.priority] ?? 0
      const pb = prio[b.priority] ?? 0
      return pb - pa || b.impressions - a.impressions
    })

  console.log("\n" + "═".repeat(80))
  console.log("  2. TOP 20 QUERIES TO PROMOTE")
  console.log("═".repeat(80))

  const top20 = promotable.slice(0, 20)
  for (let i = 0; i < top20.length; i++) {
    const r = top20[i]
    console.log(`\n  ${i + 1}. "${r.query}"`)
    console.log(`     Impressions: ${r.impressions}  Clicks: ${r.clicks}  Avg Position: ${r.position.toFixed(1)}`)
    console.log(`     Current classification: ${r.intent}`)
    console.log(`     Recommended: ${r.promoteTo}  [Lead Quality: ${r.leadQuality}]`)
    console.log(`     Rationale: ${r.rationale}`)
    console.log(`     Priority: ${r.priority}`)
  }

  // ── SECTION 2B: FALSE POSITIVES CURRENTLY INCLUDED ────────────────────────
  if (falsePosInc.length > 0) {
    console.log("\n" + "═".repeat(80))
    console.log("  2B. FALSE POSITIVES — CURRENTLY INCLUDED (SHOULD BE REMOVED)")
    console.log("═".repeat(80))
    console.log("  These queries are passing the classifier but are wrong-product intent:")
    for (const r of falsePosInc) {
      console.log(`\n  ✗ "${r.query}"`)
      console.log(`    Impressions: ${r.impressions}  Clicks: ${r.clicks}`)
      console.log(`    Reason: ${r.rationale}`)
    }
  }

  // ── SECTION 3: ESTIMATED IMPACT ───────────────────────────────────────────
  console.log("\n" + "═".repeat(80))
  console.log("  3. ESTIMATED IMPACT IF TOP 20 ARE PROMOTED")
  console.log("═".repeat(80))

  const highValue  = top20.filter(r => r.priority === "HIGH" || r.priority === "MEDIUM-HIGH")
  const totalImpr  = top20.reduce((s, r) => s + r.impressions, 0)
  const govtQueries = top20.filter(r => r.rationale.includes("Government") || r.rationale.includes("government"))

  const currentDiscoveredPct = Math.round((included.length / (included.length + rejected.length)) * 100)
  const newDiscoveredCount   = included.length + Math.min(top20.length, promotable.length)
  const newDiscoveredPct     = Math.round((newDiscoveredCount / (newDiscoveredCount + rejected.length - top20.length)) * 100)

  console.log(`
  Current GSC keywords in selected set: ${included.length}
  Rejected queries (all): ${rejected.length}
  Promotable queries identified: ${promotable.length}

  Top 20 promotion would add:
  ─────────────────────────────────────────────────
  HIGH/MEDIUM-HIGH value queries:  ${highValue.length}
  Government/institutional:        ${govtQueries.length}
  Total impressions covered:       ${totalImpr} across top 20 queries
  Promote-to: dealer_acquisition:  ${top20.filter(r => r.promoteTo === "dealer_acquisition").length}
  Promote-to: oem_authorization:   ${top20.filter(r => r.promoteTo === "oem_authorization").length}

  Source contribution change (estimate):
  ─────────────────────────────────────────────────
  Current:  GSC provides ~${Math.round(included.length / 36 * 100)}% of selected keywords
  Projected: If these ${top20.length} new signals are added and pass ranking,
             GSC could provide up to ${Math.min(95, Math.round((included.length + Math.min(15, top20.length)) / 36 * 100))}% of selected keywords.

  Required action:
  Add the following intent signals to the classifyIntent() function:
    • Government/municipal fogging context → dealer_acquisition
    • Procurement/tender context → dealer_acquisition
    • Manufacturer context → oem_authorization
    • Commercial fogging service context → dealer_acquisition
  Also add NEGATIVE keywords:
    • "anti-fog", "anti-fogging", "fogging agent" → prevent false positive inclusion
  `)

  // ── SECTION 4: NEGATIVE KEYWORD CANDIDATES ────────────────────────────────
  const negativeCandidates = rejected
    .filter(r => r.action === "NEGATIVE_CANDIDATE" || r.intent === "informational")
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)

  console.log("  4. NEGATIVE KEYWORD CANDIDATES FROM REJECTED SET")
  console.log("═".repeat(80))
  console.log("  These queries should be added to negative keyword list for Funnel A:\n")
  for (const r of negativeCandidates.slice(0, 15)) {
    console.log(`  − "${r.query}"  [impr:${r.impressions}  intent:${r.intent}]`)
  }

  console.log("\n" + "═".repeat(80))
  console.log("  Analysis complete.")
  console.log("═".repeat(80) + "\n")

} finally {
  await client.close()
}
