/**
 * Execution Pack Generator
 * Produces ready-to-use execution artifacts when a recommendation is approved.
 * Reads from existing MongoDB collections — never calls external APIs.
 * Output is artifacts only; deployment remains manual.
 */
import type { Db } from "mongodb"
import type {
  DirectorRec,
  ExecutionPack,
  DealerRecruitmentPack,
  OEMDisplacementPack,
  LandingPagePack,
  CampaignPack,
  CustomerMatchPack,
} from "@/lib/growth-os/director-types"

const inr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  `₹${Math.round(n).toLocaleString("en-IN")}`

// ─── Dealer Recruitment Pack ──────────────────────────────────────────────────

async function dealerRecruitmentPack(rec: DirectorRec, db: Db): Promise<DealerRecruitmentPack> {
  const state = String(rec.payload.state || "")
  const marketGmv = Number(rec.payload.total_gmv || 0)
  const marketContracts = Number(rec.payload.total_contracts || 0)
  const orgCount = Number(rec.payload.org_count || 0)

  // Pull top orgs in this state from fogging data
  const topOrgs = await db.collection("fogging_organizations")
    .find({ organization_state: state, total_gmv: { $gte: 10_000 } })
    .sort({ total_gmv: -1 })
    .limit(5)
    .toArray()

  const topOrgsFormatted = topOrgs.map(o => ({
    name: String(o.organization_name || ""),
    state: String(o.organization_state || ""),
    gmv: Number(o.total_gmv || 0),
    incumbent_oem: String(o.incumbent_oem_brand || o.incumbent_oem || "Unknown OEM"),
    dept_category: String(o.dept_category || "Government"),
  }))

  const topOrgList = topOrgsFormatted.slice(0, 3)
    .map(o => `• ${o.name} (${inr(o.gmv)}, currently buying from ${o.incumbent_oem})`)
    .join("\n")

  const market_evidence = `${state} market intelligence (from GeM procurement data):
Total fogging GMV: ${inr(marketGmv)}
Total contracts: ${marketContracts}
Active buyers: ${orgCount} government organizations
Top buyers:
${topOrgList}
Current suppliers: ${[...new Set(topOrgsFormatted.map(o => o.incumbent_oem).filter(Boolean))].join(", ")}
100X dealer presence: ZERO — entire market is open for capture`

  const outreach_email_draft = `Subject: 100X Circle Dealer Authorization — ${state} Market Opportunity (${inr(marketGmv)} Annual GMV)

Dear [Dealer/Distributor Name],

I'm writing because ${state} represents a significant untapped opportunity for 100X Circle thermal fogging machines — and we currently have no authorized dealer in your state.

THE MARKET:
• ${state} has ${inr(marketGmv)} in active government fogging procurement (GeM data)
• ${marketContracts} contracts across ${orgCount} government organizations
• Top buyers include: ${topOrgList.split("\n").map(l => l.replace(/^•\s*/, "")).slice(0, 2).join("; ")}
• All current procurement is going to competitors

WHY 100X CIRCLE:
• Government-approved product listed on GeM portal
• Competitive pricing with superior performance
• Strong repeat purchase cycle (annual/bi-annual maintenance + machine replacement)
• Full technical and after-sales support from manufacturer
• OEM authorization within 2 weeks of agreement

OPPORTUNITY:
An authorized dealer capturing even 10-15% of this market represents ${inr(marketGmv * 0.12)}/year in recurring revenue — with zero marketing spend on your part as buyers are already on GeM.

I'd like to schedule a 30-minute call to walk you through our authorization process, pricing, and the specific GeM tenders available in ${state}.

Are you available this week?

Best regards,
[Your Name]
100X Circle | 100xcircle.com
[Phone Number]`

  const whatsapp_draft = `Hi [Name],

I emailed you about a business opportunity — just following up here too.

We're 100X Circle — thermal fogging machines for government health/sanitation tenders.

${state} has ${inr(marketGmv)} in active demand on GeM that we're not covering yet. Looking for a dealer partner who can bid on these.

No marketing needed — buyers are already on GeM searching for suppliers.

5 minutes to talk? 📞

— [Your name], 100X Circle`

  const call_script = `DEALER RECRUITMENT CALL SCRIPT — ${state}

OPENING (30 seconds):
"Good morning/afternoon, I'm [Name] calling from 100X Circle — we manufacture thermal fogging machines for government health and sanitation departments. I sent you an email about a dealer opportunity in ${state} — is this a good time for 5 minutes?"

DISCOVERY (2 minutes):
"Are you currently supplying equipment to government organizations in ${state}?"
"Do you have an active GeM seller account?"
"What categories are you currently selling in?"
"Have you seen fogging machine tenders on GeM?"

MARKET PITCH (2 minutes):
"So here's the opportunity — ${state} has ${inr(marketGmv)} in annual fogging procurement spread across ${orgCount} government organizations. Municipal bodies, health departments, sanitation departments — all regularly buying.

Right now, all of that is going to [Competitor]. We have zero dealer presence in ${state}. With a local authorized dealer who can bid on these tenders, we estimate capturing ${inr(marketGmv * 0.12)} in the first year."

PRODUCT PITCH (1 minute):
"100X Circle machines are government-approved, listed on GeM with all certifications. We support dealers with pricing, spec sheets, demo units, and technical training. Authorization takes about 2 weeks."

CLOSE:
"Could I schedule a formal Zoom call with your director? I'll share our full product catalog, GeM authorization process, and the specific tenders available in ${state} right now."
"What's a good time this week or next?"

OBJECTIONS:
Q: "I don't know anything about fogging machines"
A: "That's exactly why we provide full training. Our team handles all technical queries — you just need to bid and manage the relationship."

Q: "What's the margin?"
A: "We offer competitive dealer margins — I'll share the exact price list on our call. Most dealers recover their first year costs within 2-3 orders."

FOLLOW-UP:
Send product catalog + GeM listing links immediately after the call.`

  const meeting_agenda = `DEALER AUTHORIZATION MEETING AGENDA — ${state}

Duration: 45 minutes
Attendees: 100X Circle (Sales/BD), Prospective Dealer (Owner/Director)

1. INTRODUCTION (5 min)
   - 100X Circle background and product range
   - ${state} market opportunity overview (${inr(marketGmv)} GMV)

2. MARKET INTELLIGENCE (10 min)
   - GeM procurement data: ${orgCount} active buyers in ${state}
   - Top buying organizations: ${topOrgList.split("\n").slice(0, 3).join("; ")}
   - Competitor analysis: who's currently winning these tenders
   - Open tender opportunities available right now

3. PRODUCT PRESENTATION (10 min)
   - Machine specifications and variants
   - Certifications and GeM listing details
   - Pricing and dealer margin structure
   - Demo unit availability

4. DEALER AGREEMENT TERMS (10 min)
   - Authorization process and timeline (2 weeks)
   - Exclusivity (state/district basis)
   - Support provided (technical, pricing, post-sale)
   - Minimum order commitments

5. NEXT STEPS (10 min)
   - Dealer agreement signing
   - GeM seller account setup (if needed)
   - First bid target: within 30 days
   - Training schedule

ACTION ITEMS:
□ 100X to share dealer agreement draft
□ Dealer to confirm GeM seller account status
□ 100X to identify 3 live tenders in ${state} for immediate bidding
□ Schedule follow-up in 1 week`

  const outreach_schedule = {
    day_1: {
      whatsapp: whatsapp_draft,
      email: outreach_email_draft,
      note: "Send WhatsApp first (higher open rate), then email within 30 min. Do not call on Day 1. Let the data speak.",
    },
    day_3: {
      call_script,
      note: "If no WhatsApp or email response in 48 hours: call between 10am–12pm or 3pm–5pm IST. Reference the email sent on Day 1.",
    },
    day_7: {
      follow_up_whatsapp: `Hi [Name],\n\nFollowing up on my message from last week about the ${state} dealer opportunity.\n\n${state} has ${inr(marketGmv)} in active fogging demand — still looking for the right partner here.\n\nAre you available for a 15-minute call this week?\n\n— [Your name], 100X Circle`,
      note: "If still no response after Day 3 call: send a short follow-up WhatsApp. Do NOT resend the full pitch — keep it brief.",
    },
    day_14: {
      final_whatsapp: `Hi [Name],\n\nLast message from my side about the 100X Circle dealer opportunity in ${state}.\n\nIf this isn't the right time, no problem at all. Feel free to reach out whenever you're ready — 100xcircle.com.\n\nWishing you well!\n— [Your name], 100X Circle`,
      note: "If no response in 14 days: send a polite close message. Mark this lead as Deferred in your CRM. Move to the next candidate.",
    },
  }

  const whatsapp_sequence = {
    first_message: whatsapp_draft,
    follow_up: `Hi [Name],\n\nJust following up on my message about 100X Circle dealer opportunity in ${state}.\n\nThis market has ${inr(marketGmv)} in active procurement with zero local representation right now — first mover advantage is real.\n\n5 minutes to connect? 📞\n\n— [Name], 100X Circle`,
    reminder: `Hi [Name],\n\nLast follow-up on ${state}.\n\nIf now isn't the right time, happy to reconnect in a few months. Just let me know!\n\n— [Name], 100X Circle`,
    meeting_confirmation: `Hi [Name],\n\nConfirming our call/meeting on [Date] at [Time].\n\nI'll have ready:\n• ${state} market data (${orgCount} active buyers, ${inr(marketGmv)} GMV)\n• 100X Circle product catalog\n• Dealer pricing and margin structure\n• Live GeM tenders in ${state}\n\nLooking forward to it!\n— [Name], 100X Circle`,
  }

  return {
    type: "dealer_recruitment",
    target_state: state,
    market_gmv: marketGmv,
    market_contracts: marketContracts,
    org_count: orgCount,
    top_organizations: topOrgsFormatted,
    market_evidence,
    outreach_email_draft,
    whatsapp_draft,
    call_script,
    meeting_agenda,
    outreach_schedule,
    whatsapp_sequence,
  }
}

