import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('video_popup').findOne({ key: 'video_popup' });
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
    return NextResponse.json({ youtubeUrl: '', orientation: 'portrait', enabled: true, delayMs: 5000, sessionOnce: true, showOnMobile: true, showOnDesktop: true, autoCloseMs: 0, hideOnPaths: [] });
  }
}
