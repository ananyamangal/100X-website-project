import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface AccreditationUpdate {
  logo?: string;
  order?: number;
  isActive?: boolean;
}

// PUT - Update a specific accreditation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid accreditation ID" }, { status: 400 });
    }

    const accreditationData: AccreditationUpdate = await request.json();
    const client = await clientPromise;
    const db = client.db();
    
    // Get the current accreditation to check if order is changing
    const currentAccreditation = await db.collection("accreditations").findOne({ _id: new ObjectId(id) });
    if (!currentAccreditation) {
      return NextResponse.json({ error: "Accreditation not found" }, { status: 404 });
    }
    
    const oldOrder = currentAccreditation.order !== undefined ? currentAccreditation.order : null;
    const newOrder = accreditationData.order !== undefined ? accreditationData.order : null;
    
    // If order is being changed, shift other accreditations accordingly
    if (oldOrder !== null && newOrder !== null && oldOrder !== newOrder) {
      if (newOrder < oldOrder) {
        // Moving up: shift accreditations between newOrder and oldOrder down by 1
        await db.collection("accreditations").updateMany(
          { 
            _id: { $ne: new ObjectId(id) },
            order: { $gte: newOrder, $lt: oldOrder }
          },
          { $inc: { order: 1 } }
        );
      } else {
        // Moving down: shift accreditations between oldOrder and newOrder up by 1
        await db.collection("accreditations").updateMany(
          { 
            _id: { $ne: new ObjectId(id) },
            order: { $gt: oldOrder, $lte: newOrder }
          },
          { $inc: { order: -1 } }
        );
      }
    }
    
    const updatedAt = new Date();
    const result = await db.collection("accreditations").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...accreditationData, updatedAt } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Accreditation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in PUT /api/admin/accreditations/[id]:", error);
    return NextResponse.json({ error: "Failed to update accreditation" }, { status: 500 });
  }
}

// DELETE - Delete a specific accreditation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid accreditation ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Get the accreditation to know its order before deleting
    const accreditation = await db.collection("accreditations").findOne({ _id: new ObjectId(id) });
    
    const result = await db.collection("accreditations").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Accreditation not found" }, { status: 404 });
    }
    
    // Shift accreditations after the deleted one down by 1
    if (accreditation && accreditation.order !== undefined) {
      await db.collection("accreditations").updateMany(
        { order: { $gt: accreditation.order } },
        { $inc: { order: -1 } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in DELETE /api/admin/accreditations/[id]:", error);
    return NextResponse.json({ error: "Failed to delete accreditation" }, { status: 500 });
  }
}