// ─── OEM Displacement Pack ────────────────────────────────────────────────────

async function oemDisplacementPack(rec: DirectorRec, db: Db): Promise<OEMDisplacementPack> {
  const orgName = String(rec.payload.organization_name || "")
  const orgState = String(rec.payload.organization_state || "")
  const incumbentOem = String(rec.payload.incumbent_oem_brand || rec.payload.incumbent_oem || "competitor")
  const incumbentGmv = Number(rec.payload.incumbent_oem_gmv || 0)
  const totalGmv = Number(rec.payload.total_gmv || 0)
  const deptCategory = String(rec.payload.dept_category || "Government")

  // Find nearest 100X dealer/seller in same state
  const nearestSeller = await db.collection("fogging_sellers")
    .findOne({ is_100x: true, seller_state: orgState })

  const market_evidence = `Organization intelligence for ${orgName}:
State: ${orgState}
Department: ${deptCategory}
Total fogging GMV: ${inr(totalGmv)} (all contracts)
Amount going to ${incumbentOem}: ${inr(incumbentGmv)}
100X revenue from this org: ₹0
Nearest 100X dealer in ${orgState}: ${nearestSeller ? String(nearestSeller.seller_name || "exists") : "NONE — recruitment needed first"}
GeM procurement status: Active buyer
Next action window: Before next GeM tender cycle`

  const outreach_email_draft = `Subject: 100X Circle — Thermal Fogging Machines for ${orgName}

Dear [Purchase Officer / Nodal Officer Name],

I'm writing on behalf of 100X Circle, a leading manufacturer of thermal fogging machines, with products listed on GeM.

We noticed that ${orgName} has been actively procuring thermal fogging equipment for ${deptCategory.toLowerCase()} operations. We'd like to introduce 100X Circle machines as a superior alternative for your next procurement cycle.

WHY 100X CIRCLE FOR ${orgName.toUpperCase()}:
• Government-approved, GeM-listed machines with all required certifications
• Competitive pricing — request a quote comparison against your current supplier
• Local technical support available in ${orgState}
• Post-purchase AMC contracts available for long-term maintenance
• Faster delivery timelines from domestic manufacturing

CURRENT USAGE:
Your department has invested ${inr(totalGmv)} in fogging procurement. We'd like to demonstrate why 100X Circle represents better value for your next tender.

NEXT STEP:
Could we arrange a 30-minute demonstration or presentation for your technical committee before your next tender? We can also provide a GeM rate comparison.

Alternatively, please mention our GeM seller listing (100X Circle) in your next tender specifications.

Best regards,
[Dealer/100X Representative Name]
100X Circle Authorized Representative | ${orgState}
GeM Seller ID: [Your GeM ID]`

  const whatsapp_draft = `Hello [Name],

This is [Your Name] from 100X Circle — we manufacture thermal fogging machines listed on GeM.

I noticed ${orgName} has been procuring fogging equipment regularly. We'd love to present our products for your next tender cycle.

Our machines are GeM-approved, competitively priced, and we have local support in ${orgState}.

Can I share our product catalog? Or arrange a quick call with your purchase team?

Thank you 🙏
100X Circle | 100xcircle.com`

  const call_script = `GOVERNMENT BUYER OUTREACH SCRIPT — ${orgName}

OPENING:
"Good morning/afternoon, I'm calling from 100X Circle — we manufacture thermal fogging machines listed on GeM. Could I speak with the purchase officer or nodal officer for fogging/sanitation equipment?"

CONTEXT:
"We understand ${orgName} has been regularly procuring thermal fogging equipment. We'd like to introduce 100X Circle as an option for your next procurement cycle."

KEY POINTS:
• "100X Circle is listed on GeM with all required government certifications"
• "We offer competitive pricing — happy to share a quote vs your current supplier"
• "We have dealer support in ${orgState} for quick delivery and maintenance"
• "Our machines come with standard warranty and AMC options"

ASK:
"Could I send our product catalog to the relevant officer? And could we schedule a demonstration before your next tender?"

OR:
"Could you share your next tender schedule so we can register our interest?"

FOLLOW UP:
"I'll send our GeM listing link and product brochure right away. Shall I also send an AMC proposal?"

NOTES:
Current supplier: ${incumbentOem} (${inr(incumbentGmv)})
Target: Position 100X as the superior alternative for the next GeM cycle`

  const meeting_agenda = `GOVERNMENT BUYER MEETING AGENDA — ${orgName}

Duration: 30 minutes
Attendees: 100X Circle representative, ${orgName} purchase/technical officer

1. INTRODUCTION (5 min)
   - 100X Circle background: domestic manufacturer, GeM-listed
   - Products: thermal fogging machines (ULV, thermal, vehicle-mounted)

2. PRODUCT PRESENTATION (10 min)
   - Machine variants relevant to ${deptCategory} operations
   - Certifications (IS standards, CE, GeM approval)
   - Pricing: compare against current procurement cost
   - Delivery timelines and warranty

3. SUPPORT ECOSYSTEM (5 min)
   - Local dealer/representative in ${orgState}
   - AMC/service contract options
   - Spare parts availability
   - Technical training for department staff

4. PROCUREMENT PATHWAY (5 min)
   - GeM listing: how to find us (100X Circle seller ID)
   - Tender specification template we can provide
   - L1 rate comparison vs current supplier

5. NEXT STEPS (5 min)
   - Share product catalog and GeM links
   - Schedule follow-up before next tender cycle
   - AMC proposal if machines already in service

ACTION ITEMS:
□ 100X to share complete product catalog with GeM links
□ 100X to share technical spec sheets matching ${orgName} requirements
□ Confirm next tender schedule with purchase officer
□ Submit GeM rate card for comparison`

  const whatsapp_sequence = {
    first_message: whatsapp_draft,
    follow_up: `Hello [Name],\n\nFollowing up on my earlier message about 100X Circle machines for ${orgName}.\n\nWe're GeM-listed, competitively priced, and have local support in ${orgState}. Happy to share a rate comparison vs your current supplier.\n\nCould I send our product catalog?\n\n— [Name], 100X Circle`,
    reminder: `Hello,\n\nLast follow-up regarding 100X Circle fogging machines for ${orgName}.\n\nIf you have upcoming procurement plans, we'd love to be considered. Otherwise, feel free to reach out whenever needed — 100xcircle.com.\n\nThank you 🙏\n— 100X Circle`,
    meeting_confirmation: `Hello [Name],\n\nConfirming our meeting/call on [Date] at [Time] regarding fogging machine procurement for ${orgName}.\n\nI'll bring:\n• 100X Circle product catalog and GeM listing details\n• Rate comparison vs current supplier\n• Technical spec sheets matching your requirements\n• AMC/service contract proposal\n\nLooking forward to meeting you!\n— [Name], 100X Circle`,
  }

  return {
    type: "oem_displacement",
    organization_name: orgName,
    organization_state: orgState,
    incumbent_oem: incumbentOem,
    incumbent_gmv: incumbentGmv,
    total_gmv: totalGmv,
    market_evidence,
    outreach_email_draft,
    whatsapp_draft,
    call_script,
    meeting_agenda,
    whatsapp_sequence,
  }
}

