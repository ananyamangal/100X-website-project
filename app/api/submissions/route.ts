import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Submission } from '@/lib/submissionModel';

function stripBotFields(body: Record<string, unknown>): { rest: Record<string, unknown>; honeypot: boolean } {
  const {
    website,
    company_website: companyWebsite,
    hp,
    url: urlHp,
    ...rest
  } = body;
  const honeypot =
    (typeof website === 'string' && website.trim() !== '') ||
    (typeof companyWebsite === 'string' && companyWebsite.trim() !== '') ||
    (typeof hp === 'string' && hp.trim() !== '') ||
    (typeof urlHp === 'string' && urlHp.trim() !== '');
  return { rest, honeypot };
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const { rest, honeypot } = stripBotFields(raw);
    if (honeypot) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const data = rest as unknown as Submission;
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