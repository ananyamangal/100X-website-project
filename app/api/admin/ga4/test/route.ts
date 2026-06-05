/**
 * POST /api/admin/ga4/test
 * 6-step live test: env vars → tokens → scope → access token → list properties → live query.
 */
import { NextResponse } from "next/server"
import { isOAuthAppConfigured, getMissingEnvVars, getStoredTokens, getValidAccessToken } from "@/lib/google-oauth"
import { listGA4Properties, getGA4Settings, runGA4Report, ga4DateRange } from "@/lib/ga4"

type StepStatus = "pass" | "fail" | "warn"

export async function POST() {
  const steps: Array<{ id: string; label: string; status: StepStatus; detail: string }> = []

  // Step 1: OAuth app env vars
  if (!isOAuthAppConfigured()) {
    const missing = getMissingEnvVars()
    steps.push({ id: "env_vars", label: "OAuth app credentials", status: "fail", detail: `Missing: ${missing.join(", ")}` })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "env_vars", label: "OAuth app credentials", status: "pass", detail: "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are set." })

  // Step 2: Tokens in MongoDB
  const stored = await getStoredTokens()
  if (!stored) {
    steps.push({ id: "tokens", label: "Google account connected", status: "fail", detail: "No tokens found in MongoDB. Connect your Google account from the setup page." })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "tokens", label: "Google account connected", status: "pass", detail: `Connected as: ${stored.connectedEmail || "unknown"}` })

  // Step 3: analytics.readonly scope present
  const hasScope = stored.scope?.includes("analytics.readonly") ?? false
  if (!hasScope) {
    steps.push({
      id: "scope",
      label: "analytics.readonly scope",
      status: "fail",
      detail: "This Google account was connected before GA4 support was added. Click 'Reconnect Google Account' below to add Analytics access — same account, one extra click.",
    })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "scope", label: "analytics.readonly scope", status: "pass", detail: "analytics.readonly is present in the stored token scope." })

  // Step 4: Valid access token
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
    steps.push({ id: "access_token", label: "Access token valid", status: "pass", detail: `Token valid (expires: ${new Date(stored.expiresAt).toLocaleString("en-IN")}).` })
  } catch (err) {
    steps.push({ id: "access_token", label: "Access token valid", status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps })
  }

  // Step 5: List GA4 properties
  let properties: Awaited<ReturnType<typeof listGA4Properties>> = []
  try {
    properties = await listGA4Properties(accessToken)
    steps.push({
      id: "properties",
      label: "List GA4 properties",
      status: "pass",
      detail: `${properties.length} propert${properties.length === 1 ? "y" : "ies"} accessible: ${properties.map(p => p.displayName).join(", ") || "none"}`,
    })
  } catch (err) {
    steps.push({ id: "properties", label: "List GA4 properties", status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps, properties: [] })
  }

  // Step 6: Live query against selected property
  const settings = await getGA4Settings()
  if (!settings?.propertyId) {
    steps.push({ id: "live_query", label: "Live GA4 query", status: "warn", detail: "No property selected yet. Choose a property on the setup page, then re-run this test." })
    return NextResponse.json({ ok: false, steps, properties })
  }

  const { startDate, endDate } = ga4DateRange(7)
  try {
    const rows = await runGA4Report({
      propertyId: settings.propertyId,
      dimensions: [],
      metrics: ["activeUsers"],
      startDate,
      endDate,
    }, accessToken)
    const users = rows[0]?.activeUsers ?? 0
    steps.push({
      id: "live_query",
      label: `Live query: ${settings.propertyName || settings.propertyId}`,
      status: "pass",
      detail: `Success. ${users} active users in last 7 days. Connection fully operational.`,
    })
    return NextResponse.json({ ok: true, steps, properties, selectedPropertyId: settings.propertyId })
  } catch (err) {
    steps.push({ id: "live_query", label: `Live query: ${settings.propertyId}`, status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps, properties })
  }
}
