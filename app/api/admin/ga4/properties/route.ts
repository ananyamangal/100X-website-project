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

  const settings = await getGA4Settings()

  try {
    const properties = await listGA4Properties(accessToken)
    return NextResponse.json({
      properties,
      selectedPropertyId: settings?.propertyId ?? null,
      settings,
      adminApiDisabled: false,
    })
  } catch (err) {
    const msg = String(err)
    // Admin API (analyticsadmin.googleapis.com) may not be enabled in the Cloud project.
    // This is independent of the Data API — fall back to manual property entry.
    if (msg.includes("403") || msg.includes("SERVICE_DISABLED")) {
      return NextResponse.json({
        properties: [],
        selectedPropertyId: settings?.propertyId ?? null,
        settings,
        adminApiDisabled: true,
        adminApiError: msg.slice(0, 300),
      })
    }
    return NextResponse.json({ error: "api_error", message: msg }, { status: 500 })
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
