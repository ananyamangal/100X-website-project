import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'video_popup';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('video_popup').findOne({ key: KEY });
    return NextResponse.json({
      youtubeUrl: doc?.youtubeUrl ?? '',
      orientation: doc?.orientation === 'landscape' ? 'landscape' : 'portrait',
      enabled: doc?.enabled !== false,
      delayMs: typeof doc?.delayMs === 'number' ? doc.delayMs : 5000,
      sessionOnce: doc?.sessionOnce !== false,
      showOnMobile: doc?.showOnMobile !== false,
      showOnDesktop: doc?.showOnDesktop !== false,
      autoCloseMs: typeof doc?.autoCloseMs === 'number' ? doc.autoCloseMs : 0,
      hideOnPaths: Array.isArray(doc?.hideOnPaths) ? doc.hideOnPaths : [],
    });
  } catch {
    return NextResponse.json({ youtubeUrl: '', orientation: 'portrait', enabled: true, delayMs: 5000 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const update = {
      youtubeUrl: body.youtubeUrl || '',
      orientation: body.orientation === 'landscape' ? 'landscape' : 'portrait',
      enabled: body.enabled !== false,
      delayMs: typeof body.delayMs === 'number' ? Math.max(0, body.delayMs) : 5000,
      sessionOnce: body.sessionOnce !== false,
      showOnMobile: body.showOnMobile !== false,
      showOnDesktop: body.showOnDesktop !== false,
      autoCloseMs: typeof body.autoCloseMs === 'number' ? Math.max(0, body.autoCloseMs) : 0,
      hideOnPaths: Array.isArray(body.hideOnPaths) ? body.hideOnPaths : [],
      updatedAt: new Date(),
    };
    await db.collection('video_popup').updateOne({ key: KEY }, { $set: update }, { upsert: true });
    return NextResponse.json(update);
  } catch (error) {
    console.error('Error saving video popup:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
