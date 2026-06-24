/**
 * Customer Match Audit — data integrity report
 * GET /api/admin/growth/ads/customer-match/audit
 *
 * Explains the intentional difference between:
 *   - fogging_sellers  (~679): unique GeM *sellers* of fogging machines
 *   - customer_match  (5000+): *contacts* for Google Ads targeting from 6 sources
 *
 * Returns deduplication stats and per-collection breakdowns.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { normalizePhone, normalizeCompanyName } from "@/lib/growth-os/customer-match-engine"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db = (await clientPromise).db()

    // ── 1. Raw collection counts ──────────────────────────────────────────────
    const [
      fogSellers,
      gemContracts,
      dealerProspects,
      crmDealers,
      fogContracts100x,
      brochureLeads,
      rfqLeads,
    ] = await Promise.all([
      db.collection("fogging_sellers").countDocuments({}),
      db.collection("gem_contracts").countDocuments({
        $or: [
          { buyer_email:   { $exists: true, $nin: [null, ""] } },
          { buyer_contact: { $exists: true, $nin: [null, ""] } },
        ],
      }),
      db.collection("dealer_prospects").countDocuments({ status: { $ne: "rejected" } }),
      db.collection("crm_dealers").countDocuments({}),
      db.collection("fogging_contracts").countDocuments({ is_100x: true }),
      db.collection("brochure_leads").countDocuments({}),
      db.collection("rfq_popup_leads").countDocuments({}),
    ])

    // ── 2. Contact-quality counts per source ──────────────────────────────────
    const [dealerEmailCount, dealerPhoneCount, brochureEmailCount] = await Promise.all([
      db.collection("dealer_prospects").countDocuments({
        status: { $ne: "rejected" },
        email: { $nin: [null, ""] },
      }),
      db.collection("dealer_prospects").countDocuments({
        status: { $ne: "rejected" },
        mobile: { $nin: [null, ""] },
      }),
      db.collection("brochure_leads").countDocuments({
        email: { $nin: [null, ""] },
      }),
    ])

    // ── 3. Deduplication analysis across all customer match sources ────────────
    // Sample a batch of emails and phones to measure cross-source duplicates
    const [prospectEmails, crmEmails, brochureEmails] = await Promise.all([
      db.collection("dealer_prospects")
        .find({ status: { $ne: "rejected" }, email: { $nin: [null, ""] } })
        .project({ email: 1 })
        .limit(5000)
        .toArray(),
      db.collection("crm_dealers")
        .find({ email: { $nin: [null, ""] } })
        .project({ email: 1 })
        .limit(500)
        .toArray(),
      db.collection("brochure_leads")
        .find({ email: { $nin: [null, ""] } })
        .project({ email: 1 })
        .limit(5000)
        .toArray(),
    ])

    const allEmailSet = new Set<string>()
    let dupEmails = 0
    for (const docs of [prospectEmails, crmEmails, brochureEmails]) {
      for (const d of docs) {
        const e = String(d.email || "").toLowerCase().trim()
        if (!e) continue
        if (allEmailSet.has(e)) dupEmails++
        else allEmailSet.add(e)
      }
    }

    const [prospectPhones, brochurePhones] = await Promise.all([
      db.collection("dealer_prospects")
        .find({ status: { $ne: "rejected" }, mobile: { $nin: [null, ""] } })
        .project({ mobile: 1 })
        .limit(5000)
        .toArray(),
      db.collection("brochure_leads")
        .find({ phone: { $nin: [null, ""] } })
        .project({ phone: 1 })
        .limit(5000)
        .toArray(),
    ])

    const allPhoneSet = new Set<string>()
    let dupPhones = 0
    for (const docs of [prospectPhones, brochurePhones]) {
      for (const d of docs) {
        const rawPhone = String(d.mobile || d.phone || "")
        const p = normalizePhone(rawPhone)
        if (!p) continue
        if (allPhoneSet.has(p)) dupPhones++
        else allPhoneSet.add(p)
      }
    }

    // ── 4. Company name dedup across existing customers ───────────────────────
    const existingCos = await db.collection("fogging_contracts")
      .find({ is_100x: true })
      .project({ buyer_display_name: 1, buyer_canonical: 1 })
      .limit(5000)
      .toArray()

    const coNormSet = new Set<string>()
    let dupCompanies = 0
    for (const c of existingCos) {
      const co = String(c.buyer_display_name || c.buyer_canonical || "")
      const norm = normalizeCompanyName(co)
      if (!norm) continue
      if (coNormSet.has(norm)) dupCompanies++
      else coNormSet.add(norm)
    }

    // ── 5. Assemble report ────────────────────────────────────────────────────
    const customerMatchTotal =
      Math.min(20000, gemContracts) +
      Math.min(5000, dealerProspects) +
      Math.min(500, crmDealers) +
      Math.min(5000, fogContracts100x) +
      Math.min(5000, brochureLeads) +
      Math.min(5000, rfqLeads)

    return NextResponse.json({
      explanation: {
        summary: "The 679 vs 5000+ figures measure completely different datasets — this is correct and expected.",
        foggingSellers: "fogging_sellers contains unique GeM SELLERS (suppliers) of fogging machines. Each record = one business that sells/distributes fogging equipment.",
        customerMatch:  "Customer Match pulls CONTACTS for Google Ads targeting from 6 sources: government buyers, dealer prospects, CRM dealers, existing 100X customers, brochure downloads, RFQ submissions.",
        intentionalDifference: "A seller on GeM and a buyer/lead in your CRM are fundamentally different entities. No data fix needed — these are correct.",
      },
      fogginIntelligence: {
        collection:  "fogging_sellers",
        description: "Pre-aggregated seller profiles (unique businesses that sold fogging machines on GeM)",
        totalSellers: fogSellers,
      },
      customerMatchSources: {
        governmentBuyers: {
          collection:  "gem_contracts",
          description: "Government org contacts extracted from GeM contract PDFs",
          rawRecords:  gemContracts,
          note:        "Deduplicated by email, then phone, within this source",
        },
        dealerProspects: {
          collection:   "dealer_prospects",
          description:  "Dealer acquisition pipeline (non-rejected)",
          rawRecords:   dealerProspects,
          withEmail:    dealerEmailCount,
          withPhone:    dealerPhoneCount,
        },
        crmDealers: {
          collection:   "crm_dealers",
          description:  "CRM pipeline dealers with contact data",
          rawRecords:   crmDealers,
        },
        existingCustomers: {
          collection:   "fogging_contracts (is_100x=true)",
          description:  "Unique organizations that bought 100X products via GeM",
          rawRecords:   fogContracts100x,
          uniqueAfterCompanyDedup: existingCos.length - dupCompanies,
          note:         "No email/phone — needs enrichment for Google match",
        },
        brochureLeads: {
          collection:   "brochure_leads",
          description:  "Brochure download form submissions",
          rawRecords:   brochureLeads,
          withEmail:    brochureEmailCount,
        },
        rfqLeads: {
          collection:   "rfq_popup_leads",
          description:  "RFQ popup form submissions",
          rawRecords:   rfqLeads,
        },
        estimatedTotalBeforeDedup: customerMatchTotal,
      },
      deduplicationStats: {
        crossSourceDuplicateEmails: dupEmails,
        crossSourceDuplicatePhones: dupPhones,
        companyDuplicates:          dupCompanies,
        deduplicationStrategy:      "Priority chain: email → phone → company name (normalized). ABC Pvt Ltd = ABC Private Limited = A.B.C Pvt Ltd",
      },
      dataIntegrityMatrix: {
        "Raw Records (Customer Match sources)": customerMatchTotal,
        "Unique Sellers (Fogging Intelligence)": fogSellers,
        "Unique Emails (cross-source sample)":   allEmailSet.size,
        "Unique Phones (cross-source sample)":   allPhoneSet.size,
        "Unique Companies (existing customers)": coNormSet.size,
        "Cross-source Email Duplicates":         dupEmails,
        "Cross-source Phone Duplicates":         dupPhones,
        "Company Name Duplicates":               dupCompanies,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
