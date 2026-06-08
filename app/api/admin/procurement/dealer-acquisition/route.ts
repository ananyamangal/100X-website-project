import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

const FOGGING_RE = /fog|fogger|thermal|ulv|mist|vector|sanitation|pest|mosquito|spray/i
const EXACT_FOG_RE = /fog|fogger|thermal fog|ulv/i

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const priorityFilter = searchParams.get("priority") || "all"
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
    const exportCsv = searchParams.get("export") === "csv"

    const db = (await clientPromise).db()

    // Step 1: dealer scores
    const dealerScores = await db.collection("gem_kg_dealer_scores").find({}).toArray()
    if (!dealerScores.length) {
      return NextResponse.json({ dealers: [], message: "Knowledge Graph not built yet" })
    }

    const maxGmv = Math.max(...dealerScores.map((d) => d.total_gmv || 0), 1)
    const maxStates = Math.max(...dealerScores.map((d) => d.state_count || 0), 1)
    const maxDepts = Math.max(...dealerScores.map((d) => d.dept_count || 0), 1)

    // Step 2: category fit per dealer from gem_kg_dealer_product
    const dealerProductRows = await db.collection("gem_kg_dealer_product").find({}, { projection: { dealer: 1, product: 1 } }).toArray()
    const dealerProductMap = new Map<string, string[]>()
    for (const row of dealerProductRows) {
      if (!row.dealer) continue
      const arr = dealerProductMap.get(row.dealer) || []
      if (row.product) arr.push(row.product)
      dealerProductMap.set(row.dealer, arr)
    }

    // Step 3: contact info per dealer from gem_contracts
    const contactRows = await db.collection("gem_contracts").aggregate([
      { $match: { seller_name_canonical: { $ne: null } } },
      { $sort: { contract_date_dt: -1 } },
      { $group: { _id: "$seller_name_canonical", seller_phone: { $first: "$seller_phone" }, seller_gst: { $first: "$seller_gst" }, seller_msme_category: { $first: "$seller_msme_category" }, seller_state: { $first: "$seller_state" } } },
    ]).toArray()
    const contactMap = new Map(contactRows.map((r) => [r._id, r]))

    // Step 4: top products/depts per dealer
    const dealerTopProducts = await db.collection("gem_kg_dealer_product").aggregate([
      { $sort: { total_gmv: -1 } },
      { $group: { _id: "$dealer", products: { $push: "$product" } } },
      { $project: { products: { $slice: ["$products", 3] } } },
    ]).toArray()
    const topProductsMap = new Map(dealerTopProducts.map((r) => [r._id, r.products]))

    const dealerTopDepts = await db.collection("gem_kg_dealer_dept").aggregate([
      { $sort: { total_gmv: -1 } },
      { $group: { _id: "$dealer", depts: { $push: "$dept" } } },
      { $project: { depts: { $slice: ["$depts", 3] } } },
    ]).toArray()
    const topDeptsMap = new Map(dealerTopDepts.map((r) => [r._id, r.depts]))

    // Compute scores
    const dealers = dealerScores.map((ds) => {
      const name: string = ds.dealer || ds._id?.toString() || ""
      const products = dealerProductMap.get(name) || []

      let category_fit = 5
      if (products.some((p) => EXACT_FOG_RE.test(p))) category_fit = 25
      else if (products.some((p) => FOGGING_RE.test(p))) category_fit = 15

      const contact = contactMap.get(name)
      const seller_phone = contact?.seller_phone || null
      const seller_gst = contact?.seller_gst || null
      const seller_msme_category = contact?.seller_msme_category || null
      const seller_state = contact?.seller_state || ds.seller_state || null

      const contact_score = (seller_phone ? 8 : 0) + (seller_gst ? 7 : 0) + (seller_msme_category ? 5 : 0)

      const total_gmv = ds.total_gmv || 0
      const total_contracts = ds.total_contracts || 0
      const dept_count = ds.dept_count || 0
      const state_count = ds.state_count || 0
      const product_count = ds.product_count || 0

      const gmv_score = (total_gmv / maxGmv) * 30
      const state_score = (state_count / maxStates) * 15
      const dept_score = (dept_count / maxDepts) * 10
      const total_score = Math.round(gmv_score + category_fit + contact_score + state_score + dept_score)

      const priority = total_score >= 65 ? "A" : total_score >= 40 ? "B" : "C"

      return {
        dealer: name,
        total_gmv,
        total_contracts,
        dept_count,
        state_count,
        product_count,
        category_fit,
        contact_score,
        gmv_score: Math.round(gmv_score * 10) / 10,
        total_score,
        priority,
        seller_phone,
        seller_gst,
        seller_msme_category,
        seller_state,
        products: topProductsMap.get(name) || [],
        departments: topDeptsMap.get(name) || [],
        score_breakdown: { gmv_score: Math.round(gmv_score), category_fit, contact_score, state_score: Math.round(state_score), dept_score: Math.round(dept_score) },
      }
    })

    const sorted = dealers.sort((a, b) => b.total_score - a.total_score)
    const filtered = priorityFilter === "all" ? sorted : sorted.filter((d) => d.priority === priorityFilter.toUpperCase())
    const sliced = filtered.slice(0, limit)

    if (exportCsv) {
      const rows = [
        "Dealer,Priority,Score,GMV,Contracts,Depts,States,Phone,GSTIN,MSME,State,Top Products,Top Departments",
        ...sliced.map((d) =>
          [
            `"${d.dealer}"`,
            d.priority,
            d.total_score,
            d.total_gmv,
            d.total_contracts,
            d.dept_count,
            d.state_count,
            d.seller_phone || "",
            d.seller_gst || "",
            d.seller_msme_category || "",
            d.seller_state || "",
            `"${(d.products || []).join("; ")}"`,
            `"${(d.departments || []).join("; ")}"`,
          ].join(",")
        ),
      ].join("\n")

      return new Response(rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="dealer-acquisition.csv"',
        },
      })
    }

    return NextResponse.json({ dealers: sliced, total: filtered.length })
  } catch (err) {
    console.error("dealer-acquisition error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
