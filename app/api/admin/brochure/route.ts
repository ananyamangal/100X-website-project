import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'main';

// GET - Admin: fetch main brochure URL for editing
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('brochure').findOne({ key: KEY });
    const mainBrochureUrl = doc?.mainBrochureUrl ?? '';
    return NextResponse.json({ mainBrochureUrl });
  } catch (error) {
    console.error('Error fetching brochure:', error);
    return NextResponse.json({ mainBrochureUrl: '' }, { status: 500 });
  }
}

// PUT - Admin: update main brochure URL
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const mainBrochureUrl = typeof body.mainBrochureUrl === 'string' ? body.mainBrochureUrl : '';
    const client = await clientPromise;
    const db = client.db();
    await db.collection('brochure').updateOne(
      { key: KEY },
      { $set: { key: KEY, mainBrochureUrl, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving brochure:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
