import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface BannerUpdate {
  image?: string;
  title?: string;
  subtitle?: string;
  order?: number;
  isActive?: boolean;
}

// PUT - Update a specific banner
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid banner ID" }, { status: 400 });
    }

    const bannerData: BannerUpdate = await request.json();
    const updatedAt = new Date();

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("banners").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...bannerData, updatedAt } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in PUT /api/admin/banners/[id]:", error);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

// DELETE - Delete a specific banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid banner ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("banners").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in DELETE /api/admin/banners/[id]:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
} 