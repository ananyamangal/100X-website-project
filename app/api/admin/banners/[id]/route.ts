import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface BannerUpdate {
  image?: string;
  desktopBannerImage?: string;
  tabletBannerImage?: string;
  mobileBannerImage?: string;
  desktopBannerAlt?: string;
  tabletBannerAlt?: string;
  mobileBannerAlt?: string;
  desktopBannerEnabled?: boolean;
  tabletBannerEnabled?: boolean;
  mobileBannerEnabled?: boolean;
  desktopFocalX?: number;
  desktopFocalY?: number;
  tabletFocalX?: number;
  tabletFocalY?: number;
  mobileFocalX?: number;
  mobileFocalY?: number;
  overlayOpacity?: number;
  textAlign?: "left" | "center" | "right";
  contentWidth?: "narrow" | "medium" | "wide";
  order?: number;
  isActive?: boolean;
  slideshowInterval?: number;
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

    // Strip client-sent fields that must never enter a MongoDB $set:
    //   _id  — immutable; MongoDB throws ImmutableField if included
    //   id   — client-side alias, not a real document field
    //   createdAt — set once at creation; never overwrite
    const { _id: _1, id: _2, createdAt: _3, ...safeBannerData } = bannerData as any;

    // Mirror desktopBannerImage into the legacy `image` field so any reader
    // that still references `image` stays in sync.
    const writePayload: Record<string, any> = { ...safeBannerData, updatedAt };
    if (safeBannerData.desktopBannerImage !== undefined) {
      writePayload.image = safeBannerData.desktopBannerImage;
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("banners").updateOne(
      { _id: new ObjectId(id) },
      { $set: writePayload }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    // Read-back verification: prove the write actually persisted in Mongo.
    const verified = await db.collection("banners").findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      banner: {
        _id:                verified?._id?.toString(),
        desktopBannerImage: verified?.desktopBannerImage ?? "",
        image:              verified?.image ?? "",
        updatedAt:          verified?.updatedAt,
      },
    });
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