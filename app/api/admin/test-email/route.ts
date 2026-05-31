import { NextResponse } from "next/server"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function POST() {
  if (!isEmailConfigured()) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      EMAIL_USER: process.env.EMAIL_USER ? "set" : "MISSING",
      EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? "set" : "MISSING",
    })
  }

  const result = await sendAdminEmail({
    subject: "100x Circle — Email Test",
    text: "This is a test email from your 100x Circle website admin panel. If you receive this, email notifications are working correctly.",
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2 style="color:#16a34a">Email Test Passed</h2>
      <p>This is a test email from your <strong>100x Circle</strong> website admin panel.</p>
      <p>If you received this, email notifications are configured correctly and will be sent for all RFQ submissions.</p>
      <p style="color:#6b7280;font-size:12px">Sent at: ${new Date().toISOString()}</p>
    </div>`,
  })

  return NextResponse.json({
    ok: result.ok,
    ...(result.ok
      ? { messageId: result.messageId }
      : { reason: result.reason, error: "error" in result ? result.error : undefined }),
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_TO: process.env.EMAIL_TO || "(same as EMAIL_USER)",
  })
}
