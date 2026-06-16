import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export interface AudienceSegment {
  id: string
  label: string
  description: string
  size: number
  estimated_value_inr: number
  recommended_campaign: string
  campaign_rationale: string
  readiness: "ready" | "needs_data" | "not_ready"
}

export interface CustomerMatchRecommendation {
  id: string
  label: string
  list_size: number
  match_rate_est: number
  expected_matches: number
  ready_to_upload: boolean
  reason: string
}

export interface AudienceIntelligenceData {
  generated_at: string
  segments: AudienceSegment[]
  customer_match: CustomerMatchRecommendation[]
  summary: {
    total_addressable_size: number
    total_addressable_value_inr: number
    ready_segments: number
    customer_match_eligible: boolean
  }
}

export async function GET() {
  try {
    const db = (await clientPromise).db()

    // ── 1. Fogging base data ──────────────────────────────────────────────────
    const [
      allOrgs,
      sellers100x,
      rfqLeads,
      brochureLeads,
      crmDealers,
    ] = await Promise.all([
      db.collection("fogging_organizations").find({}).toArray(),
      db.collection("fogging_sellers").find({ is_100x: true }).toArray(),
      db.collection("rfq_popup_leads").countDocuments(),
      db.collection("brochure_leads").countDocuments(),
      db.collection("crm_dealers").find({ stage: { $nin: ["lost"] } }).toArray(),
    ])

    const states100x = new Set(sellers100x.map((s) => String(s.seller_state || s.state || "")))

    // ── 2. Segment calculations ───────────────────────────────────────────────

    // Existing buyers — orgs in states where 100X has won contracts
    const existingBuyerOrgs = allOrgs.filter((o) => states100x.has(String(o.state || "")))
    const existingBuyerGmv = existingBuyerOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    // Municipal corporations
    const municipalOrgs = allOrgs.filter((o) => {
      const cat = String(o.dept_category || o.org_type || "").toLowerCase()
      return cat.includes("municipal") || cat.includes("municipality")
    })
    const municipalGmv = municipalOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    // Health departments
    const healthOrgs = allOrgs.filter((o) => {
      const cat = String(o.dept_category || o.org_type || "").toLowerCase()
      return cat.includes("health") || cat.includes("medical") || cat.includes("hospital")
    })
    const healthGmv = healthOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    // Agriculture departments
    const agriOrgs = allOrgs.filter((o) => {
      const cat = String(o.dept_category || o.org_type || "").toLowerCase()
      return cat.includes("agri") || cat.includes("horticulture") || cat.includes("farm")
    })
    const agriGmv = agriOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    // Urban local bodies
    const ulbOrgs = allOrgs.filter((o) => {
      const cat = String(o.dept_category || o.org_type || "").toLowerCase()
      return cat.includes("urban") || cat.includes("nagar") || cat.includes("panchayat")
    })
    const ulbGmv = ulbOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    // Dealer prospects — states without an active 100X dealer
    const allStates = [...new Set(allOrgs.map((o) => String(o.state || "")).filter(Boolean))]
    const dealerProspectStates = allStates.filter((s) => !states100x.has(s))
    const dealerProspectOrgs = allOrgs.filter((o) => dealerProspectStates.includes(String(o.state || "")))
    const dealerProspectGmv = dealerProspectOrgs.reduce((s, o) => s + Number(o.total_gmv || 0), 0)

    const crmSize = rfqLeads + brochureLeads

    // ── 3. Build segments ─────────────────────────────────────────────────────
    const segments: AudienceSegment[] = [
      {
        id: "existing_buyers",
        label: "Existing Buyers",
        description: "Organizations in states where 100X Circle has active contracts",
        size: existingBuyerOrgs.length,
        estimated_value_inr: existingBuyerGmv,
        recommended_campaign: "Customer Match + Remarketing",
        campaign_rationale: "Upsell annual contracts, fleet expansions, spare parts — highest conversion probability",
        readiness: existingBuyerOrgs.length >= 50 ? "ready" : "needs_data",
      },
      {
        id: "municipal_buyers",
        label: "Municipal Corporations",
        description: "Municipal corporations and urban civic bodies — high-volume fogging buyers",
        size: municipalOrgs.length,
        estimated_value_inr: municipalGmv,
        recommended_campaign: "Search Campaign + Performance Max",
        campaign_rationale: "Budget season procurement — search ads for 'fogging machine municipal' drive RFQs",
        readiness: municipalOrgs.length >= 20 ? "ready" : "needs_data",
      },
      {
        id: "health_departments",
        label: "Health Departments",
        description: "Government health, medical, and hospital departments — vector control buyers",
        size: healthOrgs.length,
        estimated_value_inr: healthGmv,
        recommended_campaign: "Search Campaign",
        campaign_rationale: "Disease control seasonality (monsoon/dengue season) creates predictable demand spikes",
        readiness: healthOrgs.length >= 10 ? "ready" : "needs_data",
      },
      {
        id: "agriculture_departments",
        label: "Agriculture Departments",
        description: "Agriculture, horticulture, and farming departments — crop protection use case",
        size: agriOrgs.length,
        estimated_value_inr: agriGmv,
        recommended_campaign: "YouTube Campaign",
        campaign_rationale: "Crop protection positioning — YouTube demonstrations of field use outperform text ads",
        readiness: agriOrgs.length >= 10 ? "ready" : "needs_data",
      },
      {
        id: "urban_local_bodies",
        label: "Urban Local Bodies",
        description: "Nagar Panchayats, Nagar Parishads, and smaller urban bodies",
        size: ulbOrgs.length,
        estimated_value_inr: ulbGmv,
        recommended_campaign: "Search Campaign + Customer Match",
        campaign_rationale: "Tier-2/Tier-3 cities — emerging procurement; GeM portal buyers",
        readiness: ulbOrgs.length >= 10 ? "ready" : "needs_data",
      },
      {
        id: "active_dealers",
        label: "Active Dealers",
        description: "Current dealer pipeline and authorized dealers",
        size: crmDealers.length,
        estimated_value_inr: crmDealers.reduce((s, d) => s + Number(d.expected_revenue || 0), 0),
        recommended_campaign: "Customer Match",
        campaign_rationale: "Re-engage dormant dealers and reinforce brand with active pipeline",
        readiness: crmDealers.length >= 5 ? "ready" : "needs_data",
      },
      {
        id: "dealer_prospects",
        label: "Dealer Prospects",
        description: `States without 100X coverage: ${dealerProspectStates.slice(0, 5).join(", ")}${dealerProspectStates.length > 5 ? ` +${dealerProspectStates.length - 5} more` : ""}`,
        size: dealerProspectOrgs.length,
        estimated_value_inr: dealerProspectGmv,
        recommended_campaign: "Competitor Conquest Campaign",
        campaign_rationale: "Untapped states — conquest ads against incumbent OEMs to attract dealer sign-ups",
        readiness: dealerProspectOrgs.length >= 20 ? "ready" : "needs_data",
      },
    ]

    // ── 4. Customer Match recommendations ─────────────────────────────────────
    const customerMatch: CustomerMatchRecommendation[] = [
      {
        id: "crm_all",
        label: "All CRM Contacts",
        list_size: crmSize,
        match_rate_est: 35,
        expected_matches: Math.round(crmSize * 0.35),
        ready_to_upload: crmSize >= 1000,
        reason: crmSize >= 1000
          ? "Meets Google minimum of 1,000 contacts. Upload to Google Ads Customer Match for remarketing."
          : `${1000 - crmSize} more contacts needed to meet Google minimum of 1,000.`,
      },
      {
        id: "fogging_buyers",
        label: "Fogging Contract Buyers (if emails available)",
        list_size: existingBuyerOrgs.length,
        match_rate_est: 20,
        expected_matches: Math.round(existingBuyerOrgs.length * 0.2),
        ready_to_upload: existingBuyerOrgs.length >= 500,
        reason: existingBuyerOrgs.length >= 500
          ? "Organizations in active states — collect official procurement contact emails from GeM portal."
          : "Build email list from GeM portal procurement officers for these organizations.",
      },
      {
        id: "dealer_emails",
        label: "Dealer & Distributor List",
        list_size: crmDealers.length,
        match_rate_est: 60,
        expected_matches: Math.round(crmDealers.length * 0.6),
        ready_to_upload: crmDealers.length >= 100,
        reason: crmDealers.length >= 100
          ? "Dealer contacts — high match rate as business emails. Ready for Customer Match."
          : `${100 - crmDealers.length} more dealer contacts needed for effective Customer Match.`,
      },
    ]

    // ── 5. Summary ────────────────────────────────────────────────────────────
    const totalSize = segments.reduce((s, a) => s + a.size, 0)
    const totalValue = segments.reduce((s, a) => s + a.estimated_value_inr, 0)
    const readyCount = segments.filter((s) => s.readiness === "ready").length

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      segments,
      customer_match: customerMatch,
      summary: {
        total_addressable_size: totalSize,
        total_addressable_value_inr: totalValue,
        ready_segments: readyCount,
        customer_match_eligible: crmSize >= 1000,
      },
    } satisfies AudienceIntelligenceData)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
