// Email template system.
// Default templates are hardcoded below.  Super admins can override subject,
// html, and text per type via the email_templates MongoDB collection.
// Variable substitution uses {{VAR_NAME}} syntax.

import clientPromise from "@/lib/mongodb"
import { sendAdminEmail } from "@/lib/email"

export type EmailTemplateType =
  | "forgot_password"
  | "password_changed"
  | "welcome"
  | "account_locked"
  | "account_unlocked"

export interface EmailTemplate {
  type:    EmailTemplateType
  subject: string
  html:    string
  text:    string
}

// ── Default templates ─────────────────────────────────────────────────────────

const DEFAULTS: Record<EmailTemplateType, Omit<EmailTemplate, "type">> = {
  forgot_password: {
    subject: "Reset your 100X Circle admin password",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
  <div style="margin-bottom:24px;">
    <div style="width:48px;height:48px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:white;font-size:24px;">🔑</span>
    </div>
    <h2 style="color:#111827;margin:0 0 8px;">Password Reset Request</h2>
    <p style="color:#6b7280;margin:0;">Hi {{NAME}},</p>
  </div>
  <p style="color:#374151;line-height:1.6;">We received a request to reset the password for your 100X Circle admin account (<strong>{{EMAIL}}</strong>). Click the button below — this link expires in <strong>30 minutes</strong>.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{{RESET_URL}}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.01em;">Reset Password →</a>
  </div>
  <p style="color:#9ca3af;font-size:13px;line-height:1.6;">If you didn't request this, you can safely ignore this email — your password won't change.<br><br>Or copy this link: <a href="{{RESET_URL}}" style="color:#16a34a;word-break:break-all;">{{RESET_URL}}</a></p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#d1d5db;font-size:12px;margin:0;">100X Circle · Admin Panel · Sent to {{EMAIL}}</p>
</div>`,
    text: `Reset your 100X Circle admin password

Hi {{NAME}},

We received a request to reset your admin password. Use the link below (expires in 30 minutes):

{{RESET_URL}}

If you didn't request this, ignore this email.

— 100X Circle Admin`,
  },

  password_changed: {
    subject: "Your 100X Circle admin password was changed",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
  <h2 style="color:#111827;">Password Changed</h2>
  <p style="color:#374151;line-height:1.6;">Hi {{NAME}},</p>
  <p style="color:#374151;line-height:1.6;">Your password for the 100X Circle admin panel was successfully changed on <strong>{{CHANGED_AT}}</strong>.</p>
  <p style="color:#374151;line-height:1.6;">All active sessions have been revoked. Please log in again with your new password.</p>
  <p style="color:#ef4444;line-height:1.6;"><strong>If you did not make this change</strong>, contact your system administrator immediately.</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#d1d5db;font-size:12px;margin:0;">100X Circle · Admin Panel · Sent to {{EMAIL}}</p>
</div>`,
    text: `Your 100X Circle admin password was changed.

Hi {{NAME}},

Your admin password was changed on {{CHANGED_AT}}. All active sessions have been revoked.

If you did not do this, contact your administrator immediately.

— 100X Circle Admin`,
  },

  welcome: {
    subject: "Welcome to 100X Circle Admin — your account is ready",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
  <h2 style="color:#111827;">Welcome, {{NAME}}!</h2>
  <p style="color:#374151;line-height:1.6;">Your 100X Circle admin account has been created with the role <strong>{{ROLE}}</strong>.</p>
  <p style="color:#374151;line-height:1.6;"><strong>Email:</strong> {{EMAIL}}<br><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">{{TEMP_PASSWORD}}</code></p>
  <p style="color:#6b7280;font-size:13px;">Please change your password after your first login.</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#d1d5db;font-size:12px;margin:0;">100X Circle · Admin Panel</p>
</div>`,
    text: `Welcome to 100X Circle Admin, {{NAME}}!

Your account has been created.
Email: {{EMAIL}}
Temporary password: {{TEMP_PASSWORD}}
Role: {{ROLE}}

Please change your password after your first login.

— 100X Circle Admin`,
  },

  account_locked: {
    subject: "Your 100X Circle admin account has been locked",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
  <h2 style="color:#dc2626;">Account Locked</h2>
  <p style="color:#374151;line-height:1.6;">Hi {{NAME}},</p>
  <p style="color:#374151;line-height:1.6;">Your 100X Circle admin account has been <strong>locked</strong> by {{LOCKED_BY}} on {{LOCKED_AT}}.</p>
  <p style="color:#374151;line-height:1.6;">You will not be able to log in until an administrator unlocks your account. Contact your system administrator for assistance.</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#d1d5db;font-size:12px;margin:0;">100X Circle · Admin Panel · Sent to {{EMAIL}}</p>
</div>`,
    text: `Your 100X Circle admin account has been locked.

Hi {{NAME}},

Your account was locked by {{LOCKED_BY}} on {{LOCKED_AT}}. Contact your administrator to regain access.

— 100X Circle Admin`,
  },

  account_unlocked: {
    subject: "Your 100X Circle admin account has been unlocked",
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
  <h2 style="color:#16a34a;">Account Unlocked</h2>
  <p style="color:#374151;line-height:1.6;">Hi {{NAME}},</p>
  <p style="color:#374151;line-height:1.6;">Your 100X Circle admin account has been <strong>unlocked</strong> and you can now log in again.</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#d1d5db;font-size:12px;margin:0;">100X Circle · Admin Panel · Sent to {{EMAIL}}</p>
</div>`,
    text: `Your 100X Circle admin account has been unlocked.

Hi {{NAME}},

Your account has been unlocked. You can log in again now.

— 100X Circle Admin`,
  },
}

// ── Variable substitution ─────────────────────────────────────────────────────

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// ── DB override fetch ─────────────────────────────────────────────────────────

async function getTemplate(type: EmailTemplateType): Promise<Omit<EmailTemplate, "type">> {
  try {
    const db  = (await clientPromise).db()
    const doc = await db.collection("email_templates").findOne({ type })
    if (doc?.subject && doc?.html && doc?.text) {
      return { subject: doc.subject, html: doc.html, text: doc.text }
    }
  } catch { /* fall through to default */ }
  return DEFAULTS[type]
}

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const types: EmailTemplateType[] = [
    "forgot_password", "password_changed", "welcome", "account_locked", "account_unlocked",
  ]
  const results = await Promise.all(
    types.map(async (type) => ({ type, ...(await getTemplate(type)) }))
  )
  return results
}

export async function saveTemplate(
  type: EmailTemplateType,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("email_templates").updateOne(
    { type },
    { $set: { type, subject, html, text, updatedAt: new Date() } },
    { upsert: true },
  )
}

export function getDefaultTemplate(type: EmailTemplateType): Omit<EmailTemplate, "type"> {
  return DEFAULTS[type]
}

// ── Send helper ───────────────────────────────────────────────────────────────

export async function renderAndSend(
  type:  EmailTemplateType,
  vars:  Record<string, string>,
  toEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const tpl = await getTemplate(type)
  const result = await sendAdminEmail({
    to:      toEmail,
    subject: renderTemplate(tpl.subject, vars),
    html:    renderTemplate(tpl.html, vars),
    text:    renderTemplate(tpl.text, vars),
  })
  if (!result.ok) return { ok: false, error: result.reason }
  return { ok: true }
}
