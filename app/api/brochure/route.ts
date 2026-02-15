import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'main';

// GET - Public: fetch main website brochure URL
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('brochure').findOne({ key: KEY });
    const mainBrochureUrl = doc?.mainBrochureUrl ?? null;
    return NextResponse.json({ mainBrochureUrl });
  } catch (error) {
    console.error('Error fetching brochure:', error);
    return NextResponse.json({ mainBrochureUrl: null });
  }
}
