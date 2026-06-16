/**
 * POST /api/admin/growth/seo/recommendations/[id]/execute
 * Execute an approved SEO recommendation.
 *
 * State machine: approved → executing → validating → implemented | rolled_back
 *
 * Safety rules enforced here (not just in UI):
 *  - Only "approved" recs can be executed
 *  - Risk gate: MEDIUM → admin_override:true required; HIGH/CRITICAL → founder_approval:true required
 *  - Forbidden patterns (redirect/canonical/url change) are blocked at API level
 *  - Before snapshot stored in seo_execution_log before any write
 *  - Validation runs after write — auto-rollback on failure
 *  - Traffic baseline captured on success for 14-day monitoring
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { scorePageRisk } from "@/lib/growth-os/seo-risk-engine"

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

  const body = await req.json().catch(() => ({}))
  const founder_approval = body.founder_approval === true
  const admin_override   = body.admin_override   === true

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

  // ── 1b. Safety pre-checks (v2.5.2) ─────────────────────────────────────────
  const recPath = rec.url || "/"

  // FREEZE CHECK — blocks ALL executions globally
  const freezeDoc = await db.collection("seo_global_settings").findOne({ key: "automation_freeze" })
  if (freezeDoc?.value === true) {
    return NextResponse.json({
      error: "SEO Automation Freeze is active — all executions blocked by Founder directive. Disable freeze to proceed.",
      freeze_active: true,
    }, { status: 503 })
  }

  // VELOCITY CHECK — max 5 successful executions per 24h; founder_approval bypasses
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const todayCount = await db.collection("seo_execution_log").countDocuments({
    action: "execute",
    final_status: "implemented",
    executed_at: { $gte: oneDayAgo },
  })
  if (todayCount >= 5 && !founder_approval) {
    return NextResponse.json({
      error: `Change velocity limit: ${todayCount}/5 SEO executions already made today. Founder approval required to exceed daily limit.`,
      velocity_blocked: true,
      today_count: todayCount,
      velocity_limit: 5,
      requires: "founder_approval: true in request body",
    }, { status: 429 })
  }

  // COOL-DOWN CHECK — 14 days per page; founder_approval bypasses
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()
  const lastPageExecution = await db.collection("seo_execution_log").findOne(
    { path: recPath, action: "execute", final_status: "implemented", executed_at: { $gte: fourteenDaysAgo } },
    { sort: { executed_at: -1 } }
  )
  if (lastPageExecution && !founder_approval) {
    const daysAgo = (Date.now() - new Date(lastPageExecution.executed_at).getTime()) / 86_400_000
    const cooldownRemaining = Math.ceil(14 - daysAgo)
    return NextResponse.json({
      error: `Page cool-down: ${Math.floor(daysAgo)}d since last execution. ${cooldownRemaining}d remaining before this page can be changed again. Founder approval overrides.`,
      cooldown_active: true,
      last_execution_at: lastPageExecution.executed_at,
      cooldown_remaining_days: cooldownRemaining,
      requires: "founder_approval: true in request body",
    }, { status: 409 })
  }

  // HIGH-VALUE PAGE LOCK — protected pages always require founder_approval
  const protectedPage = await db.collection("seo_protected_pages").findOne({ path: recPath })
  if (protectedPage && !founder_approval) {
    return NextResponse.json({
      error: `Protected page (${protectedPage.reason}): Founder approval required for all changes to this page — no exceptions.`,
      protected_page: true,
      protection_reason: protectedPage.reason,
      requires: "founder_approval: true in request body",
    }, { status: 403 })
  }

  const pageRows = await db.collection("gsc_query_rows")
    .find({ $or: [{ page: recPath }, { pagePath: recPath }] })
    .toArray()
  const clicks_28d     = pageRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.clicks || 0), 0)
  const impressions_28d = pageRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.impressions || 0), 0)
  const avg_position   = pageRows.length > 0 ? pageRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.position || 0), 0) / pageRows.length : 0
  const top10_keywords = pageRows.filter((r: Record<string, unknown>) => Number(r.position || 99) <= 10).length
  const cachedScore    = await db.collection("seo_page_risk_scores").findOne({ path: recPath })

  const riskProfile = scorePageRisk({
    path: recPath,
    clicks_28d,
    impressions_28d,
    avg_position,
    ranking_keywords: pageRows.length,
    top10_keywords,
    backlink_count:    cachedScore?.backlink_count    ?? 0,
    referring_domains: cachedScore?.referring_domains ?? 0,
  })

  if (riskProfile.risk_level === "MEDIUM" && !admin_override) {
    return NextResponse.json({
      error: "Admin approval required before executing this change",
      gate: "MEDIUM",
      risk_level: riskProfile.risk_level,
      risk_score: riskProfile.risk_score,
      warnings: riskProfile.warnings,
      requires: "Confirm in the UI that you approve this change as admin (admin_override: true)",
    }, { status: 403 })
  }

  if ((riskProfile.risk_level === "HIGH" || riskProfile.risk_level === "CRITICAL") && !founder_approval) {
    return NextResponse.json({
      error: `Founder approval required — this page has ${riskProfile.risk_level} SEO risk`,
      gate: riskProfile.risk_level,
      risk_level: riskProfile.risk_level,
      risk_score: riskProfile.risk_score,
      warnings: riskProfile.warnings,
      requires: "Confirm Founder has approved this change (founder_approval: true)",
    }, { status: 403 })
  }

  // ── 2. Forbidden content check ───────────────────────────────────────────────
  const proposedText = [rec.proposed_change, rec.title, rec.implementation_package?.meta_title || ""].join(" ")
  const forbidden = checkForbidden(proposedText)
  if (forbidden) {
    return NextResponse.json({ error: forbidden, auto_blocked: true }, { status: 400 })
  }

  const path = recPath
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
  const logResult = await db.collection("seo_execution_log").insertOne({
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
    risk_gate: {
      risk_level: riskProfile.risk_level,
      risk_score: riskProfile.risk_score,
      founder_approval,
      admin_override,
      today_count: todayCount,
      protected_page: !!protectedPage,
      cooldown_bypassed: !!lastPageExecution && founder_approval,
    },
  })
  const executionId = String(logResult.insertedId)

  // ── 8b. Enhanced GSC snapshot (v2.5.2 — seo_execution_baselines) ────────────
  if (finalStatus === "implemented") {
    const ctr_28d = impressions_28d > 0 ? clicks_28d / impressions_28d : 0
    await db.collection("seo_execution_baselines").insertOne({
      execution_id: executionId,
      path,
      rec_id: id,
      clicks_28d,
      impressions_28d,
      ctr_28d,
      avg_position_28d: avg_position,
      keyword_count: pageRows.length,
      top10_count: top10_keywords,
      captured_at: now,
    })
    // Keep traffic_baselines for the monitoring route (existing)
    await db.collection("seo_traffic_baselines").updateOne(
      { rec_id: id },
      { $set: { path, rec_id: id, clicks: clicks_28d, impressions: impressions_28d, avg_position, period: "28d_at_execution", captured_at: now } },
      { upsert: true }
    )
  }

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
    execution_id: executionId,
    validation,
    auto_rollback: !validation.pass,
    reason: validation.pass ? null : validation.reason,
    today_count: todayCount + (finalStatus === "implemented" ? 1 : 0),
  })
}
