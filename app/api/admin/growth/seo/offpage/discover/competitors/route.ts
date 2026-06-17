import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// ─── Industry backlink sources for thermal fogging machine niche ──────────────
// High-value referring domain opportunities per competitor

const COMPETITOR_DOMAINS: Record<string, string> = {
  balwaan:      "balwaan.in",
  kisankraft:   "kisankraft.com",
  neptune:      "neptuneplasticsolutions.com",
  vectorfog:    "vectorfog.com",
  curtisdynafog:"dynafog.com",
}

// Industry domains likely to link to thermal fogging machine brands in India
const INDUSTRY_LINK_SOURCES: {
  domain: string; da: number; category: string; opportunity: string
}[] = [
  // Agricultural / Farm equipment portals
  { domain: "krishijagran.com",       da: 52, category: "agriculture_media",     opportunity: "high" },
  { domain: "tractorjunction.com",    da: 51, category: "agri_equipment",        opportunity: "high" },
  { domain: "farmingdost.com",        da: 38, category: "farming_portal",        opportunity: "medium" },
  { domain: "agrifarming.in",         da: 44, category: "agriculture_media",     opportunity: "high" },
  { domain: "krishisewa.com",         da: 35, category: "agri_service",          opportunity: "medium" },
  // Pest control / vector control directories
  { domain: "pestcontrolindia.com",   da: 36, category: "pest_control_directory",opportunity: "high" },
  { domain: "pestcontrolweb.in",      da: 28, category: "pest_control_directory",opportunity: "medium" },
  { domain: "ipca.org.in",            da: 40, category: "industry_association",  opportunity: "high" },
  // Municipal / government portals
  { domain: "nmcgoa.org",             da: 45, category: "municipal_body",        opportunity: "medium" },
  { domain: "mcdelhi.org",            da: 48, category: "municipal_body",        opportunity: "medium" },
  // B2B marketplaces
  { domain: "exportersindia.com",     da: 57, category: "b2b_marketplace",       opportunity: "high" },
  { domain: "indiamart.com",          da: 72, category: "b2b_marketplace",       opportunity: "high" },
  { domain: "tradeindia.com",         da: 65, category: "b2b_marketplace",       opportunity: "high" },
  { domain: "alibaba.com",            da: 91, category: "global_b2b",            opportunity: "medium" },
  // Health / sanitation portals
  { domain: "nhm.gov.in",             da: 55, category: "govt_health",           opportunity: "medium" },
  { domain: "nvbdcp.gov.in",          da: 58, category: "govt_vector_control",   opportunity: "high" },
  { domain: "phdcci.in",              da: 42, category: "industry_chamber",      opportunity: "medium" },
  // Review / comparison sites
  { domain: "sulekha.com",            da: 62, category: "local_directory",       opportunity: "medium" },
  { domain: "justdial.com",           da: 70, category: "local_directory",       opportunity: "high" },
  { domain: "yellowpages.in",         da: 48, category: "local_directory",       opportunity: "medium" },
  // Startup / MSME / business portals
  { domain: "startupindia.gov.in",    da: 60, category: "govt_startup",          opportunity: "medium" },
  { domain: "nsic.co.in",             da: 52, category: "govt_msme",             opportunity: "medium" },
  { domain: "udyogplus.in",           da: 30, category: "msme_portal",           opportunity: "medium" },
  // Tech / product review
  { domain: "99acres.com",            da: 68, category: "real_estate_facility",  opportunity: "low" },
  { domain: "ambitionbox.com",        da: 61, category: "employer_brand",        opportunity: "low" },
]

