import { NextRequest, NextResponse, after } from "next/server"
import { sendAdminEmail, isEmailConfigured } from "@/lib/email"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { buildLeadEmail, leadSubject } from "@/lib/lead-email"
import { sanitizeAttribution } from "@/lib/attribution-sanitize"
import { decoyId, isHoneypotFilled, logHoneypotDiscard, withoutHoneypot } from "@/lib/honeypot"
import { ingestWebsiteSubmissionSafely } from "@/lib/crm/website"

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
  /** Honeypot (lib/honeypot.ts). */
  website?: string;
  company_website?: string;
}

export async function POST(request: NextRequest) {
  let body: RFQBody
  try {
    body = (await request.json()) as RFQBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Honeypot filled (lib/honeypot.ts): answer exactly like a saved and e-mailed RFQ
  // so the client proceeds normally, but nothing is saved or e-mailed. One log line,
  // no lead data.
  if (isHoneypotFilled(body)) {
    logHoneypotDiscard("/api/rfq-submit", body, request.headers.get("referer"))
    return NextResponse.json({ ok: true, emailStatus: "sent", dbStatus: "saved", dbId: decoyId() }, { status: 200 })
  }

  if (!body.product || !body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json(
      { error: "Product, name, and phone are required." },
      { status: 400 },
    )
  }

  // Save first (graceful fallback if Mongo is unreachable), so the e-mail can
  // carry the database id and the saved document is the single source of truth.
  const now = new Date().toISOString()
  const { attribution: rawAttribution, ...fields } = withoutHoneypot(body as unknown as Record<string, unknown>) as unknown as RFQBody
  const cleanAttribution = sanitizeAttribution(rawAttribution)
  const record: Record<string, unknown> = {
    type: "rfq",
    ...fields,
    ...(cleanAttribution ? { attribution: cleanAttribution } : {}),
    createdAt: now,
  }
  let dbStatus: "saved" | "failed" = "failed"
  let dbId: string | undefined
  try {
    const client = await clientPromise
    const db = client.db()
    const result = await db.collection("submissions").insertOne({ ...record, emailStatus: "pending" })
    dbStatus = "saved"
    dbId = String(result.insertedId)
  } catch (err) {
    dbStatus = "failed"
    console.error("[api/rfq-submit] DB save failed:", err instanceof Error ? err.message.split("\n")[0] : String(err))
  }

  // CRM lead (lib/crm/website.ts): saved rows only; runs after the response, never throws, never changes it.
  if (dbStatus === "saved" && dbId) {
    const savedId = dbId
    after(() => ingestWebsiteSubmissionSafely({ ...record, _id: savedId }, request.headers.get("x-vercel-id")))
  }

  // E-mail built from every submitted field (graceful if not configured or failing).
  let emailStatus: "sent" | "not_configured" | "failed" = "not_configured"
  let emailError: string | undefined
  if (isEmailConfigured()) {
    try {
      const { text, html } = buildLeadEmail({
        title: "New RFQ",
        intro: "Request for quotation submitted on www.100xcircle.com.",
        record,
        id: dbId,
      })
      const result = await sendAdminEmail({
        subject: leadSubject("New RFQ", record, body.product),
        text,
        html,
        replyTo: body.email && body.email.includes("@") ? body.email : undefined,
      })
      if (result.ok) {
        emailStatus = "sent"
      } else {
        emailStatus = "failed"
        emailError = result.reason === "send_failed" ? result.error : undefined
        console.error(`[api/rfq-submit] admin e-mail not sent for submission ${dbId ?? "(unsaved)"}: ${result.reason}`)
      }
    } catch (err) {
      emailStatus = "failed"
      console.error(`[api/rfq-submit] admin e-mail failed for submission ${dbId ?? "(unsaved)"}:`, err instanceof Error ? err.message.split("\n")[0] : String(err))
    }
  } else {
    console.error(`[api/rfq-submit] admin e-mail not sent for submission ${dbId ?? "(unsaved)"}: EMAIL_USER / EMAIL_APP_PASSWORD not configured`)
  }

  // Record the final e-mail status on the saved row (best effort).
  if (dbId) {
    try {
      const client = await clientPromise
      await client.db().collection("submissions").updateOne({ _id: new ObjectId(dbId) }, { $set: { emailStatus } })
    } catch {
      /* the row is saved; the status is informational */
    }
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
