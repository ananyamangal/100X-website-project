import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const dealerCol = db.collection("gem_dealers")

    const dealers = await dealerCol
      .find({})
      .sort({ l1_wins: -1 })
      .toArray()

    const result = dealers.map(d => ({
      name: d.canonical_name as string,
      l1_wins: (d.l1_wins as number) ?? 0,
      l2_count: (d.l2_count as number) ?? 0,
      l3_count: (d.l3_count as number) ?? 0,
      departments: (d.departments as string[]) ?? [],
      states: (d.states as string[]) ?? [],
      bid_count: ((d.bids as string[]) ?? []).length,
      is_100x_dealer: (d.is_100x_dealer as boolean) ?? false,
      aliases: ((d.aliases as string[]) ?? []).slice(0, 3),
    }))

    return NextResponse.json(JSON.parse(JSON.stringify({ dealers: result })))
  } catch (err) {
    console.error("procurement/dealers GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.canonical_name)
      return NextResponse.json({ error: "canonical_name required" }, { status: 400 })

    const db = (await clientPromise).db()
    const result = await db.collection("gem_dealers").updateOne(
      { canonical_name: body.canonical_name },
      { $set: { is_100x_dealer: !!body.is_100x_dealer, updated_at: new Date() } }
    )

    return NextResponse.json({ ok: true, modified: result.modifiedCount > 0 })
  } catch (err) {
    console.error("procurement/dealers POST error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
