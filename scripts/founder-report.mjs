/**
 * Founder Report: Dealer Lead Agent run + full analysis
 * Runs classifier, writes MongoDB updates, creates opportunities, prints report.
 */
import { MongoClient, ObjectId } from "mongodb"

const URI = "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project"

// ── Classification config ──────────────────────────────────────────────────
const DEALER_PAGES = ["/become-a-dealer","/dealer-application","/gem-oem-authorization","/gem-reverse-auction-fogging","/dealers-and-government"]
const TENDER_PAGES = ["/gem-tender-support","/is-14855-fogging-machine"]
const GOV_PAGES = ["/nhm-fogging-machine","/nvbdcp-fogging-machine","/municipal-fogging-programme","/fogging-machine-for-nagar-panchayat","/public-health-equipment","/vector-control-equipment"]
const OEM_KEYWORDS = ["oem","authorization","authorisation","dealer","reseller","distributor","gem seller","vendor"]
const TENDER_KEYWORDS = ["tender","bid","l1","reverse auction","gem ra","documentation","is 14855"]
const GOV_KEYWORDS = ["municipality","nagar","municipal","nhm","nvbdcp","health department","government","panchayat","corporation"]
const FARMER_KEYWORDS = ["farm","agriculture","kisan","agri","crop","pest control","mosquito","dengue","malaria","spray machine"]

// ── Indian mobile telecom circle → state approximation ─────────────────────
// First 5 digits of 10-digit mobile → circle. Rough mapping for major circles.
function guessState(phone) {
  if (!phone) return "Unknown"
  const digits = phone.replace(/\D/g, "")
  const mobile = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits
  if (mobile.length < 7) return "Unknown"
  const prefix4 = mobile.slice(0, 4)
  const prefix3 = mobile.slice(0, 3)
  const circleMap = {
    // Delhi
    "9810": "Delhi", "9811": "Delhi", "9818": "Delhi", "9871": "Delhi",
    "9891": "Delhi", "9999": "Delhi", "8750": "Delhi", "9312": "Delhi",
    "9313": "Delhi", "9560": "Delhi", "9717": "Delhi", "8178": "Delhi",
    "8700": "Delhi", "8130": "Delhi", "8527": "Delhi", "9953": "Delhi",
    "9582": "Delhi", "7011": "Delhi", "9958": "Delhi",
    // Mumbai
    "9820": "Maharashtra", "9821": "Maharashtra", "9870": "Maharashtra",
    "9819": "Maharashtra", "9869": "Maharashtra", "9324": "Maharashtra",
    // UP
    "9415": "Uttar Pradesh", "9452": "Uttar Pradesh", "9918": "Uttar Pradesh",
    "9450": "Uttar Pradesh", "7839": "Uttar Pradesh", "8858": "Uttar Pradesh",
    // Rajasthan
    "9829": "Rajasthan", "9414": "Rajasthan", "8107": "Rajasthan",
    // Haryana
    "9812": "Haryana", "9813": "Haryana", "9896": "Haryana", "7015": "Haryana",
    // Punjab
    "9815": "Punjab", "9814": "Punjab", "9872": "Punjab", "7888": "Punjab",
    // Gujarat
    "9825": "Gujarat", "9824": "Gujarat", "8980": "Gujarat", "9979": "Gujarat",
    // Karnataka
    "9845": "Karnataka", "9844": "Karnataka", "8861": "Karnataka",
    // Tamil Nadu
    "9840": "Tamil Nadu", "9841": "Tamil Nadu", "8778": "Tamil Nadu",
    // West Bengal
    "9830": "West Bengal", "9831": "West Bengal", "8100": "West Bengal",
    // Bihar
    "9431": "Bihar", "9430": "Bihar", "7763": "Bihar",
    // MP
    "9826": "Madhya Pradesh", "9827": "Madhya Pradesh", "7869": "Madhya Pradesh",
    // Telangana/AP
    "9849": "Telangana", "9848": "Telangana", "8309": "Telangana",
    // Kerala
    "9447": "Kerala", "9446": "Kerala", "8129": "Kerala",
    // Jharkhand
    "9431": "Jharkhand", "9973": "Jharkhand", "8987": "Jharkhand",
    // Odisha
    "9437": "Odisha", "9438": "Odisha", "8280": "Odisha",
  }
  return circleMap[prefix4] || circleMap[prefix3] || "Other/Unknown"
}