// ─── Landing Page / Content Pack ──────────────────────────────────────────────

async function landingPagePack(rec: DirectorRec, db: Db): Promise<LandingPagePack> {
  const keyword = String(rec.payload.query || "thermal fogging machine")
  const impressions = Number(rec.payload.impressions || 0)
  const ctr = Number(rec.payload.ctr || 0)
  const position = Number(rec.payload.position || 10)
  const clicks = Number(rec.payload.clicks || 0)

  // Pull related queries from GSC for keyword expansion
  const syncDate = rec.payload.syncDate as string
  const relatedQueries = syncDate ? await db.collection("gsc_query_rows")
    .find({ syncDate, period: "current", impressions: { $gte: 10 } })
    .sort({ impressions: -1 })
    .limit(10)
    .toArray() : []

  const relatedKeywords = relatedQueries
    .map(q => String(q.query || ""))
    .filter(q => q !== keyword && q.length > 3)
    .slice(0, 5)

  const isLandingPage = rec.type === "landing_page_create"

  const recommended_structure = isLandingPage ? [
    `H1: [Product/Service Name] for ${keyword.replace(/machine/gi, "").trim()} — Government Approved`,
    "Hero section: Machine image + key specs + 'Get Quote on GeM' CTA",
    "Trust section: GeM listing badge, certifications, government clients",
    "Product variants section: 3 machine types with specs table",
    "Use cases section: Health dept, Municipal, Sanitation applications",
    "State-specific section: Delivery and dealer availability in your state",
    "FAQ section: Addressing top 5 search intent questions",
    "Contact CTA: Request demo / Get GeM rate card",
  ] : [
    `H1: Complete Guide to ${keyword} for Government Departments`,
    "Introduction: What, why, when",
    "Section 2: Types of machines and which to choose",
    "Section 3: Government procurement guide (GeM process)",
    "Section 4: Specifications and standards (IS certifications)",
    "Section 5: Cost and AMC considerations",
    "Section 6: State-wise availability (100X Circle)",
    "Conclusion + CTA: Get quote",
  ]

  const seo_brief = `SEO BRIEF: ${keyword}

TARGET KEYWORD: "${keyword}"
SEARCH DATA: ${impressions.toLocaleString("en-IN")} monthly impressions, position ${Math.round(position)}, ${(ctr * 100).toFixed(1)}% CTR
OPPORTUNITY: Moving from position ${Math.round(position)} to top 3 would yield ~${Math.round(impressions * 0.2).toLocaleString("en-IN")} extra clicks/month
INTENT: ${position < 8 ? "Commercial — user is comparing/evaluating" : "Informational — user is researching"}

RELATED KEYWORDS TO TARGET:
${relatedKeywords.map(k => `• ${k}`).join("\n") || "• Check GSC for related queries"}

ON-PAGE REQUIREMENTS:
• Primary keyword in title, H1, first paragraph, meta description
• Secondary keywords: ${relatedKeywords.slice(0, 3).join(", ")}
• Word count: ${isLandingPage ? "600-900 words (conversion-focused)" : "1,500-2,500 words (comprehensive guide)"}
• Internal links: Link to product pages, GSC page, dealer finder
• External links: GeM portal, government department sites for credibility
• Schema markup: Product schema (if LP), Article schema (if blog)

META REQUIREMENTS:
• Title (60 chars): Optimize for "${keyword}" + benefit/location
• Description (155 chars): Include keyword + CTA + differentiator
• URL slug: /${keyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`

  const meta_title = `${keyword.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} | GeM Listed | 100X Circle`
  const meta_description = `Buy ${keyword} for government departments. 100X Circle machines are GeM-listed, government-approved, and available across India. Request a quote today.`

  const content_outline = `CONTENT OUTLINE: "${keyword}"

TITLE: ${isLandingPage
    ? `100X Circle ${keyword.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} — Government Approved, GeM Listed`
    : `${keyword.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}: Complete Guide for Government Departments (2024)`}

${recommended_structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}

KEY MESSAGES:
• 100X Circle is a trusted domestic manufacturer
• GeM-listed, government-approved, all certifications
• Available across India with local dealer support
• Competitive pricing with after-sale service

TONE: Professional, authoritative, helpful. Not promotional. Government procurement officers are the audience.

DIFFERENTIATORS TO HIGHLIGHT:
• Domestic manufacturer (Make in India)
• GeM portal listing (easy procurement)
• State-wise dealer presence
• Post-sale AMC available`

  const cta_recommendation = isLandingPage
    ? `PRIMARY CTA: "Get GeM Rate Card" (email capture + quote form)
SECONDARY CTA: "Request Demo in Your State"
URGENCY HOOK: "Active GeM tenders in your state — check availability"
FORM FIELDS: Name, Department, State, Phone, "Current machine brand (optional)"`
    : `END-OF-ARTICLE CTA: "View 100X Circle machines on GeM" + link to GeM listing
MID-ARTICLE CTA: "Check dealer availability in your state"
LEAD MAGNET: "Download Thermal Fogging Machine Spec Sheet" (PDF capture)`

  return {
    type: "landing_page",
    keyword,
    search_demand: { impressions, position, ctr_pct: parseFloat((ctr * 100).toFixed(1)), clicks },
    recommended_structure,
    seo_brief,
    content_outline,
    cta_recommendation,
    meta_title,
    meta_description,
  }
}

