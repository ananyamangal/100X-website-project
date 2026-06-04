/**
 * POST /api/admin/gsc/test
 * Runs a live connection test against the Google Search Console API.
 * Returns a step-by-step result so the UI can show exactly what failed.
 */
import { NextResponse } from "next/server"
import { getGSCCredentials, getGSCSiteUrl, queryGSC, dateRange } from "@/lib/gsc"

export interface GCSTestResult {
  ok: boolean
  steps: Array<{
    id: string
    label: string
    status: "pass" | "fail" | "skip"
    detail: string
  }>
  siteUrl: string
  serviceAccountEmail?: string
  rowsFetched?: number
  error?: string
}

export async function POST(): Promise<NextResponse> {
  const steps: GCSTestResult["steps"] = []
  const siteUrl = getGSCSiteUrl()

  // Step 1: GOOGLE_SC_KEY present
  const keyRaw = process.env.GOOGLE_SC_KEY
  if (!keyRaw) {
    steps.push({ id: "key_present", label: "GOOGLE_SC_KEY env var", status: "fail", detail: "Not set. Add GOOGLE_SC_KEY in Vercel → Settings → Environment Variables." })
    return NextResponse.json({ ok: false, steps, siteUrl })
  }
  steps.push({ id: "key_present", label: "GOOGLE_SC_KEY env var", status: "pass", detail: "Variable is set." })

  // Step 2: GOOGLE_SC_KEY is valid JSON with required fields
  const creds = getGSCCredentials()
  if (!creds) {
    steps.push({ id: "key_parse", label: "Parse service account JSON", status: "fail", detail: "GOOGLE_SC_KEY could not be parsed as JSON. Paste the full contents of the key file, not a file path." })
    return NextResponse.json({ ok: false, steps, siteUrl })
  }
  if (!creds.private_key || !creds.client_email) {
    steps.push({ id: "key_parse", label: "Parse service account JSON", status: "fail", detail: `Missing fields. Found: ${Object.keys(creds).join(", ")}. Expected: private_key, client_email, token_uri.` })
    return NextResponse.json({ ok: false, steps, siteUrl })
  }
  steps.push({ id: "key_parse", label: "Parse service account JSON", status: "pass", detail: `Parsed OK. Service account: ${creds.client_email}` })

  // Step 3: GOOGLE_SC_SITE_URL present
  const siteUrlEnv = process.env.GOOGLE_SC_SITE_URL
  if (!siteUrlEnv) {
    steps.push({ id: "site_url", label: "GOOGLE_SC_SITE_URL env var", status: "fail", detail: `Not set. Add GOOGLE_SC_SITE_URL=https://www.100xcircle.com/ in Vercel env vars. The trailing slash is required for URL-prefix properties.` })
    return NextResponse.json({ ok: false, steps, siteUrl, serviceAccountEmail: creds.client_email })
  }
  steps.push({ id: "site_url", label: "GOOGLE_SC_SITE_URL env var", status: "pass", detail: `Set to: ${siteUrlEnv}` })

  // Step 4: private_key format check
  const keyStr = creds.private_key
  if (!keyStr.includes("BEGIN") || !keyStr.includes("END")) {
    steps.push({ id: "key_format", label: "Private key format", status: "fail", detail: `Private key does not look like a PEM key. Check that \\n sequences in the JSON are actual newlines, not escaped. Current value starts with: ${keyStr.slice(0, 40)}` })
    return NextResponse.json({ ok: false, steps, siteUrl, serviceAccountEmail: creds.client_email })
  }
  steps.push({ id: "key_format", label: "Private key format", status: "pass", detail: "PEM format detected." })

  // Step 5: OAuth2 token exchange
  try {
    const { startDate, endDate } = dateRange(7)
    let rowsFetched = 0
    try {
      const rows = await queryGSC({ startDate, endDate, dimensions: ["query"], rowLimit: 1 })
      rowsFetched = rows.length
      steps.push({ id: "auth", label: "OAuth2 token exchange", status: "pass", detail: "Access token obtained from Google." })
      // Step 6: GSC query succeeded
      steps.push({
        id: "gsc_query",
        label: `Query Search Console (${siteUrlEnv})`,
        status: "pass",
        detail: rowsFetched > 0
          ? `Success. ${rowsFetched} row(s) returned for the last 7 days.`
          : `Success. 0 rows returned — GSC access confirmed but no query data in the last 7 days. This is normal for new properties or very low traffic periods.`,
      })
      return NextResponse.json({ ok: true, steps, siteUrl, serviceAccountEmail: creds.client_email, rowsFetched })
    } catch (queryErr) {
      const msg = String(queryErr)
      if (msg.includes("403")) {
        steps.push({ id: "auth", label: "OAuth2 token exchange", status: "pass", detail: "Access token obtained." })
        steps.push({
          id: "gsc_query",
          label: `Query Search Console (${siteUrlEnv})`,
          status: "fail",
          detail: `403 Forbidden. The service account (${creds.client_email}) does not have access to ${siteUrlEnv}. In Google Search Console → Settings → Users and permissions → add ${creds.client_email} as Owner.`,
        })
      } else if (msg.includes("404")) {
        steps.push({ id: "auth", label: "OAuth2 token exchange", status: "pass", detail: "Access token obtained." })
        steps.push({
          id: "gsc_query",
          label: `Query Search Console (${siteUrlEnv})`,
          status: "fail",
          detail: `404 Not Found. The site URL ${siteUrlEnv} is not a verified property in this Google account. Check GOOGLE_SC_SITE_URL — it must match the property URL exactly as it appears in Search Console (including or excluding www, and trailing slash).`,
        })
      } else if (msg.includes("token error") || msg.includes("401")) {
        steps.push({
          id: "auth",
          label: "OAuth2 token exchange",
          status: "fail",
          detail: `Token exchange failed: ${msg.slice(0, 200)}. The private_key or client_email in GOOGLE_SC_KEY may be invalid, or the Search Console API is not enabled in your Google Cloud project.`,
        })
      } else {
        steps.push({ id: "auth", label: "OAuth2 token exchange + GSC query", status: "fail", detail: msg.slice(0, 300) })
      }
      return NextResponse.json({ ok: false, steps, siteUrl, serviceAccountEmail: creds.client_email, error: msg.slice(0, 200) })
    }
  } catch (authErr) {
    steps.push({
      id: "auth",
      label: "OAuth2 token exchange",
      status: "fail",
      detail: `Unexpected error: ${String(authErr).slice(0, 200)}`,
    })
    return NextResponse.json({ ok: false, steps, siteUrl, serviceAccountEmail: creds.client_email, error: String(authErr).slice(0, 200) })
  }
}
