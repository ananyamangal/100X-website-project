import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const update = {
      ...body,
      quantity: body.quantity ? Number(body.quantity) : null,
      orderValue: body.orderValue ? Number(body.orderValue) : null,
      orderYear: body.orderYear ? Number(body.orderYear) : null,
      updatedAt: new Date().toISOString(),
    }
    delete update._id
    await db
      .collection("gov_past_performance")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: update })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db()
    await db.collection("gov_past_performance").deleteOne({ _id: new ObjectId(params.id) })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
