import { NextResponse } from "next/server"
import { getDeployment, rollbackDeployment } from "@/lib/growth-os/ads-deployment"

export const dynamic = "force-dynamic"

// GET — load a deployment record by deploymentId
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const deployment = await getDeployment(params.id)
    if (!deployment) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ deployment })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — manual rollback
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json() as { reason?: string }
    const result = await rollbackDeployment(params.id, body.reason ?? "manual_rollback")
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
