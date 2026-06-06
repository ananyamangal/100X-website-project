import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

function canonicalize(name: string | null): string {
  if (!name) return ""
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim()
}

// GET /api/admin/procurement/dealer?name=CANONICAL_NAME
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const db = (await clientPromise).db()
  const dealerCol = db.collection("gem_dealers")
  const bidCol    = db.collection("gem_awarded_bids")

  const dealer = await dealerCol.findOne({ canonical_name: name })
  if (!dealer) return NextResponse.json({ error: "not found" }, { status: 404 })

  const bidNumbers = (dealer.bids as string[]) ?? []
  const bids = bidNumbers.length > 0
    ? await bidCol.find({ bid_number: { $in: bidNumbers } }).sort({ updated_at: -1 }).toArray()
    : []

  // Determine rank for each bid using canonicalization
  const bidDetails = bids.map(b => {
    const c1 = canonicalize(b.l1_name as string)
    const c2 = canonicalize(b.l2_name as string)
    const c3 = canonicalize(b.l3_name as string)
    const rank = c1 === name ? "L1" : c2 === name ? "L2" : c3 === name ? "L3" : "—"
    return {
      bid_number: b.bid_number,
      page_id: b.page_id ?? null,
      dept: b.dept,
      state: b.state,
      keyword: b.keyword,
      variant: b.variant,
      l1_name: b.l1_name,
      l2_name: b.l2_name,
      l3_name: b.l3_name,
      l1_price: b.l1_price,
      est_value: b.est_value,
      updated_at: b.updated_at,
      rank,
    }
  })

  const deptCount  = ((dealer.departments as string[]) ?? []).length
  const stateCount = ((dealer.states as string[]) ?? []).length
  const l1_wins    = (dealer.l1_wins as number) ?? 0
  const authScore  = l1_wins * 3 + deptCount * 2 + stateCount

  const sortedDates = bids.map(b => b.updated_at).filter(Boolean).sort() as string[]

  return NextResponse.json(JSON.parse(JSON.stringify({
    name: dealer.canonical_name,
    aliases: (dealer.aliases as string[]) ?? [],
    l1_wins,
    l2_count: (dealer.l2_count as number) ?? 0,
    l3_count: (dealer.l3_count as number) ?? 0,
    departments: (dealer.departments as string[]) ?? [],
    states: (dealer.states as string[]) ?? [],
    is_100x_dealer: (dealer.is_100x_dealer as boolean) ?? false,
    crm_contacted: (dealer.crm_contacted as boolean) ?? false,
    crm_notes: (dealer.crm_notes as string) ?? "",
    crm_follow_up: (dealer.crm_follow_up as string) ?? "",
    contacted_at: dealer.contacted_at ?? null,
    auth_score: authScore,
    first_bid_date: sortedDates[0] ?? null,
    last_bid_date: sortedDates[sortedDates.length - 1] ?? null,
    bid_count: bids.length,
    bids: bidDetails,
  })))
}

// PATCH /api/admin/procurement/dealer — CRM update
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  if (!body.canonical_name)
    return NextResponse.json({ error: "canonical_name required" }, { status: 400 })

  const db = (await clientPromise).db()
  const update: Record<string, unknown> = { updated_at: new Date() }

  if (body.is_100x_dealer !== undefined) update.is_100x_dealer = !!body.is_100x_dealer
  if (body.crm_contacted !== undefined) {
    update.crm_contacted = !!body.crm_contacted
    if (body.crm_contacted && !body.already_contacted) update.contacted_at = new Date()
  }
  if (body.crm_notes    !== undefined) update.crm_notes    = String(body.crm_notes)
  if (body.crm_follow_up !== undefined) update.crm_follow_up = String(body.crm_follow_up)

  const result = await db.collection("gem_dealers").updateOne(
    { canonical_name: body.canonical_name },
    { $set: update }
  )

  return NextResponse.json({ ok: true, modified: result.modifiedCount > 0 })
}
