// CRM health for uptime checks. Session-exempt in middleware.ts; accepts the secret ONLY as
// `Authorization: Bearer <CRON_SECRET>` (never a query parameter). See lib/crm/health.ts.
import { NextResponse, type NextRequest } from "next/server"
import { crmDb, assertWorkspace } from "@/lib/crm/db"
import { readCrmEnv } from "@/lib/crm/env"
import { buildHealthReport, isHealthAuthorized } from "@/lib/crm/health"
import { DEFAULT_WORKSPACE } from "@/lib/crm/model"
import { requestIdOf } from "@/lib/crm/whatsapp/webhook"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const requestId = requestIdOf(request.headers)
  const env = readCrmEnv()
  const noStore = { "Cache-Control": "no-store", "x-request-id": requestId }
  if (!isHealthAuthorized(request.headers.get("authorization"), env.healthSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore })
  }
  const ws = request.nextUrl.searchParams.get("workspace") ?? DEFAULT_WORKSPACE
  try {
    assertWorkspace(ws)
  } catch {
    return NextResponse.json({ error: "unknown_workspace" }, { status: 400, headers: noStore })
  }
  try {
    const db = await crmDb(ws)
    return NextResponse.json(await buildHealthReport(db, env), { headers: noStore })
  } catch (e) {
    console.error(JSON.stringify({ scope: "crm.health", level: "error", requestId, msg: "health failed", error: e instanceof Error ? e.name : "unknown" }))
    return NextResponse.json({ ok: false, error: "health_unavailable" }, { status: 503, headers: noStore })
  }
}
