import { NextRequest, NextResponse, after } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Submission } from '@/lib/submissionModel';
import { sendAdminEmail, isEmailConfigured } from '@/lib/email';
import { buildLeadEmail, leadSubject } from '@/lib/lead-email';

// This route is shared by several different forms (OEM partner apply, quote
// modal, dealer program, contact section, landing pages) with different field
// shapes, so the e-mail is built from EVERY field of the saved document
// (lib/lead-email.ts) instead of a fixed list that silently drops the rest.
async function notifyNewSubmission(submission: Record<string, unknown>, id: string) {
  const { text, html } = buildLeadEmail({
    title: 'New website lead',
    intro: 'Submitted through a form on www.100xcircle.com.',
    record: submission,
    id,
  });
  const replyTo = typeof submission.email === 'string' && submission.email.includes('@') ? submission.email : undefined;
  const result = await sendAdminEmail({ subject: leadSubject('New lead', submission), text, html, replyTo });
  if (!result.ok) {
    // lib/email already logged the detail; this line ties it to the saved row (no lead data).
    console.error(`[api/submissions] admin e-mail not sent for submission ${id}: ${result.reason}`);
  }
}

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
    const id = String(result.insertedId);

    // after(): the response goes out immediately, but the platform keeps the
    // function alive until the e-mail has actually been sent (the old
    // fire-and-forget promise could be cut off when the function froze).
    // A send failure never fails the submission; it is logged without lead data.
    after(async () => {
      try {
        if (!isEmailConfigured()) {
          console.error(`[api/submissions] admin e-mail not sent for submission ${id}: EMAIL_USER / EMAIL_APP_PASSWORD not configured`);
          return;
        }
        await notifyNewSubmission(submission, id);
      } catch (err) {
        console.error(`[api/submissions] admin e-mail failed for submission ${id}:`, err instanceof Error ? err.message.split('\n')[0] : String(err));
      }
    });

    return NextResponse.json({ ...submission, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('[api/submissions] POST failed', error);
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
