import { type NextRequest, NextResponse } from "next/server"
import { runRevenueDirector } from "@/lib/growth-os/agents/revenue-director"
import { requireAuth } from "@/lib/rbac/server"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Manual trigger for Revenue Director. Force=true overwrites today's run. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json().catch(() => ({}))
    const force = body.force === true
    const result = await runRevenueDirector(force)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Revenue Director manual run error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
