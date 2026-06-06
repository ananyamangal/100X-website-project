import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

// ── Storage size assumptions (measured from 140-contract sample) ──────────────
const AVG_PDF_KB      = 58    // measured: 58KB avg, range 51–117KB
const AVG_PDF_KB_CONS = 500   // conservative (complex multi-page contracts)
const AVG_RAW_TEXT_KB = 13    // measured
const AVG_MONGO_KB    = 8     // estimated per gem_contracts document

// ── Retention policy ──────────────────────────────────────────────────────────
const B_RETENTION_MONTHS = 6
const RAW_RETENTION_DAYS = 90

// ── Growth rate assumptions ───────────────────────────────────────────────────
// Conservative: fogging-only niche collection
const CONTRACTS_PER_YEAR_BASE = 5_000
// Moderate: expand to adjacent categories
const CONTRACTS_PER_YEAR_MID  = 20_000
// Full: all-category GeM collection
const CONTRACTS_PER_YEAR_HIGH = 100_000

// Class distribution for fogging-focused collection (Strategic by default)
const CLASS_DIST = { A: 0.55, B: 0.35, C: 0.10 }

function forecast(contractsPerYear: number, years: number) {
  // Cumulative contracts
  const total = contractsPerYear * years

  // Tier 1 — MongoDB (grows linearly, permanent)
  const mongoMB = total * AVG_MONGO_KB / 1024

  // Tier 2 — Raw text (steady state: rolling 90-day window)
  const rawSteadyMB = contractsPerYear * (RAW_RETENTION_DAYS / 365) * AVG_RAW_TEXT_KB / 1024

  // Tier 3 — PDFs by class
  // Class A: permanent, grows each year
  const aCount = total * CLASS_DIST.A
  const pdfAMB = aCount * AVG_PDF_KB / 1024

  // Class B: steady state (rolling 6-month window)
  const pdfBMB = contractsPerYear * CLASS_DIST.B * (B_RETENTION_MONTHS / 12) * AVG_PDF_KB / 1024

  // Class C: deleted after extraction — only transient during processing
  // At any moment: ~1 day of processing = contractsPerYear/365 contracts
  const pdfCMB = (contractsPerYear / 365) * CLASS_DIST.C * AVG_PDF_KB / 1024

  const totalTieredMB = mongoMB + rawSteadyMB + pdfAMB + pdfBMB + pdfCMB

  // Naive (keep everything, no tiering)
  const naivePdfMB = total * AVG_PDF_KB / 1024
  const naiveRawMB = total * AVG_RAW_TEXT_KB / 1024
  const naiveTotalMB = mongoMB + naiveRawMB + naivePdfMB

  return {
    years,
    contracts_total: Math.round(total),
    tier1_mongo_mb:  Math.round(mongoMB),
    tier2_raw_mb:    Math.round(rawSteadyMB),
    tier3_pdf_a_mb:  Math.round(pdfAMB),
    tier3_pdf_b_mb:  Math.round(pdfBMB),
    tier3_pdf_c_mb:  Math.round(pdfCMB),
    total_tiered_mb: Math.round(totalTieredMB),
    naive_total_mb:  Math.round(naiveTotalMB),
    savings_pct:     Math.round((1 - totalTieredMB / naiveTotalMB) * 100),
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = (await clientPromise).db()
    const gc  = db.collection("gem_contracts")
    const raw = db.collection("gem_contracts_raw")
    const sp  = req.nextUrl.searchParams
    const section = sp.get("section") || "overview"

    // ── Overview ─────────────────────────────────────────────────────────────
    if (section === "overview") {
      const [
        total,
        enriched,
        classAgg,
        rawCount,
        duplicates,
      ] = await Promise.all([
        gc.countDocuments(),
        gc.countDocuments({ detail_scraped: true }),
        gc.aggregate([
          {
            $group: {
              _id: { $ifNull: ["$pdf_retention_class", "unclassified"] },
              count:   { $sum: 1 },
              pdf_on_disk: { $sum: { $cond: ["$pdf_saved", 1, 0] } },
              pdf_bytes:   { $sum: { $ifNull: ["$pdf_size", 0] } },
              deleted_count: { $sum: { $cond: [{ $ifNull: ["$pdf_deleted_at", false] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]).toArray(),
        raw.countDocuments(),
        gc.aggregate([
          { $match: { pdf_hash: { $nin: [null, ""] } } },
          { $group: { _id: "$pdf_hash", count: { $sum: 1 }, gemc_nos: { $push: "$gemc_no" } } },
          { $match: { count: { $gt: 1 } } },
          { $count: "dupe_groups" },
        ]).toArray(),
      ])

      type ClassEntry = { _id: string; count: number; pdf_on_disk: number; pdf_bytes: number; deleted_count: number }
      const byClass: Record<string, ClassEntry> = {}
      for (const row of classAgg as ClassEntry[]) {
        byClass[row._id] = row
      }

      const totalPdfBytes = (classAgg as ClassEntry[]).reduce((s, r) => s + (r.pdf_bytes || 0), 0)
      const totalRawEstBytes = rawCount * AVG_RAW_TEXT_KB * 1024

      return NextResponse.json({
        total,
        enriched,
        classified: total - (byClass.unclassified?.count || 0),
        unclassified: byClass.unclassified?.count || 0,
        by_class: {
          A: byClass.A   || { count: 0, pdf_on_disk: 0, pdf_bytes: 0, deleted_count: 0 },
          B: byClass.B   || { count: 0, pdf_on_disk: 0, pdf_bytes: 0, deleted_count: 0 },
          C: byClass.C   || { count: 0, pdf_on_disk: 0, pdf_bytes: 0, deleted_count: 0 },
        },
        tier1_mongo_kb:   Math.round(total * AVG_MONGO_KB),
        tier2_raw_kb:     Math.round(totalRawEstBytes / 1024),
        tier3_pdf_kb:     Math.round(totalPdfBytes / 1024),
        tier3_pdf_count:  (classAgg as ClassEntry[]).reduce((s, r) => s + (r.pdf_on_disk || 0), 0),
        raw_count:        rawCount,
        duplicate_groups: duplicates[0]?.dupe_groups || 0,
        reclaimable_C_kb: Math.round((byClass.C?.pdf_bytes || 0) / 1024),
      })
    }

    // ── Forecast ──────────────────────────────────────────────────────────────
    if (section === "forecast") {
      const rates = [
        { label: "Niche (fogging only)", per_year: CONTRACTS_PER_YEAR_BASE },
        { label: "Moderate (adjacent categories)", per_year: CONTRACTS_PER_YEAR_MID },
        { label: "Full GeM collection", per_year: CONTRACTS_PER_YEAR_HIGH },
      ]

      const rows = rates.map(r => ({
        scenario: r.label,
        per_year: r.per_year,
        year1:  forecast(r.per_year, 1),
        year3:  forecast(r.per_year, 3),
        year5:  forecast(r.per_year, 5),
      }))

      return NextResponse.json({
        assumptions: {
          avg_pdf_kb:      AVG_PDF_KB,
          avg_pdf_kb_cons: AVG_PDF_KB_CONS,
          avg_raw_kb:      AVG_RAW_TEXT_KB,
          avg_mongo_kb:    AVG_MONGO_KB,
          class_dist:      CLASS_DIST,
          b_retention_months: B_RETENTION_MONTHS,
          raw_retention_days: RAW_RETENTION_DAYS,
        },
        rows,
      })
    }

    // ── Class breakdown (detailed) ────────────────────────────────────────────
    if (section === "class_breakdown") {
      const limit = parseInt(sp.get("limit") || "20")
      const cls   = sp.get("class") || "A"
      const rows = await gc
        .find(
          { pdf_retention_class: cls },
          { projection: {
            gemc_no: 1, seller_name_canonical: 1, dept_name: 1, product_name: 1,
            contract_value_num: 1, pdf_retention_class: 1, pdf_saved: 1,
            pdf_size: 1, pdf_hash: 1, pdf_deleted_at: 1, first_seen: 1,
            extraction_confidence: 1, raw_deleted_at: 1,
          }}
        )
        .sort({ contract_value_num: -1 })
        .limit(limit)
        .toArray()
      return NextResponse.json({ rows, class: cls })
    }

    // ── Duplicates by hash ────────────────────────────────────────────────────
    if (section === "duplicates") {
      const dupes = await gc.aggregate([
        { $match: { pdf_hash: { $nin: [null, ""] } } },
        { $group: {
          _id:      "$pdf_hash",
          count:    { $sum: 1 },
          gemc_nos: { $push: "$gemc_no" },
          sellers:  { $push: "$seller_name_canonical" },
          size:     { $first: "$pdf_size" },
        }},
        { $match: { count: { $gt: 1 } } },
        { $sort: { size: -1 } },
        { $limit: 50 },
      ]).toArray()
      return NextResponse.json({ duplicates: dupes })
    }

    // ── Records list with PDF metadata ───────────────────────────────────────
    if (section === "records") {
      const cls   = sp.get("class") || null
      const limit = parseInt(sp.get("limit") || "100")
      const query: Record<string, unknown> = {}
      if (cls) query.pdf_retention_class = cls
      const rows = await gc
        .find(query, {
          projection: {
            gemc_no: 1, seller_name_canonical: 1, product_name: 1,
            contract_value_num: 1, pdf_retention_class: 1, pdf_saved: 1,
            pdf_size: 1, pdf_deleted_at: 1, pdf_bookmarked: 1,
            extraction_confidence: 1, first_seen: 1, raw_deleted_at: 1,
          }
        })
        .sort({ contract_value_num: -1 })
        .limit(limit)
        .toArray()
      return NextResponse.json({ rows })
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 })
  } catch (err) {
    console.error("storage API error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
