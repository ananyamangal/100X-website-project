/**
 * POST /api/admin/gsc/submit-sitemap?token=<one-time-secret>
 *
 * One-shot: submit sitemap.xml to GSC. Protected by a hard-coded one-time
 * token (not a user password). DELETE THIS FILE after use.
 */
import { NextRequest, NextResponse } from "next/server"
import { getValidAccessToken } from "@/lib/google-oauth"
import { getGSCSiteUrl } from "@/lib/gsc"

const ONE_TIME_TOKEN = "gsc-submit-a7f3d9e2-4b1c-48f0-9a6b-2d5e8c1f0374"

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const siteUrl    = getGSCSiteUrl()
  const sitemapUrl = `${siteUrl.replace(/\/$/, "")}/sitemap.xml`
  const timestamp  = new Date().toISOString()

  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), timestamp }, { status: 500 })
  }

  const encodedSite    = encodeURIComponent(siteUrl)
  const encodedSitemap = encodeURIComponent(sitemapUrl)
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Length": "0" },
  })

  let body = ""
  try { body = await res.text() } catch { /* empty */ }

  return NextResponse.json({
    ok: res.status === 200 || res.status === 204,
    property: siteUrl,
    sitemapUrl,
    httpStatus: res.status,
    httpStatusText: res.statusText,
    responseBody: body || "(empty — success)",
    timestamp,
  }, { status: res.ok ? 200 : res.status })
}
