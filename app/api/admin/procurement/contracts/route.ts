import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth
  try {
    const db = (await clientPromise).db()
    const gc = db.collection("gem_contracts")
    const sp = req.nextUrl.searchParams
    const section = sp.get("section") || "overview"

    // ── Overview ──────────────────────────────────────────────────────────────
    if (section === "overview") {
      const [total, enriched, failed, tvr, evr] = await Promise.all([
        gc.countDocuments(),
        gc.countDocuments({ detail_scraped: true }),
        gc.countDocuments({ enrichment_error: { $exists: true, $ne: null } }),
        gc.aggregate([{ $group: { _id: null, t: { $sum: "$contract_value_num" } } }]).toArray(),
        gc.aggregate([
          { $match: { detail_scraped: true } },
          { $group: { _id: null, t: { $sum: "$contract_value_num" } } },
        ]).toArray(),
      ])
      return NextResponse.json({
        total, enriched, pending: total - enriched - failed, failed,
        pct_enriched: total ? Math.round((enriched / total) * 100) : 0,
        total_gmv: tvr[0]?.t || 0,
        enriched_gmv: evr[0]?.t || 0,
      })
    }

    // ── Contracts list (table, with optional search) ───────────────────────────
    if (section === "contracts_list") {
      const q = sp.get("q") || ""
      const query: Record<string, unknown> = {}
      if (q.length >= 2) {
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        query.$or = [
          { gemc_no:              { $regex: esc, $options: "i" } },
          { seller_name_canonical: { $regex: esc, $options: "i" } },
          { seller_gst:           { $regex: esc, $options: "i" } },
          { dept_name:            { $regex: esc, $options: "i" } },
          { product_name:         { $regex: esc, $options: "i" } },
          { seller_state:         { $regex: esc, $options: "i" } },
          { state:                { $regex: esc, $options: "i" } },
          { seller_phone:         { $regex: esc, $options: "i" } },
        ]
      }
      const contracts = await gc.find(query, {
        projection: {
          gemc_no: 1, seller_name_canonical: 1, dept_name: 1, product_name: 1,
          contract_value_num: 1, seller_state: 1, state: 1, contract_status: 1,
          contract_date_dt: 1, first_seen: 1, quantity: 1, unit_rate: 1,
          ministry: 1, extraction_confidence: 1, buyer_name: 1, detail_scraped: 1,
          seller_gst: 1, buying_mode: 1,
        }
      }).sort({ contract_value_num: -1 }).limit(500).toArray()
      return NextResponse.json({ contracts, total: contracts.length })
    }

    // ── Contract detail (single contract, all fields) ──────────────────────────
    if (section === "contract_detail") {
      const gemc = sp.get("gemc")
      if (!gemc) return NextResponse.json({ error: "gemc required" }, { status: 400 })
      const contract = await gc.findOne({ gemc_no: gemc })
      if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

      let raw_text: string | null = null
      try {
        const { existsSync, readFileSync } = await import("fs")
        const { join } = await import("path")
        const safeName = gemc.replace(/[^A-Z0-9]/g, "_")
        const archiveRoot = process.env.GEM_ARCHIVE_ROOT ||
          join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
        const archivePath = join(archiveRoot, "RawText", `${safeName}.txt`)
        const legacyPath  = join(process.cwd(), "audit", "enrichment", "text", `${safeName}.txt`)
        const p = existsSync(archivePath) ? archivePath : legacyPath
        if (existsSync(p)) raw_text = readFileSync(p, "utf8").slice(0, 10000)
      } catch { /* graceful on Vercel */ }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = contract
      return NextResponse.json({ ...rest, raw_text })
    }

    // ── Global search suggestions ──────────────────────────────────────────────
    if (section === "search") {
      const q = sp.get("q") || ""
      if (q.length < 2) return NextResponse.json({ contracts: [], sellers: [], depts: [], products: [] })
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const [contracts, sellers, depts, products] = await Promise.all([
        gc.find(
          { $or: [
            { gemc_no:              { $regex: esc, $options: "i" } },
            { seller_name_canonical: { $regex: esc, $options: "i" } },
            { seller_gst:           { $regex: esc, $options: "i" } },
          ]},
          { projection: { gemc_no: 1, seller_name_canonical: 1, contract_value_num: 1 } }
        ).limit(5).toArray(),
        gc.distinct("seller_name_canonical", { seller_name_canonical: { $regex: esc, $options: "i" } }),
        gc.distinct("dept_name",             { dept_name:             { $regex: esc, $options: "i" } }),
        gc.distinct("product_name",          { product_name:          { $regex: esc, $options: "i" } }),
      ])
      return NextResponse.json({
        contracts,
        sellers:  (sellers  as string[]).filter(Boolean).slice(0, 5),
        depts:    (depts    as string[]).filter(Boolean).slice(0, 5),
        products: (products as string[]).filter(Boolean).slice(0, 5),
      })
    }

    // ── Top sellers by GMV ────────────────────────────────────────────────────
    if (section === "sellers_by_gmv") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] } } },
        { $group: {
          _id:   "$seller_name_canonical",
          gmv:   { $sum: "$contract_value_num" },
          count: { $sum: 1 },
          gstin: { $first: "$seller_gst" },
          state: { $first: "$seller_state" },
        }},
        { $sort: { gmv: -1 } }, { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Top sellers by count ───────────────────────────────────────────────────
    if (section === "sellers_by_count") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] } } },
        { $group: { _id: "$seller_name_canonical", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" }, gstin: { $first: "$seller_gst" } } },
        { $sort: { count: -1 } }, { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── New sellers ────────────────────────────────────────────────────────────
    if (section === "new_sellers") {
      const limit = parseInt(sp.get("limit") || "30")
      const dealerNames = await db.collection("gem_dealers")
        .distinct("canonical_name")
        .then(r => new Set(r.map((n: string) => n.toUpperCase())))
      const rows = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] }, detail_scraped: true } },
        { $group: { _id: "$seller_name_canonical", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 }, gstin: { $first: "$seller_gst" }, state: { $first: "$seller_state" } } },
        { $sort: { gmv: -1 } }, { $limit: limit * 3 },
      ]).toArray()
      type R = { _id: string; gmv: number; count: number; gstin?: string; state?: string }
      return NextResponse.json({ rows: (rows as R[]).filter(r => !dealerNames.has(r._id)).slice(0, limit) })
    }

    // ── Departments by spend ───────────────────────────────────────────────────
    if (section === "depts_by_spend") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows = await gc.aggregate([
        { $match: { dept_name: { $nin: [null, ""] } } },
        { $group: { _id: "$dept_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 }, ministry: { $first: "$ministry" } } },
        { $sort: { gmv: -1 } }, { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Products by spend ──────────────────────────────────────────────────────
    if (section === "products_by_spend") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows = await gc.aggregate([
        { $match: { product_name: { $nin: [null, ""] } } },
        { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
        { $sort: { gmv: -1 } }, { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── States by spend ────────────────────────────────────────────────────────
    if (section === "states_by_spend") {
      const rows = await gc.aggregate([
        { $match: { seller_state: { $nin: [null, ""] } } },
        { $group: { _id: "$seller_state", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
        { $sort: { gmv: -1 } },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Seller profile ─────────────────────────────────────────────────────────
    if (section === "seller_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
      const contracts = await gc
        .find({ seller_name_canonical: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } })
        .sort({ contract_value_num: -1 }).limit(100).toArray()
      if (!contracts.length) return NextResponse.json({ error: "No contracts found for this seller" }, { status: 404 })

      const gmv   = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const depts = [...new Set(contracts.map(r => r.dept_name).filter(Boolean))]
      const prods = [...new Set(contracts.map(r => r.product_name).filter(Boolean))]
      const dealer = await db.collection("gem_dealers").findOne({ canonical_name: { $regex: `^${name}$`, $options: "i" } })

      const sample = contracts[0]
      return NextResponse.json({
        name: sample.seller_name_canonical,
        gmv, count: contracts.length,
        gstin:       sample.seller_gst,
        msme:        sample.seller_msme_category || sample.seller_msme,
        msme_number: sample.seller_msme_number,
        state:       sample.seller_state,
        phone:       sample.seller_phone,
        email:       sample.seller_email,
        address:     sample.seller_address,
        gem_id:      sample.seller_gem_id,
        selling_as:  sample.selling_as,
        gender_cat:  sample.seller_gender_category,
        departments: depts,
        products:    prods,
        in_gem_dealers: !!dealer,
        bid_wins:    dealer?.l1_wins || 0,
        contracts: contracts.map(c => ({
          gemc_no: c.gemc_no,
          dept_name: c.dept_name,
          product_name: c.product_name,
          contract_value_num: c.contract_value_num,
          first_seen: c.first_seen,
          contract_status: c.contract_status,
          quantity: c.quantity,
          state: c.state,
        })),
      })
    }

    // ── Department profile ─────────────────────────────────────────────────────
    if (section === "dept_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
      const contracts = await gc
        .find({ dept_name: name })
        .sort({ contract_value_num: -1 }).limit(100).toArray()
      if (!contracts.length) return NextResponse.json({ error: "No contracts found for this dept" }, { status: 404 })

      const gmv     = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const sellers = [...new Set(contracts.map(r => r.seller_name_canonical).filter(Boolean))]
      const prods   = [...new Set(contracts.map(r => r.product_name).filter(Boolean))]

      // Top sellers by gmv within this dept
      const sellerGmv: Record<string, number> = {}
      for (const c of contracts) {
        if (c.seller_name_canonical) sellerGmv[c.seller_name_canonical] = (sellerGmv[c.seller_name_canonical] || 0) + (c.contract_value_num || 0)
      }
      const topSellers = Object.entries(sellerGmv).sort((a, b) => b[1] - a[1]).slice(0, 10)

      const sample = contracts[0]
      return NextResponse.json({
        name, gmv, count: contracts.length,
        ministry: sample.ministry,
        org_type: sample.org_type,
        state: sample.state,
        sellers, products: prods,
        top_sellers: topSellers.map(([s, v]) => ({ name: s, gmv: v })),
        contracts: contracts.map(c => ({
          gemc_no: c.gemc_no,
          seller_name_canonical: c.seller_name_canonical,
          product_name: c.product_name,
          contract_value_num: c.contract_value_num,
          first_seen: c.first_seen,
          contract_status: c.contract_status,
          quantity: c.quantity,
        })),
      })
    }

    // ── Product profile ────────────────────────────────────────────────────────
    if (section === "product_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
      const contracts = await gc
        .find({ product_name: name })
        .sort({ contract_value_num: -1 }).limit(100).toArray()
      if (!contracts.length) return NextResponse.json({ error: "No contracts found for this product" }, { status: 404 })

      const gmv    = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const sellers = [...new Set(contracts.map(r => r.seller_name_canonical).filter(Boolean))]
      const depts  = [...new Set(contracts.map(r => r.dept_name).filter(Boolean))]
      const states = [...new Set(contracts.map(r => r.seller_state || r.state).filter(Boolean))]
      const rates  = contracts.map(r => r.unit_rate).filter(Boolean) as number[]

      return NextResponse.json({
        name, gmv, count: contracts.length,
        oem:         contracts[0]?.oem_name || contracts[0]?.oem_brand,
        brand:       contracts[0]?.oem_brand,
        avg_price:   rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
        min_price:   rates.length ? Math.min(...rates) : null,
        max_price:   rates.length ? Math.max(...rates) : null,
        sellers, departments: depts, states,
        contracts: contracts.map(c => ({
          gemc_no: c.gemc_no,
          seller_name_canonical: c.seller_name_canonical,
          dept_name: c.dept_name,
          contract_value_num: c.contract_value_num,
          first_seen: c.first_seen,
          contract_status: c.contract_status,
          quantity: c.quantity,
          unit_rate: c.unit_rate,
          seller_state: c.seller_state,
        })),
      })
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 })
  } catch (err) {
    console.error("contracts API error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