function getAttrField(lead, field) {
  if (typeof lead[field] === "string") return String(lead[field])
  const attr = lead.attribution
  if (attr && typeof attr[field] === "string") return attr[field]
  return ""
}

function classify(lead) {
  const page = String(lead.page || lead.form_page_path || lead.pagePath || "").toLowerCase()
  const landingPage = getAttrField(lead, "landingPage").toLowerCase()
  const effectivePage = (page && page !== "/") ? page : ((landingPage && landingPage !== "/") ? landingPage : "")
  const product = String(lead.product || lead.productName || "").toLowerCase()
  const message = String(lead.message || lead.notes || lead.description || "").toLowerCase()
  const answers = lead.answers || {}
  const answersText = Object.values(answers).join(" ").toLowerCase()
  const allText = product + " " + message + " " + answersText
  const source = String(lead.source || lead.type || "")
  const utmObj = lead.utm || {}
  const utmCampaign = (lead.utmCampaign || utmObj.utm_campaign || utmObj.campaign || getAttrField(lead, "utm_campaign") || "").toString().toLowerCase()
  const utmSource = (lead.utmSource || utmObj.utm_source || utmObj.source || getAttrField(lead, "utm_source") || "").toString().toLowerCase()
  const sessionPageCount = parseInt(String(lead.sessionPageCount || getAttrField(lead, "sessionPageCount") || "1"), 10)

  const signals = []
  let score = 3
  let leadType = "general"

  // Explicit intent flags (highest confidence)
  if (lead.dealerInquiry === true || lead.dealerInquiry === "true") {
    score = Math.max(score, 9); leadType = "dealer_application"; signals.push("Dealer inquiry checkbox")
  }
  if (lead.gemAuthRequired === true || lead.gemAuthRequired === "true") {
    score = Math.max(score, 8)
    if (leadType === "general") leadType = "oem_authorization"
    signals.push("GeM auth required checkbox")
  }

  // Page URL
  if (effectivePage && DEALER_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 8)
    leadType = effectivePage.includes("oem") ? "oem_authorization" : "dealer_application"
    signals.push("Page: " + effectivePage.slice(0, 50))
  } else if (effectivePage && TENDER_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 8); leadType = "tender_support"; signals.push("Page: " + effectivePage.slice(0, 50))
  } else if (effectivePage && GOV_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 7); leadType = "government_procurement"; signals.push("Page: " + effectivePage.slice(0, 50))
  }

  if (landingPage && landingPage !== "/" && landingPage !== page) {
    if (DEALER_PAGES.some(p => landingPage.includes(p)) || TENDER_PAGES.some(p => landingPage.includes(p))) {
      score = Math.max(score, 7)
      if (leadType === "general") leadType = "dealer_application"
      signals.push("Landed: " + landingPage.slice(0, 50))
    }
  }

  if (source === "gem_inquiry" || source === "gem_popup_submit_only") {
    score = Math.max(score, 8)
    if (leadType === "general") leadType = "gem_inquiry"
    signals.push("GeM inquiry form")
  }

  if (utmCampaign.includes("dealer") || utmCampaign.includes("oem") || utmCampaign.includes("gem")) {
    score = Math.max(score, 7)
    if (leadType === "general") leadType = "dealer_application"
    signals.push("UTM campaign: " + utmCampaign)
  }
  if (utmSource === "google" && utmCampaign) {
    score = Math.max(score, Math.min(score + 1, 9))
    signals.push("Paid: " + utmSource + "/" + utmCampaign)
  }

  const oemHits = OEM_KEYWORDS.filter(k => allText.includes(k))
  if (oemHits.length) { score = Math.max(score, 7); if (leadType === "general") leadType = "oem_authorization"; signals.push("Keywords: " + oemHits.join(", ")) }

  const tenderHits = TENDER_KEYWORDS.filter(k => allText.includes(k))
  if (tenderHits.length) { score = Math.max(score, 7); if (leadType === "general") leadType = "tender_support"; signals.push("Keywords: " + tenderHits.join(", ")) }

  const govHits = GOV_KEYWORDS.filter(k => allText.includes(k))
  if (govHits.length) { score = Math.max(score, 6); if (leadType === "general") leadType = "government_procurement"; signals.push("Keywords: " + govHits.join(", ")) }

  if (sessionPageCount >= 3) { score = Math.min(score + 1, 10); signals.push("Engaged: " + sessionPageCount + " pages") }

  if (leadType === "general") {
    const fh = FARMER_KEYWORDS.filter(k => allText.includes(k))
    if (fh.length) { score = Math.max(score, 5); leadType = "farmer"; signals.push("Agri: " + fh.join(", ")) }
  }
  if (leadType === "general" && (product || source === "rfq" || lead._collection === "rfq_popup_leads")) {
    leadType = "end_customer"; signals.push("Product inquiry")
  }

  const leadValue = score >= 7 ? "high" : score >= 5 ? "medium" : "low"
  return { leadType, leadValue, score, signals }
}

