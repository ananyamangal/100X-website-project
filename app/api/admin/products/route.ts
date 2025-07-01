import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Product } from "@/lib/productModel"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const products = await db.collection("products").find({}).toArray()
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const productData: Product = await request.json()
    const now = new Date().toISOString()
    const newProduct = {
      ...productData,
      createdAt: now,
      updatedAt: now,
    }
    const client = await clientPromise
    const db = client.db()
    const result = await db.collection("products").insertOne(newProduct)
    return NextResponse.json({ ...newProduct, _id: result.insertedId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
