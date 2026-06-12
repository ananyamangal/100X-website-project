// TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER USE
// GET  — read all banners
// PUT  — test write: sets _diagTestAt on a banner by _id, returns modifiedCount + read-back
// Both require ?t=<token>. No auth cookie needed (outside /api/admin/ middleware matcher).
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const TOKEN = process.env.DIAG_TOKEN ?? 'bv8x2k9mQzR4nT';

function auth(request: NextRequest) {
  return request.nextUrl.searchParams.get('t') === TOKEN;
}

export async function GET(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

// Test write: PUT ?t=<token> body={id:"<bannerId>"}
// Sets _diagTestAt timestamp on the banner, reads back, cleans up the test field.
export async function PUT(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { id } = await request.json();
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const client = await clientPromise;
  const db = client.db();
  const oid = new ObjectId(id);

  // Snapshot the "before" state
  const before = await db.collection('banners').findOne(
    { _id: oid },
    { projection: { _id: 1, desktopBannerImage: 1, image: 1, updatedAt: 1 } }
  );
  if (!before) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });

  // Write a test field (does not affect displayed image)
  const testTs = new Date();
  const result = await db.collection('banners').updateOne(
    { _id: oid },
    { $set: { _diagTestAt: testTs } }
  );

  // Read-back verification
  const after = await db.collection('banners').findOne(
    { _id: oid },
    { projection: { _id: 1, desktopBannerImage: 1, image: 1, updatedAt: 1, _diagTestAt: 1 } }
  );

  // Clean up the test field so it doesn't linger
  await db.collection('banners').updateOne({ _id: oid }, { $unset: { _diagTestAt: '' } });

  return NextResponse.json({
    bannerId:      id,
    modifiedCount: result.modifiedCount,
    matchedCount:  result.matchedCount,
    before: {
      desktopBannerImage: before.desktopBannerImage ?? '',
      image:              before.image ?? '',
      updatedAt:          before.updatedAt,
    },
    after: {
      desktopBannerImage: after?.desktopBannerImage ?? '',
      image:              after?.image ?? '',
      _diagTestAt:        after?._diagTestAt,
    },
    writeVerified: after?._diagTestAt?.getTime() === testTs.getTime(),
  });
}