// ── Priority ranking ───────────────────────────────────────────────────────
function priorityRank(lead, score, leadType, leadValue) {
  // A: contact within 24h — explicit dealer/OEM/gem intent, high score
  if (leadValue === "high" && ["dealer_application","oem_authorization","gem_inquiry","government_procurement","tender_support"].includes(leadType)) return "A"
  // A also: any score >= 9
  if (score >= 9) return "A"
  // B: contact this week — medium leads or end_customer with product name
  if (leadValue === "medium") return "B"
  if (leadValue === "high" && leadType === "end_customer") return "B"
  if (leadValue === "low" && leadType === "end_customer" && (lead.product || lead.productName)) return "B"
  // C: nurture
  return "C"
}

// ─────────────────────────────────────────────────────────────────────────────
const client = new MongoClient(URI)
await client.connect()
const db = client.db()

// Fetch all leads
const [popup, subs, gemInq] = await Promise.all([
  db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
  db.collection("submissions").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
  db.collection("gem_inquiries").find({}).sort({ createdAt: -1 }).limit(200).toArray(),
])

const allLeads = [
  ...popup.map(l => ({ ...l, _collection: "rfq_popup_leads", page: l.pagePath })),
  ...subs.map(l => ({ ...l, _collection: "submissions" })),
  ...gemInq.map(l => ({ ...l, _collection: "gem_inquiries", source: "gem_inquiry" })),
]

// ── Step 1: Classify + bulk write ─────────────────────────────────────────
const bulkByCollection = { rfq_popup_leads: [], submissions: [], gem_inquiries: [] }
let newlyClassified = 0
const classified = []

for (const lead of allLeads) {
  const r = classify(lead)
  const name = String(lead.name || lead.answers?.["Your Name"] || "")
  const phone = String(lead.phone || lead.answers?.["Phone Number"] || "")
  const email = String(lead.email || lead.answers?.["Email Address"] || "")
  const product = String(lead.product || lead.productName || lead.answers?.["Product"] || "")
  const requirement = String(lead.answers?.["Your Requirement"] || lead.message || lead.notes || "")
  const state = guessState(phone)
  const rank = priorityRank(lead, r.score, r.leadType, r.leadValue)
  const coll = lead._collection

  classified.push({
    _id: lead._id,
    _collection: coll,
    name,
    phone,
    email,
    product,
    requirement: requirement.slice(0, 80),
    source: String(lead.source || lead.type || ""),
    createdAt: String(lead.createdAt || ""),
    state,
    dealerInquiry: lead.dealerInquiry,
    gemAuthRequired: lead.gemAuthRequired,
    company_website: lead.company_website || "",
    ...r,
    rank,
  })

  if (lead.dealerScore !== r.score) {
    newlyClassified++
    bulkByCollection[coll].push({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            dealerScore: r.score,
            leadType: r.leadType,
            leadValue: r.leadValue,
            leadSignals: r.signals,
            classifiedAt: new Date().toISOString(),
          },
        },
      },
    })
  }
}

// Write updates
for (const [coll, ops] of Object.entries(bulkByCollection)) {
  if (ops.length > 0) {
    await db.collection(coll).bulkWrite(ops.slice(0, 200))
  }
}

