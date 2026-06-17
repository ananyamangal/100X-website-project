import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// ─── Known citation platform check patterns ───────────────────────────────────

interface PlatformDef {
  id:             string
  label:          string
  check_url:      string       // URL to HEAD-check for presence
  profile_pattern: string     // expected profile URL format
  priority:       "critical" | "high" | "medium"
  da:             number
}

const PLATFORMS: PlatformDef[] = [
  {
    id:              "indiamart",
    label:           "IndiaMART",
    check_url:       "https://www.indiamart.com/100xcircle/",
    profile_pattern: "https://www.indiamart.com/100xcircle/",
    priority:        "critical",
    da:              72,
  },
  {
    id:              "tradeindia",
    label:           "TradeIndia",
    check_url:       "https://www.tradeindia.com/fp/100xcircle",
    profile_pattern: "https://www.tradeindia.com/fp/100xcircle",
    priority:        "critical",
    da:              65,
  },
  {
    id:              "justdial",
    label:           "Justdial",
    check_url:       "https://www.justdial.com/jdmart/100x-circle",
    profile_pattern: "https://www.justdial.com/jdmart/100x-circle",
    priority:        "high",
    da:              70,
  },
  {
    id:              "exportersindia",
    label:           "ExportersIndia",
    check_url:       "https://www.exportersindia.com/100xcircle/",
    profile_pattern: "https://www.exportersindia.com/100xcircle/",
    priority:        "high",
    da:              57,
  },
  {
    id:              "gem_portal",
    label:           "GeM Seller Portal",
    check_url:       "https://mkp.gem.gov.in/seller/100xcircle",
    profile_pattern: "https://gem.gov.in/",
    priority:        "critical",
    da:              80,
  },
  {
    id:              "msme_directory",
    label:           "MSME Udyam",
    check_url:       "https://udyamregistration.gov.in/",
    profile_pattern: "https://udyamregistration.gov.in/",
    priority:        "high",
    da:              55,
  },
  {
    id:              "industry_association",
    label:           "IPCA (Pest Control Association)",
    check_url:       "https://www.ipca.org.in/member-list",
    profile_pattern: "https://www.ipca.org.in/",
    priority:        "medium",
    da:              40,
  },
  {
    id:              "google_business",
    label:           "Google Business Profile",
    check_url:       "https://business.google.com/",
    profile_pattern: "https://maps.google.com/",
    priority:        "critical",
    da:              99,
  },
]

// HEAD-check if a URL responds (not 404)
async function checkUrl(url: string): Promise<"present" | "missing" | "unknown"> {
  try {
    const res = await fetch(url, {
      method:  "HEAD",
      redirect: "follow",
      signal:  AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; 100xBot/1.0)" },
    })
    if (res.status === 404 || res.status === 410) return "missing"
    if (res.status >= 200 && res.status < 400) return "present"
    return "unknown"
  } catch {
    return "unknown"
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db   = (await clientPromise).db()
  const coll = db.collection("seo_citations")
  const log  = db.collection("seo_offpage_audit_log")
  const now  = new Date().toISOString()

  const results: {
    platform: string; status: "already_tracked" | "verified" | "recommended"; checked: string
  }[] = []

  for (const platform of PLATFORMS) {
    // Skip if already tracked (non-missing status)
    const existing = await coll.findOne({ platform: platform.id })
    if (existing && existing.status !== "recommended") {
      results.push({ platform: platform.id, status: "already_tracked", checked: platform.check_url })
      continue
    }
    if (existing) {
      results.push({ platform: platform.id, status: "already_tracked", checked: platform.check_url })
      continue
    }

    // Attempt to verify presence
    const presence = await checkUrl(platform.check_url)

    if (presence === "present") {
      // Found — create as verified
      await coll.insertOne({
        platform:       platform.id,
        platform_label: platform.label,
        listing_url:    platform.profile_pattern,
        nap_consistent: false,
        status:         "verified",
        priority:       platform.priority,
        domain_authority: platform.da,
        discovered_by:  "auto_scan",
        notes:          "Auto-discovered: listing found at known URL pattern",
        submitted_at:   null,
        verified_at:    now,
        created_at:     now,
        updated_at:     now,
      })
      results.push({ platform: platform.id, status: "verified", checked: platform.check_url })
    } else {
      // Not found or unknown — create as recommended
      await coll.insertOne({
        platform:       platform.id,
        platform_label: platform.label,
        listing_url:    "",
        nap_consistent: false,
        status:         "recommended",
        priority:       platform.priority,
        domain_authority: platform.da,
        discovered_by:  "auto_scan",
        notes:          presence === "missing"
          ? "Auto-scan: not listed on this platform — submit to get citation"
          : "Auto-scan: could not verify — manual check recommended",
        submitted_at:   null,
        verified_at:    null,
        created_at:     now,
        updated_at:     now,
      })
      results.push({ platform: platform.id, status: "recommended", checked: platform.check_url })
    }
  }

  const found     = results.filter(r => r.status === "verified").length
  const missing   = results.filter(r => r.status === "recommended").length
  const tracked   = results.filter(r => r.status === "already_tracked").length

  await log.insertOne({
    collection: "seo_citations", action: "citation_discovery",
    detail: `Citation scan: ${found} found, ${missing} missing/recommended, ${tracked} already tracked`,
    meta: results,
    created_at: now,
  })

  return NextResponse.json({ ok: true, results, found, missing, already_tracked: tracked })
}
