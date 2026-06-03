import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const badges = await db.collection('trust_badges').find({}).sort({ order: 1 }).toArray();
    return NextResponse.json(badges);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trust badges' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await request.json();
    const max = await db.collection('trust_badges').find({}).sort({ order: -1 }).limit(1).toArray();
    const badge = {
      label: body.label || '',
      icon: body.icon || '✓',
      description: body.description || '',
      isActive: body.isActive ?? true,
      order: max.length > 0 ? max[0].order + 1 : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('trust_badges').insertOne(badge);
    return NextResponse.json({ ...badge, _id: result.insertedId });
  } catch {
    return NextResponse.json({ error: 'Failed to create trust badge' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await request.json();
    const { _id, ...rest } = body;
    await db.collection('trust_badges').updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...rest, updatedAt: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update trust badge' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.collection('trust_badges').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete trust badge' }, { status: 500 });
  }
}
