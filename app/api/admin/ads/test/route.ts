/**
 * POST /api/admin/ads/test
 * 6-step test: env vars → dev token → tokens → ads scope → accessible customers → live query
 */
import { NextResponse } from "next/server"
import { isOAuthAppConfigured, getMissingEnvVars, getStoredTokens, getValidAccessToken } from "@/lib/google-oauth"
import { isDeveloperTokenConfigured, listAccessibleCustomerIds, searchAds, getAdsSettings } from "@/lib/google-ads"

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

  // Step 2: Developer token
  if (!isDeveloperTokenConfigured()) {
    steps.push({
      id: "dev_token",
      label: "GOOGLE_ADS_DEVELOPER_TOKEN",
      status: "fail",
      detail: "GOOGLE_ADS_DEVELOPER_TOKEN is not set. Add it in Vercel → Settings → Environment Variables. Get it from Google Ads → Tools → API Center.",
    })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "dev_token", label: "GOOGLE_ADS_DEVELOPER_TOKEN", status: "pass", detail: "Developer token is set." })

  // Step 3: Google tokens in MongoDB
  const stored = await getStoredTokens()
  if (!stored) {
    steps.push({ id: "tokens", label: "Google account connected", status: "fail", detail: "No tokens in MongoDB. Connect your Google account from the setup page." })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "tokens", label: "Google account connected", status: "pass", detail: `Connected as: ${stored.connectedEmail || "unknown"}` })

  // Step 4: adwords scope
  const hasScope = stored.scope?.includes("adwords") ?? false
  if (!hasScope) {
    steps.push({
      id: "scope",
      label: "adwords scope",
      status: "fail",
      detail: "Your Google account was connected before Ads support was added. Click 'Reconnect Google Account' to add adwords access — same account, one extra permission click.",
    })
    return NextResponse.json({ ok: false, steps })
  }
  steps.push({ id: "scope", label: "adwords scope", status: "pass", detail: "adwords scope is present in the stored token." })

  // Step 5: Valid access token
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
    steps.push({ id: "access_token", label: "Access token valid", status: "pass", detail: `Token valid (expires: ${new Date(stored.expiresAt).toLocaleString("en-IN")}).` })
  } catch (err) {
    steps.push({ id: "access_token", label: "Access token valid", status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps })
  }

  // Step 6: List accessible customers
  let customerIds: string[] = []
  try {
    customerIds = await listAccessibleCustomerIds(accessToken)
    steps.push({
      id: "customers",
      label: "List accessible Ads accounts",
      status: "pass",
      detail: `${customerIds.length} account${customerIds.length !== 1 ? "s" : ""} accessible: ${customerIds.slice(0, 5).join(", ")}${customerIds.length > 5 ? " …" : ""}`,
    })
  } catch (err) {
    steps.push({ id: "customers", label: "List accessible Ads accounts", status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps })
  }

  // Step 7: Live GAQL query against selected account
  const settings = await getAdsSettings()
  if (!settings?.customerId) {
    steps.push({ id: "live_query", label: "Live Ads query", status: "warn", detail: "No account selected. Choose an account on the setup page, then re-run this test." })
    return NextResponse.json({ ok: false, steps, customerIds })
  }

  try {
    const rows = await searchAds(
      settings.customerId,
      "SELECT campaign.id, campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.status != 'REMOVED' LIMIT 1",
      accessToken,
      settings.loginCustomerId
    )
    steps.push({
      id: "live_query",
      label: `Live query: ${settings.customerName || settings.customerId}`,
      status: "pass",
      detail: `Success. ${rows.length > 0 ? `Campaign "${(rows[0] as { campaign?: { name?: string } }).campaign?.name}" accessible.` : "0 active campaigns in last 7 days — account accessible."}`,
    })
    return NextResponse.json({ ok: true, steps, customerIds, selectedCustomerId: settings.customerId })
  } catch (err) {
    steps.push({ id: "live_query", label: `Live query: ${settings.customerId}`, status: "fail", detail: String(err) })
    return NextResponse.json({ ok: false, steps, customerIds })
  }
}
