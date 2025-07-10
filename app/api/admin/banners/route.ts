import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface Banner {
  _id?: string;
  image: string;
  title: string;
  subtitle: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BannerInput {
  image: string;
  title: string;
  subtitle: string;
  order?: number;
  isActive?: boolean;
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
    
    return NextResponse.json(banners);
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
    
    // Set default values
    const newBanner = {
      ...bannerData,
      isActive: bannerData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
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
    
    return NextResponse.json({
      ...newBanner,
      _id: result.insertedId
    });
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