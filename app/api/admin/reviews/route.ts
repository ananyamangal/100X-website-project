import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  const client = await clientPromise
  const reviews = await client.db().collection("reviews").find({}).sort({ order: 1, createdAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(reviews)))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const client = await clientPromise
  const doc = {
    ...body,
    isPublished: body.isPublished ?? true,
    rating: Number(body.rating) || 5,
    order: Number(body.order) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const result = await client.db().collection("reviews").insertOne(doc)
  return NextResponse.json({ _id: result.insertedId, ...doc })
}
