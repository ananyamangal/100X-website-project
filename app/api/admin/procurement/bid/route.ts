import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// GET /api/admin/procurement/bid?bid_number=GEM/...
export async function GET(req: NextRequest) {
  const bidNumber = req.nextUrl.searchParams.get("bid_number")
  if (!bidNumber) return NextResponse.json({ error: "bid_number required" }, { status: 400 })

  const db = (await clientPromise).db()
  const bid = await db.collection("gem_awarded_bids").findOne({ bid_number: bidNumber })
  if (!bid) return NextResponse.json({ error: "not found" }, { status: 404 })

  return NextResponse.json(JSON.parse(JSON.stringify(bid)))
}
