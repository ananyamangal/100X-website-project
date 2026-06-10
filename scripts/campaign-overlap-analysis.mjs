/**
 * Campaign overlap analysis — compares structure of three campaigns in
 * account 3797786327 before any deletion decision:
 *   23421174455  100X FGG Search 2026 DEL,UP,BHR,MUM,ASM   (historical launch)
 *   23931538303  100X | Funnel A | Dealer Acquisition | Search (unsuffixed, older run)
 *   23924509179  100X | Funnel A | Dealer Acquisition | Search — duw7pp (current factory)
 *
 * Reads via POST /api/admin/ads/query (read-only GAQL). No mutations.
 */

const BASE = "https://100-x-website-project.vercel.app"
const PASSWORD = "dtu@ananya"
const CAMPAIGNS = ["23421174455", "23931538303", "23924509179"]

async function login() {
  const res = await fetch(`${BASE}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  })
  const setCookie = res.headers.get("set-cookie") || ""
  const m = setCookie.match(/admin-token=([^;]+)/)
  if (!m) throw new Error("login failed")
  return m[1]
}

async function gaql(token, query) {
  const res = await fetch(`${BASE}/api/admin/ads/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `admin-token=${token}` },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`GAQL error: ${data.error.slice(0, 300)}`)
  return data.rows
}

async function analyzeCampaign(token, id) {
  const out = { id }

  // Objective: channel type, bidding, status, name
  const camp = await gaql(token, `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.advertising_channel_type, campaign.bidding_strategy_type
    FROM campaign WHERE campaign.id = ${id}`)
  const c = camp[0]?.campaign ?? {}
  out.name = c.name
  out.status = c.status
  out.channelType = c.advertisingChannelType
  out.bidding = c.biddingStrategyType

  // Ad groups
  const groups = await gaql(token, `
    SELECT ad_group.id, ad_group.name, ad_group.status
    FROM ad_group WHERE campaign.id = ${id} AND ad_group.status != 'REMOVED'`)
  out.adGroups = groups.map(r => ({ id: String(r.adGroup.id), name: r.adGroup.name, status: r.adGroup.status }))

  // Positive keywords
  const kws = await gaql(token, `
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group.name
    FROM ad_group_criterion
    WHERE campaign.id = ${id}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = FALSE
      AND ad_group_criterion.status != 'REMOVED'`)
  out.keywords = kws.map(r => ({
    text: r.adGroupCriterion.keyword.text,
    matchType: r.adGroupCriterion.keyword.matchType,
    adGroup: r.adGroup?.name,
  }))

  // Campaign-level negative keywords
  const negs = await gaql(token, `
    SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
    FROM campaign_criterion
    WHERE campaign.id = ${id}
      AND campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = TRUE
      AND campaign_criterion.status != 'REMOVED'`)
  out.negatives = negs.map(r => r.campaignCriterion.keyword.text)

  // Geo targets
  const geos = await gaql(token, `
    SELECT campaign_criterion.location.geo_target_constant, campaign_criterion.negative
    FROM campaign_criterion
    WHERE campaign.id = ${id}
      AND campaign_criterion.type = 'LOCATION'
      AND campaign_criterion.status != 'REMOVED'`)
  out.geoTargets = geos.map(r => ({
    geo: r.campaignCriterion.location?.geoTargetConstant,
    negative: r.campaignCriterion.negative,
  }))

  // Landing pages (final URLs from RSA ads)
  const ads = await gaql(token, `
    SELECT ad_group_ad.ad.final_urls, ad_group.name, ad_group_ad.status
    FROM ad_group_ad
    WHERE campaign.id = ${id} AND ad_group_ad.status != 'REMOVED'`)
  out.landingPages = [...new Set(ads.flatMap(r => r.adGroupAd?.ad?.finalUrls ?? []))]
  out.adCount = ads.length

  return out
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b)
  if (A.size === 0 && B.size === 0) return null
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...A, ...B]).size
  return union === 0 ? null : Math.round((inter / union) * 100)
}

async function main() {
  const token = await login()
  const results = []
  for (const id of CAMPAIGNS) {
    process.stderr.write(`analyzing ${id}...\n`)
    results.push(await analyzeCampaign(token, id))
  }

  for (const r of results) {
    console.log("=".repeat(72))
    console.log(`CAMPAIGN ${r.id} — ${r.name}`)
    console.log(`  status=${r.status} channel=${r.channelType} bidding=${r.bidding}`)
    console.log(`  ad groups (${r.adGroups.length}):`)
    r.adGroups.forEach(g => console.log(`    ${g.id}  ${g.name} [${g.status}]`))
    console.log(`  landing pages (${r.landingPages.length}):`)
    r.landingPages.forEach(u => console.log(`    ${u}`))
    console.log(`  keywords: ${r.keywords.length} | negatives: ${r.negatives.length} | geo targets: ${r.geoTargets.length} | ads: ${r.adCount}`)
    console.log(`  geo: ${JSON.stringify(r.geoTargets)}`)
    console.log(`  sample keywords: ${r.keywords.slice(0, 8).map(k => `"${k.text}"(${k.matchType})`).join(", ")}`)
  }

  console.log("=".repeat(72))
  console.log("PAIRWISE OVERLAP (Jaccard % on keyword text)")
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i], b = results[j]
      const kwOverlap  = jaccard(a.keywords.map(k => k.text.toLowerCase()), b.keywords.map(k => k.text.toLowerCase()))
      const negOverlap = jaccard(a.negatives.map(t => t.toLowerCase()), b.negatives.map(t => t.toLowerCase()))
      const lpOverlap  = jaccard(a.landingPages, b.landingPages)
      const agOverlap  = jaccard(a.adGroups.map(g => g.name.toLowerCase()), b.adGroups.map(g => g.name.toLowerCase()))
      console.log(`${a.id} vs ${b.id}: keywords=${kwOverlap}% negatives=${negOverlap}% landingPages=${lpOverlap}% adGroups=${agOverlap}%`)
    }
  }
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
