import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Product } from "@/lib/productModel";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const product = await db.collection("products").findOne({ _id: new ObjectId(params.id) });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productData: Product = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: { ...productData, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result.value) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.value);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").deleteOne({ _id: new ObjectId(params.id) });
    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
} 