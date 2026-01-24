import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Product } from "@/lib/productModel";
import { ObjectId } from "mongodb";

// GET all products
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const products = await db.collection("products")
      .find({})
      .sort({ order: 1, createdAt: -1 }) // Sort by order first, then by creation date
      .toArray();
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
    const client = await clientPromise;
    const db = client.db();
    
    // Determine the order for the new product
    let order: number;
    if (productData.order !== undefined && productData.order !== null) {
      // If order is specified, shift all products with order >= specified order up by 1
      order = productData.order;
      await db.collection("products").updateMany(
        { order: { $gte: order } },
        { $inc: { order: 1 } }
      );
    } else {
      // If no order specified, find the minimum order and set new product to order - 1 (top)
      const minOrderProduct = await db.collection("products")
        .find({})
        .sort({ order: 1 })
        .limit(1)
        .toArray();
      
      if (minOrderProduct.length > 0 && minOrderProduct[0].order !== undefined) {
        order = minOrderProduct[0].order - 1;
      } else {
        order = 0; // First product gets order 0
      }
    }
    
    const newProduct = { ...productData, order, createdAt: now, updatedAt: now };
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
