import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// GET - Public: fetch the video popup YouTube URL for the site
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('video_popup').findOne({ key: 'video_popup' });
    return NextResponse.json({ youtubeUrl: doc?.youtubeUrl ?? null });
  } catch (error) {
    console.error('Error fetching video popup:', error);
    return NextResponse.json({ youtubeUrl: null });
  }
}
