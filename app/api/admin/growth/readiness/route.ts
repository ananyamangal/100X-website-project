/**
 * GET /api/admin/growth/readiness
 * Returns system readiness check for all five Growth OS systems.
 * Used by Founder Mode dashboard and Readiness Score widget.
 */

import { NextResponse } from "next/server"
import { checkSystemReadiness } from "@/lib/growth-os/user-success/readiness-checker"

export const dynamic     = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  try {
    const result = await checkSystemReadiness()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
