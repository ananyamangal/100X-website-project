import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/rbac/server"
import {
  getAllTemplates,
  saveTemplate,
  getDefaultTemplate,
  type EmailTemplateType,
} from "@/lib/emailTemplates"

const VALID_TYPES: EmailTemplateType[] = [
  "forgot_password", "password_changed", "welcome", "account_locked", "account_unlocked",
]

// GET /api/admin/email-templates
// Returns all 5 templates (DB override merged with defaults).
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const templates = await getAllTemplates()

  // Also include the hardcoded defaults so the UI can show a "Reset to default" preview
  const defaults = Object.fromEntries(
    VALID_TYPES.map(type => [type, getDefaultTemplate(type)]),
  )

  return NextResponse.json({ templates, defaults })
}

// PUT /api/admin/email-templates
// Body: { type, subject, html, text }
// Super Admin / users.edit required.
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth

  let body: { type?: string; subject?: string; html?: string; text?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { type, subject, html, text } = body

  if (!type || !VALID_TYPES.includes(type as EmailTemplateType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    )
  }
  if (!subject?.trim() || !html?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "subject, html, and text are all required" }, { status: 400 })
  }

  await saveTemplate(type as EmailTemplateType, subject.trim(), html.trim(), text.trim())

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/email-templates?type=forgot_password
// Removes the DB override so the hardcoded default is used again.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth

  const type = new URL(request.url).searchParams.get("type")
  if (!type || !VALID_TYPES.includes(type as EmailTemplateType)) {
    return NextResponse.json({ error: "Valid type parameter is required" }, { status: 400 })
  }

  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  await db.collection("email_templates").deleteOne({ type })

  return NextResponse.json({ ok: true })
}
