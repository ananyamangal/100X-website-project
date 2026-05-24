/**
 * Email helper using nodemailer.
 *
 * Designed to fail gracefully when env vars are missing — production sends a
 * real Gmail email; if no credentials are configured the function returns
 * `{ ok: false, reason: "not_configured" }` and the caller can fall back to
 * other delivery channels (e.g. WhatsApp link, DB save).
 *
 * Required env vars (Gmail App Password recommended):
 *   - EMAIL_USER         (e.g. 100xcircle@gmail.com)
 *   - EMAIL_APP_PASSWORD (16-char app password generated in Google Account)
 *
 * Optional:
 *   - EMAIL_TO           (override admin recipient; defaults to EMAIL_USER)
 */

import nodemailer from "nodemailer"

type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "not_configured" | "send_failed"; error?: string }

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_APP_PASSWORD
  if (!user || !pass) return null
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
  return cachedTransporter
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)
}

export async function sendAdminEmail(args: {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const transporter = getTransporter()
  if (!transporter) return { ok: false, reason: "not_configured" }

  const from = process.env.EMAIL_USER!
  const to = process.env.EMAIL_TO || from

  try {
    const info = await transporter.sendMail({
      from: `100x Circle Website <${from}>`,
      to,
      subject: args.subject,
      text: args.text,
      html: args.html,
      replyTo: args.replyTo,
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    return {
      ok: false,
      reason: "send_failed",
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
