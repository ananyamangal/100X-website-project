import { MongoClient } from "mongodb"
const URI = "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project"

const DEALER_PAGES = ["/become-a-dealer","/dealer-application","/gem-oem-authorization","/gem-reverse-auction-fogging","/dealers-and-government"]
const TENDER_PAGES = ["/gem-tender-support","/is-14855-fogging-machine"]
const GOV_PAGES = ["/nhm-fogging-machine","/nvbdcp-fogging-machine","/municipal-fogging-programme","/fogging-machine-for-nagar-panchayat","/public-health-equipment","/vector-control-equipment"]
const OEM_KEYWORDS = ["oem","authorization","authorisation","dealer","reseller","distributor","gem seller","vendor"]
const TENDER_KEYWORDS = ["tender","bid","l1","reverse auction","gem ra","documentation","is 14855"]
const GOV_KEYWORDS = ["municipality","nagar","municipal","nhm","nvbdcp","health department","government","panchayat","corporation"]
const FARMER_KEYWORDS = ["farm","agriculture","kisan","agri","crop","pest control","mosquito","dengue","malaria","spray machine"]

function getAttrField(lead, field) {
  if (typeof lead[field] === "string") return String(lead[field])
  const attr = lead.attribution
  if (attr && typeof attr[field] === "string") return attr[field]
  return ""
}

function classify(lead) {
  const page = String(lead.page || lead.form_page_path || lead.pagePath || "").toLowerCase()
  const landingPage = getAttrField(lead, "landingPage").toLowerCase()
  const effectivePage = page || landingPage
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
  if (DEALER_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 8)
    leadType = effectivePage.includes("oem") ? "oem_authorization" : "dealer_application"
    signals.push("Page: " + effectivePage.slice(0, 40))
  } else if (TENDER_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 8); leadType = "tender_support"; signals.push("Page: " + effectivePage.slice(0, 40))
  } else if (GOV_PAGES.some(p => effectivePage.includes(p))) {
    score = Math.max(score, 7); leadType = "government_procurement"; signals.push("Page: " + effectivePage.slice(0, 40))
  }

  if (landingPage && landingPage !== page && landingPage !== "") {
    if (DEALER_PAGES.some(p => landingPage.includes(p)) || TENDER_PAGES.some(p => landingPage.includes(p))) {
      score = Math.max(score, 7)
      if (leadType === "general") leadType = "dealer_application"
      signals.push("Landed: " + landingPage.slice(0, 40))
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
  if (oemHits.length) { score = Math.max(score, 7); if (leadType === "general") leadType = "oem_authorization"; signals.push("Keywords: " + oemHits.join(",")) }

  const tenderHits = TENDER_KEYWORDS.filter(k => allText.includes(k))
  if (tenderHits.length) { score = Math.max(score, 7); if (leadType === "general") leadType = "tender_support"; signals.push("Keywords: " + tenderHits.join(",")) }

  const govHits = GOV_KEYWORDS.filter(k => allText.includes(k))
  if (govHits.length) { score = Math.max(score, 6); if (leadType === "general") leadType = "government_procurement"; signals.push("Keywords: " + govHits.join(",")) }

  if (sessionPageCount >= 3) { score = Math.min(score + 1, 10); signals.push("Engaged: " + sessionPageCount + " pages") }

  if (leadType === "general") {
    const fh = FARMER_KEYWORDS.filter(k => allText.includes(k))
    if (fh.length) { score = Math.max(score, 5); leadType = "farmer"; signals.push("Agri: " + fh.join(",")) }
  }

  if (leadType === "general" && (product || source === "rfq" || lead._collection === "rfq_popup_leads")) {
    leadType = "end_customer"; signals.push("Product inquiry")
  }

  const leadValue = score >= 7 ? "high" : score >= 5 ? "medium" : "low"
  return { leadType, leadValue, score, signals }
}

const client = new MongoClient(URI)
await client.connect()
const db = client.db()

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

const byType = {}
const byValue = { high:0, medium:0, low:0 }
const highLeads = []

for (const lead of allLeads) {
  const r = classify(lead)
  byValue[r.leadValue]++
  byType[r.leadType] = (byType[r.leadType]||0)+1
  if (r.score >= 7) {
    highLeads.push({
      col: lead._collection,
      name: String(lead.name || lead.answers?.["Your Name"] || ""),
      product: String(lead.product || lead.productName || ""),
      dealerInquiry: lead.dealerInquiry,
      gemAuthRequired: lead.gemAuthRequired,
      leadType: r.leadType,
      score: r.score,
      signals: r.signals
    })
  }
}

console.log("=== FIXED CLASSIFIER RESULTS ===")
console.log("Total leads:", allLeads.length)
console.log("byValue:", JSON.stringify(byValue))
console.log("byType:", JSON.stringify(byType))
console.log("High-value leads (score>=7):", highLeads.length)
for (const l of highLeads) console.log(JSON.stringify(l))

await client.close()
