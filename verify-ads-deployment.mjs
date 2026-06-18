/**
 * verify-ads-deployment.mjs
 *
 * Audits the Google Ads deployment directly from the real API (not DB).
 * Reports: campaign, ad groups, keywords, RSA ads, sitelinks, callouts,
 * conversion actions, warnings, partial resources.
 *
 * Usage: node verify-ads-deployment.mjs
 */
import fs   from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.join(__dirname, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([^=#\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const CAMPAIGN_KEYWORD = "Dealer Acquisition"
const API_VERSION      = "v24"
const DEV_TOKEN        = process.env.GOOGLE_ADS_DEVELOPER_TOKEN

if (!DEV_TOKEN) {
  console.error("✗ GOOGLE_ADS_DEVELOPER_TOKEN not set in .env.local")
  process.exit(1)
}

// ── DB: load tokens + account config ─────────────────────────────────────────
const { MongoClient } = await import("mongodb")
const dbClient = new MongoClient(process.env.MONGODB_URI)
await dbClient.connect()
const db = dbClient.db()

const oauthDoc = await db.collection("oauth_tokens").findOne({ provider: "google" })
if (!oauthDoc?.access_token) {
  console.error("✗ No Google OAuth tokens in DB. Connect Google account first.")
  await dbClient.close(); process.exit(1)
}

let accessToken = oauthDoc.access_token

// Refresh if expired
const expiresAt = new Date(oauthDoc.expires_at || 0).getTime()
if (Date.now() > expiresAt - 60_000) {
  process.stdout.write("  Token expired — refreshing… ")
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: oauthDoc.refresh_token,
      grant_type:    "refresh_token",
    }),
  })
  const refreshed = await r.json()
  if (!refreshed.access_token) {
    console.error(`\n✗ Token refresh failed: ${JSON.stringify(refreshed)}`)
    await dbClient.close(); process.exit(1)
  }
  accessToken = refreshed.access_token
  await db.collection("oauth_tokens").updateOne(
    { provider: "google" },
    { $set: { access_token: accessToken, expires_at: new Date(Date.now() + refreshed.expires_in * 1_000).toISOString() } },
  )
  console.log("done")
}

const settingsDoc = await db.collection("ads_settings").findOne({})
  ?? await db.collection("google_ads_settings").findOne({})

if (!settingsDoc?.customerId) {
  console.error("✗ No customerId saved. Set up Google Ads account first (Ads Setup page).")
  await dbClient.close(); process.exit(1)
}

const customerId   = String(settingsDoc.customerId).replace(/-/g, "")
const loginCustId  = settingsDoc.loginCustomerId
  ? String(settingsDoc.loginCustomerId).replace(/-/g, "")
  : null

await dbClient.close()

// ── GAQL query helper ─────────────────────────────────────────────────────────
async function gaql(query) {
  const url     = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`
  const headers = {
    Authorization:       `Bearer ${accessToken}`,
    "developer-token":   DEV_TOKEN,
    "Content-Type":      "application/json",
    ...(loginCustId ? { "login-customer-id": loginCustId } : {}),
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query }) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GAQL ${res.status}: ${txt.slice(0, 300)}`)
  }

  // searchStream returns a JSON array of batch objects
  const text = await res.text()
  const rows = []
  for (const line of text.trim().split("\n")) {
    const clean = line.trim().replace(/^,/, "").replace(/^[\[,]/, "").replace(/[\],]$/, "")
    if (!clean || clean === "[" || clean === "]") continue
    try {
      const parsed = JSON.parse(clean)
      if (parsed.results) rows.push(...parsed.results)
    } catch { /* skip */ }
  }
  return rows
}

// ── Main verification ─────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(72))
console.log("  Google Ads Deployment Verification")
console.log(`  Customer ID: ${customerId}${loginCustId ? ` (login: ${loginCustId})` : ""}`)
console.log(`  Searching for campaigns matching: "${CAMPAIGN_KEYWORD}"`)
console.log("═".repeat(72))

// 1. Find the campaign
const campaignRows = await gaql(`
  SELECT
    campaign.id, campaign.name, campaign.status,
    campaign.resource_name, campaign.advertising_channel_type,
    campaign.start_date, campaign.end_date
  FROM campaign
  WHERE campaign.name LIKE '%${CAMPAIGN_KEYWORD}%'
    AND campaign.status != 'REMOVED'
  ORDER BY campaign.id DESC
`)

if (!campaignRows.length) {
  console.log(`\n  ✗ No campaigns found matching "${CAMPAIGN_KEYWORD}"`)
  console.log("  Check campaign name or deploy one first via Campaign Factory.")
  process.exit(0)
}

const campaign   = campaignRows[0].campaign
const campaignId = campaign.id

console.log(`\n  Campaign`)
console.log(`  ────────`)
console.log(`  Name     : ${campaign.name}`)
console.log(`  ID       : ${campaignId}`)
console.log(`  Status   : ${campaign.status}`)
console.log(`  Resource : ${campaign.resourceName}`)
console.log(`  Type     : ${campaign.advertisingChannelType}`)
console.log(`  Start    : ${campaign.startDate ?? "—"}`)

// 2. Ad groups
const agRows = await gaql(`
  SELECT ad_group.id, ad_group.name, ad_group.status
  FROM ad_group
  WHERE campaign.id = ${campaignId}
    AND ad_group.status != 'REMOVED'
  ORDER BY ad_group.name
`)

console.log(`\n  Ad Groups (${agRows.length})`)
console.log("  ──────────────────────────────")
for (const row of agRows) {
  console.log(`  · [${row.adGroup.status.padEnd(7)}] ${row.adGroup.name}`)
}

