import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Product } from "@/lib/productModel";

export async function GET(request: NextRequest, context: { params?: { id?: string } }) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ensure imageUrls is always an array
    let imageUrls = [];
    if (Array.isArray(product.imageUrls)) {
      imageUrls = product.imageUrls;
    } else if (typeof product.imageUrls === 'string') {
      imageUrls = product.imageUrls.split(/\r?\n/).map((url: string) => url.trim()).filter((url: string) => url);
    } else if (product.imageUrl) {
      imageUrls = [product.imageUrl];
    } else if (product.image) {
      imageUrls = [product.image];
    }
    product.imageUrls = imageUrls;

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    const productData: Product = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...productData, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result || !result.value) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.value);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    if (!result || result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
} 