// ── Step 2: Create opportunities for HIGH leads ────────────────────────────
const highLeads = classified.filter(l => l.leadValue === "high")
const byTypeHigh = {}
for (const l of highLeads) {
  byTypeHigh[l.leadType] = byTypeHigh[l.leadType] || []
  byTypeHigh[l.leadType].push(l)
}

let opportunitiesCreated = 0
const opportunityTitles = []
const now = new Date().toISOString()

for (const [type, leads] of Object.entries(byTypeHigh)) {
  const count = leads.length
  const topLead = leads[0]
  const title = `[${type.replace(/_/g, " ").toUpperCase()}] ${count} high-value lead${count > 1 ? "s" : ""} require follow-up`
  const existing = await db.collection("growth_os_opportunities").findOne({ title })
  if (!existing) {
    const phoneList = leads.slice(0, 5).map(l => l.phone || l.name).filter(Boolean).join(", ")
    await db.collection("growth_os_opportunities").insertOne({
      title,
      description: `${count} lead${count > 1 ? "s" : ""} classified as ${type.replace(/_/g, " ")}. Contacts: ${phoneList}. Top score: ${topLead.score}/10. Signals: ${topLead.signals.join("; ")}.`,
      module: "dealers",
      source: "agent",
      businessValue: "high",
      seoValue: "low",
      geoValue: type === "government_procurement" ? "high" : "low",
      dealerImpact: ["dealer_application","oem_authorization"].includes(type) ? "high" : "medium",
      effort: "low",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    opportunitiesCreated++
    opportunityTitles.push(title)
  }
}

// Log agent run
await db.collection("growth_os_logs").insertOne({
  ts: now,
  agent: "Dealer Lead Agent",
  action: `Manual run: Processed ${allLeads.length} leads — HIGH: ${highLeads.length}, MEDIUM: ${classified.filter(l => l.leadValue === "medium").length}, LOW: ${classified.filter(l => l.leadValue === "low").length}. ${newlyClassified} newly classified. ${opportunitiesCreated} opportunities created`,
  reason: "Founder report run with fixed classifier",
  level: highLeads.length > 0 ? "success" : "info",
  module: "dealers",
})

// ── Step 3: Build report data ─────────────────────────────────────────────

// 1. Lead type distribution
const byType = {}
for (const l of classified) byType[l.leadType] = (byType[l.leadType] || 0) + 1
const byValue = { high: 0, medium: 0, low: 0 }
for (const l of classified) byValue[l.leadValue]++

// 2. Top 10 highest-value leads (by score, then recency)
const top10 = [...classified]
  .sort((a, b) => b.score - a.score || (b.createdAt > a.createdAt ? 1 : -1))
  .slice(0, 10)

// 3. Dealer applications requiring contact
const dealerApps = classified
  .filter(l => l.leadType === "dealer_application" && l.leadValue === "high")
  .sort((a, b) => b.score - a.score)

// 4. OEM authorization requests
const oemLeads = classified
  .filter(l => l.leadType === "oem_authorization")
  .sort((a, b) => b.score - a.score)

// 5. GeM inquiries
const gemLeads = classified
  .filter(l => l.leadType === "gem_inquiry")
  .sort((a, b) => b.score - a.score)

// 6. State-wise distribution
const byState = {}
for (const l of classified) {
  if (l.state && l.state !== "Unknown" && l.state !== "Other/Unknown") {
    byState[l.state] = byState[l.state] || { total: 0, high: 0, leads: [] }
    byState[l.state].total++
    if (l.leadValue === "high") byState[l.state].high++
    if (l.leadValue === "high") byState[l.state].leads.push(l.name || l.phone)
  }
}
const stateRanked = Object.entries(byState).sort((a, b) => b[1].total - a[1].total)

// 7. Opportunity score by source
const bySource = {}
for (const l of classified) {
  const src = l.source || l._collection || "unknown"
  bySource[src] = bySource[src] || { count: 0, totalScore: 0, high: 0 }
  bySource[src].count++
  bySource[src].totalScore += l.score
  if (l.leadValue === "high") bySource[src].high++
}

// 8. Priority contact list (A first, then B)
const contactList = classified
  .filter(l => l.rank === "A" || l.rank === "B")
  .sort((a, b) => {
    if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1
    return b.score - a.score
  })

// ── PRINT REPORT ──────────────────────────────────────────────────────────
const sep = "═".repeat(70)
const line = "─".repeat(70)

console.log(sep)
console.log("  100x CIRCLE — FOUNDER LEAD INTELLIGENCE REPORT")
console.log("  Generated:", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
console.log("  Agent run: " + newlyClassified + " leads reclassified | " + opportunitiesCreated + " opportunities created")
console.log(sep)

console.log("\n▸ 1. LEAD TYPE DISTRIBUTION")
console.log(line)
const typeOrder = ["dealer_application","oem_authorization","gem_inquiry","government_procurement","tender_support","farmer","end_customer","general"]
for (const t of typeOrder) {
  const n = byType[t] || 0
  if (!n) continue
  const bar = "█".repeat(Math.round(n / allLeads.length * 30))
  const pct = ((n / allLeads.length) * 100).toFixed(1)
  console.log(`  ${t.padEnd(22)} ${String(n).padStart(3)}  ${bar} ${pct}%`)
}
console.log(line)
console.log(`  VALUE BREAKDOWN  HIGH: ${byValue.high}  MEDIUM: ${byValue.medium}  LOW: ${byValue.low}  TOTAL: ${allLeads.length}`)

console.log("\n▸ 2. TOP 10 HIGHEST-VALUE LEADS")
console.log(line)
for (let i = 0; i < top10.length; i++) {
  const l = top10[i]
  const contact = l.phone || l.email || "(no contact)"
  const nameStr = l.name || "(anonymous)"
  console.log(`  ${String(i+1).padStart(2)}. [${l.rank}] ${nameStr.padEnd(24)} ${String(l.score).padStart(2)}/10  ${l.leadType.padEnd(22)} ${l._collection.replace("_leads","").replace("submissions","sub")}`)
  console.log(`      📞 ${contact}  |  ${l.product || l.requirement || "(no product)"}`)
  console.log(`      Signals: ${l.signals.join(" · ")}`)
}

console.log("\n▸ 3. DEALER APPLICATIONS REQUIRING CONTACT")
console.log(line)
if (dealerApps.length === 0) {
  console.log("  None found.")
} else {
  for (const l of dealerApps) {
    console.log(`  [${l.rank}] ${(l.name || "Anonymous").padEnd(24)} Score: ${l.score}/10`)
    console.log(`      📞 ${l.phone || "(no phone)"}  |  ✉ ${l.email || "(no email)"}`)
    if (l.product) console.log(`      Product: ${l.product}`)
    if (l.company_website) console.log(`      Website: ${l.company_website}`)
    console.log(`      Signals: ${l.signals.join(" · ")}`)
    console.log(`      Submitted: ${l.createdAt.slice(0, 10)}  |  State: ${l.state}`)
    console.log()
  }
}

console.log("\n▸ 4. OEM AUTHORIZATION REQUESTS REQUIRING FOLLOW-UP")
console.log(line)
if (oemLeads.length === 0) {
  console.log("  None found.")
} else {
  for (const l of oemLeads) {
    console.log(`  [${l.rank}] ${(l.name || "Anonymous").padEnd(24)} Score: ${l.score}/10`)
    console.log(`      📞 ${l.phone || "(no phone)"}  |  ✉ ${l.email || "(no email)"}`)
    if (l.product) console.log(`      Product interest: ${l.product}`)
    if (l.company_website) console.log(`      Website: ${l.company_website}`)
    console.log(`      Signals: ${l.signals.join(" · ")}`)
    console.log(`      Submitted: ${l.createdAt.slice(0, 10)}  |  State: ${l.state}`)
    console.log()
  }
}

console.log("\n▸ 5. GeM INQUIRIES REQUIRING FOLLOW-UP")
console.log(line)
if (gemLeads.length === 0) {
  console.log("  None found.")
} else {
  for (const l of gemLeads) {
    const contact = l.phone || l.email || "(no contact)"
    console.log(`  [${l.rank}] ${(l.name || "Anonymous").padEnd(24)} Score: ${l.score}/10  📞 ${contact}`)
    console.log(`      Signals: ${l.signals.join(" · ")}  |  ${l.createdAt.slice(0, 10)}`)
  }
}

console.log("\n▸ 6. STATE-WISE DISTRIBUTION (phone-circle inference)")
console.log(line)
if (stateRanked.length === 0) {
  console.log("  Insufficient phone data for state inference.")
  const unresolved = classified.filter(l => l.phone && l.phone.length >= 10).length
  console.log(`  ${unresolved} leads have valid phone numbers but prefix not in lookup table.`)
  console.log("  Note: lead records contain no explicit city/state fields.")
} else {
  for (const [state, data] of stateRanked) {
    const bar = "█".repeat(Math.min(data.total, 20))
    console.log(`  ${state.padEnd(20)} Total: ${String(data.total).padStart(3)}  High: ${data.high}  ${bar}`)
    if (data.leads.length) console.log(`    High leads: ${data.leads.slice(0,3).join(", ")}`)
  }
}

console.log("\n▸ 7. OPPORTUNITY SCORE BY LEAD SOURCE")
console.log(line)
const srcSorted = Object.entries(bySource).sort((a, b) => b[1].high - a[1].high || b[1].totalScore - a[1].totalScore)
for (const [src, data] of srcSorted) {
  const avg = (data.totalScore / data.count).toFixed(1)
  console.log(`  ${src.padEnd(30)} count: ${String(data.count).padStart(3)}  avg score: ${avg}  high: ${data.high}`)
}

console.log("\n▸ 8. RECOMMENDED CONTACT PRIORITY LIST — THIS WEEK")
console.log(line)
console.log("  A = Contact within 24h  |  B = Contact this week  |  C = Nurture only\n")

const rankA = contactList.filter(l => l.rank === "A")
const rankB = contactList.filter(l => l.rank === "B")

if (rankA.length > 0) {
  console.log("  ── RANK A: CONTACT WITHIN 24 HOURS ──")
  for (let i = 0; i < rankA.length; i++) {
    const l = rankA[i]
    const contact = l.phone || l.email || "(no contact)"
    console.log(`  ${String(i+1).padStart(2)}. ${(l.name || "Anonymous").padEnd(24)} ${contact}`)
    console.log(`      Type: ${l.leadType}  |  Score: ${l.score}/10  |  State: ${l.state}`)
    const action = l.leadType === "dealer_application" ? "→ Call to qualify as dealer, ask about territory and current business"
      : l.leadType === "oem_authorization" ? "→ Share GeM OEM authorization docs, ask about GeM registration"
      : l.leadType === "gem_inquiry" ? "→ Share GeM product catalogue, ask about bid timeline"
      : l.leadType === "government_procurement" ? "→ Ask about tender reference, share IS 14855 compliance docs"
      : "→ Qualify requirement, share product specs"
    console.log(`      ${action}`)
    if (l.product) console.log(`      Product: ${l.product}`)
    console.log()
  }
}

if (rankB.length > 0) {
  console.log("  ── RANK B: CONTACT THIS WEEK ──")
  for (let i = 0; i < Math.min(rankB.length, 15); i++) {
    const l = rankB[i]
    const contact = l.phone || l.email || "(no contact)"
    console.log(`  ${String(i+1).padStart(2)}. ${(l.name || "Anonymous").padEnd(24)} ${contact}  |  ${l.leadType}  |  ${l.product || l.requirement || ""}`)
  }
  if (rankB.length > 15) console.log(`  ... and ${rankB.length - 15} more B-rank leads`)
}

const rankC = classified.filter(l => l.rank === "C").length
console.log(`\n  RANK C (nurture only): ${rankC} leads — add to email sequence, no immediate call`)

console.log("\n▸ OPPORTUNITIES CREATED THIS RUN")
console.log(line)
if (opportunityTitles.length === 0) {
  console.log("  All opportunity types already exist in growth_os_opportunities (no duplicates created).")
} else {
  for (const t of opportunityTitles) console.log(`  ✓ ${t}`)
}

console.log("\n" + sep)
console.log("  END OF REPORT")
console.log(sep)

await client.close()
