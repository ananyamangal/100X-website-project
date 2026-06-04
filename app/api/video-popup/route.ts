import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Video popup config rarely changes — cache for 10 minutes at the CDN edge.
export const revalidate = 600

export async function GET() {
  // TEST_MODE: bypass MongoDB for local popup behavior testing
  if (process.env.POPUP_TEST_MODE === "1") {
    return NextResponse.json({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', orientation: 'landscape', enabled: true, delayMs: 300, sessionOnce: false, showOnMobile: true, showOnDesktop: true, autoCloseMs: 0, hideOnPaths: [] });
  }
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