// Per-competitor known / likely backlink sources
const COMPETITOR_SPECIFIC: Record<string, { domain: string; da: number; anchor: string }[]> = {
  balwaan: [
    { domain: "farmingdost.com",    da: 38, anchor: "balwaan power sprayer" },
    { domain: "krishijagran.com",   da: 52, anchor: "balwaan farm equipment" },
    { domain: "tractorjunction.com",da: 51, anchor: "balwaan pump" },
    { domain: "amazon.in",          da: 86, anchor: "balwaan power fogger" },
    { domain: "flipkart.com",       da: 83, anchor: "balwaan sprayer" },
  ],
  kisankraft: [
    { domain: "agrifarming.in",     da: 44, anchor: "kisankraft fogging machine" },
    { domain: "amazon.in",          da: 86, anchor: "kisankraft fogger" },
    { domain: "flipkart.com",       da: 83, anchor: "kisankraft thermal fogger" },
    { domain: "krishijagran.com",   da: 52, anchor: "kisankraft sprayer" },
    { domain: "exportersindia.com", da: 57, anchor: "kisankraft garden tools" },
  ],
  neptune: [
    { domain: "indiamart.com",      da: 72, anchor: "neptune thermal fogging machine" },
    { domain: "tradeindia.com",     da: 65, anchor: "neptune fogger" },
    { domain: "exportersindia.com", da: 57, anchor: "neptune sprayer" },
    { domain: "sulekha.com",        da: 62, anchor: "thermal fogger neptune" },
    { domain: "pestcontrolindia.com",da: 36, anchor: "neptune pest control machine" },
  ],
  vectorfog: [
    { domain: "pestcontrolindia.com",da: 36, anchor: "vectorfog ULV sprayer" },
    { domain: "ipca.org.in",        da: 40, anchor: "vectorfog fogger" },
    { domain: "nvbdcp.gov.in",      da: 58, anchor: "vector control equipment" },
    { domain: "exportersindia.com", da: 57, anchor: "vectorfog disinfection machine" },
    { domain: "indiamart.com",      da: 72, anchor: "cold fogging machine vectorfog" },
  ],
  curtisdynafog: [
    { domain: "dynafog.com",        da: 45, anchor: "thermal fogger" },
    { domain: "nvbdcp.gov.in",      da: 58, anchor: "dynafog vector control" },
    { domain: "ipca.org.in",        da: 40, anchor: "curtis dyna-fog" },
    { domain: "pestcontrolindia.com",da: 36, anchor: "dyna-fog machine" },
    { domain: "phdcci.in",          da: 42, anchor: "fogging equipment" },
  ],
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const target: string = body.competitor || "all"
  const competitors = target === "all"
    ? Object.keys(COMPETITOR_SPECIFIC)
    : [target].filter(c => COMPETITOR_SPECIFIC[c])

  if (!competitors.length) return NextResponse.json({ error: "Unknown competitor" }, { status: 400 })

  const db   = (await clientPromise).db()
  const coll = db.collection("seo_competitor_links")
  const log  = db.collection("seo_offpage_audit_log")
  const gc   = db.collection("gem_contracts")
  const now  = new Date().toISOString()

  const results: Record<string, { discovered: number; gaps: number; skipped: number }> = {}

  for (const comp of competitors) {
    const compLinks = COMPETITOR_SPECIFIC[comp] ?? []
    let discovered = 0; let gaps = 0; let skipped = 0

    // 1. Seed per-competitor known links
    for (const link of compLinks) {
      const exists = await coll.findOne({ competitor: comp, domain: link.domain })
      if (exists) { skipped++; continue }
      await coll.insertOne({
        competitor:        comp,
        competitor_domain: COMPETITOR_DOMAINS[comp] ?? `${comp}.com`,
        backlink_url:      `https://${link.domain}/`,
        domain:            link.domain,
        anchor_text:       link.anchor,
        domain_authority:  link.da,
        gap_status:        "gap",
        opportunity:       link.da >= 60 ? "high" : link.da >= 40 ? "medium" : "low",
        source:            "discovery_seeded",
        discovered_at:     now,
        created_at:        now,
        updated_at:        now,
      })
      discovered++; gaps++
    }

    // 2. Mine gem_contracts — find buyer orgs that contracted the competitor
    // These orgs are high-value targets: if they mention the competitor, they may link to us
    const compKws = [comp.replace("_", " "), COMPETITOR_DOMAINS[comp]?.split(".")[0] ?? ""].filter(Boolean)
    const contractLinks = await gc.aggregate([
      {
        $match: {
          seller_name_canonical: {
            $regex: compKws.join("|"), $options: "i",
          },
        },
      },
      { $group: { _id: "$dept_name", ministry: { $first: "$ministry" }, count: { $sum: 1 } } },
      { $limit: 10 },
    ]).toArray().catch(() => [] as { _id: string; ministry: string; count: number }[])

    for (const org of contractLinks) {
      const deptDomain = (org._id || "").toLowerCase()
        .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "").slice(0, 30)
      if (!deptDomain) continue
      const domain = `${deptDomain}.gov.in`
      const exists = await coll.findOne({ competitor: comp, domain })
      if (exists) { skipped++; continue }
      await coll.insertOne({
        competitor:        comp,
        competitor_domain: COMPETITOR_DOMAINS[comp] ?? `${comp}.com`,
        backlink_url:      `https://${domain}/`,
        domain,
        anchor_text:       "thermal fogging machine",
        domain_authority:  45,
        gap_status:        "gap",
        opportunity:       "high",
        source:            "gem_contracts_discovery",
        org_name:          org._id,
        ministry:          org.ministry,
        contract_count:    org.count,
        discovered_at:     now,
        created_at:        now,
        updated_at:        now,
      })
      discovered++; gaps++
    }

    results[comp] = { discovered, gaps, skipped }
  }

  // Log
  const totalDiscovered = Object.values(results).reduce((a, b) => a + b.discovered, 0)
  await log.insertOne({
    collection: "seo_competitor_links", action: "competitor_discovery",
    detail: `Discovered ${totalDiscovered} competitor link opportunities across: ${competitors.join(", ")}`,
    meta: results,
    created_at: now,
  })

  return NextResponse.json({ ok: true, results, competitors })
}
