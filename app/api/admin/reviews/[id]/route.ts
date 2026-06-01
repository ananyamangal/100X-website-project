import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const client = await clientPromise
  const { _id, ...update } = body
  update.updatedAt = new Date().toISOString()
  update.rating = Number(update.rating) || 5
  update.order = Number(update.order) || 0
  await client.db().collection("reviews").updateOne(
    { _id: new ObjectId(params.id) },
    { $set: update }
  )
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await clientPromise
  await client.db().collection("reviews").deleteOne({ _id: new ObjectId(params.id) })
  return NextResponse.json({ success: true })
}
