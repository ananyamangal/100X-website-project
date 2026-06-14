import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import {
  buildAllBuyerSellerPairs,
  buildIncrementalBuyerSellerPairs,
} from "@/lib/gem/contract-analytics-builder"

export const maxDuration = 60

// POST — rebuild / refresh
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const { action } = await req.json() as { action?: string }
    if (action !== "rebuild_pairs" && action !== "refresh_pairs") {
      return NextResponse.json(
        { error: "action must be 'rebuild_pairs' or 'refresh_pairs'" },
        { status: 400 },
      )
    }

    const db     = (await clientPromise).db()
    const result = action === "rebuild_pairs"
      ? await buildAllBuyerSellerPairs(db)
      : await buildIncrementalBuyerSellerPairs(db)

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error("contract-analytics POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
