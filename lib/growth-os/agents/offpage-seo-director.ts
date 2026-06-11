/**
 * Off-Page SEO Director
 * 7 modules: Backlink Discovery, Competitor Monitor, Guest Post Finder, Citation Builder,
 * Digital PR, Outreach Automation, Authority Asset Promotion.
 * Focuses on: GeM/government, fogging/MSME, India B2B.
 * Never suggests PBNs or spam networks.
 */
import Anthropic from "@anthropic-ai/sdk"
import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

// ── Types ─────────────────────────────────────────────────────────────────────

export type OpportunityType =
  | "directory" | "guest_post" | "citation" | "competitor_backlink"
  | "press_release" | "government_listing" | "association" | "review_site"
  | "resource_page" | "podcast" | "forum"

export type OutreachStatus =
  | "discovered" | "queued" | "contacted" | "replied"
  | "negotiating" | "published" | "acquired" | "declined" | "no_response"

export interface BacklinkScore {
  relevance:             number   // 0-10: topic match for fogging/MSME/govt
  domainAuthority:       number   // 0-10: estimated DA
  trafficValue:          number   // 0-10: organic traffic estimate
  spamRisk:              number   // 0-10: LOWER is safer (0=clean, 10=PBN/spam)
  acquisitionDifficulty: number   // 0-10: 0=easy/free, 10=very hard/expensive
  priorityScore:         number   // composite (higher = do first)
}

export interface BacklinkOpportunity {
  id:            string
  type:          OpportunityType
  domain:        string
  url:           string
  pageTitle:     string
  contactEmail?: string
  contactName?:  string
  scores:        BacklinkScore

  metadata: {
    linkedToCompetitors?: string[]
    suggestedTopic?:     string
    anchorText:          string
    targetPage:          string   // our page to link to
    language?:           string
    country?:            string
    vertical?:           string
  }

  outreach: {
    status:          OutreachStatus
    initialEmailAt?: string
    followUpCount:   number
    lastContactAt?:  string
    notes?:          string
    emailSubject?:   string
    emailBody?:      string
    followUps?:      string[]
  }

  result?: {
    liveUrl?:    string
    acquiredAt?: string
    doFollow:    boolean
    anchorText?: string
  }

  approvalStatus: "pending_review" | "approved" | "skipped"
  createdAt:      string
  updatedAt:      string
}

// ── Seed data — known Indian relevant directories ─────────────────────────────

