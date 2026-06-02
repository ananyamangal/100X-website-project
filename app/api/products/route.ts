import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { normalizeProducts } from "@/lib/normalizeProduct"

export async function GET() {
  const client = await clientPromise
  const products = await client
    .db()
    .collection("products")
    .find({})
    .sort({ order: 1, createdAt: -1 })
    .toArray()

  return NextResponse.json(normalizeProducts(JSON.parse(JSON.stringify(products))))
}
