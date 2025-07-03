import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Product } from "@/lib/productModel";

// GET all products
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const products = await db.collection("products").find({}).toArray();
    return NextResponse.json(products);
  } catch (error) {
    console.error("❌ Error in GET /api/admin/products:", error);
    return NextResponse.json({ error: "Failed to fetch products", details: String(error) }, { status: 500 });
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    const productData: Product = await request.json();
    const now = new Date().toISOString();
    const newProduct = { ...productData, createdAt: now, updatedAt: now };
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").insertOne(newProduct);
    return NextResponse.json({ ...newProduct, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("❌ Error in POST /api/admin/products:", error);
    return NextResponse.json({ error: "Failed to create product", details: String(error) }, { status: 500 });
  }
}

// DELETE product by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in DELETE /api/admin/products/[id]:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

// PUT (Update) product by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const productData = await request.json();
    const updatedAt = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...productData, updatedAt } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in PUT /api/admin/products/[id]:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
