import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

// GET /api/admin/landing-pages/cms-status
// Returns override counts for the CMS Status card. Requires landing_pages.view.
export async function GET(request: Request) {
  const auth = await requirePermission(request as any, "landing_pages.view")
  if (auth instanceof NextResponse) return auth

  try {
    const client = await clientPromise
    const db = client.db()

    const withOverrides = await db
      .collection("landing_page_overrides")
      .countDocuments()

    return NextResponse.json({ ok: true, withOverrides })
  } catch (err) {
    console.error("cms-status GET error:", err)
    return NextResponse.json({ ok: false, withOverrides: 0 }, { status: 500 })
  }
}