// 3. Keywords
const kwRows = await gaql(`
  SELECT
    ad_group_criterion.keyword.text,
    ad_group_criterion.keyword.match_type,
    ad_group_criterion.status,
    ad_group.name
  FROM ad_group_criterion
  WHERE campaign.id = ${campaignId}
    AND ad_group_criterion.type = 'KEYWORD'
    AND ad_group_criterion.status != 'REMOVED'
  ORDER BY ad_group.name, ad_group_criterion.keyword.text
`)

console.log(`\n  Keywords (${kwRows.length})`)
console.log("  ──────────────────────────────")
const kwByGroup = {}
for (const row of kwRows) {
  const g   = row.adGroup.name
  const kw  = row.adGroupCriterion
  if (!kwByGroup[g]) kwByGroup[g] = []
  const mt = kw.keyword.matchType
  const bracket = mt === "EXACT" ? `[${kw.keyword.text}]` : mt === "PHRASE" ? `"${kw.keyword.text}"` : `+${kw.keyword.text}`
  kwByGroup[g].push(bracket)
}
for (const [grp, kws] of Object.entries(kwByGroup)) {
  console.log(`  ${grp}:`)
  for (const kw of kws) console.log(`    ${kw}`)
}

// 4. RSA ads
const rsaRows = await gaql(`
  SELECT
    ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status,
    ad_group_ad.ad.responsive_search_ad.headlines,
    ad_group_ad.ad.responsive_search_ad.descriptions,
    ad_group.name
  FROM ad_group_ad
  WHERE campaign.id = ${campaignId}
    AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    AND ad_group_ad.status != 'REMOVED'
`)

console.log(`\n  RSA Ads (${rsaRows.length})`)
console.log("  ──────────────────────────────")
for (const row of rsaRows) {
  const rsa = row.adGroupAd?.ad?.responsiveSearchAd
  const h   = rsa?.headlines?.length ?? 0
  const d   = rsa?.descriptions?.length ?? 0
  console.log(`  · ${row.adGroup.name}: ${h} headlines, ${d} descriptions [${row.adGroupAd.status}]`)
}

// 5. Sitelinks
const slRows = await gaql(`
  SELECT
    campaign_asset.resource_name, campaign_asset.status,
    asset.sitelink_asset.link_text,
    asset.sitelink_asset.description1,
    asset.sitelink_asset.description2,
    asset.final_urls
  FROM campaign_asset
  WHERE campaign.id = ${campaignId}
    AND campaign_asset.asset_field_type = 'SITELINK'
    AND campaign_asset.status != 'REMOVED'
`)

console.log(`\n  Sitelinks (${slRows.length})`)
console.log("  ──────────────────────────────")
for (const row of slRows) {
  const sl = row.asset?.sitelinkAsset
  const urls = (row.asset?.finalUrls ?? []).join(", ")
  console.log(`  · "${sl?.linkText}" → ${urls || "(no URL)"}`)
  if (sl?.description1) console.log(`    ${sl.description1}`)
}

// 6. Callouts
const coRows = await gaql(`
  SELECT
    campaign_asset.resource_name, campaign_asset.status,
    asset.callout_asset.callout_text
  FROM campaign_asset
  WHERE campaign.id = ${campaignId}
    AND campaign_asset.asset_field_type = 'CALLOUT'
    AND campaign_asset.status != 'REMOVED'
`)

console.log(`\n  Callouts (${coRows.length})`)
console.log("  ──────────────────────────────")
for (const row of coRows) {
  console.log(`  · "${row.asset?.calloutAsset?.calloutText}"`)
}

// 7. Conversion actions (account-level)
const caRows = await gaql(`
  SELECT
    conversion_action.id, conversion_action.name,
    conversion_action.status, conversion_action.type,
    conversion_action.include_in_conversions_metric
  FROM conversion_action
  WHERE conversion_action.status = 'ENABLED'
  ORDER BY conversion_action.name
`)

console.log(`\n  Conversion Actions (${caRows.length} enabled, account-level)`)
console.log("  ──────────────────────────────")
for (const row of caRows) {
  const ca = row.conversionAction
  const inc = ca.includeInConversionsMetric ? "✓" : "–"
  console.log(`  ${inc} ${ca.name} [${ca.type}] id=${ca.id}`)
}

// ── Summary ───────────────────────────────────────────────────────────────────
const warnings = []
if (agRows.length  === 0) warnings.push("No ad groups found — factory may have failed partway")
if (kwRows.length  === 0) warnings.push("No keywords found")
if (rsaRows.length === 0) warnings.push("No RSA ads found")
if (slRows.length  === 0) warnings.push("No sitelinks found — check sitelink fix was deployed")
if (coRows.length  === 0) warnings.push("No callouts found")
if (campaign.status === "PAUSED") warnings.push("Campaign is PAUSED — approve in Campaign Factory to enable")
if (caRows.length  === 0) warnings.push("No conversion actions — revenue optimisation is blind")

console.log("\n" + "─".repeat(72))
console.log("  SUMMARY")
console.log("─".repeat(72))
console.log(`  Campaign ID       : ${campaignId}`)
console.log(`  Status            : ${campaign.status}`)
console.log(`  Ad Groups         : ${agRows.length}`)
console.log(`  Keywords          : ${kwRows.length}`)
console.log(`  RSA Ads           : ${rsaRows.length}`)
console.log(`  Sitelinks         : ${slRows.length}`)
console.log(`  Callouts          : ${coRows.length}`)
console.log(`  Conv Actions      : ${caRows.length}`)

if (warnings.length) {
  console.log(`\n  Warnings (${warnings.length}):`)
  for (const w of warnings) console.log(`  ⚠  ${w}`)
} else {
  console.log("\n  ✓ All entities verified — campaign fully deployed")
}

console.log("\n" + "═".repeat(72) + "\n")
