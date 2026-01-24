import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface CustomerUpdate {
  logo?: string;
  order?: number;
  isActive?: boolean;
}

// PUT - Update a specific customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const data: CustomerUpdate = await request.json();
    const client = await clientPromise;
    const db = client.db();
    
    const current = await db.collection("customers").findOne({ _id: new ObjectId(id) });
    if (!current) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    const oldOrder = current.order !== undefined ? current.order : null;
    const newOrder = data.order !== undefined ? data.order : null;
    
    if (oldOrder !== null && newOrder !== null && oldOrder !== newOrder) {
      if (newOrder < oldOrder) {
        await db.collection("customers").updateMany(
          { _id: { $ne: new ObjectId(id) }, order: { $gte: newOrder, $lt: oldOrder } },
          { $inc: { order: 1 } }
        );
      } else {
        await db.collection("customers").updateMany(
          { _id: { $ne: new ObjectId(id) }, order: { $gt: oldOrder, $lte: newOrder } },
          { $inc: { order: -1 } }
        );
      }
    }
    
    const result = await db.collection("customers").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/customers/[id]:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE - Delete a specific customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection("customers").findOne({ _id: new ObjectId(id) });
    const result = await db.collection("customers").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    if (doc && doc.order !== undefined) {
      await db.collection("customers").updateMany(
        { order: { $gt: doc.order } },
        { $inc: { order: -1 } }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/customers/[id]:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
