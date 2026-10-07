/**
 * Email helper using nodemailer.
 *
 * Designed to fail gracefully when env vars are missing — production sends a
 * real Gmail email; if no credentials are configured the function returns
 * `{ ok: false, reason: "not_configured" }` and the caller can fall back to
 * other delivery channels (e.g. WhatsApp link, DB save).
 *
 * Required env vars (Gmail App Password recommended):
 *   - EMAIL_USER         (the sending Gmail mailbox)
 *   - EMAIL_APP_PASSWORD (16-char app password generated in Google Account)
 *
 * Optional:
 *   - EMAIL_TO           (admin recipients, comma-separated; defaults to EMAIL_USER)
 *
 * Every failure is logged with console.error naming the env var or the SMTP
 * error class — never an address, password or lead detail — so a missing
 * notification shows up in the Vercel function logs instead of vanishing.
 */

import nodemailer from "nodemailer"

type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "not_configured" | "send_failed"; error?: string }

let cachedTransporter: nodemailer.Transporter | null = null

function missingEnv(): string[] {
  const missing: string[] = []
  if (!process.env.EMAIL_USER) missing.push("EMAIL_USER")
  if (!process.env.EMAIL_APP_PASSWORD) missing.push("EMAIL_APP_PASSWORD")
  return missing
}

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter
  const user = process.env.EMAIL_USER
  const rawPass = process.env.EMAIL_APP_PASSWORD
  if (!user || !rawPass) return null
  // Google App Passwords are displayed with spaces (e.g. "abcd efgh ijkl mnop")
  // but must be sent without spaces to the SMTP server.
  const pass = rawPass.replace(/\s+/g, "")
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
  return cachedTransporter
}

export function isEmailConfigured(): boolean {
  return missingEnv().length === 0
}

/** Admin recipients from EMAIL_TO (comma-separated), falling back to EMAIL_USER. */
export function adminRecipients(): string[] {
  const raw = process.env.EMAIL_TO || process.env.EMAIL_USER || ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Safe-to-log description of a nodemailer/SMTP error: class, code and the
// first line of the message (which carries the SMTP reply, not our content).
function describeError(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { code?: string; responseCode?: number; command?: string }
    const parts = [e.name, e.code, e.responseCode ? `smtp ${e.responseCode}` : "", e.command].filter(Boolean)
    const firstLine = (e.message || "").split("\n")[0].slice(0, 160)
    return `${parts.join(" ")}${firstLine ? `: ${firstLine}` : ""}`
  }
  return String(err).slice(0, 160)
}

export async function sendAdminEmail(args: {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Override recipient(s): a single address or a comma-separated list. */
  to?: string;
}): Promise<SendResult> {
  const transporter = getTransporter()
  if (!transporter) {
    console.error(`[email] not configured — missing env var(s): ${missingEnv().join(", ")}. Admin notification "${args.subject.slice(0, 60)}" was NOT sent.`)
    return { ok: false, reason: "not_configured" }
  }

  const from = process.env.EMAIL_USER!
  const to = args.to
    ? args.to.split(",").map((s) => s.trim()).filter(Boolean)
    : adminRecipients()

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
    const error = describeError(err)
    console.error(`[email] send failed (${to.length} recipient(s), subject "${args.subject.slice(0, 60)}"): ${error}`)
    return { ok: false, reason: "send_failed", error }
  }
}
