// TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER USE
// Read-only: returns current banner collection state from MongoDB.
// Requires ?t=<token> matching DIAG_TOKEN env var (or hard-coded fallback).
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t');
  const expected = process.env.DIAG_TOKEN ?? 'bv8x2k9mQzR4nT';
  if (t !== expected) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const client = await clientPromise;
  const db = client.db();
  const banners = await db.collection('banners')
    .find({})
    .sort({ order: 1 })
    .project({ _id: 1, desktopBannerImage: 1, image: 1, isActive: 1, order: 1, updatedAt: 1 })
    .toArray();
  return NextResponse.json(banners.map(b => ({
    _id: b._id.toString(),
    desktopBannerImage: b.desktopBannerImage ?? '',
    image: b.image ?? '',
    isActive: b.isActive,
    order: b.order,
    updatedAt: b.updatedAt,
  })));
}