export const SEED_OPPORTUNITIES: Omit<BacklinkOpportunity, "id" | "createdAt" | "updatedAt">[] = [
  {
    type: "government_listing", domain: "gem.gov.in", url: "https://gem.gov.in/seller/product",
    pageTitle: "GeM Seller Product Listing", contactEmail: "", contactName: "",
    scores: { relevance: 10, domainAuthority: 9, trafficValue: 9, spamRisk: 0, acquisitionDifficulty: 3, priorityScore: 9.4 },
    metadata: { anchorText: "100X Circle Fogging Machines", targetPage: "/products/thermal-fogging-machines", vertical: "government", country: "India" },
    outreach: { status: "discovered", followUpCount: 0, notes: "OEM registered, ensure all product pages link back to landing page" },
    approvalStatus: "approved",
  },
  {
    type: "directory", domain: "msme.gov.in", url: "https://msme.gov.in/udyam-registration",
    pageTitle: "MSME Udyam Registration", contactEmail: "", contactName: "",
    scores: { relevance: 9, domainAuthority: 9, trafficValue: 7, spamRisk: 0, acquisitionDifficulty: 2, priorityScore: 8.8 },
    metadata: { anchorText: "100X Circle MSME Registered", targetPage: "/about", vertical: "government", country: "India" },
    outreach: { status: "discovered", followUpCount: 0, notes: "Verify Udyam certificate is linked and NAP consistent" },
    approvalStatus: "approved",
  },
  {
    type: "association", domain: "ficci.in", url: "https://ficci.in/member",
    pageTitle: "FICCI Member Directory", contactEmail: "membership@ficci.in", contactName: "",
    scores: { relevance: 7, domainAuthority: 8, trafficValue: 6, spamRisk: 0, acquisitionDifficulty: 5, priorityScore: 7.2 },
    metadata: { anchorText: "100X Circle", targetPage: "/", vertical: "industry", country: "India" },
    outreach: { status: "discovered", followUpCount: 0 },
    approvalStatus: "pending_review",
  },
  {
    type: "directory", domain: "indiamart.com", url: "https://www.indiamart.com/100xcircle",
    pageTitle: "IndiaMart Supplier Profile", contactEmail: "", contactName: "",
    scores: { relevance: 9, domainAuthority: 8, trafficValue: 8, spamRisk: 0, acquisitionDifficulty: 1, priorityScore: 8.9 },
    metadata: { anchorText: "Thermal Fogging Machine Supplier India", targetPage: "/products", vertical: "b2b", country: "India" },
    outreach: { status: "discovered", followUpCount: 0, notes: "Ensure product catalog links to 100xcircle.com" },
    approvalStatus: "approved",
  },
  {
    type: "directory", domain: "tradeindia.com", url: "https://www.tradeindia.com",
    pageTitle: "TradeIndia B2B Directory", contactEmail: "support@tradeindia.com", contactName: "",
    scores: { relevance: 8, domainAuthority: 7, trafficValue: 7, spamRisk: 1, acquisitionDifficulty: 2, priorityScore: 7.8 },
    metadata: { anchorText: "Fogging Machine Manufacturer India", targetPage: "/products/thermal-fogging-machines", vertical: "b2b", country: "India" },
    outreach: { status: "discovered", followUpCount: 0 },
    approvalStatus: "pending_review",
  },
  {
    type: "government_listing", domain: "nvbdcp.gov.in", url: "https://nvbdcp.gov.in",
    pageTitle: "NVBDCP National Vector-Borne Disease Control Programme", contactEmail: "nvbdcp@nic.in", contactName: "",
    scores: { relevance: 10, domainAuthority: 9, trafficValue: 6, spamRisk: 0, acquisitionDifficulty: 8, priorityScore: 8.2 },
    metadata: { anchorText: "BIS Certified Fogging Equipment", targetPage: "/products/thermal-fogging-machines", vertical: "government_health", country: "India" },
    outreach: { status: "discovered", followUpCount: 0, notes: "High value — approach after sales team introduction. Requires formal government liaison." },
    approvalStatus: "pending_review",
  },
  {
    type: "resource_page", domain: "krishijagran.com", url: "https://www.krishijagran.com",
    pageTitle: "Krishi Jagran — India's Leading Agri Portal", contactEmail: "info@krishijagran.com", contactName: "",
    scores: { relevance: 8, domainAuthority: 7, trafficValue: 8, spamRisk: 0, acquisitionDifficulty: 4, priorityScore: 7.6 },
    metadata: { suggestedTopic: "How to Choose the Right Fogging Machine for Crop Protection", anchorText: "fogging machine for agriculture", targetPage: "/products/agri-fogging", vertical: "agriculture", country: "India" },
    outreach: { status: "discovered", followUpCount: 0 },
    approvalStatus: "pending_review",
  },
  {
    type: "guest_post", domain: "pestcontrolblog.in", url: "https://pestcontrolblog.in",
    pageTitle: "Pest Control India Blog", contactEmail: "", contactName: "",
    scores: { relevance: 10, domainAuthority: 5, trafficValue: 5, spamRisk: 1, acquisitionDifficulty: 3, priorityScore: 6.8 },
    metadata: { suggestedTopic: "IS 14855:2019 Compliance Guide for Pest Control Operators", anchorText: "IS 14855 compliant thermal fogger", targetPage: "/blog/is-14855-guide", vertical: "pest_control", country: "India" },
    outreach: { status: "discovered", followUpCount: 0 },
    approvalStatus: "pending_review",
  },
]

// ── Score computation ─────────────────────────────────────────────────────────

function computePriorityScore(s: Omit<BacklinkScore, "priorityScore">): number {
  // Relevance 30%, DA 25%, Traffic 20%, low spam 15%, easy acquisition 10%
  const safetyFactor = 1 - s.spamRisk / 10        // invert spam risk
  const easyFactor   = 1 - s.acquisitionDifficulty / 10  // invert difficulty
  const score = (s.relevance * 0.30) + (s.domainAuthority * 0.25) + (s.trafficValue * 0.20) + (safetyFactor * 10 * 0.15) + (easyFactor * 10 * 0.10)
  return Math.round(score * 10) / 10
}

// ── Claude — generate outreach email ─────────────────────────────────────────