// ─── Campaign Pack ────────────────────────────────────────────────────────────

async function campaignPack(rec: DirectorRec, db: Db): Promise<CampaignPack> {
  const type = rec.type
  const payload = rec.payload

  // Pull market data for context
  const totalFoggingOrgs = await db.collection("fogging_organizations").countDocuments()
  const totalFoggingGmv = await db.collection("fogging_organizations")
    .aggregate([{ $group: { _id: null, total: { $sum: "$total_gmv" } } }])
    .toArray().then(r => Number(r[0]?.total || 0))

  const campaignConfigs: Record<string, {
    label: string
    audience: string
    audience_desc: string
    keywords: string[]
    budget: number
    reach: number
    ctr_pct: number
    creative_brief: string
    targeting: string
    ad_copies: Array<{ headline: string; description: string; display_url: string }>
    campaign_name: string
    campaign_objective: string
    ad_groups: Array<{ name: string; match_type: string; keywords: string[]; headlines: string[]; descriptions: string[] }>
    negative_keywords: string[]
  }> = {
    remarketing_campaign: {
      label: "Remarketing Campaign",
      audience: "Previous site visitors (30/90/180 day windows)",
      audience_desc: "Users who visited 100xcircle.com but did not convert. High intent — already aware of the brand.",
      keywords: [],
      budget: 5000,
      reach: Math.round(totalFoggingOrgs * 0.3),
      ctr_pct: 2.5,
      creative_brief: "Display ads showing machine image + 'Still looking for a fogging machine?' message. Include trust signals: GeM-listed, government-approved. Strong CTA to quote form.",
      targeting: "Remarketing lists: All visitors (30d), Product page visitors (90d), Quote form abandoners (180d). Exclude: Converted leads.",
      ad_copies: [
        { headline: "Still Looking for Fogging Machines?", description: "100X Circle — GeM Listed, Government Approved. Get your quote today.", display_url: "100xcircle.com/fogging-machines" },
        { headline: "100X Circle | Government Grade Fogging", description: "₹[price] onwards. Certified machines for municipal & health departments. Request demo.", display_url: "100xcircle.com/get-quote" },
      ],
      campaign_name: "100X Circle | Remarketing — Site Visitors",
      campaign_objective: "Re-engage site visitors — drive quote form submission",
      negative_keywords: ["job", "career", "vacancy", "repair service", "spare parts", "used", "second hand", "rent", "hire"],
      ad_groups: [
        {
          name: "All Visitors — 30 Day",
          match_type: "Audience (remarketing)",
          keywords: [],
          headlines: ["Still Looking for a Fogger?", "100X Circle — Get Quote", "Fogging Machine Quote", "GeM Listed | 100X Circle", "Government Grade Fogging", "Compare Before You Buy"],
          descriptions: [
            "You visited 100xcircle.com. Ready to get a quote? GeM-listed, government-approved. 24-hour response.",
            "Don't let the next tender pass. 100X Circle thermal fogging machines — get your rate card today.",
          ],
        },
        {
          name: "Product Page Visitors — 90 Day",
          match_type: "Audience (remarketing)",
          keywords: [],
          headlines: ["100X Circle Thermal Fogger", "Ready to Order?", "Get GeM Rate Card", "Government Approved Fogger", "Quote in 24 Hours", "Bulk Orders Welcome"],
          descriptions: [
            "You viewed our fogging machines. Let us send you a formal quote — delivered within 24 hours.",
            "100X Circle machines: ISO certified, GeM-listed, with local dealer support across India.",
          ],
        },
      ],
    },
    youtube_campaign: {
      label: "YouTube Brand Awareness Campaign",
      audience: "Government officials, purchase managers, health/sanitation departments",
      audience_desc: `${totalFoggingOrgs}+ government organizations actively procuring fogging machines. Video awareness builds brand recall before the next GeM tender cycle.`,
      keywords: ["thermal fogging machine", "fogging machine for government", "thermal fogger india", "sanitation equipment"],
      budget: 15000,
      reach: Math.round(totalFoggingOrgs * 2),
      ctr_pct: 1.2,
      creative_brief: `VIDEO BRIEF (30-60 second TrueView ad):
HOOK (0-5s): Show machine spraying in a government premise. Text: "Government health departments use 100X Circle"
CONTENT (5-25s): Show machine features, GeM portal badge, municipal corporation client logos
PROOF (25-45s): Before/after or usage footage. Key stat: "Trusted by ${Math.round(totalFoggingOrgs * 0.1)}+ government organizations"
CTA (45-60s): "Available on GeM — search 100X Circle" + website URL
TONE: Professional, trustworthy, government-appropriate`,
      targeting: "Demographics: 25-55, All genders. Interests: Government procurement, Health & sanitation, Environmental management. Custom intent: 'thermal fogging machine price', 'fogging machine for dengue control'. Remarketing: 100xcircle.com visitors.",
      ad_copies: [
        { headline: "100X Circle Thermal Fogging Machines", description: "Government-approved, GeM-listed. Used by 100+ municipal and health departments.", display_url: "100xcircle.com" },
      ],
      campaign_name: "100X Circle | YouTube — Government Fogging Awareness",
      campaign_objective: "Brand awareness — reach government buyers before next tender cycle",
      negative_keywords: ["children", "kids", "cartoon", "gaming", "music"],
      ad_groups: [
        {
          name: "TrueView In-Stream — Government Audience",
          match_type: "Custom Intent / Affinity",
          keywords: ["thermal fogging machine", "fogging machine for government", "fogging machine tender", "municipal fogging equipment", "sanitation equipment india"],
          headlines: ["100X Circle | GeM Listed Fogging Machines", "Government Approved Thermal Fogger", "Trusted by 100+ Govt Departments"],
          descriptions: [
            "100X Circle: Government-grade thermal fogging machines. GeM-listed. Available across India with local dealer support.",
            "Used by municipal corporations and health departments. Request a demo before your next tender.",
          ],
        },
      ],
    },
    performance_max_campaign: {
      label: "Performance Max Campaign",
      audience: "Full-funnel: awareness to conversion across all Google channels",
      audience_desc: "Performance Max covers Search, Display, YouTube, Gmail, Maps, and Discover simultaneously. Uses AI to find best-converting placements.",
      keywords: ["thermal fogging machine", "fogging machine price", "buy fogging machine india", "fogging machine for government", "thermal fogger", "ulv fogger india"],
      budget: 20000,
      reach: Math.round(totalFoggingOrgs * 5),
      ctr_pct: 3.5,
      creative_brief: `PERFORMANCE MAX ASSET GROUP:
Headlines (15 max): "100X Circle Thermal Fogger" | "GeM Listed Fogging Machines" | "Government Approved Fogger" | "Dengue Control Equipment" | "Buy Fogging Machine Online" | "Certified Thermal Fogger India" | "Municipal Grade Fogger" | "Get Quote — Same Day Response" | "Fogging Machine ₹[price]+" | "Made in India Fogger"
Descriptions (4 max): "100X Circle thermal fogging machines are government-approved and GeM-listed. Available across India with dealer support." | "Used by 100+ municipal corporations and health departments. Request a quote and get GeM rate card instantly." | "Domestic manufacturer with full after-sales support. ISO certified. Competitive pricing for government bulk orders." | "Compare against imported machines — 100X Circle delivers better value, faster delivery, and local service."
Images: Machine on white background, Machine in use (government premises), Team/facility, GeM badge
Videos: 30s product demo, 60s testimonial (if available)`,
      targeting: "Conversion goal: Quote form submission. Use existing customer data as seed audience. Let Google AI optimize across channels.",
      ad_copies: [
        { headline: "100X Circle | GeM Listed Fogging Machines", description: "Government-approved thermal foggers. Quote in 24 hours. Local dealer support.", display_url: "100xcircle.com/fogging-machines" },
        { headline: "Thermal Fogging Machine — Buy on GeM", description: "100X Circle: Trusted by 100+ govt departments. Compare prices, get quote.", display_url: "100xcircle.com" },
      ],
      campaign_name: "100X Circle | Performance Max — Fogging",
      campaign_objective: "All-channels lead generation — quote form submissions",
      negative_keywords: ["second hand", "used", "rent", "repair", "spare parts", "job", "career", "diy", "personal use", "mini", "toy"],
      ad_groups: [
        {
          name: "Asset Group 1 — Primary",
          match_type: "Performance Max (AI-driven)",
          keywords: ["thermal fogging machine", "fogging machine india", "buy fogging machine", "fogging machine for government", "thermal fogger price", "ulv fogger india"],
          headlines: [
            "100X Circle Thermal Fogger", "GeM Listed Fogging Machines", "Government Approved Fogger",
            "Dengue Control Equipment", "Buy Fogging Machine Online", "Certified Thermal Fogger India",
            "Municipal Grade Fogger", "Get Quote — Same Day", "Fogging Machine ₹[price]+",
            "Made in India Fogger", "ISO Certified Thermal Fogger", "Pan-India Dealer Support",
            "100+ Govt Departments Trust Us", "Compare Before You Buy", "Request Demo Today",
          ],
          descriptions: [
            "100X Circle thermal fogging machines are government-approved and GeM-listed. Available across India with dealer support.",
            "Used by 100+ municipal corporations and health departments. Request a quote and get GeM rate card instantly.",
            "Domestic manufacturer with full after-sales support. ISO certified. Competitive pricing for government bulk orders.",
            "Compare against imported machines — 100X Circle delivers better value, faster delivery, and local service.",
          ],
        },
      ],
    },
    competitor_conquest_campaign: {
      label: "Competitor Conquest Campaign",
      audience: "Users searching for competitor brands (BioFog, Kisankraft, Pulsfog, etc.)",
      audience_desc: "Buyers actively considering competitor products are high-intent. Conquest ads intercept them at the decision moment.",
      keywords: [
        ...String(payload.top_competitors || "").split(",").map((c: string) => c.trim().toLowerCase() + " fogging machine"),
        "biofog machine", "kisankraft fogger", "pulsfog", "nebulizer machine india",
        "thermal fogger alternative", "compare fogging machines",
      ].filter(Boolean),
      budget: 10000,
      reach: Math.round(totalFoggingOrgs * 1.5),
      ctr_pct: 4.5,
      creative_brief: `CONQUEST AD BRIEF:
Goal: Intercept users searching for competitors and offer a comparison
Tone: Confident, not aggressive. "Consider 100X Circle" not "Competitor X is bad"
Message: Better value, domestic manufacturer, GeM-listed, local support
Key proof: Government approval, GeM listing, domestic manufacturing
Landing page: Create a comparison page or improve the product page with competitor comparison table`,
      targeting: `Keywords (exact/phrase match):
• Competitor brand terms: [competitor] fogging machine, [competitor] fogger price, [competitor] review
• Comparison terms: best fogging machine india, fogging machine comparison, thermal fogger brands
IMPORTANT: Use phrase match, not broad. Monitor search terms for irrelevant traffic.`,
      ad_copies: [
        { headline: "Compare Before You Buy — 100X Circle", description: "GeM-listed, government-approved fogging machines. Compare specs and pricing. Made in India.", display_url: "100xcircle.com/compare" },
        { headline: "100X Circle vs [Competitor Brand]", description: "Domestic manufacturer. Full after-sales support. Competitive pricing. Get a quote in 24 hours.", display_url: "100xcircle.com/get-quote" },
      ],
      campaign_name: "100X Circle | Conquest — Competitor Keywords",
      campaign_objective: "Intercept competitor brand searches — convert to 100X leads",
      negative_keywords: ["second hand", "used", "repair", "spare parts", "job", "rent"],
      ad_groups: [
        {
          name: "Competitor Brand Terms",
          match_type: "Phrase Match",
          keywords: [
            ...String(payload.top_competitors || "").split(",").map((c: string) => c.trim().toLowerCase() + " fogging machine").filter(Boolean),
            "biofog fogging machine", "kisankraft fogger price", "pulsfog machine india",
          ].filter(Boolean),
          headlines: ["Compare Before You Buy", "100X Circle vs [Competitor]", "Better Than [Competitor]?", "GeM Listed | 100X Circle", "Domestic Manufacturer", "Get Free Quote Today"],
          descriptions: [
            "Considering a competitor? Compare 100X Circle — GeM-listed, government-approved, domestic manufacturer.",
            "Better value, faster delivery, local support. 100X Circle thermal fogging machines. Free quote in 24 hours.",
          ],
        },
        {
          name: "Comparison / Alternative Terms",
          match_type: "Phrase Match",
          keywords: ["best fogging machine india", "fogging machine comparison", "thermal fogger brands india", "fogging machine alternative", "compare thermal fogger"],
          headlines: ["Best Fogging Machine India", "100X Circle | Top Rated", "Compare Fogger Brands", "Why Choose 100X Circle?", "GeM Listed | ISO Certified", "Free Comparison Report"],
          descriptions: [
            "100X Circle: domestic manufacturer, GeM-listed, ISO certified. Compare against any competitor — free.",
            "See why 100+ government departments prefer 100X Circle. Request specs and pricing comparison today.",
          ],
        },
      ],
    },
    search_campaign: {
      label: "Search Campaign",
      audience: "Users actively searching for fogging/thermal fogging solutions",
      audience_desc: "High-intent buyers in the consideration phase, searching for machines to purchase or quote for government procurement.",
      keywords: String(payload.query || "").split(",").map((k: string) => k.trim()).filter(Boolean).concat([
        "thermal fogging machine", "fogging machine for government", "buy thermal fogger india",
        "fogging machine price india", "thermal fogger government approved",
      ]),
      budget: 12000,
      reach: Number(payload.impressions || 500),
      ctr_pct: 5.0,
      creative_brief: `SEARCH CAMPAIGN BRIEF:
Ad groups: Group by intent — (1) Buy intent: 'buy fogging machine', (2) Government: 'fogging machine for municipal', (3) Price: 'fogging machine price'
Match types: Phrase match primary, some exact match for high-value terms
Landing page: Direct to product page or quote form — not homepage
Extensions: Sitelinks (Quote, Products, Dealers, GeM Listing), Callout (GeM Listed, Government Approved, Pan-India)`,
      targeting: "Geographic: India, focus on states with active government procurement. Schedule: Weekdays 9 AM - 6 PM (government purchase officers). Devices: All.",
      ad_copies: [
        { headline: "Thermal Fogging Machines — GeM Listed", description: "Government-approved 100X Circle foggers. Get quote for bulk procurement. Pan-India delivery.", display_url: "100xcircle.com/fogging-machines" },
        { headline: "100X Circle | Buy Fogging Machine", description: "Government-grade thermal foggers. ISO certified, GeM listed. Request a demo in your state.", display_url: "100xcircle.com/get-quote" },
      ],
      campaign_name: "100X Circle | Search — Fogging Machine Buyers",
      campaign_objective: "Leads — quote form submissions from government buyers",
      negative_keywords: [
        "second hand", "used", "rent", "hire", "repair", "spare parts", "job", "career", "vacancy",
        "diy", "homemade", "personal use", "mini", "toy", "fake", "cheap quality", "mosquito coil",
        "manual sprayer", "hand sprayer", "knapsack", "backpack sprayer",
      ],
      ad_groups: [
        {
          name: "Buy Intent — Fogging Machine",
          match_type: "Phrase Match",
          keywords: ["buy thermal fogging machine", "fogging machine price india", "purchase thermal fogger", "fogging machine online india", "buy fogger machine india"],
          headlines: ["Buy Thermal Fogging Machine", "100X Circle | GeM Listed Fogger", "Fogging Machine — Get Quote", "100X Circle Thermal Fogger", "Government Grade Fogging", "Thermal Fogger — Pan India"],
          descriptions: [
            "100X Circle thermal fogging machines: GeM-listed, government-approved. Get your quote in 24 hours.",
            "Competitive pricing for bulk government orders. ISO certified. Domestic manufacturer. Pan-India delivery.",
          ],
        },
        {
          name: "Government / GeM Intent",
          match_type: "Phrase Match",
          keywords: ["fogging machine for government", "fogging machine gem", "thermal fogger government approved", "fogging machine municipal corporation", "fogger for health department"],
          headlines: ["GeM Listed Fogging Machine", "Government Approved Fogger", "100X Circle | GeM Seller", "Thermal Fogger for Govt Dept", "Bulk Orders Welcome", "GeM Rate Card Available"],
          descriptions: [
            "Available on GeM portal. 100X Circle — trusted by municipal and health departments across India.",
            "Request GeM rate card. Compare vs current supplier. Same-day quote response. Local dealer support.",
          ],
        },
        {
          name: "Price / Comparison Intent",
          match_type: "Phrase Match",
          keywords: ["thermal fogging machine price", "fogging machine cost india", "fogging machine rate", "best fogging machine india", "thermal fogger comparison"],
          headlines: ["Thermal Fogger Price India", "Compare Fogging Machines", "100X Circle | Best Value", "Fogging Machine ₹[Price]+", "Get Price List Today", "100X Circle Fogging"],
          descriptions: [
            "Get 100X Circle price list for thermal fogging machines. Compare against current supplier. ISO certified.",
            "Transparent pricing. No hidden costs. Request quote + GeM rate card — respond within 24 hours.",
          ],
        },
      ],
    },
    negative_keyword: {
      label: "Negative Keyword Fix",
      audience: "N/A — waste elimination, not a campaign creation",
      audience_desc: "Remove wasted spend from zero-conversion search terms.",
      keywords: [String(payload.searchTerm || "")],
      budget: 0,
      reach: 0,
      ctr_pct: 0,
      creative_brief: `NEGATIVE KEYWORD ACTION:
Search term to block: "${payload.searchTerm}"
Campaign: ${payload.campaign}
Match type: Exact match negative — [${payload.searchTerm}]
STEPS:
1. Log into Google Ads
2. Navigate to: Campaigns → Keywords → Negative Keywords
3. Add at campaign level: [${payload.searchTerm}]
4. Optionally add similar terms as phrase match: "${payload.searchTerm}"
IMPACT: Prevents ${payload.clicks} future irrelevant clicks at ${inr(Number(payload.spend || 0))} per batch`,
      targeting: `Campaign: ${payload.campaign}\nAction type: Exclude (negative keyword)\nScope: Campaign level`,
      ad_copies: [],
      campaign_name: `[Optimisation] Negative Keyword — ${payload.campaign || "Campaign"}`,
      campaign_objective: "Eliminate wasted spend on non-converting search terms",
      ad_groups: [],
      negative_keywords: [String(payload.searchTerm || "")].filter(Boolean),
    },
    budget_reallocate: {
      label: "Budget Reallocation",
      audience: "N/A — budget optimization, not a new campaign",
      audience_desc: "Shift budget from underperforming campaigns to high-ROAS campaigns.",
      keywords: [],
      budget: Number(payload.from_spend || 0),
      reach: 0,
      ctr_pct: 0,
      creative_brief: `BUDGET REALLOCATION ACTION:
Reduce budget on: ${payload.from_campaign || "underperforming campaign"}
Increase budget on: ${payload.to_campaign || "high-ROAS campaign"}
Amount to shift: ${inr(Number(payload.shift_amount || 0))} per day
Expected improvement: More conversions from same total spend`,
      targeting: `From: ${payload.from_campaign}\nTo: ${payload.to_campaign}\nMethod: Reduce daily budget by ${payload.reduction_pct || "20"}% on source, increase target proportionally`,
      ad_copies: [],
      campaign_name: `[Optimisation] Budget Reallocation`,
      campaign_objective: "Shift spend from low-ROAS to high-ROAS campaigns",
      ad_groups: [],
      negative_keywords: [],
    },
    creative_refresh: {
      label: "Creative Refresh",
      audience: "Existing campaign audience",
      audience_desc: "Refresh underperforming ad creatives to improve CTR and conversion.",
      keywords: [],
      budget: 0,
      reach: 0,
      ctr_pct: 0,
      creative_brief: `CREATIVE REFRESH ACTION:
Campaign: ${payload.campaign}
Current issue: Low CTR / poor conversion rate
NEW CREATIVE GUIDELINES:
• Lead with the strongest benefit: "GeM Listed" or "Government Approved"
• Test price-anchored headlines: "Fogging Machine from ₹[X]"
• Include social proof: "Used by 100+ Govt Departments"
• Strong CTA: "Get Quote Today" not "Learn More"
• Test responsive search ads with 15 headlines and 4 descriptions`,
      targeting: `Campaign: ${payload.campaign}\nAction: Replace / add ad variations while keeping existing ads live until new ones accumulate data`,
      ad_copies: [
        { headline: "100X Circle | GeM Listed Fogger", description: "Government-approved thermal foggers. Competitive pricing for bulk orders. Quote in 24h.", display_url: "100xcircle.com" },
        { headline: "Thermal Fogging Machines — Govt Grade", description: "ISO certified. Pan-India dealer support. Used by 100+ municipal departments. Get quote.", display_url: "100xcircle.com/fogging-machines" },
      ],
      campaign_name: `[Optimisation] Creative Refresh — ${payload.campaign || "Campaign"}`,
      campaign_objective: "Replace low-CTR ad creatives to improve conversion rate",
      ad_groups: [
        {
          name: "Refreshed Creatives",
          match_type: "RSA (Responsive Search Ad)",
          keywords: [],
          headlines: [
            "100X Circle | GeM Listed Fogger", "Thermal Fogging Machine India", "Government Approved Fogger",
            "GeM Listed | Government Approved", "Fogging Machine — Get Quote", "Thermal Fogger ₹[Price]+",
            "100X Circle Thermal Fogger", "Bulk Orders | Fast Delivery", "ISO Certified Fogging Machine",
            "Used by Govt Departments", "Pan-India Dealer Support", "Get Quote in 24 Hours",
            "Compare Before You Buy", "Domestic Manufacturer", "Request Demo in Your State",
          ],
          descriptions: [
            "100X Circle thermal fogging machines: GeM-listed, ISO certified, government-approved. Quote in 24 hours.",
            "Competitive pricing for bulk orders. Domestic manufacturer with pan-India dealer support and AMC contracts.",
            "100+ municipal and health departments trust 100X Circle. Compare specs and pricing — free quote today.",
            "GeM portal listed. All government certifications. Local dealer support in your state. Fast delivery.",
          ],
        },
      ],
      negative_keywords: [],
    },
  }

  const config = campaignConfigs[type] || campaignConfigs.search_campaign

  return {
    type: "campaign",
    campaign_type: type,
    campaign_label: config.label,
    target_audience: config.audience,
    audience_description: config.audience_desc,
    keywords: config.keywords,
    budget_recommendation_inr: config.budget,
    expected_reach: config.reach,
    expected_ctr_pct: config.ctr_pct,
    ad_copy_drafts: config.ad_copies,
    creative_brief: config.creative_brief,
    targeting_notes: config.targeting,
    campaign_name: config.campaign_name,
    campaign_objective: config.campaign_objective,
    ad_groups: config.ad_groups ?? [],
    negative_keywords: config.negative_keywords ?? [],
  }
}

