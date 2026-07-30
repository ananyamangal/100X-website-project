import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Submission } from '@/lib/submissionModel';
import { sendAdminEmail, isEmailConfigured } from '@/lib/email';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:180px">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(display)}</td></tr>`;
}

// This route is shared by several different forms (OEM partner apply, quote
// modal, dealer program, contact section, landing pages) with slightly
// different field shapes -- so every field here is optional and skipped in
// the email if absent, rather than assuming one fixed schema.
function notifyNewSubmission(submission: Record<string, unknown>) {
  const name = typeof submission.name === 'string' ? submission.name : undefined;
  const company = typeof submission.company === 'string' ? submission.company : undefined;
  const mobile = typeof submission.mobile === 'string' ? submission.mobile
    : typeof submission.phone === 'string' ? submission.phone : undefined;
  const email = typeof submission.email === 'string' ? submission.email : undefined;
  const state = typeof submission.state === 'string' ? submission.state : undefined;
  const intent = typeof submission.intent === 'string' ? submission.intent : undefined;
  const type = typeof submission.type === 'string' ? submission.type : undefined;
  const source = typeof submission.source === 'string' ? submission.source : undefined;

  const subject = `New submission — ${name ?? 'website lead'}${company ? ` (${company})` : ''}`;
  const text = [
    'New submission from the 100x Circle website',
    '',
    name ? `Name:     ${name}` : '',
    company ? `Company:  ${company}` : '',
    mobile ? `Mobile:   ${mobile}` : '',
    email ? `Email:    ${email}` : '',
    state ? `State:    ${state}` : '',
    intent ? `Intent:   ${intent}` : '',
    type ? `Type:     ${type}` : '',
    source ? `Source:   ${source}` : '',
  ].filter(Boolean).join('\n');
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px">
      <h2 style="color:#16a34a;margin:0 0 16px">New Website Submission</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;font-size:14px;color:#111827">
        ${row('Name', name)}
        ${row('Company', company)}
        ${row('Mobile', mobile)}
        ${row('Email', email)}
        ${row('State', state)}
        ${row('Intent', intent)}
        ${row('Type', type)}
        ${row('Source', source)}
      </table>
    </div>
  `;

  // Best-effort, non-blocking: the caller has already gotten a 201 response
  // by the time this resolves. Never let an email failure surface to the
  // client or delay the submission being saved.
  sendAdminEmail({ subject, text, html, replyTo: email }).catch(() => {});
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

    if (isEmailConfigured()) {
      notifyNewSubmission(submission);
    }

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