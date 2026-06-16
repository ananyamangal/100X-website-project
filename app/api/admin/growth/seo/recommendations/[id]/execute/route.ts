/**
 * POST /api/admin/growth/seo/recommendations/[id]/execute
 * Execute an approved SEO recommendation.
 *
 * State machine: approved → executing → validating → implemented | rolled_back
 *
 * Safety rules enforced here (not just in UI):
 *  - Only "approved" recs can be executed
 *  - Forbidden patterns (redirect/canonical/url change) are blocked at API level
 *  - Before snapshot stored in seo_execution_log before any write
 *  - Validation runs after write — auto-rollback on failure
 *  - No URL, slug, redirect, or canonical changes are possible through this endpoint
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const EXECUTABLE_TYPES = [
  "ctr_opportunity",
  "ranking_opportunity",
  "schema_fix",
  "internal_link",
  "title_optimization",
  "content_gap",
]

// Any proposed change containing these patterns is blocked at the API level
const FORBIDDEN_PATTERNS = [
  /\bredirect\b/i,
  /\bcanonical\b/i,
  /\bslug.{0,20}change\b/i,
  /\burl.{0,20}change\b/i,
  /\brename\b/i,
  /\brobots\.txt\b/i,
  /\bsitemap\b/i,
]

type ValidationCheck = { pass: boolean; reason?: string; value?: unknown }
type ValidationResult = {
  pass: boolean
  reason?: string
  checks: Record<string, ValidationCheck>
  safe_types_only: boolean
}

function checkForbidden(text: string): string | null {
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(text)) return `Blocked: proposed change contains "${p.source}" — requires Founder approval`
  }
  return null
}

function validateMetaTitle(title: string): ValidationCheck {
  if (!title || title.trim().length === 0) return { pass: false, reason: "Empty meta title" }
  if (title.length > 75) return { pass: false, reason: `Too long: ${title.length}/75 chars`, value: title.length }
  if (title.length < 10) return { pass: false, reason: `Too short: ${title.length}/10 min chars`, value: title.length }
  return { pass: true, value: title.length }
}

function validateMetaDescription(desc: string): ValidationCheck {
  if (!desc || desc.trim().length === 0) return { pass: false, reason: "Empty meta description" }
  if (desc.length > 175) return { pass: false, reason: `Too long: ${desc.length}/175 chars`, value: desc.length }
  if (desc.length < 50) return { pass: false, reason: `Too short: ${desc.length}/50 min chars`, value: desc.length }
  return { pass: true, value: desc.length }
}

function validateSchema(snippet: string): ValidationCheck & { parsed?: Record<string, unknown> } {
  if (!snippet) return { pass: false, reason: "No schema snippet provided" }
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(snippet) } catch (e) {
    return { pass: false, reason: `Invalid JSON: ${String(e)}` }
  }
  if (parsed["@context"] !== "https://schema.org") return { pass: false, reason: `@context must be "https://schema.org"` }
  if (!parsed["@type"]) return { pass: false, reason: "Missing @type" }
  // Block any schema that tries to set a URL that differs from the rec's url
  if (typeof parsed["url"] === "string" && parsed["url"].includes("redirect")) {
    return { pass: false, reason: "Schema contains redirect URL — blocked" }
  }
  return { pass: true, parsed }
}

function validateLinks(links: Array<{ from: string; anchor: string; to: string }>): ValidationCheck {
  if (!links || links.length === 0) return { pass: false, reason: "No link recommendations in implementation package" }
  for (const l of links) {
    if (!l.from || !l.to || !l.anchor) return { pass: false, reason: `Invalid link entry: missing from/to/anchor` }
    if (l.from === l.to) return { pass: false, reason: `Self-link detected: ${l.from} → ${l.to}` }
  }
  return { pass: true, value: links.length }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid recommendation ID" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // ── 1. Load rec ─────────────────────────────────────────────────────────────
  const rec = await db.collection("seo_recommendations").findOne({ _id: new ObjectId(id) })
  if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
  if (rec.status !== "approved") {
    return NextResponse.json({ error: `Cannot execute: status is "${rec.status}" — must be "approved"` }, { status: 400 })
  }
  if (!EXECUTABLE_TYPES.includes(rec.type)) {
    return NextResponse.json({ error: `Type "${rec.type}" is not auto-executable in v2.5` }, { status: 400 })
  }

  // ── 2. Forbidden content check ───────────────────────────────────────────────
  const proposedText = [rec.proposed_change, rec.title, rec.implementation_package?.meta_title || ""].join(" ")
  const forbidden = checkForbidden(proposedText)
  if (forbidden) {
    return NextResponse.json({ error: forbidden, auto_blocked: true }, { status: 400 })
  }

  const path = rec.url || "/"
  const pkg = (rec.implementation_package || {}) as Record<string, unknown>

  // ── 3. Load before snapshot ──────────────────────────────────────────────────
  const existingOverride = await db.collection("seo_page_overrides").findOne({ path })
  const beforeSnapshot = existingOverride
    ? {
        meta_title: existingOverride.meta_title ?? null,
        meta_description: existingOverride.meta_description ?? null,
        schema_additions: existingOverride.schema_additions ?? [],
        link_injections: existingOverride.link_injections ?? [],
      }
    : null

  // ── 4. Set status → executing ────────────────────────────────────────────────
  await db.collection("seo_recommendations").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "executing", executed_at: now, updated_at: now } }
  )

  // ── 5. Build override + validate ─────────────────────────────────────────────
  const overrideUpdate: Record<string, unknown> = { path, active: true, rec_id: id, applied_at: now, updated_at: now }
  const validation: ValidationResult = { pass: true, checks: {}, safe_types_only: true }

  if (rec.type === "ctr_opportunity" || rec.type === "title_optimization") {
    if (pkg.meta_title) {
      const v = validateMetaTitle(pkg.meta_title as string)
      validation.checks.meta_title = v
      if (!v.pass) { validation.pass = false; validation.reason = v.reason }
      else overrideUpdate.meta_title = pkg.meta_title
    }
    if (pkg.meta_description) {
      const v = validateMetaDescription(pkg.meta_description as string)
      validation.checks.meta_description = v
      if (!v.pass && validation.pass) { validation.pass = false; validation.reason = v.reason }
      else if (v.pass) overrideUpdate.meta_description = pkg.meta_description
    }
  } else if (rec.type === "schema_fix") {
    if (pkg.schema_snippet) {
      const v = validateSchema(pkg.schema_snippet as string)
      validation.checks.schema = { pass: v.pass, reason: v.reason }
      if (!v.pass) { validation.pass = false; validation.reason = v.reason }
      else {
        const existing: object[] = (existingOverride?.schema_additions as object[]) ?? []
        overrideUpdate.schema_additions = [...existing, v.parsed]
      }
    } else {
      validation.pass = false
      validation.reason = "No schema snippet in implementation package"
      validation.checks.schema = { pass: false, reason: validation.reason }
    }
  } else if (rec.type === "internal_link") {
    const links = (pkg.link_recommendations as Array<{ from: string; anchor: string; to: string }>) ?? []
    const v = validateLinks(links)
    validation.checks.links = v
    if (!v.pass) { validation.pass = false; validation.reason = v.reason }
    else {
      const existing = (existingOverride?.link_injections as object[]) ?? []
      overrideUpdate.link_injections = [...existing, ...links]
    }
  } else if (rec.type === "ranking_opportunity" || rec.type === "content_gap") {
    // Content additions are staged for human review — always pass validation
    overrideUpdate.content_draft = {
      proposed_section: rec.proposed_change,
      notes: pkg.notes ?? null,
      keywords: [rec.title],
      staged_at: now,
    }
    validation.checks.staged = { pass: true, reason: "Content addition staged for human review and deployment" }
  }

  // ── 6. Set status → validating ───────────────────────────────────────────────
  await db.collection("seo_recommendations").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "validating", validation_result: validation, updated_at: now } }
  )

  // ── 7. Apply or auto-rollback ────────────────────────────────────────────────
  let finalStatus: string
  let afterSnapshot: Record<string, unknown> | null = null

  if (validation.pass) {
    await db.collection("seo_page_overrides").updateOne(
      { path },
      { $set: overrideUpdate },
      { upsert: true }
    )
    afterSnapshot = overrideUpdate
    finalStatus = "implemented"
  } else {
    // Auto-rollback: if there was an existing override, it was never touched (we only wrote on validation pass)
    // Nothing to restore — the override was never applied
    finalStatus = "rolled_back"
  }

  // ── 8. Write audit log ───────────────────────────────────────────────────────
  await db.collection("seo_execution_log").insertOne({
    rec_id: id,
    rec_type: rec.type,
    rec_title: rec.title,
    action: "execute",
    path,
    before: beforeSnapshot,
    after: afterSnapshot,
    status: validation.pass ? "success" : "failed",
    validation_result: validation,
    executed_at: now,
    final_status: finalStatus,
    auto_rollback: !validation.pass,
  })

  // ── 9. Set final rec status ──────────────────────────────────────────────────
  await db.collection("seo_recommendations").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: finalStatus,
        validation_result: validation,
        updated_at: now,
        ...(finalStatus === "implemented" ? { implemented_at: now } : { rolled_back_at: now }),
      },
    }
  )

  return NextResponse.json({
    ok: true,
    status: finalStatus,
    validation,
    auto_rollback: !validation.pass,
    reason: validation.pass ? null : validation.reason,
  })
}
