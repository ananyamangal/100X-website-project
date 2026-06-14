import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sellerSlug: string }> },
) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const { sellerSlug } = await params
    const db = (await clientPromise).db()

    const profile = await db.collection("seller_profiles").findOne({ seller_slug: sellerSlug })
    if (!profile) {
      return NextResponse.json({ error: "Seller profile not found" }, { status: 404 })
    }

    // Query contracts by all GSTIN variants, GeM ID, or name variants
    const gstinSet      = (profile.seller_gstin_set  as string[]) ?? []
    const gemId         = profile.seller_gem_id       as string | null
    const nameVariants  = (profile.seller_name_variants as string[]) ?? [profile.seller_name as string]

    const contractFilter: Record<string, unknown> = {
      $or: [
        ...(gstinSet.length   ? [{ seller_gst:             { $in: gstinSet    } }] : []),
        ...(gemId              ? [{ seller_gem_id:          gemId              }] : []),
        ...(nameVariants.length? [{ seller_name_canonical:  { $in: nameVariants } }] : []),
      ],
    }

    if (!contractFilter.$or || (contractFilter.$or as unknown[]).length === 0) {
      return NextResponse.json({ profile: { ...profile, _id: undefined }, contracts: [], archive_records: [], buyers: [], products: [] })
    }

    const archiveFilter: Record<string, unknown> = {
      $or: [
        ...(gstinSet.length   ? [{ seller_gstin: { $in: gstinSet } }] : []),
        ...(nameVariants.length? [{ seller_name:  { $in: nameVariants } }] : []),
      ],
    }

    const [contracts, archiveRecords] = await Promise.all([
      db.collection("gem_contracts")
        .find(contractFilter, {
          projection: {
            gemc_no: 1, product_name: 1, contract_value_num: 1,
            dept_name: 1, state: 1, ministry: 1,
            seller_gst: 1, seller_gem_id: 1, seller_name_canonical: 1,
            contract_date_dt: 1, first_seen: 1,
            contract_status: 1, quantity: 1, unit_rate: 1,
            oem_brand: 1, oem_name: 1, detail_scraped: 1,
          },
        })
        .sort({ contract_value_num: -1 })
        .limit(150)
        .toArray(),

      db.collection("gem_contract_archives")
        .find(archiveFilter, {
          projection: {
            gemc_number: 1, product_name_raw: 1, contract_value_inr: 1,
            buyer_name: 1, buyer_state: 1, seller_name: 1, seller_gstin: 1,
            award_date: 1, status: 1, integrity_verified: 1, pdf_class: 1,
          },
        })
        .sort({ created_at: -1 })
        .limit(75)
        .toArray(),
    ])

    // Buyer breakdown
    const buyerSpend = new Map<string, { spend: number; count: number; state: string | null }>()
    for (const c of contracts) {
      const name = c.dept_name as string | null
      if (!name) continue
      const prev = buyerSpend.get(name) ?? { spend: 0, count: 0, state: null }
      buyerSpend.set(name, {
        spend: prev.spend + ((c.contract_value_num as number) || 0),
        count: prev.count + 1,
        state: prev.state || (c.state as string | null),
      })
    }
    const buyers = [...buyerSpend.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 30)
      .map(([name, v]) => ({
        dept_name:      name,
        state:          v.state,
        total_spend:    v.spend,
        contract_count: v.count,
      }))

    // Product breakdown
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
    const products = [...productSpend.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 20)
      .map(([name, v]) => ({
        product_name:   name,
        total_spend:    v.spend,
        contract_count: v.count,
      }))

    const { _id, ...profileData } = profile

    return NextResponse.json({
      profile: profileData,
      buyers,
      products,
      contracts: contracts.map(c => ({
        gemc_no:               c.gemc_no,
        product_name:          c.product_name,
        contract_value_num:    c.contract_value_num,
        dept_name:             c.dept_name,
        state:                 c.state,
        ministry:              c.ministry,
        seller_name_canonical: c.seller_name_canonical,
        contract_date_dt:      c.contract_date_dt,
        first_seen:            c.first_seen,
        contract_status:       c.contract_status,
        quantity:              c.quantity,
        unit_rate:             c.unit_rate,
        oem_brand:             c.oem_brand,
        oem_name:              c.oem_name,
        detail_scraped:        c.detail_scraped,
      })),
      archive_records: archiveRecords.map(a => ({
        gemc_number:        a.gemc_number,
        product_name_raw:   a.product_name_raw,
        contract_value_inr: a.contract_value_inr,
        buyer_name:         a.buyer_name,
        buyer_state:        a.buyer_state,
        seller_name:        a.seller_name,
        seller_gstin:       a.seller_gstin,
        award_date:         a.award_date,
        status:             a.status,
        integrity_verified: a.integrity_verified,
        pdf_class:          a.pdf_class,
      })),
    })
  } catch (err) {
    console.error("seller-profiles/[sellerSlug] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
