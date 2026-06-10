import { MongoClient } from "mongodb"

const URI = "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project"
const client = new MongoClient(URI)

async function run() {
  await client.connect()
  const db = client.db()

  // 1. Full deployment record
  const dep = await db.collection("ads_deployments").findOne({}, { sort: { createdAt: -1 } })
  console.log("[DEPLOYMENT RECORD]")
  console.log(JSON.stringify({ deploymentId: dep?.deploymentId, state: dep?.state, status: dep?.status, campaignName: dep?.campaignName, createdAt: dep?.createdAt }, null, 2))

  // 2. GSC row sample — what fields exist?
  const gscSample = await db.collection("gsc_query_rows").findOne({}, { sort: { impressions: -1 } })
  console.log("\n[GSC ROW FIELDS]")
  console.log(JSON.stringify(gscSample ? Object.keys(gscSample) : "empty", null, 2))
  console.log("[GSC TOP ROW]", JSON.stringify({ query: gscSample?.query, impressions: gscSample?.impressions, date: gscSample?.date, syncedAt: gscSample?.syncedAt, createdAt: gscSample?.createdAt }, null, 2))

  // 3. Latest GSC sync date
  const gscLatest = await db.collection("gsc_query_rows").findOne({}, { sort: { date: -1 }, projection: { date: 1, syncedAt: 1, createdAt: 1 } })
  console.log("\n[GSC LATEST ROW DATE]", JSON.stringify(gscLatest, null, 2))

  // 4. RFQ lead fields
  const rfqSample = await db.collection("rfq_popup_leads").findOne({}, { sort: { createdAt: -1 } })
  console.log("\n[RFQ LEAD FIELDS]", JSON.stringify(rfqSample ? Object.keys(rfqSample) : "empty", null, 2))
  console.log("[RFQ SAMPLE]", JSON.stringify({ leadType: rfqSample?.leadType, dealerScore: rfqSample?.dealerScore, answers: rfqSample?.answers, utmTerm: rfqSample?.utmTerm, utmCampaign: rfqSample?.utmCampaign, pagePath: rfqSample?.pagePath, createdAt: rfqSample?.createdAt }, null, 2))

  // 5. Brochure lead fields
  const brSample = await db.collection("brochure_leads").findOne({}, { sort: { createdAt: -1 } })
  console.log("\n[BROCHURE LEAD FIELDS]", JSON.stringify(brSample ? Object.keys(brSample) : "empty", null, 2))
  console.log("[BROCHURE SAMPLE]", JSON.stringify({ state: brSample?.state, productName: brSample?.productName, score: brSample?.score, createdAt: brSample?.createdAt }, null, 2))

  // 6. All ads_settings content
  const adsSettings = await db.collection("ads_settings").findOne({})
  console.log("\n[ADS SETTINGS]", JSON.stringify(adsSettings ? Object.fromEntries(Object.entries(adsSettings).filter(([k]) => k !== '_id')) : "empty", null, 2))

  // 7. KW intelligence runs
  const kwLatest = await db.collection("ads_keyword_intelligence").findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1, totalCount: 1, rawCount: 1, meetsSuccessCriterion: 1, validatorRejectionCount: 1, expansionContributionPct: 1 } })
  console.log("\n[KW INTELLIGENCE LATEST]", JSON.stringify(kwLatest ?? "none", null, 2))

  // 8. Growth opportunities pending
  const oppCount = await db.collection("growth_opportunities").countDocuments({ status: "pending" })
  const oppSample = await db.collection("growth_opportunities").findOne({ status: "pending" }, { sort: { createdAt: -1 } })
  console.log("\n[GROWTH OPPORTUNITIES]")
  console.log("  Pending count:", oppCount)
  if (oppSample) console.log("  Sample:", JSON.stringify({ title: oppSample.title, type: oppSample.type, status: oppSample.status }, null, 2))

  // 9. Keyword intelligence by env check — what does OAuth look like on Vercel?
  // The .env.local only has MONGODB_URI. Check what Vercel env vars are expected.
  console.log("\n[LOCAL ENV CHECK]")
  console.log("  GOOGLE_ADS_DEVELOPER_TOKEN:", process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? "SET" : "NOT SET (Vercel-only)")
  console.log("  GOOGLE_OAUTH_CLIENT_ID:", process.env.GOOGLE_OAUTH_CLIENT_ID ? "SET" : "NOT SET (Vercel-only)")
  console.log("  NEXT_PUBLIC_GTM_CONTAINER_ID:", process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? "NOT SET")

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
