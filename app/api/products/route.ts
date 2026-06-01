import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  const client = await clientPromise
  const products = await client
    .db()
    .collection("products")
    .find({})
    .sort({ order: 1, createdAt: -1 })
    .toArray()

  const serialized = JSON.parse(JSON.stringify(products)).map((p: any) => ({
    ...p,
    imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
  }))

  return NextResponse.json(serialized)
}
