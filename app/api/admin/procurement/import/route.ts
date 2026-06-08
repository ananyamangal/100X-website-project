import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

type ImportType = "bids" | "dealers" | "products" | "brands"

function parseDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function parseBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === "yes"
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.batch_collect.run")
  if (!("user" in auth)) return auth

  try {
    const { type, rows }: { type: ImportType; rows: Record<string, unknown>[] } =
      await req.json()

    if (!type || !Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ error: "type and rows[] required" }, { status: 400 })

    const db = (await clientPromise).db()
    const now = new Date()
    let created = 0, updated = 0, skipped = 0

    if (type === "bids") {
      for (const row of rows) {
        const bidNumber = (row.bid_number as string)?.trim()
        if (!bidNumber) { skipped++; continue }

        const doc: Record<string, unknown> = {
          bid_number:          bidNumber,
          source:              (row.source as string)?.trim() || "gem",
          department_name:     (row.department_name as string)?.trim() || "",
          state:               (row.state as string)?.trim() || "",
          district:            (row.district as string)?.trim() || "",
          city:                (row.city as string)?.trim() || "",
          product_category:    (row.product_category as string)?.trim() || "thermal_fogger",
          product_name_raw:    (row.product_name_raw as string)?.trim() || "",
          quantity:            parseNum(row.quantity),
          estimated_value_inr: parseNum(row.estimated_value_inr),
          current_status:      (row.current_status as string)?.trim() || "published",
          publish_date:        parseDate(row.publish_date),
          bid_end_date:        parseDate(row.bid_end_date),
          award_date:          parseDate(row.award_date),
          l1_dealer_name:      (row.l1_dealer_name as string)?.trim() || "",
          l1_oem_brand:        (row.l1_oem_brand as string)?.trim() || "",
          l1_price_inr:        parseNum(row.l1_price_inr),
          l2_dealer_name:      (row.l2_dealer_name as string)?.trim() || "",
          l2_oem_brand:        (row.l2_oem_brand as string)?.trim() || "",
          l2_price_inr:        parseNum(row.l2_price_inr),
          l3_dealer_name:      (row.l3_dealer_name as string)?.trim() || "",
          l3_oem_brand:        (row.l3_oem_brand as string)?.trim() || "",
          l3_price_inr:        parseNum(row.l3_price_inr),
          total_bidders_count: parseNum(row.total_bidders_count),
          is_100x_win:         parseBool(row.is_100x_win),
          updated_at:          now,
        }

        const r = await db.collection("bid_lifecycle").updateOne(
          { bid_number: bidNumber },
          { $set: doc, $setOnInsert: { created_at: now } },
          { upsert: true }
        )
        r.upsertedCount > 0 ? created++ : updated++
      }
    } else if (type === "dealers") {
      for (const row of rows) {
        const name = (row.canonical_name as string)?.trim()
        if (!name) { skipped++; continue }

        const knownOemsRaw = row.known_oems as string
        const knownOems = knownOemsRaw
          ? knownOemsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : []

        const doc: Record<string, unknown> = {
          canonical_name: name,
          state:          (row.state as string)?.trim() || "",
          city:           (row.city as string)?.trim() || "",
          gstin:          (row.gstin as string)?.trim() || "",
          phone:          (row.phone as string)?.trim() || "",
          email:          (row.email as string)?.trim() || "",
          is_100x_dealer: parseBool(row.is_100x_dealer),
          known_oems:     knownOems,
          notes:          (row.notes as string)?.trim() || "",
          updated_at:     now,
        }

        const r = await db.collection("proc_dealers").updateOne(
          { canonical_name: name },
          { $set: doc, $setOnInsert: { created_at: now } },
          { upsert: true }
        )
        r.upsertedCount > 0 ? created++ : updated++
      }
    } else if (type === "products") {
      for (const row of rows) {
        const name = (row.name as string)?.trim()
        if (!name) { skipped++; continue }

        const doc: Record<string, unknown> = {
          name,
          category:                     (row.category as string)?.trim() || "",
          selling_price_inr:            parseNum(row.selling_price_inr),
          gross_margin_pct:             parseNum(row.gross_margin_pct),
          dealer_margin_pct:            parseNum(row.dealer_margin_pct),
          is_bis_certified:             parseBool(row.is_bis_certified),
          certification_number:         (row.certification_number as string)?.trim() || "",
          gem_listed:                   parseBool(row.gem_listed),
          government_suitability_score: parseNum(row.government_suitability_score),
          dealer_suitability_score:     parseNum(row.dealer_suitability_score),
          tier:                         (row.tier as string)?.trim() || "",
          notes:                        (row.notes as string)?.trim() || "",
          updated_at:                   now,
        }

        const r = await db.collection("proc_products").updateOne(
          { name },
          { $set: doc, $setOnInsert: { created_at: now } },
          { upsert: true }
        )
        r.upsertedCount > 0 ? created++ : updated++
      }
    } else if (type === "brands") {
      for (const row of rows) {
        const brandName = (row.brand_name as string)?.trim()
        if (!brandName) { skipped++; continue }

        const doc: Record<string, unknown> = {
          brand_name:        brandName,
          is_competitor:     parseBool(row.is_competitor),
          is_100x:           parseBool(row.is_100x),
          country_of_origin: (row.country_of_origin as string)?.trim() || "",
          notes:             (row.notes as string)?.trim() || "",
          updated_at:        now,
        }

        const r = await db.collection("proc_brand_profiles").updateOne(
          { brand_name: brandName },
          { $set: doc, $setOnInsert: { created_at: now } },
          { upsert: true }
        )
        r.upsertedCount > 0 ? created++ : updated++
      }
    } else {
      return NextResponse.json({ error: `Unknown import type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, created, updated, skipped, total: rows.length })
  } catch (err) {
    console.error("procurement/import error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
