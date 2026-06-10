/**
 * Search-term routing simulation for audience separation between:
 *   Funnel B (buyer)  — 23421174455  (28 PHRASE buyer keywords, negatives below)
 *   Funnel A (dealer) — 23924509179  (36 dealer/OEM/GeM keywords)
 *
 * Negative semantics: a PHRASE negative blocks any query containing that
 *   exact token sequence (whole words, no close variants — hence plurals).
 * Positive PHRASE: query must contain keyword token sequence.
 * Positive EXACT: query must equal keyword (modulo close variants — simplified here).
 */

// Proposed negatives for 23421174455 (all PHRASE)
export const NEGATIVES = [
  "dealer", "dealers", "dealership", "dealerships",
  "distributor", "distributors", "distributorship",
  "franchise", "franchisee",
  "reseller", "resellers",
  "oem",
  "gem",
  "tender", "tenders",
]

// Funnel B positive keywords (all PHRASE)
const FUNNEL_B = [
  "fogging machine", "fogger machine", "portable fog machine",
  "mosquito fogging machine", "thermal fogging machine", "mosquito fogger",
  "cold fogger machine", "fogging machine price", "thermal foggers",
  "small fog machine", "mosquito smoke machine",
  "fogging machine for mosquito control", "mosquito control fogging machine",
  "thermal fogger", "mosquito fogging machine price", "fogging sprayer",
  "mini fogger machine", "best mosquito sprayer", "mosquito fumigation machine",
  "mosquito repellent fogging machine", "mini fogging machine price",
  "foggers price", "fogger price", "mosquito killer fog machine",
  "fogging smoke machine", "agriculture fogging machine", "hand fogging machine",
  "fogging machine for mosquito near me",
]

// Funnel A positive keywords (text only; match type noted but simulation uses contains)
const FUNNEL_A = [
  "disinfectant fogging machine", "portable fogging machine",
  "ulv fogger authorized dealer", "thermal fogging machine dealership",
  "fogging machine dealership", "ulv fogger dealership",
  "fogging machine authorized dealer", "thermal fogging machine authorized dealer",
  "thermal fogger authorized dealer", "thermal fogging machine distributor",
  "thermal fogger dealership", "thermal fogging machine dealer",
  "fogging machine oem authorization", "oem authorization letter fogging machine india",
  "thermal fogging machine oem authorization", "thermal fogger oem authorization",
  "ulv fogger oem authorization", "fogging machine oem authorized",
  "thermal fogging machine oem authorized", "thermal fogger oem authorized",
  "ulv fogger oem authorized", "thermal fogging machine oem",
  "make in india fogging machine oem", "fogging machine oem",
  "fogging machine on gem", "fogging machine on gem portal",
  "fogging machine in gem portal", "gem dealer authorization fogging machine",
  "fogging machine gem reseller", "thermal fogging machine gem reseller",
  "thermal fogger gem reseller", "ulv fogger gem reseller",
  "fogging machine gem seller", "thermal fogging machine gem seller",
  "thermal fogger gem seller", "ulv fogger gem seller",
]

const containsPhrase = (query, phrase) => {
  const q = ` ${query.toLowerCase()} `
  return q.includes(` ${phrase.toLowerCase()} `)
}

const blockedFromB = q => NEGATIVES.some(n => containsPhrase(q, n))
const matchesB     = q => FUNNEL_B.some(k => containsPhrase(q, k))
const matchesA     = q => FUNNEL_A.some(k => containsPhrase(q, k) || q.toLowerCase() === k)

function route(query) {
  const a = matchesA(query)
  const bEligible = matchesB(query) && !blockedFromB(query)
  if (a && !bEligible) return "Funnel A"
  if (!a && bEligible) return "Funnel B"
  if (a && bEligible)  return "BOTH (overlap!)"
  return "neither"
}

// ── Test queries ─────────────────────────────────────────────────────────────

const DEALER_INTENT_QUERIES = [
  "fogging machine dealership",
  "become fogging machine dealer",
  "thermal fogging machine distributor in mumbai",
  "fogging machine franchise opportunity",
  "ulv fogger authorized dealer near me",
  "oem authorization fogging machine",
  "fogging machine oem certificate",
  "gem reseller fogging machine",
  "fogging machine gem seller registration",
  "fogging machine on gem portal",
  "tender support fogging machine",
  "fogging machine tender documents",
  "thermal fogger distributorship",
]

const BUYER_INTENT_QUERIES = [
  "fogging machine price",
  "thermal fogging machine price in delhi",
  "mosquito fogging machine for municipality",
  "portable fog machine buy",
  "best mosquito fogger for society",
  "agriculture fogging machine cost",
  "hand fogging machine for pest control",
  "mini fogging machine price india",
  "cold fogger machine online",
  "mosquito fumigation machine for hospital",
]

console.log("NEGATIVE SET FOR 23421174455 (" + NEGATIVES.length + " PHRASE negatives):")
console.log("  " + NEGATIVES.join(", "))
console.log()

console.log("── DEALER/OEM/GeM/TENDER QUERIES (must NOT route to Funnel B) " + "─".repeat(10))
let leaks = 0
for (const q of DEALER_INTENT_QUERIES) {
  const r = route(q)
  const ok = !r.includes("B") || r === "Funnel A"
  if (r.includes("Funnel B") || r.includes("BOTH")) leaks++
  console.log(`  "${q}"`)
  console.log(`     → ${r} ${r === "Funnel A" ? "✓" : r === "neither" ? "(blocked from B, not matching A keywords — acceptable)" : "✗ LEAK"}`)
}
console.log()

console.log("── BUYER QUERIES (must still route to Funnel B) " + "─".repeat(25))
let buyerBlocked = 0
for (const q of BUYER_INTENT_QUERIES) {
  const r = route(q)
  if (r !== "Funnel B") buyerBlocked++
  console.log(`  "${q}"`)
  console.log(`     → ${r} ${r === "Funnel B" ? "✓" : "✗ WRONGLY BLOCKED"}`)
}
console.log()

console.log("── FUNNEL B POSITIVE KEYWORD SELF-CHECK (negatives must not block own keywords)")
const selfBlocked = FUNNEL_B.filter(k => blockedFromB(k))
console.log(selfBlocked.length === 0
  ? "  ✓ none of the 28 buyer keywords contain a negative token"
  : "  ✗ BLOCKED OWN KEYWORDS: " + selfBlocked.join(", "))
console.log()

console.log("── FUNNEL A LEAK CHECK (A keywords still eligible in B after negatives)")
const stillEligibleInB = FUNNEL_A.filter(k => matchesB(k) && !blockedFromB(k))
console.log(`  ${stillEligibleInB.length}/${FUNNEL_A.length} Funnel A keywords remain eligible in Funnel B`)
stillEligibleInB.forEach(k => console.log(`    LEAK: "${k}"`))
console.log()
console.log("SUMMARY: dealerLeaks=" + leaks + " buyerWronglyBlocked=" + buyerBlocked +
  " selfBlocked=" + selfBlocked.length + " residualOverlap=" + stillEligibleInB.length + "/" + FUNNEL_A.length +
  " (" + Math.round(stillEligibleInB.length / FUNNEL_A.length * 100) + "%)")
