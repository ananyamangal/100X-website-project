import { NextRequest, NextResponse } from "next/server"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"
import clientPromise from "@/lib/mongodb"

interface RFQBody {
  product: string;
  quantity?: string;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  cityState?: string;
  description?: string;
  gemAuthRequired?: boolean;
  dealerInquiry?: boolean;
  uploadUrl?: string | null;
  uploadName?: string | null;
  uploadSizeBytes?: number | null;
  attribution?: unknown;
  form_page_url?: string;
  form_page_path?: string;
  location_label?: string;
  company_website?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function row(label: string, value: string | undefined | null | boolean) {
  if (value === undefined || value === null || value === "" || value === false) return ""
  const display = value === true ? "Yes" : String(value)
  return `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:180px">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(display)}</td></tr>`
}

function buildEmailBodies(body: RFQBody): { subject: string; text: string; html: string } {
  const subject = `New RFQ — ${body.product}${body.organization ? ` (${body.organization})` : ""}`
  const lines = [
    `New RFQ submission from the 100x Circle website`,
    ``,
    `Product:          ${body.product}`,
    body.quantity ? `Quantity:         ${body.quantity}` : "",
    `Name:             ${body.name}`,
    `Phone:            ${body.phone}`,
    body.email ? `Email:            ${body.email}` : "",
    body.organization ? `Organization:     ${body.organization}` : "",
    body.cityState ? `City / State:     ${body.cityState}` : "",
    body.description ? `Description:      ${body.description}` : "",
    `GeM auth required: ${body.gemAuthRequired ? "Yes" : "No"}`,
    `Dealer inquiry:    ${body.dealerInquiry ? "Yes" : "No"}`,
    body.uploadUrl ? `Upload:           ${body.uploadUrl}` : "",
    ``,
    body.form_page_url ? `Source URL: ${body.form_page_url}` : "",
    body.location_label ? `Form location: ${body.location_label}` : "",
  ].filter(Boolean)
  const text = lines.join("\n")
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px">
      <h2 style="color:#16a34a;margin:0 0 16px">New RFQ Submission</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;font-size:14px;color:#111827">
        ${row("Product", body.product)}
        ${row("Quantity", body.quantity)}
        ${row("Name", body.name)}
        ${row("Phone", body.phone)}
        ${row("Email", body.email)}
        ${row("Organization", body.organization)}
        ${row("City / State", body.cityState)}
        ${row("Description", body.description)}
        ${row("GeM auth required", body.gemAuthRequired === true)}
        ${row("Dealer inquiry", body.dealerInquiry === true)}
        ${row("Upload", body.uploadUrl)}
      </table>
      <p style="font-size:12px;color:#6b7280;margin-top:16px">
        ${body.form_page_url ? `Source: <a href="${escapeHtml(body.form_page_url)}">${escapeHtml(body.form_page_url)}</a><br/>` : ""}
        ${body.location_label ? `Form location: ${escapeHtml(body.location_label)}` : ""}
      </p>
    </div>
  `
  return { subject, text, html }
}

export async function POST(request: NextRequest) {
  let body: RFQBody
  try {
    body = (await request.json()) as RFQBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Honeypot
  if (body.company_website && body.company_website.trim() !== "") {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
  }

  if (!body.product || !body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json(
      { error: "Product, name, and phone are required." },
      { status: 400 },
    )
  }

  // Try email (graceful fallback if not configured)
  let emailStatus: "sent" | "not_configured" | "failed" = "not_configured"
  let emailError: string | undefined
  if (isEmailConfigured()) {
    const { subject, text, html } = buildEmailBodies(body)
    const result = await sendAdminEmail({ subject, text, html, replyTo: body.email })
    if (result.ok) {
      emailStatus = "sent"
    } else {
      emailStatus = "failed"
      emailError = result.reason === "send_failed" ? result.error : undefined
    }
  }

  // Try DB save (graceful fallback if Mongo unreachable)
  let dbStatus: "saved" | "failed" = "failed"
  let dbId: string | undefined
  try {
    const client = await clientPromise
    const db = client.db()
    const now = new Date().toISOString()
    const result = await db.collection("submissions").insertOne({
      type: "rfq",
      ...body,
      createdAt: now,
      emailStatus,
    })
    dbStatus = "saved"
    dbId = String(result.insertedId)
  } catch (err) {
    dbStatus = "failed"
    console.error("RFQ DB save failed:", err)
  }

  // We treat the submission as successful if EITHER email or DB succeeded —
  // the client also fires a WhatsApp open in parallel, so total delivery
  // surface is 3 channels.
  const ok = emailStatus === "sent" || dbStatus === "saved"

  return NextResponse.json(
    {
      ok,
      emailStatus,
      dbStatus,
      dbId,
      ...(emailError ? { emailError } : {}),
    },
    { status: ok ? 200 : 502 },
  )
}
