/**
 * Campaign Decision Engine — pure deterministic function, no DB queries.
 * Maps any Revenue Director rec type to a campaign strategy with full reasoning.
 * Answers: Why this campaign? Why best? What if nothing? Expected return? Confidence?
 */

export interface CampaignBundle {
  campaign_type: string
  campaign_label: string
  reason_selected: string
  estimated_budget_inr: number
  expected_leads: number
  expected_revenue_inr: number
  confidence_pct: number
}

export interface RejectedCampaign {
  campaign_type: string
  campaign_label: string
  reason_rejected: string
}

export interface CampaignCrossLink {
  label: string
  href: string
  badge?: string
}

export interface CampaignIntelligence {
  strategic_thesis: string
  primary_bundles: CampaignBundle[]
  rejected_bundles: RejectedCampaign[]
  if_nothing_impact: string
  total_budget_estimate_inr: number
  total_expected_revenue_inr: number
  overall_confidence: number
  cross_links: CampaignCrossLink[]
}

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "₹0"

export function getCampaignIntelligence(
  recType: string,
  payload: Record<string, unknown>,
  confidence: number,
  expectedRevenue: number,
): CampaignIntelligence {
  const state     = String(payload.state || "")
  const orgName   = String(payload.organization_name || "")
  const incumbentOem = String(payload.incumbent_oem_brand || payload.incumbent_oem || "competitor")
  const totalGmv  = Number(payload.total_gmv || 0)
  const orgCount  = Number(payload.org_count || 0)
  const query     = String(payload.query || "")
  const impressions = Number(payload.impressions || 0)
  const position  = Number(payload.position || 10)

  switch (recType) {

    case "dealer_recruit": {
      const budget = 17_000
      const leads = Math.max(2, Math.round(orgCount * 0.05))
      const rev = expectedRevenue
      return {
        strategic_thesis: `${state || "target state"} has ${INR(totalGmv)} in active fogging demand across ${orgCount} gov orgs — all currently going to competitors. Zero 100X dealer presence. A two-channel campaign (Customer Match to known buyers + Search to procurement intent queries) captures this window before incumbents deepen roots.`,
        primary_bundles: [
          {
            campaign_type: "customer_match_campaign",
            campaign_label: "Customer Match",
            reason_selected: `${orgCount} known government buyers in ${state || "this state"} are in the database. Customer Match re-targets them directly on Google — highest conversion rate, lowest waste.`,
            estimated_budget_inr: 5_000,
            expected_leads: leads,
            expected_revenue_inr: Math.round(rev * 0.6),
            confidence_pct: confidence,
          },
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign",
            reason_selected: `Captures procurement officers actively searching "fogging machine ${state}" or "thermal fogger government". Intercepts at highest-intent moment.`,
            estimated_budget_inr: 12_000,
            expected_leads: Math.max(1, leads - 1),
            expected_revenue_inr: Math.round(rev * 0.4),
            confidence_pct: Math.max(30, confidence - 10),
          },
        ],
        rejected_bundles: [
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "Brand awareness overkill for a geographically targeted dealer recruitment. Budget better spent on direct-response channels first." },
          { campaign_type: "performance_max_campaign", campaign_label: "Performance Max", reason_rejected: "Requires established conversion history. Run Search first to accumulate data, then upgrade to PMax in 90 days." },
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "No meaningful website traffic from this state yet — remarketing list will be too small to activate." },
        ],
        if_nothing_impact: `${state || "Target state"} remains 100% competitor-controlled. Incumbent deepens relationship with ${orgCount} buyers through the next procurement cycle. This window (zero 100X dealer) is temporary — competitors are expanding.`,
        total_budget_estimate_inr: budget,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Dealer Pipeline", href: "/admin/growth/crm/dealers" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
          { label: "Execution Hub", href: "/admin/growth/execution" },
        ],
      }
    }

    case "oem_displacement": {
      const budget = 18_000
      const leads = 2
      const rev = expectedRevenue
      return {
        strategic_thesis: `${orgName || "Target org"} (${orgName ? String(payload.organization_state || "") : ""}) is actively buying from ${incumbentOem}. A two-channel conquest strategy intercepts their next procurement search + displaces ${incumbentOem} at the search moment. The narrower the target, the higher the conversion — this is a precision campaign, not a broad reach play.`,
        primary_bundles: [
          {
            campaign_type: "competitor_conquest_campaign",
            campaign_label: "Competitor Conquest",
            reason_selected: `${orgName}'s procurement officers will search "${incumbentOem} fogging machine" or compare suppliers. Conquest ads appear at the exact comparison moment — highest displacement probability.`,
            estimated_budget_inr: 10_000,
            expected_leads: 1,
            expected_revenue_inr: Math.round(rev * 0.6),
            confidence_pct: confidence,
          },
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign",
            reason_selected: `Captures "thermal fogging machine ${String(payload.organization_state || "")}${String(payload.dept_category || "")}" queries from this organization's procurement window.`,
            estimated_budget_inr: 8_000,
            expected_leads: 1,
            expected_revenue_inr: Math.round(rev * 0.4),
            confidence_pct: Math.max(30, confidence - 10),
          },
        ],
        rejected_bundles: [
          { campaign_type: "customer_match_campaign", campaign_label: "Customer Match", reason_rejected: "Need contact data for this specific org's purchase officers first. Trigger after first contact is made." },
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "Wrong channel for government procurement decisions. Purchase officers use Google Search, not YouTube browse." },
          { campaign_type: "performance_max_campaign", campaign_label: "Performance Max", reason_rejected: "Too broad for a precision org-level displacement. PMax would spread budget across irrelevant placements." },
        ],
        if_nothing_impact: `${orgName || "This organization"} renews with ${incumbentOem} in the next GeM cycle. Total opportunity: ${INR(totalGmv)}. Once incumbent deepens with multi-year AMC contracts, displacement becomes 3-5x harder.`,
        total_budget_estimate_inr: budget,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Opportunity Pipeline", href: "/admin/growth/crm/opportunities" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
          { label: "Execution Hub", href: "/admin/growth/execution" },
        ],
      }
    }

    case "procurement_target": {
      const budget = 12_000
      const rev = expectedRevenue
      return {
        strategic_thesis: `Active procurement window detected. A Search campaign targeting procurement intent queries + a landing page optimized for this buyer segment captures the window with the highest conversion path: search → landing page → quote form → GeM bid.`,
        primary_bundles: [
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign",
            reason_selected: `Procurement officers actively searching now. Search ads put 100X Circle at position 1 during the active decision window — this is the highest-intent moment.`,
            estimated_budget_inr: 12_000,
            expected_leads: 2,
            expected_revenue_inr: Math.round(rev * 0.7),
            confidence_pct: confidence,
          },
          {
            campaign_type: "landing_page_create",
            campaign_label: "Landing Page",
            reason_selected: `A procurement-specific landing page (specs, certifications, GeM listing, state-wise dealer) converts search traffic to quote requests 3x better than the homepage.`,
            estimated_budget_inr: 0,
            expected_leads: 1,
            expected_revenue_inr: Math.round(rev * 0.3),
            confidence_pct: Math.max(30, confidence - 15),
          },
        ],
        rejected_bundles: [
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "Procurement decisions happen in a short window. Remarketing is too slow — need immediate reach." },
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "Government purchase officers don't research procurement on YouTube. Wrong channel for this buyer." },
          { campaign_type: "customer_match_campaign", campaign_label: "Customer Match", reason_rejected: "Need contact data for this org first. Run search to generate initial contact, then retarget." },
        ],
        if_nothing_impact: `Procurement cycle ends without 100X Circle bid. Next opportunity: 6-12 months. Incumbent captures the contract and builds relationship that makes next displacement harder.`,
        total_budget_estimate_inr: budget,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Opportunity Pipeline", href: "/admin/growth/crm/opportunities" },
          { label: "SEO Workflow", href: "/admin/growth/seo/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Execution Hub", href: "/admin/growth/execution" },
        ],
      }
    }

    case "search_campaign": {
      const budget = 12_000
      const missedClicks = impressions > 0 ? Math.round(impressions * 0.05) : 50
      const rev = expectedRevenue
      return {
        strategic_thesis: `"${query || "target keyword"}" has ${impressions > 0 ? impressions.toLocaleString("en-IN") + " monthly impressions" : "proven search demand"} with 100X Circle at position ${Math.round(position)}. A Search campaign captures active buyers now while SEO compounds long-term — two channels, same keyword, compounding coverage.`,
        primary_bundles: [
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign",
            reason_selected: `Immediate coverage for "${query || "target keyword"}". Paid search appears at position 1 while organic climbs. Every month of delay loses ~${missedClicks} buyer clicks to competitors.`,
            estimated_budget_inr: budget,
            expected_leads: Math.max(1, Math.round(missedClicks * 0.03)),
            expected_revenue_inr: Math.round(rev * 0.7),
            confidence_pct: confidence,
          },
          {
            campaign_type: "landing_page_create",
            campaign_label: "Dedicated Landing Page",
            reason_selected: `A keyword-specific landing page improves Quality Score → reduces CPC by 20-40% → stretches the budget further. Also builds organic ranking for the same query.`,
            estimated_budget_inr: 0,
            expected_leads: Math.max(1, Math.round(missedClicks * 0.01)),
            expected_revenue_inr: Math.round(rev * 0.3),
            confidence_pct: Math.max(30, confidence - 10),
          },
        ],
        rejected_bundles: [
          { campaign_type: "performance_max_campaign", campaign_label: "Performance Max", reason_rejected: "Don't run PMax and Search simultaneously on the same keywords — they cannibalize each other. Search first, PMax after 90 days of data." },
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "User is already in search mode — high intent. YouTube is an awareness play for a different audience." },
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "Remarketing works on existing traffic. Run Search first to generate that traffic, then add remarketing in 30 days." },
        ],
        if_nothing_impact: `Losing ${impressions > 0 ? impressions.toLocaleString("en-IN") : "~500"} monthly impressions to competitors. At 5% CTR, missing ~${missedClicks} buyer clicks/month. Each click = ~₹${budget > 0 ? Math.round(budget / Math.max(missedClicks, 1)) : 240} in paid acquisition value.`,
        total_budget_estimate_inr: budget,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
          { label: "SEO Workflow", href: "/admin/growth/seo/workflow" },
        ],
      }
    }

    case "landing_page_create":
    case "content_create": {
      const isLP = recType === "landing_page_create"
      const budget = 0
      const rev = expectedRevenue
      return {
        strategic_thesis: `"${query || "target keyword"}" (position ${Math.round(position)}, ${impressions.toLocaleString("en-IN")} impressions/month) is within striking distance of top 3. A ${isLP ? "conversion-focused landing page" : "comprehensive content piece"} targeting this keyword compounds SEO ranking and reduces paid CPC when amplified with a Search campaign.`,
        primary_bundles: [
          {
            campaign_type: isLP ? "landing_page_create" : "content_create",
            campaign_label: isLP ? "Landing Page" : "Content Article",
            reason_selected: `Position ${Math.round(position)} → top 3 moves from ~${Math.round(impressions * 0.02 * 100) / 100}% to ~20%+ CTR. Moving up 1 position at this impression volume = ~${Math.round(impressions * 0.03)} extra organic clicks/month with zero ongoing spend.`,
            estimated_budget_inr: 0,
            expected_leads: Math.max(1, Math.round(impressions * 0.001)),
            expected_revenue_inr: Math.round(rev * 0.7),
            confidence_pct: confidence,
          },
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign (amplifier)",
            reason_selected: `Run a Search campaign on the same keyword to: (1) capture buyers now while organic climbs, (2) generate CTR data that reinforces organic ranking signals.`,
            estimated_budget_inr: 8_000,
            expected_leads: Math.max(1, Math.round(impressions * 0.0005)),
            expected_revenue_inr: Math.round(rev * 0.3),
            confidence_pct: Math.max(30, confidence - 10),
          },
        ],
        rejected_bundles: [
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "Wrong funnel stage. User is in search/research mode — text content ranks, video doesn't for these queries." },
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "Requires existing traffic. Create the content first, then retarget readers in 60 days." },
          { campaign_type: "customer_match_campaign", campaign_label: "Customer Match", reason_rejected: "Content/SEO play — audience targeting not applicable at this stage." },
        ],
        if_nothing_impact: `Keyword stays at position ${Math.round(position)}. ~${Math.round(impressions * 0.02)} monthly clicks continue going to competitor pages already ranking for this query. Organic gap widens each month competitors build more content.`,
        total_budget_estimate_inr: budget,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "SEO Workflow", href: "/admin/growth/seo/workflow" },
          { label: "Landing Pages", href: "/admin/growth/landing-pages" },
          { label: "Content Factory", href: "/admin/growth/content" },
          { label: "Search Console", href: "/admin/growth/seo/setup" },
        ],
      }
    }

    case "remarketing_campaign": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Previous site visitors have already shown intent — remarketing converts them at 2-5x the rate of cold audiences at 30-50% lower CPC. This is the highest-efficiency spend available given existing traffic.`,
        primary_bundles: [
          {
            campaign_type: "remarketing_campaign",
            campaign_label: "Remarketing Campaign",
            reason_selected: `Visitors who left without converting are the warmest available audience. 30/90/180 day windows let you re-engage across the full consideration cycle.`,
            estimated_budget_inr: 5_000,
            expected_leads: 3,
            expected_revenue_inr: Math.round(rev * 0.7),
            confidence_pct: confidence,
          },
          {
            campaign_type: "customer_match_campaign",
            campaign_label: "Customer Match (complementary)",
            reason_selected: `Pair remarketing with Customer Match to also re-engage known buyers who visited. Combined, these two audiences cover the full re-engagement funnel.`,
            estimated_budget_inr: 3_000,
            expected_leads: 2,
            expected_revenue_inr: Math.round(rev * 0.3),
            confidence_pct: Math.max(30, confidence - 15),
          },
        ],
        rejected_bundles: [
          { campaign_type: "search_campaign", campaign_label: "Search Campaign", reason_rejected: "Run Search in parallel for new user acquisition — but remarketing ROI is consistently higher for warm audiences." },
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "YouTube remarketing is a brand play. Display remarketing (this rec) has better purchase-intent conversion for B2G products." },
        ],
        if_nothing_impact: `Site visitors who researched 100X Circle products will see competitor ads next time they search. Conversion opportunity evaporates as consideration window closes (typically 30-90 days).`,
        total_budget_estimate_inr: 8_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Remarketing Readiness", href: "/admin/growth/ads/remarketing-readiness", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
        ],
      }
    }

    case "youtube_campaign": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `YouTube brand awareness before the next procurement cycle builds recall among government purchase officers. When they hit Google Search for fogging machines, 100X Circle is already in their consideration set — improving Search campaign conversion rates by 20-40%.`,
        primary_bundles: [
          {
            campaign_type: "youtube_campaign",
            campaign_label: "YouTube TrueView Campaign",
            reason_selected: `30-60 second TrueView ads to procurement demographics (25-55, government procurement interests) build brand awareness that multiplies Search campaign effectiveness.`,
            estimated_budget_inr: 15_000,
            expected_leads: 1,
            expected_revenue_inr: Math.round(rev * 0.5),
            confidence_pct: confidence,
          },
          {
            campaign_type: "search_campaign",
            campaign_label: "Search (brand lift)",
            reason_selected: `Run a Search campaign simultaneously. YouTube awareness increases branded search volume — Search captures those branded queries at high conversion intent.`,
            estimated_budget_inr: 8_000,
            expected_leads: 2,
            expected_revenue_inr: Math.round(rev * 0.5),
            confidence_pct: confidence,
          },
        ],
        rejected_bundles: [
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "Remarketing is a bottom-funnel play. YouTube is top-funnel — run sequentially, not in parallel." },
          { campaign_type: "customer_match_campaign", campaign_label: "Customer Match", reason_rejected: "Customer Match converts known buyers. YouTube is for building new audience awareness — different goal." },
        ],
        if_nothing_impact: `Brand remains invisible during the awareness phase. Government purchase officers recall competitor brands (who advertise on YouTube) when they reach the Search phase. First-mover brand recall advantage is lost.`,
        total_budget_estimate_inr: 23_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
        ],
      }
    }

    case "performance_max_campaign": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Performance Max covers all Google channels simultaneously (Search, Display, YouTube, Gmail, Maps, Discover) using AI to find best-converting placements. Deploy only after 90+ days of Search campaign data — Google AI needs conversion history to optimize.`,
        primary_bundles: [
          {
            campaign_type: "performance_max_campaign",
            campaign_label: "Performance Max",
            reason_selected: `Full-funnel coverage with AI optimization. Once Search has accumulated conversion data, PMax can outperform manual campaigns by finding placements and audiences you haven't discovered.`,
            estimated_budget_inr: 20_000,
            expected_leads: 5,
            expected_revenue_inr: rev,
            confidence_pct: confidence,
          },
        ],
        rejected_bundles: [
          { campaign_type: "search_campaign", campaign_label: "Search Campaign", reason_rejected: "Don't run PMax and Search on overlapping keywords — they cannibalize. Pause Search on keywords PMax covers, or keep Search only on high-value branded terms." },
          { campaign_type: "youtube_campaign", campaign_label: "YouTube (separate)", reason_rejected: "PMax already includes YouTube placements — running a separate YouTube campaign creates overlap and splits budget inefficiently." },
        ],
        if_nothing_impact: `Remaining in single-channel Search limits reach to users already searching. PMax expands to buyers in the awareness and consideration phase before they reach Search — a 3-5x larger potential audience.`,
        total_budget_estimate_inr: 20_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
          { label: "Revenue Attribution", href: "/admin/growth/ads/revenue", badge: "Advanced" },
        ],
      }
    }

    case "competitor_conquest_campaign": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Users searching for competitor brands are in the decision phase — they're comparing and about to buy. Conquest ads intercept at the highest-intent moment with a "consider 100X Circle" message. 4-5% CTR vs 2-3% on generic terms.`,
        primary_bundles: [
          {
            campaign_type: "competitor_conquest_campaign",
            campaign_label: "Competitor Conquest",
            reason_selected: `Competitor brand searches signal active procurement intent. These buyers are already qualified — they just need to know 100X Circle is an alternative worth considering.`,
            estimated_budget_inr: 10_000,
            expected_leads: 3,
            expected_revenue_inr: Math.round(rev * 0.7),
            confidence_pct: confidence,
          },
          {
            campaign_type: "landing_page_create",
            campaign_label: "Comparison Landing Page",
            reason_selected: `A "100X Circle vs [Competitor]" comparison page converts conquest traffic at 2x vs sending users to the homepage. Essential for campaign effectiveness.`,
            estimated_budget_inr: 0,
            expected_leads: 1,
            expected_revenue_inr: Math.round(rev * 0.3),
            confidence_pct: Math.max(30, confidence - 10),
          },
        ],
        rejected_bundles: [
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "Conquest works on Search intent. YouTube is awareness — wrong funnel stage for competitor displacement." },
          { campaign_type: "remarketing_campaign", campaign_label: "Remarketing", reason_rejected: "These are new users (competitor's audience) — remarketing can't target them until after they visit 100X Circle." },
        ],
        if_nothing_impact: `Competitor brand searches continue converting into competitor sales. Each unconverted conquest opportunity is a confirmed lost sale — buyer was already in decision mode.`,
        total_budget_estimate_inr: 10_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Creative Director", href: "/admin/growth/ads/creative-director" },
          { label: "Competitor Intel", href: "/admin/growth/competitors", badge: "Advanced" },
        ],
      }
    }

    case "customer_match":
    case "customer_match_campaign": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Known government buyers who've purchased fogging machines before are the highest-value audience possible. Customer Match places 100X Circle in front of these verified buyers at a fraction of the cost of finding new buyers — 2-4x better conversion rates than cold audiences.`,
        primary_bundles: [
          {
            campaign_type: "customer_match_campaign",
            campaign_label: "Customer Match",
            reason_selected: `Government buyers with proven fogging procurement history are already in the database (GeM data). This is 100X Circle's proprietary audience advantage — no competitor has this intelligence.`,
            estimated_budget_inr: 8_000,
            expected_leads: 4,
            expected_revenue_inr: Math.round(rev * 0.8),
            confidence_pct: confidence,
          },
          {
            campaign_type: "search_campaign",
            campaign_label: "Search (new buyer capture)",
            reason_selected: `Customer Match re-engages known buyers. Run Search simultaneously to capture new buyers entering the market. Together they cover full acquisition + retention.`,
            estimated_budget_inr: 5_000,
            expected_leads: 2,
            expected_revenue_inr: Math.round(rev * 0.2),
            confidence_pct: Math.max(30, confidence - 15),
          },
        ],
        rejected_bundles: [
          { campaign_type: "youtube_campaign", campaign_label: "YouTube", reason_rejected: "These are warm, known buyers — they don't need awareness campaigns. Customer Match converts them directly." },
          { campaign_type: "performance_max_campaign", campaign_label: "Performance Max", reason_rejected: "PMax would dilute the precision of Customer Match by also targeting cold audiences. Run dedicated Customer Match campaign to maintain targeting accuracy." },
        ],
        if_nothing_impact: `Known buyers receive no 100X Circle communications. Competitors with Customer Match lists reach them first. Government procurement decisions are sticky — losing a buyer now means 2-3 year re-engagement cycle.`,
        total_budget_estimate_inr: 13_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Campaign Factory", href: "/admin/growth/ads/campaign-factory", badge: "Advanced" },
          { label: "Fogging Intelligence", href: "/admin/growth/fogging" },
        ],
      }
    }

    case "creative_refresh": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Ad fatigue detected — existing creatives have exhausted their effective reach. Fresh creatives with updated messaging restore CTR, improve Quality Score, and reduce CPC. Every 3-4 months of unchanged creatives loses ~15-25% CTR.`,
        primary_bundles: [
          {
            campaign_type: "creative_refresh",
            campaign_label: "Creative Refresh",
            reason_selected: `New headlines and descriptions (RSA format, 15 headlines, 4 descriptions) with A/B testing restore CTR. The Creative Director generates 8 persuasion framework variations automatically.`,
            estimated_budget_inr: 0,
            expected_leads: Math.max(1, Math.round(rev / 50_000)),
            expected_revenue_inr: rev,
            confidence_pct: confidence,
          },
        ],
        rejected_bundles: [
          { campaign_type: "budget_reallocate", campaign_label: "Budget Reallocation", reason_rejected: "Budget isn't the problem — creative fatigue is. Moving budget to a fatigued campaign in a different location doesn't fix the root cause." },
          { campaign_type: "search_campaign", campaign_label: "New Campaign", reason_rejected: "Don't launch new campaigns while existing ones are underperforming. Fix creative first, then expand budget." },
        ],
        if_nothing_impact: `CTR continues degrading. Quality Score drops → CPC rises → same budget buys fewer clicks. Creative fatigue compounds — campaigns that haven't refreshed in 6+ months typically see 40-60% CPC inflation.`,
        total_budget_estimate_inr: 0,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Creative Director", href: "/admin/growth/ads/creative-director", badge: "Use This" },
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Ads Dashboard", href: "/admin/growth/ads" },
        ],
      }
    }

    case "budget_reallocate": {
      const rev = expectedRevenue
      return {
        strategic_thesis: `Budget is going to a low-ROAS campaign while a high-performing campaign is constrained. Reallocation without new spend — pure efficiency gain.`,
        primary_bundles: [
          {
            campaign_type: "budget_reallocate",
            campaign_label: "Budget Reallocation",
            reason_selected: `Moving ${INR(Number(payload.shift_amount || 0))}/day from "${String(payload.from_campaign || "underperforming campaign")}" to "${String(payload.to_campaign || "high-ROAS campaign")}" increases total ROAS without increasing total spend.`,
            estimated_budget_inr: 0,
            expected_leads: 2,
            expected_revenue_inr: rev,
            confidence_pct: confidence,
          },
        ],
        rejected_bundles: [
          { campaign_type: "search_campaign", campaign_label: "New Campaign", reason_rejected: "Fix budget allocation inefficiencies before adding new campaigns. New campaigns with the same budget distribution problem repeat the waste." },
        ],
        if_nothing_impact: `Wasted spend continues. High-performing campaign remains budget-constrained, leaving confirmed revenue on the table. Every day of delay = ${INR(Number(payload.shift_amount || 0))} in suboptimal allocation.`,
        total_budget_estimate_inr: 0,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Revenue Attribution", href: "/admin/growth/ads/revenue", badge: "Advanced" },
          { label: "Ads Dashboard", href: "/admin/growth/ads" },
        ],
      }
    }

    case "negative_keyword": {
      const rev = expectedRevenue
      const searchTerm = String(payload.searchTerm || "irrelevant term")
      return {
        strategic_thesis: `Wasted spend on "${searchTerm}" drains budget from converting search terms. Adding this as a negative keyword immediately stops the waste and reallocates that budget to productive clicks.`,
        primary_bundles: [
          {
            campaign_type: "negative_keyword",
            campaign_label: "Negative Keyword",
            reason_selected: `"${searchTerm}" has generated ${Number(payload.clicks || 0)} clicks at ₹${Math.round(Number(payload.spend || 0))} with zero conversions. Every ₹ spent here is a ₹ not spent on terms that convert.`,
            estimated_budget_inr: 0,
            expected_leads: 0,
            expected_revenue_inr: rev,
            confidence_pct: confidence,
          },
        ],
        rejected_bundles: [
          { campaign_type: "creative_refresh", campaign_label: "Creative Refresh", reason_rejected: "Creative quality isn't the issue — the term itself has no purchase intent. No creative can convert a fundamentally irrelevant query." },
        ],
        if_nothing_impact: `${INR(Number(payload.spend || 0))} in wasted spend accumulates per cycle. Campaign budget ceiling hit faster → high-converting terms show less due to budget exhaustion from irrelevant clicks.`,
        total_budget_estimate_inr: 0,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Ads Dashboard", href: "/admin/growth/ads" },
          { label: "Ads Approvals", href: "/admin/growth/ads/director" },
        ],
      }
    }

    default: {
      const rev = expectedRevenue
      return {
        strategic_thesis: `This recommendation drives revenue through direct action — campaign support channels amplify the outcome.`,
        primary_bundles: [
          {
            campaign_type: "search_campaign",
            campaign_label: "Search Campaign (amplifier)",
            reason_selected: `Search campaigns capture buyers actively looking for solutions at the moment this initiative creates supply.`,
            estimated_budget_inr: 10_000,
            expected_leads: 2,
            expected_revenue_inr: Math.round(rev * 0.5),
            confidence_pct: Math.max(30, confidence - 20),
          },
        ],
        rejected_bundles: [],
        if_nothing_impact: `Revenue opportunity remains unrealized. Competitors who combine organic initiatives with paid amplification will capture this market position first.`,
        total_budget_estimate_inr: 10_000,
        total_expected_revenue_inr: rev,
        overall_confidence: confidence,
        cross_links: [
          { label: "Ads Workflow", href: "/admin/growth/ads/workflow" },
          { label: "Execution Hub", href: "/admin/growth/execution" },
        ],
      }
    }
  }
}
