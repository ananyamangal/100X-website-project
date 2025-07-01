import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Submission } from '@/lib/submissionModel';

export async function POST(request: NextRequest) {
  try {
    const data: Submission = await request.json();
    const { _id, ...submissionData } = data;
    const now = new Date().toISOString();
    const submission = { ...submissionData, createdAt: now };
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('submissions').insertOne(submission);
    return NextResponse.json({ ...submission, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const submissions = await db.collection('submissions').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(submissions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
} 