import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const db = (await clientPromise).db()
    const col = db.collection("gem_procurement_alerts")

    if (searchParams.get("mark_read") === "all") {
      await col.updateMany({ read: { $ne: true } }, { $set: { read: true } })
    }

    const alerts = await col.find({}).sort({ created_at: -1 }).limit(50).project({ _id: 1, type: 1, title: 1, description: 1, severity: 1, data: 1, created_at: 1, read: 1 }).toArray()
    const unread_count = await col.countDocuments({ read: { $ne: true } })

    const mapped = alerts.map((a) => ({ ...a, _id: a._id.toString() }))
    return NextResponse.json({ alerts: mapped, unread_count })
  } catch (err) {
    console.error("alerts GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, read } = body
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const db = (await clientPromise).db()
    const col = db.collection("gem_procurement_alerts")
    await col.updateOne({ _id: new ObjectId(id) }, { $set: { read: !!read } })

    const unread_count = await col.countDocuments({ read: { $ne: true } })
    return NextResponse.json({ success: true, unread_count })
  } catch (err) {
    console.error("alerts PATCH error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
