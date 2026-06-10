/**
 * Page Guidance API.
 *
 * GET /api/admin/growth/page-guidance/[page]
 *   Returns context-aware "What should I do now?" guidance for the given page.
 *   [page] is the slug of the current admin page, e.g. "approval-queue".
 */

import { NextResponse } from "next/server"
import { getPageGuidance } from "@/lib/growth-os/user-success/page-guidance"

export const dynamic     = "force-dynamic"
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: { page: string } },
) {
  try {
    const guidance = await getPageGuidance(params.page)
    return NextResponse.json(guidance)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