export async function generateOutreachEmail(opp: BacklinkOpportunity): Promise<{ subject: string; body: string; followUps: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const anthropic = new Anthropic({ apiKey })

  const prompt = `You are writing an outreach email on behalf of Sulabh Mangal, Founder of 100X Circle (100xcircle.com), India's leading BIS-certified thermal fogging machine manufacturer.

TARGET SITE: ${opp.domain}
PAGE: ${opp.url}
PAGE TITLE: ${opp.pageTitle}
OPPORTUNITY TYPE: ${opp.type}
SUGGESTED TOPIC: ${opp.metadata.suggestedTopic ?? "n/a"}
TARGET PAGE ON OUR SITE: https://100xcircle.com${opp.metadata.targetPage}
VERTICAL: ${opp.metadata.vertical ?? "b2b"}

ABOUT 100X CIRCLE:
- BIS Certified manufacturer of thermal fogging, ULV, and vehicle-mounted fogging machines
- IS 14855:2019 compliant — the Indian standard for fogging equipment
- GeM Registered OEM, MSME Certified, Startup India certified
- 10+ years, 5,000+ machines, 28 states
- Serving municipal corporations, NHM, NVBDCP, pest control, agriculture

RULES:
- Keep subject line under 60 characters
- Email body: 100–150 words, professional but warm, not spammy
- Mention a specific value-add (a real stat, a resource, a guest post idea)
- No generic "I noticed your site" openers
- Sign as Sulabh Mangal, Founder, 100X Circle | +91-XXXXXXXXXX | 100xcircle.com
- Write 2 follow-up messages (sent at +5 days and +12 days) — keep them shorter (40–60 words each)

Return JSON only (no preamble):
{
  "subject": "...",
  "body": "...",
  "follow_up_1": "...",
  "follow_up_2": "..."
}`

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    message = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages:   [{ role: "user", content: prompt }],
    })
  } catch (err) {
    throw new Error(`Claude API error generating outreach for ${opp.domain}: ${err instanceof Error ? err.message : String(err)}`)
  }

  const raw  = message.content.find(b => b.type === "text")?.text ?? "{}"
  const json = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim()

  let parsed: { subject?: string; body?: string; follow_up_1?: string; follow_up_2?: string } = {}
  try {
    parsed = JSON.parse(json)
  } catch {
    // Extract JSON if wrapped in prose
    const match = json.match(/\{[\s\S]+\}/)
    if (match) { try { parsed = JSON.parse(match[0]) } catch { /* use defaults */ } }
  }

  return {
    subject:   parsed.subject  ?? `Partnership inquiry — ${opp.domain}`,
    body:      parsed.body     ?? "(Email body generation failed — please regenerate)",
    followUps: [parsed.follow_up_1 ?? "", parsed.follow_up_2 ?? ""].filter(Boolean),
  }
}

// ── Discover new opportunities via Claude ─────────────────────────────────────

