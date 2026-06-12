import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface Banner {
  _id?: string;
  // Legacy single-image field — kept on writes (mirrors desktopBannerImage)
  // so any older client/component that still reads `image` keeps working.
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
  // Focal point per device (percent 0..100, default 50). Drives object-position.
  desktopFocalX?: number;
  desktopFocalY?: number;
  tabletFocalX?: number;
  tabletFocalY?: number;
  mobileFocalX?: number;
  mobileFocalY?: number;
  // Hero content layer controls (per slide)
  overlayOpacity?: number;            // 0..1, default 0.4
  textAlign?: "left" | "center" | "right"; // default "left"
  contentWidth?: "narrow" | "medium" | "wide"; // default "medium"
  order: number;
  isActive: boolean;
  slideshowInterval?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BannerInput {
  // Either legacy `image` (back-compat) or the new device-specific fields.
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

// Read shim — applied on GET so legacy records render correctly on the
// frontend without a DB migration. Promotes the legacy `image` field into
// desktopBannerImage when the latter is absent, and defaults the per-device
// enable flags to the slide-level isActive.
function normalizeBanner(raw: any) {
  const desktopBannerImage = raw?.desktopBannerImage || raw?.image || '';
  const tabletBannerImage = raw?.tabletBannerImage ?? '';
  const mobileBannerImage = raw?.mobileBannerImage ?? '';
  return {
    ...raw,
    image: raw?.image ?? desktopBannerImage,
    desktopBannerImage,
    tabletBannerImage,
    mobileBannerImage,
    desktopBannerAlt: raw?.desktopBannerAlt ?? '',
    tabletBannerAlt: raw?.tabletBannerAlt ?? '',
    mobileBannerAlt: raw?.mobileBannerAlt ?? '',
    desktopBannerEnabled: raw?.desktopBannerEnabled ?? raw?.isActive ?? true,
    tabletBannerEnabled: raw?.tabletBannerEnabled ?? raw?.isActive ?? true,
    mobileBannerEnabled: raw?.mobileBannerEnabled ?? raw?.isActive ?? true,
    desktopFocalX: typeof raw?.desktopFocalX === 'number' ? raw.desktopFocalX : 50,
    desktopFocalY: typeof raw?.desktopFocalY === 'number' ? raw.desktopFocalY : 50,
    tabletFocalX: typeof raw?.tabletFocalX === 'number' ? raw.tabletFocalX : 50,
    tabletFocalY: typeof raw?.tabletFocalY === 'number' ? raw.tabletFocalY : 50,
    mobileFocalX: typeof raw?.mobileFocalX === 'number' ? raw.mobileFocalX : 50,
    mobileFocalY: typeof raw?.mobileFocalY === 'number' ? raw.mobileFocalY : 50,
    overlayOpacity: typeof raw?.overlayOpacity === 'number' ? raw.overlayOpacity : 0.4,
    textAlign: raw?.textAlign ?? 'left',
    contentWidth: raw?.contentWidth ?? 'medium',
  };
}

// Write shim — when admin saves only the new fields, mirror desktopBannerImage
// into the legacy `image` field so any other reader sees a coherent record.
function applyWriteDefaults(input: BannerInput) {
  const desktopBannerImage = input.desktopBannerImage || input.image || '';
  return {
    ...input,
    image: desktopBannerImage,
    desktopBannerImage,
    tabletBannerImage: input.tabletBannerImage ?? '',
    mobileBannerImage: input.mobileBannerImage ?? '',
    desktopBannerAlt: input.desktopBannerAlt ?? '',
    tabletBannerAlt: input.tabletBannerAlt ?? '',
    mobileBannerAlt: input.mobileBannerAlt ?? '',
    desktopBannerEnabled: input.desktopBannerEnabled ?? true,
    tabletBannerEnabled: input.tabletBannerEnabled ?? true,
    mobileBannerEnabled: input.mobileBannerEnabled ?? true,
    desktopFocalX: input.desktopFocalX ?? 50,
    desktopFocalY: input.desktopFocalY ?? 50,
    tabletFocalX: input.tabletFocalX ?? 50,
    tabletFocalY: input.tabletFocalY ?? 50,
    mobileFocalX: input.mobileFocalX ?? 50,
    mobileFocalY: input.mobileFocalY ?? 50,
    overlayOpacity: input.overlayOpacity ?? 0.4,
    textAlign: input.textAlign ?? 'left',
    contentWidth: input.contentWidth ?? 'medium',
  };
}

// GET - Fetch all banners
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const banners = await db.collection('banners')
      .find({})
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json(banners.map(normalizeBanner));
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

// POST - Create a new banner
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const bannerData: BannerInput = await request.json();

    const normalized = applyWriteDefaults(bannerData);

    // Set default values
    const newBanner: any = {
      ...normalized,
      isActive: bannerData.isActive ?? true,
      slideshowInterval: bannerData.slideshowInterval ?? 4000, // Default 4 seconds
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If no order is specified, set it to the next available order
    if (!newBanner.order) {
      const maxOrderBanner = await db.collection('banners')
        .find({})
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      newBanner.order = maxOrderBanner.length > 0 ? maxOrderBanner[0].order + 1 : 1;
    }

    const result = await db.collection('banners').insertOne(newBanner);

    return NextResponse.json(normalizeBanner({
      ...newBanner,
      _id: result.insertedId,
    }));
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}

// PUT - Update banner order
export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { banners } = await request.json();

    // Update all banners with their new order
    const updatePromises = banners.map((banner: Banner) =>
      db.collection('banners').updateOne(
        { _id: new ObjectId(banner._id) },
        {
          $set: {
            order: banner.order,
            updatedAt: new Date()
          }
        }
      )
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Banner order updated successfully' });
  } catch (error) {
    console.error('Error updating banner order:', error);
    return NextResponse.json({ error: 'Failed to update banner order' }, { status: 500 });
  }
}
