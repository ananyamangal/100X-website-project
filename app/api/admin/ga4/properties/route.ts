/**
 * GET  /api/admin/ga4/properties — list accessible GA4 properties + current selection
 * POST /api/admin/ga4/properties — save selected property { propertyId, propertyName, accountName }
 */
import { NextRequest, NextResponse } from "next/server"
import { getValidAccessToken } from "@/lib/google-oauth"
import { listGA4Properties, getGA4Settings, saveGA4Settings } from "@/lib/ga4"

export async function GET() {
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    return NextResponse.json({ error: "not_connected", message: String(err) }, { status: 400 })
  }

  try {
    const [properties, settings] = await Promise.all([
      listGA4Properties(accessToken),
      getGA4Settings(),
    ])
    return NextResponse.json({
      properties,
      selectedPropertyId: settings?.propertyId ?? null,
      settings,
    })
  } catch (err) {
    const msg = String(err)
    const status = msg.includes("403") ? 403 : 500
    return NextResponse.json({ error: "api_error", message: msg }, { status })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { propertyId?: string; propertyName?: string; accountName?: string }
  if (!body.propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 })
  }
  await saveGA4Settings({
    propertyId: body.propertyId,
    propertyName: body.propertyName || "",
    accountName: body.accountName || "",
  })
  return NextResponse.json({ ok: true })
}
