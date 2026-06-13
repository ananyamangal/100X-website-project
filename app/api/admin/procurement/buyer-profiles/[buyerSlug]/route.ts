import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buyerSlug: string }> },
) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const { buyerSlug } = await params
    const db  = (await clientPromise).db()

    const profile = await db.collection("buyer_profiles").findOne({ buyer_slug: buyerSlug })
    if (!profile) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 })
    }

    // Fetch recent contracts for all dept_name variants of this buyer
    const variants = (profile.buyer_name_variants as string[]) ?? [profile.buyer_name as string]

    const [contracts, archiveRecords] = await Promise.all([
      db.collection("gem_contracts")
        .find(
          { dept_name: { $in: variants } },
          {
            projection: {
              gemc_no: 1, product_name: 1, contract_value_num: 1,
              seller_name_canonical: 1, seller_gst: 1,
              contract_date_dt: 1, first_seen: 1,
              contract_status: 1, quantity: 1, unit_rate: 1,
              detail_scraped: 1,
            },
          },
        )
        .sort({ contract_value_num: -1 })
        .limit(100)
        .toArray(),

      db.collection("gem_contract_archives")
        .find(
          { buyer_slug: buyerSlug },
          {
            projection: {
              gemc_number: 1, product_name_raw: 1, contract_value_inr: 1,
              seller_name: 1, seller_gstin: 1, award_date: 1,
              status: 1, integrity_verified: 1, pdf_class: 1,
            },
          },
        )
        .sort({ created_at: -1 })
        .limit(50)
        .toArray(),
    ])

    // Top products by spend within this buyer
    const productSpend = new Map<string, { spend: number; count: number }>()
    for (const c of contracts) {
      const name = c.product_name as string | null
      if (!name) continue
      const prev = productSpend.get(name) ?? { spend: 0, count: 0 }
      productSpend.set(name, {
        spend: prev.spend + ((c.contract_value_num as number) || 0),
        count: prev.count + 1,
      })
    }
    const top_products = [...productSpend.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 10)
      .map(([name, v]) => ({ product_name: name, total_spend: v.spend, contract_count: v.count }))

    // Supplier breakdown for this buyer
    const supplierMap = new Map<string, { spend: number; count: number; gstin: string | null }>()
    for (const c of contracts) {
      const name = c.seller_name_canonical as string | null
      if (!name) continue
      const prev = supplierMap.get(name) ?? { spend: 0, count: 0, gstin: null }
      supplierMap.set(name, {
        spend: prev.spend + ((c.contract_value_num as number) || 0),
        count: prev.count + 1,
        gstin: prev.gstin || (c.seller_gst as string | null),
      })
    }
    const suppliers = [...supplierMap.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 20)
      .map(([name, v]) => ({
        seller_name:   name,
        seller_gstin:  v.gstin,
        total_spend:   v.spend,
        contract_count: v.count,
      }))

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...profileData } = profile

    return NextResponse.json({
      profile: profileData,
      top_products,
      suppliers,
      contracts: contracts.map(c => ({
        gemc_no:               c.gemc_no,
        product_name:          c.product_name,
        contract_value_num:    c.contract_value_num,
        seller_name_canonical: c.seller_name_canonical,
        contract_date_dt:      c.contract_date_dt,
        first_seen:            c.first_seen,
        contract_status:       c.contract_status,
        quantity:              c.quantity,
        unit_rate:             c.unit_rate,
        detail_scraped:        c.detail_scraped,
      })),
      archive_records: archiveRecords.map(a => ({
        gemc_number:       a.gemc_number,
        product_name_raw:  a.product_name_raw,
        contract_value_inr: a.contract_value_inr,
        seller_name:       a.seller_name,
        seller_gstin:      a.seller_gstin,
        award_date:        a.award_date,
        status:            a.status,
        integrity_verified: a.integrity_verified,
        pdf_class:         a.pdf_class,
      })),
    })
  } catch (err) {
    console.error("buyer-profiles/[buyerSlug] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
