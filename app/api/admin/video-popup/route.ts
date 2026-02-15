import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'video_popup';

// PUT - Set the video popup YouTube URL and orientation (portrait | landscape)
export async function PUT(request: NextRequest) {
  try {
    const { youtubeUrl, orientation } = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const value = orientation === 'landscape' ? 'landscape' : 'portrait';
    await db.collection('video_popup').updateOne(
      { key: KEY },
      { $set: { youtubeUrl: youtubeUrl || '', orientation: value, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ youtubeUrl: youtubeUrl || '', orientation: value });
  } catch (error) {
    console.error('Error saving video popup:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
