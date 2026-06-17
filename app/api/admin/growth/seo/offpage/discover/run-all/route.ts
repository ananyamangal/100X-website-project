import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// ─── Types ────────────────────────────────────────────────────────────────────

type PhaseStatus = "success" | "partial" | "failed"

interface PhaseReport {
  status:  PhaseStatus
  label:   string
  summary: string          // one-liner shown to founder
  detail:  string          // secondary line
  counts:  Record<string, number>
  errors:  string[]
  duration_ms: number
}

interface DiscoveryRun {
  ran_at:         string
  triggered_by:   string
  duration_ms:    number
  overall_status: PhaseStatus
  phases:         Record<string, PhaseReport>
  totals: {
    items_discovered:    number
    competitors_scanned: number
    citations_checked:   number
    gem_opportunities:   number
    authority_score:     number
    authority_delta:     number
  }
  errors_count: number
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function overallStatus(phases: Record<string, PhaseReport>): PhaseStatus {
  const statuses = Object.values(phases).map(p => p.status)
  if (statuses.every(s => s === "success")) return "success"
  if (statuses.every(s => s === "failed"))  return "failed"
  return "partial"
}

// ─── Phase analyzers ─────────────────────────────────────────────────────────

function analyzeCompetitors(
  data: Record<string, unknown> | null,
  error: string | null,
  ms: number
): PhaseReport {
  if (error || !data) {
    return {
      status: "failed", label: "Dynamic Competitor Intelligence",
      summary: "Failed to run", detail: error ?? "No response",
      counts: {}, errors: [error ?? "No response"], duration_ms: ms,
    }
  }

  // Handle both dynamic (v3.2+) and legacy static discovery response shapes
  const isDynamic = "discovered" in data

  if (isDynamic) {
    const discovered    = Number(data.discovered    ?? 0)
    const ranked        = Number(data.ranked        ?? 0)
    const linksCreated  = Number(data.links_created ?? 0)
    const top = (data.top_competitors as Array<{name:string;score:number;rank:number}> | undefined) ?? []

    const status: PhaseStatus =
      discovered > 0 && ranked > 0  ? "success" :
      discovered > 0                ? "partial"  : "failed"

    return {
      status, label: "Dynamic Competitor Intelligence",
      summary: discovered > 0
        ? `${discovered} competitors from gem_contracts · Top: ${top[0]?.name ?? "—"}`
        : "No competitors found in gem_contracts",
      detail: `${ranked} ranked by intelligence score · ${linksCreated} link gaps created · 5 sources`,
      counts: { discovered, ranked, link_gaps_created: linksCreated },
      errors: discovered === 0 ? ["No fogging-category sellers found in gem_contracts"] : [],
      duration_ms: ms,
    }
  }

  // Legacy static discovery path
  const results = (data.results ?? {}) as Record<string, { discovered: number; gaps: number; skipped: number }>
  const competitors   = Object.keys(results)
  const totalDiscovered = Object.values(results).reduce((a, b) => a + (b.discovered ?? 0), 0)
  const totalGaps       = Object.values(results).reduce((a, b) => a + (b.gaps ?? 0), 0)
  const totalSkipped    = Object.values(results).reduce((a, b) => a + (b.skipped ?? 0), 0)

  const status: PhaseStatus =
    totalDiscovered > 0 ? "success" : totalSkipped > 0 ? "partial" : "failed"

  return {
    status, label: "Dynamic Competitor Intelligence",
    summary: totalDiscovered > 0
      ? `${totalDiscovered} gap opportunities discovered`
      : totalSkipped > 0 ? `${totalSkipped} already tracked` : "No opportunities found",
    detail: `${competitors.length} competitors scanned · ${totalGaps} gaps`,
    counts: { discovered: totalDiscovered, gaps: totalGaps, skipped: totalSkipped, competitors: competitors.length },
    errors: [],
    duration_ms: ms,
  }
}

function analyzeCitations(
  data: Record<string, unknown> | null,
  error: string | null,
  ms: number
): PhaseReport {
  if (error || !data) {
    return {
      status: "failed", label: "Citation Scan",
      summary: "Failed to run", detail: error ?? "No response",
      counts: {}, errors: [error ?? "No response"], duration_ms: ms,
    }
  }

  const found         = Number(data.found ?? 0)
  const missing       = Number(data.missing ?? 0)
  const alreadyTracked = Number(data.already_tracked ?? 0)
  const results       = (data.results as { status: string }[] | undefined) ?? []
  const unknownCount  = results.filter(r => r.status === "recommended" && !missing).length

  const status: PhaseStatus =
    (found + missing) > 0 && unknownCount === 0  ? "success" :
    (found + missing) > 0 && unknownCount > 0    ? "partial"  :
    alreadyTracked > 0                           ? "partial"  : "failed"

  return {
    status, label: "Citation Scan",
    summary: found > 0
      ? `${found} citation${found !== 1 ? "s" : ""} verified`
      : missing > 0
        ? `${missing} platform${missing !== 1 ? "s" : ""} missing — submissions recommended`
        : alreadyTracked > 0
          ? `All ${alreadyTracked} platforms already tracked`
          : "No platforms checked",
    detail: `${found} found · ${missing} missing · ${alreadyTracked} already tracked`,
    counts: { found, missing, already_tracked: alreadyTracked },
    errors: [],
    duration_ms: ms,
  }
}

function analyzeGem(
  data: Record<string, unknown> | null,
  error: string | null,
  ms: number
): PhaseReport {
  if (error || !data) {
    return {
      status: "failed", label: "GeM Authority",
      summary: "Failed to run", detail: error ?? "No response",
      counts: {}, errors: [error ?? "No response"], duration_ms: ms,
    }
  }

  const fromContracts = Number(data.from_contracts ?? 0)
  const fromBaseline  = Number(data.from_baseline  ?? 0)
  const skipped       = Number(data.skipped        ?? 0)
  const total         = fromContracts + fromBaseline

  const status: PhaseStatus =
    total > 0 && fromContracts > 0  ? "success" :
    total > 0 && fromContracts === 0 ? "partial" :  // only baseline, no contract matches
    skipped > 0                      ? "partial" :
    "failed"

  return {
    status, label: "GeM Authority",
    summary: total > 0
      ? `${total} opportunit${total !== 1 ? "ies" : "y"} found`
      : skipped > 0
        ? `${skipped} already tracked`
        : "No opportunities found",
    detail: fromContracts > 0
      ? `${fromContracts} from contracts DB · ${fromBaseline} baseline seeded · ${skipped} already tracked`
      : fromBaseline > 0
        ? `${fromBaseline} baseline seeded (no contract matches for 100x Circle yet)`
        : `${skipped} already tracked`,
    counts: { from_contracts: fromContracts, from_baseline: fromBaseline, skipped },
    errors: fromContracts === 0 ? ["No 100x Circle contracts found in gem_contracts DB — check seller name variants"] : [],
    duration_ms: ms,
  }
}

function analyzeAuthorityScore(
  data: Record<string, unknown> | null,
  error: string | null,
  ms: number
): PhaseReport {
  if (error || !data) {
    return {
      status: "failed", label: "Authority Score",
      summary: "Failed to calculate", detail: error ?? "No response",
      counts: {}, errors: [error ?? ""], duration_ms: ms,
    }
  }

  const snap  = (data.snapshot ?? {}) as { authority_score?: number; delta?: number }
  const score = snap.authority_score ?? 0
  const delta = snap.delta ?? 0

  return {
    status: "success", label: "Authority Score",
    summary: `Score: ${score}/100${delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}`,
    detail: `Domain pts + Quality pts + Diversity pts + Brand pts`,
    counts: { score, delta },
    errors: [],
    duration_ms: ms,
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const startMs  = Date.now()
  const ran_at   = new Date().toISOString()
  const base     = req.nextUrl.origin
  const cookie   = req.headers.get("cookie") ?? ""

  const rawResults:  Record<string, Record<string, unknown> | null> = { competitors: null, citations: null, gem: null, authority_score: null }
  const rawErrors:   Record<string, string | null>                  = { competitors: null, citations: null, gem: null, authority_score: null }
  const phaseMs:     Record<string, number>                         = {}

  // ── 1. Dynamic competitor discovery (v3.2: mines gem_contracts for all fogging sellers) ───
  {
    const t = Date.now()
    try {
      const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/competitors-dynamic`, {
        method: "POST", headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({}),
      })
      rawResults.competitors = await res.json()
    } catch (e) { rawErrors.competitors = String(e) }
    phaseMs.competitors = Date.now() - t
  }

  // ── 2. Citation discovery ─────────────────────────────────────────────────
  {
    const t = Date.now()
    try {
      const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/citations`, {
        method: "POST", headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({}),
      })
      rawResults.citations = await res.json()
    } catch (e) { rawErrors.citations = String(e) }
    phaseMs.citations = Date.now() - t
  }

  // ── 3. GeM discovery ─────────────────────────────────────────────────────
  {
    const t = Date.now()
    try {
      const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/gem`, {
        method: "POST", headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({}),
      })
      rawResults.gem = await res.json()
    } catch (e) { rawErrors.gem = String(e) }
    phaseMs.gem = Date.now() - t
  }

  // ── 4. Authority score ────────────────────────────────────────────────────
  {
    const t = Date.now()
    try {
      const res = await fetch(`${base}/api/admin/growth/seo/offpage/authority-score`, {
        method: "POST", headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({}),
      })
      rawResults.authority_score = await res.json()
    } catch (e) { rawErrors.authority_score = String(e) }
    phaseMs.authority_score = Date.now() - t
  }

  // ── Build phase reports ───────────────────────────────────────────────────
  const phases: Record<string, PhaseReport> = {
    competitors:     analyzeCompetitors(rawResults.competitors,     rawErrors.competitors,     phaseMs.competitors),
    citations:       analyzeCitations(rawResults.citations,         rawErrors.citations,       phaseMs.citations),
    gem:             analyzeGem(rawResults.gem,                     rawErrors.gem,             phaseMs.gem),
    authority_score: analyzeAuthorityScore(rawResults.authority_score, rawErrors.authority_score, phaseMs.authority_score),
  }

  const totalMs = Date.now() - startMs

  const snap = (rawResults.authority_score?.snapshot ?? {}) as { authority_score?: number; delta?: number }

  const totals = {
    items_discovered:    (phases.competitors.counts.discovered ?? 0) + (phases.citations.counts.found ?? 0) + (phases.gem.counts.from_contracts ?? 0) + (phases.gem.counts.from_baseline ?? 0),
    competitors_scanned: phases.competitors.counts.ranked ?? phases.competitors.counts.competitors ?? 0,
    citations_checked:   (phases.citations.counts.found ?? 0) + (phases.citations.counts.missing ?? 0) + (phases.citations.counts.already_tracked ?? 0),
    gem_opportunities:   (phases.gem.counts.from_contracts ?? 0) + (phases.gem.counts.from_baseline ?? 0),
    authority_score:     snap.authority_score ?? 0,
    authority_delta:     snap.delta ?? 0,
  }

  const run: DiscoveryRun = {
    ran_at,
    triggered_by:   "manual",
    duration_ms:    totalMs,
    overall_status: overallStatus(phases),
    phases,
    totals,
    errors_count: Object.values(rawErrors).filter(Boolean).length,
  }

  // ── Persist run ───────────────────────────────────────────────────────────
  const db = (await clientPromise).db()
  await db.collection("seo_discovery_runs").insertOne({ ...run, created_at: ran_at })

  // ── Audit log ─────────────────────────────────────────────────────────────
  await db.collection("seo_offpage_audit_log").insertOne({
    action: "discovery_run_complete",
    detail: `Discovery: ${run.overall_status.toUpperCase()} — ${totals.items_discovered} items discovered in ${(totalMs / 1000).toFixed(1)}s`,
    meta:   { overall_status: run.overall_status, totals, duration_ms: totalMs },
    created_at: ran_at,
  })

  return NextResponse.json({
    ok:             run.overall_status !== "failed",
    overall_status: run.overall_status,
    phases,
    totals,
    duration_ms:    totalMs,
    ran_at,
  })
}
