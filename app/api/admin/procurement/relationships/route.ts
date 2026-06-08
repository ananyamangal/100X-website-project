import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as "dealer" | "dept" | "product" | null
    const name = searchParams.get("name")

    const db = (await clientPromise).db()

    // No name param — return explore overview
    if (!name || !type) {
      const [topDealers, topDepts, topProducts] = await Promise.all([
        db.collection("gem_kg_dealer_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dept_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_product_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
      ])
      return NextResponse.json({ top_dealers: topDealers, top_depts: topDepts, top_products: topProducts })
    }

    const gc = db.collection("gem_contracts")

    if (type === "dealer") {
      const [products, depts, states, recentContracts] = await Promise.all([
        db.collection("gem_kg_dealer_product").find({ dealer: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_dept").find({ dealer: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_state").find({ dealer: name }).toArray(),
        gc.find({ seller_name_canonical: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
      ])
      const total_gmv = products.reduce((s, p) => s + (p.total_gmv || 0), 0)
      const total_contracts = recentContracts.length
      return NextResponse.json({ type, name, products, depts, states, recent_contracts: recentContracts, total_gmv, total_contracts })
    }

    if (type === "dept") {
      const [dealers, products, recentContracts] = await Promise.all([
        db.collection("gem_kg_dealer_dept").find({ dept: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dept_product").find({ dept: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        gc.find({ dept_name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
      ])
      const total_gmv = dealers.reduce((s, d) => s + (d.total_gmv || 0), 0)
      const total_contracts = dealers.reduce((s, d) => s + (d.total_contracts || 0), 0)
      return NextResponse.json({ type, name, dealers, products, recent_contracts: recentContracts, total_gmv, total_contracts })
    }

    if (type === "product") {
      const [depts, dealers, recentContracts] = await Promise.all([
        db.collection("gem_kg_dept_product").find({ product: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_product").find({ product: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        gc.find({ product_name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
      ])
      const total_gmv = depts.reduce((s, d) => s + (d.total_gmv || 0), 0)
      const total_contracts = depts.reduce((s, d) => s + (d.total_contracts || 0), 0)
      return NextResponse.json({ type, name, depts, dealers, recent_contracts: recentContracts, total_gmv, total_contracts })
    }

    return NextResponse.json({ error: "Invalid type. Must be dealer, dept, or product" }, { status: 400 })
  } catch (err) {
    console.error("relationships error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
