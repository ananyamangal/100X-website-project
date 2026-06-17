import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// ─── Orchestrates all off-page discovery routines ────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const base = req.nextUrl.origin

  const results: Record<string, unknown> = {}
  const errors:  Record<string, string>  = {}

  // Run discovery in sequence (to avoid overwhelming DB with concurrent writes)

  // 1. Competitor discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/competitors`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        cookie:         req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ competitor: "all" }),
    })
    results.competitors = await res.json()
  } catch (e) {
    errors.competitors = String(e)
  }

  // 2. Citation discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/citations`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body:    JSON.stringify({}),
    })
    results.citations = await res.json()
  } catch (e) {
    errors.citations = String(e)
  }

  // 3. GeM discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/gem`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body:    JSON.stringify({}),
    })
    results.gem = await res.json()
  } catch (e) {
    errors.gem = String(e)
  }

  // 4. Recalculate authority score after all discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/authority-score`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body:    JSON.stringify({}),
    })
    results.authority_score = await res.json()
  } catch (e) {
    errors.authority_score = String(e)
  }

  const hasErrors = Object.keys(errors).length > 0

  return NextResponse.json({
    ok:        !hasErrors,
    results,
    errors:    hasErrors ? errors : undefined,
    ran_at:    new Date().toISOString(),
    phases:    ["competitors", "citations", "gem", "authority_score"],
  })
}