// ─── Customer Match Pack ──────────────────────────────────────────────────────

async function customerMatchPack(rec: DirectorRec, db: Db): Promise<CustomerMatchPack> {
  // Aggregate fogging organizations by department category
  const orgs = await db.collection("fogging_organizations")
    .find({ total_gmv: { $gte: 5_000 } })
    .toArray()

  const segmentMap = new Map<string, { count: number; gmv: number }>()
  for (const org of orgs) {
    const dept = String(org.dept_category || org.organization_type || "General Government")
    const entry = segmentMap.get(dept) || { count: 0, gmv: 0 }
    entry.count++
    entry.gmv += Number(org.total_gmv || 0)
    segmentMap.set(dept, entry)
  }

  const segments = Array.from(segmentMap.entries())
    .map(([name, data]) => ({
      segment_name: name,
      count: data.count,
      gmv: data.gmv,
      description: `${data.count} organizations in ${name.toLowerCase()} sector with ${inr(data.gmv)} in total fogging procurement`,
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 8)

  const totalOrgs = orgs.length
  const totalGmv = orgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

  const audience_name = rec.payload.audience_name
    ? String(rec.payload.audience_name)
    : "100X Circle — Government Fogging Buyers"

  return {
    type: "customer_match",
    audience_name,
    estimated_size: totalOrgs,
    audience_segments: segments,
    upload_format: "CSV with columns: Email Address, Phone, First Name, Last Name, Organization",
    upload_instructions: `CUSTOMER MATCH UPLOAD INSTRUCTIONS:

1. PREPARE THE AUDIENCE LIST
   • Export organization contact details (purchase officers, nodal officers)
   • Format as CSV: First Name, Last Name, Email, Phone, Org Name
   • Minimum 1,000 records for effective Customer Match
   • Current identified organizations: ${totalOrgs} buyers with ${inr(totalGmv)} in procurement

2. GOOGLE ADS SETUP
   • Go to: Tools & Settings → Audience Manager → Customer Lists
   • Click "+" → Customer Match
   • Select "Upload a data file"
   • Choose your prepared CSV
   • Select data type: Email addresses (primary) + Phone numbers (secondary)
   • Upload and wait for list to build (~48 hours)

3. CAMPAIGN TARGETING
   • Create new campaign or add to existing
   • Under Audiences → Add customer list
   • Set bid adjustment: +30% for Customer Match audiences
   • Campaign type: Search (highest intent) or Display (awareness)

4. AUDIENCE SEGMENTS TO BUILD:
${segments.slice(0, 5).map(s => `   • ${s.segment_name}: ${s.count} orgs`).join("\n")}

5. ESTIMATED PERFORMANCE
   • Match rate: 20-40% of records (depends on data quality)
   • Estimated matched users: ${Math.round(totalOrgs * 0.3)}-${Math.round(totalOrgs * 0.5)}
   • Recommended bid modifier: +25-35% above base bid`,
    campaign_brief: `CUSTOMER MATCH CAMPAIGN BRIEF

Audience: ${totalOrgs} government organizations that actively buy fogging machines (GeM data)
Total procurement value represented: ${inr(totalGmv)}
These are buyers with proven purchase history — the highest quality audience we can build.

CAMPAIGN OBJECTIVE: Re-engage known buyers before their next procurement cycle

RECOMMENDED AD APPROACH:
• Personalization angle: "Your department has purchased fogging machines before — see our latest models"
• Upgrade angle: "Upgrading from [competitor]? Compare 100X Circle"
• Service angle: "AMC due? 100X Circle machines come with service contracts"
• Tender angle: "New GeM tenders opening — 100X Circle is listed and ready"

TOP 3 SEGMENTS TO PRIORITIZE:
${segments.slice(0, 3).map(s => `${s.segment_name}: ${s.count} orgs, ${inr(s.gmv)} GMV — ${s.description}`).join("\n")}`,
    expected_reach: Math.round(totalOrgs * 0.35),
  }
}

// ─── Procurement Target Pack ──────────────────────────────────────────────────

async function procurementTargetPack(rec: DirectorRec, db: Db): Promise<OEMDisplacementPack> {
  const orgName  = String(rec.payload.organization_name || "")
  const orgState = String(rec.payload.organization_state || "")
  const totalGmv = Number(rec.payload.total_gmv || 0)
  const deptCategory = String(rec.payload.dept_category || "Government Department")

  // Pull nearest 100X seller in same state for response time
  const nearestSeller = await db.collection("fogging_sellers")
    .findOne({ is_100x: true, seller_state: orgState })

  const market_evidence = `Procurement target: ${orgName}
State: ${orgState}
Department: ${deptCategory}
Active procurement GMV: ${inr(totalGmv)}
100X seller in ${orgState}: ${nearestSeller ? String(nearestSeller.seller_name || "exists") : "NONE — dealer required"}
GeM status: Active buyer with procurement history
Window: Active — submit GeM quote before tender closes`

  const outreach_email_draft = `Subject: 100X Circle — Thermal Fogging Machines for ${orgName} (GeM Listed)

Dear Purchase/Nodal Officer,

I'm writing from 100X Circle, a GeM-listed manufacturer of thermal fogging machines.

We've identified ${orgName} (${deptCategory}) has an active or upcoming procurement requirement for thermal fogging equipment.

WHY 100X CIRCLE:
• GeM-listed with all required government certifications
• Competitive L1 pricing — request a rate comparison
• Pan-India delivery with local dealer support in ${orgState || "your state"}
• AMC contracts available for post-purchase maintenance
• Typical delivery: 2-3 weeks from PO

NEXT STEP:
Please find our GeM catalog listing at [GeM Seller Link]. We'd like to submit a quote for your upcoming requirement.

Could we schedule a 15-minute call this week to understand your exact specifications?

Best regards,
[Dealer/100X Representative]
100X Circle | 100xcircle.com`

  const whatsapp_draft = `Hello,

This is [Name] from 100X Circle — thermal fogging machines, GeM-listed.

I noticed ${orgName} has active fogging procurement requirements. We'd like to quote for your upcoming tender.

Competitive pricing, government-approved, local support in ${orgState || "your state"}.

May I share our product catalog?

— 100X Circle | 100xcircle.com`

  const call_script = `PROCUREMENT TARGET OUTREACH — ${orgName}

OPENING:
"Good morning, I'm calling from 100X Circle — we manufacture thermal fogging machines listed on GeM. Could I speak with the purchase officer for sanitation or fogging equipment?"

KEY POINTS:
• "We noticed ${orgName} has procurement requirements for fogging equipment"
• "100X Circle is GeM-listed with all required certifications"
• "We're competitive on L1 pricing — happy to share a rate card"
• "We have dealer support in ${orgState || "your state"} for quick delivery and maintenance"

ASK:
"Can I share our GeM product listing and submit a quote for your next tender?"
"What are your exact specifications? I can send a detailed proposal."

FOLLOW-UP:
Send: GeM catalog link + spec sheet + rate card within 1 hour of call.`

  const meeting_agenda = `PROCUREMENT MEETING — ${orgName}

Duration: 20 minutes
Goal: Qualify requirement, submit quote, get on approved vendor list

1. REQUIREMENT UNDERSTANDING (5 min)
   - Machine type needed (ULV/thermal/vehicle-mounted)
   - Quantity and delivery timeline
   - Budget range or reference rates from prior purchases

2. PRODUCT PRESENTATION (5 min)
   - 100X Circle machine variants matching requirements
   - GeM listing and certifications
   - Pricing vs market rates (L1 positioning)

3. QUOTE SUBMISSION (5 min)
   - Submit GeM quote on portal during or immediately after meeting
   - Offer demo unit if required before purchase decision

4. NEXT STEPS (5 min)
   - Confirm tender submission deadline
   - Share AMC proposal if machines already in service
   - Exchange contact details for procurement officer

ACTION ITEMS:
□ Submit GeM quote within 24 hours
□ Share technical specification sheet
□ Confirm AMC/service availability in ${orgState || "state"}`

  const whatsapp_sequence = {
    first_message: whatsapp_draft,
    follow_up: `Hello,\n\nFollowing up about 100X Circle fogging machines for ${orgName}.\n\nWe're GeM-listed and ready to quote for your upcoming requirement. Happy to share our rate card and technical specs.\n\nMay I connect with the purchase officer?\n\n— [Name], 100X Circle`,
    reminder: `Hello,\n\nLast follow-up regarding 100X Circle for ${orgName}.\n\nIf procurement is planned soon, please reach out — we'd love to submit a competitive quote on GeM.\n\n100xcircle.com\n— 100X Circle`,
    meeting_confirmation: `Hello [Name],\n\nConfirming our meeting/call on [Date] at [Time] for ${orgName} procurement discussion.\n\nI'll have ready:\n• GeM product listing and certifications\n• Rate card and comparison vs current supplier\n• Technical specification sheet\n• Delivery and AMC details\n\nThank you!\n— [Name], 100X Circle`,
  }

  return {
    type: "oem_displacement",
    organization_name: orgName,
    organization_state: orgState,
    incumbent_oem: "current supplier",
    incumbent_gmv: totalGmv,
    total_gmv: totalGmv,
    market_evidence,
    outreach_email_draft,
    whatsapp_draft,
    call_script,
    meeting_agenda,
    whatsapp_sequence,
  }
}

// ─── Main router ──────────────────────────────────────────────────────────────

export async function generateExecutionPack(
  rec: DirectorRec, db: Db
): Promise<ExecutionPack | null> {
  try {
    switch (rec.type) {
      case "dealer_recruit":
        return await dealerRecruitmentPack(rec, db)
      case "oem_displacement":
        return await oemDisplacementPack(rec, db)
      case "procurement_target":
        return await procurementTargetPack(rec, db)
      case "landing_page_create":
      case "content_create":
        return await landingPagePack(rec, db)
      case "customer_match":
      case "customer_match_campaign":
        return await customerMatchPack(rec, db)
      case "search_campaign":
      case "remarketing_campaign":
      case "youtube_campaign":
      case "performance_max_campaign":
      case "competitor_conquest_campaign":
      case "negative_keyword":
      case "budget_reallocate":
      case "creative_refresh":
        return await campaignPack(rec, db)
      default:
        return null
    }
  } catch (err) {
    console.error("Execution pack generation failed:", err)
    return null
  }
}
