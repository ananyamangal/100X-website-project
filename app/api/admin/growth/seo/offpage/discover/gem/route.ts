import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// ─── Seller name variants for 100x Circle ────────────────────────────────────

const SELLER_VARIANTS = [
  "100x", "100 x", "hundred x", "hundredx", "100xcircle", "100x circle",
]

// ─── GeM authority opportunities we can seed even without contract matches ───

const BASELINE_GEM_OPPORTUNITIES: {
  type: string; title: string; url: string; authority_value: string
  backlink_opportunity: boolean; opportunity_notes: string; notes: string
}[] = [
  {
    type: "gem_listing",
    title: "GeM Catalogue — Thermal Fogging Machine",
    url: "https://mkp.gem.gov.in/",
    authority_value: "high",
    backlink_opportunity: true,
    opportunity_notes: "GeM product listing creates a gov.in backlink — ensure product page is live and optimized",
    notes: "Primary GeM listing. Verify at mkp.gem.gov.in for 100x Circle seller account.",
  },
  {
    type: "oem_authorization",
    title: "OEM Authorization Certificate — GeM Portal",
    url: "https://gem.gov.in/oem-authorization",
    authority_value: "high",
    backlink_opportunity: true,
    opportunity_notes: "OEM authorization on GeM creates additional authority signals and brand mentions",
    notes: "Apply for OEM status to unlock higher bid limits and authority mentions.",
  },
  {
    type: "procurement_portal",
    title: "NVBDCP (National Vector Borne Disease Control) Approved Vendor",
    url: "https://nvbdcp.gov.in/",
    authority_value: "high",
    backlink_opportunity: true,
    opportunity_notes: "NVBDCP approved vendor list — DA 58. Getting listed creates high-authority .gov.in backlink",
    notes: "Vector control equipment procurement authority. Apply via state health department.",
  },
  {
    type: "procurement_portal",
    title: "MSME Udyam Registration — Public Registry",
    url: "https://udyamregistration.gov.in/",
    authority_value: "medium",
    backlink_opportunity: false,
    opportunity_notes: "",
    notes: "Udyam registration number creates citations and validates MSME status for GeM bidding.",
  },
  {
    type: "government_mention",
    title: "Make in India Initiative — Thermal Fogging Equipment",
    url: "https://www.makeinindia.com/",
    authority_value: "high",
    backlink_opportunity: true,
    opportunity_notes: "Make in India mention for domestic manufacturing creates DA 65+ backlink",
    notes: "Register product under Make in India for agricultural/health equipment sector.",
  },
  {
    type: "gem_listing",
    title: "GeM — ULV Cold Fogging Machine Listing",
    url: "https://mkp.gem.gov.in/",
    authority_value: "medium",
    backlink_opportunity: true,
    opportunity_notes: "Separate listing for ULV cold fogging machine product variant",
    notes: "List ULV variant as a separate SKU for broader procurement visibility.",
  },
]

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db   = (await clientPromise).db()
  const gem  = db.collection("seo_gem_authority")
  const gc   = db.collection("gem_contracts")
  const log  = db.collection("seo_offpage_audit_log")
  const now  = new Date().toISOString()

  let fromContracts = 0; let fromBaseline = 0; let skipped = 0

  // 1. Mine gem_contracts for 100x Circle seller contracts
  const sellerRegex = new RegExp(SELLER_VARIANTS.join("|"), "i")

  const ourContracts = await gc.aggregate([
    { $match: { seller_name_canonical: { $regex: sellerRegex } } },
    {
      $group: {
        _id:       "$dept_name",
        ministry:  { $first: "$ministry" },
        count:     { $sum: 1 },
        total_val: { $sum: "$contract_value_num" },
        products:  { $addToSet: "$product_name" },
      },
    },
    { $limit: 30 },
  ]).toArray().catch(() => [] as Array<{
    _id: string; ministry: string; count: number; total_val: number; products: string[]
  }>)

  for (const org of ourContracts) {
    if (!org._id) continue
    const title = `GeM Contract — ${org._id}`
    const existing = await gem.findOne({ title })
    if (existing) { skipped++; continue }

    await gem.insertOne({
      type:                "tender_reference",
      title,
      url:                 "https://gem.gov.in/",
      organization:        org._id,
      ministry:            org.ministry || "",
      authority_value:     org.total_val > 500000 ? "high" : "medium",
      status:              "active",
      contract_count:      org.count,
      total_value_inr:     org.total_val,
      products:            org.products,
      backlink_opportunity: true,
      opportunity_notes:   `${org._id} has contracted us ${org.count} time(s). Request they mention/link us in their vendor portal.`,
      notes:               `Discovered from gem_contracts DB. Ministry: ${org.ministry || "N/A"}`,
      discovered_by:       "gem_db_scan",
      created_at:          now,
      updated_at:          now,
    })
    fromContracts++
  }

  // 2. Seed baseline GeM opportunities (if not already present)
  for (const opp of BASELINE_GEM_OPPORTUNITIES) {
    const existing = await gem.findOne({ title: opp.title })
    if (existing) { skipped++; continue }

    await gem.insertOne({
      ...opp,
      organization:  "100x Circle / GoI",
      status:        "identified",
      discovered_by: "gem_baseline_seed",
      created_at:    now,
      updated_at:    now,
    })
    fromBaseline++
  }

  await log.insertOne({
    collection: "seo_gem_authority", action: "gem_discovery",
    detail: `GeM discovery: ${fromContracts} from contracts DB, ${fromBaseline} baseline opportunities seeded, ${skipped} already tracked`,
    created_at: now,
  })

  return NextResponse.json({
    ok:            true,
    from_contracts: fromContracts,
    from_baseline:  fromBaseline,
    skipped,
    total:          fromContracts + fromBaseline,
  })
}