export async function discoverOpportunities(vertical: string, count: number = 10): Promise<BacklinkOpportunity[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const anthropic = new Anthropic({ apiKey })

  const prompt = `You are an Off-Page SEO expert for 100X Circle (fogging machine manufacturer, India).

Find ${count} REAL, high-value backlink opportunities for the vertical: "${vertical}"

Focus on: Indian government portals, industry associations, trade directories, agricultural media, pest control resources, manufacturing directories, MSME ecosystems.

STRICT RULES:
- No PBNs, link farms, spam directories
- Minimum estimated DA 40+
- Must be topically relevant to: fogging machines, pest control, agriculture spray, government procurement, MSME, manufacturing
- Only include sites that actively accept listings, guest posts, or resource additions

Return JSON array (no preamble):
[{
  "type": "directory|guest_post|citation|association|resource_page|government_listing",
  "domain": "...",
  "url": "...",
  "page_title": "...",
  "contact_email": "...",
  "relevance": 0-10,
  "domain_authority": 0-10,
  "traffic_value": 0-10,
  "spam_risk": 0-10,
  "acquisition_difficulty": 0-10,
  "anchor_text": "...",
  "target_page": "/our-page-path",
  "suggested_topic": "..."
}]`

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    message = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const db2 = (await clientPromise).db()
    await logAgentRun(db2, {
      agent:          "Off-Page SEO Director",
      action:         `FAILED discovery for vertical: ${vertical}`,
      reason:         "Claude API call failed",
      expectedImpact: "n/a",
      actualImpact:   `Error: ${errMsg.slice(0, 200)}`,
      level:          "error",
      module:         "seo",
    })
    throw new Error(`Claude API error during discovery: ${errMsg}`)
  }

  const raw  = message.content.find(b => b.type === "text")?.text ?? "[]"
  const json = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim()

  let items: Array<Record<string, unknown>> = []
  try {
    items = JSON.parse(json)
    if (!Array.isArray(items)) items = []
  } catch {
    // Try extracting array from prose
    const match = json.match(/\[[\s\S]+\]/)
    if (match) { try { items = JSON.parse(match[0]) } catch { items = [] } }
  }

  const db = (await clientPromise).db()
  const results: BacklinkOpportunity[] = []
  let duplicatesSkipped = 0

  // Build set of existing domains to prevent duplicates
  const existingDomains = new Set(
    (await db.collection("offpage_opportunities")
      .find({}, { projection: { domain: 1 } })
      .toArray()
    ).map(d => String(d.domain ?? "").toLowerCase())
  )

  for (const item of items) {
    const domain = String(item.domain ?? "").toLowerCase().trim()
    if (!domain) continue

    // Skip duplicate domains
    if (existingDomains.has(domain)) { duplicatesSkipped++; continue }

    // Spam risk gate: skip if Claude rates spam risk > 6
    const spamRisk = Number(item.spam_risk ?? 3)
    if (spamRisk > 6) continue

    existingDomains.add(domain)  // prevent intra-batch duplicates too

    const scores: Omit<BacklinkScore, "priorityScore"> = {
      relevance:             Math.min(10, Math.max(0, Number(item.relevance ?? 5))),
      domainAuthority:       Math.min(10, Math.max(0, Number(item.domain_authority ?? 5))),
      trafficValue:          Math.min(10, Math.max(0, Number(item.traffic_value ?? 5))),
      spamRisk:              Math.min(10, Math.max(0, spamRisk)),
      acquisitionDifficulty: Math.min(10, Math.max(0, Number(item.acquisition_difficulty ?? 5))),
    }

    const opp: BacklinkOpportunity = {
      id:           `opp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type:         (item.type as OpportunityType) ?? "directory",
      domain,
      url:          String(item.url ?? ""),
      pageTitle:    String(item.page_title ?? ""),
      contactEmail: String(item.contact_email ?? ""),
      scores: { ...scores, priorityScore: computePriorityScore(scores) },
      metadata: {
        anchorText:      String(item.anchor_text ?? "100X Circle"),
        targetPage:      String(item.target_page ?? "/"),
        suggestedTopic:  item.suggested_topic ? String(item.suggested_topic) : undefined,
        vertical,
        country:         "India",
      },
      outreach: { status: "discovered", followUpCount: 0 },
      approvalStatus: "pending_review",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.collection("offpage_opportunities").insertOne({ ...opp })
    results.push(opp)
  }

  await logAgentRun(db, {
    agent:          "Off-Page SEO Director",
    action:         `Discovered ${results.length} new opportunities for "${vertical}" (${duplicatesSkipped} duplicates skipped)`,
    reason:         "Automated opportunity discovery",
    expectedImpact: "Domain authority growth, rank improvement for government/dealer keywords",
    actualImpact:   `${results.length} new · ${duplicatesSkipped} skipped · ${items.length - results.length - duplicatesSkipped} filtered (spam/invalid)`,
    level:          "success",
    module:         "seo",
  })

  return results
}

// ── Seed initial opportunities (idempotent — checks per domain) ───────────────

export async function seedOpportunities() {
  const db = (await clientPromise).db()

  // Check by domain — not by count — so partial seeds can be completed
  const seedDomains = SEED_OPPORTUNITIES.map(o => o.domain.toLowerCase())
  const alreadySeeded = new Set(
    (await db.collection("offpage_opportunities")
      .find({ domain: { $in: seedDomains } }, { projection: { domain: 1 } })
      .toArray()
    ).map(d => String(d.domain ?? "").toLowerCase())
  )

  const missing = SEED_OPPORTUNITIES.filter(o => !alreadySeeded.has(o.domain.toLowerCase()))
  if (missing.length === 0) return { seeded: 0, existing: alreadySeeded.size }

  const docs = missing.map(o => ({
    ...o,
    id:        `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    scores:    { ...o.scores },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  await db.collection("offpage_opportunities").insertMany(docs)
  return { seeded: docs.length, existing: alreadySeeded.size }
}
