import { NextRequest, NextResponse, after } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Submission } from '@/lib/submissionModel';
import { sendAdminEmail, isEmailConfigured } from '@/lib/email';
import { buildLeadEmail, leadSubject } from '@/lib/lead-email';
import { sanitizeAttribution } from '@/lib/attribution-sanitize';
import { decoyId, isHoneypotFilled, logHoneypotDiscard, withoutHoneypot } from '@/lib/honeypot';

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

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const rest = withoutHoneypot(raw);
    if (isHoneypotFilled(raw)) {
      // Honeypot filled (lib/honeypot.ts): answer exactly like a saved submission
      // (201, the echoed document with createdAt and an _id) so the client proceeds
      // normally, but nothing is saved or e-mailed. One log line, no lead data.
      logHoneypotDiscard('/api/submissions', raw, request.headers.get('referer'));
      const { _id: _ignored, attribution: _attr, ...echo } = rest;
      return NextResponse.json({ ...echo, createdAt: new Date().toISOString(), _id: decoyId() }, { status: 201 });
    }

    const data = rest as unknown as Submission;
    const { _id, attribution: rawAttribution, ...submissionData } = data;
    const now = new Date().toISOString();
    // Additive: keep only whitelisted attribution keys (length-capped).
    const cleanAttribution = sanitizeAttribution(rawAttribution);
    const submission = {
      ...submissionData,
      ...(cleanAttribution ? { attribution: cleanAttribution } : {}),
      createdAt: now,
    };
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
