/**
 * GET  /api/admin/ads/accounts — discover accessible Ads accounts + current selection
 * POST /api/admin/ads/accounts — save { customerId, customerName, currencyCode, loginCustomerId? }
 */
import { NextRequest, NextResponse } from "next/server"
import { getValidAccessToken } from "@/lib/google-oauth"
import { discoverCustomers, getAdsSettings, saveAdsSettings, isDeveloperTokenConfigured } from "@/lib/google-ads"

export async function GET() {
  if (!isDeveloperTokenConfigured()) {
    const settings = await getAdsSettings()
    return NextResponse.json({
      customers: [],
      selectedCustomerId: settings?.customerId ?? null,
      settings,
      devTokenMissing: true,
    })
  }

  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    return NextResponse.json({ error: "not_connected", message: String(err) }, { status: 400 })
  }

  const settings = await getAdsSettings()

  try {
    const customers = await discoverCustomers(accessToken)
    return NextResponse.json({
      customers,
      selectedCustomerId: settings?.customerId ?? null,
      settings,
      devTokenMissing: false,
    })
  } catch (err) {
    // Discovery failed — allow manual entry
    return NextResponse.json({
      customers: [],
      selectedCustomerId: settings?.customerId ?? null,
      settings,
      devTokenMissing: false,
      discoveryError: String(err).slice(0, 300),
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customerId?: string
    customerName?: string
    currencyCode?: string
    loginCustomerId?: string
  }
  if (!body.customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 })
  }
  await saveAdsSettings({
    customerId: body.customerId.replace(/-/g, ""),
    customerName: body.customerName || `Account ${body.customerId}`,
    currencyCode: body.currencyCode || "INR",
    loginCustomerId: body.loginCustomerId || undefined,
  })
  return NextResponse.json({ ok: true })
}
