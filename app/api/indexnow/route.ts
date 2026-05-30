import { NextRequest, NextResponse } from "next/server"
import { SITE_URL } from "@/lib/seo/site-config"

const INDEXNOW_KEY = "a4f8c2b9e1d3f7a5b0c6e2d8f4a1b3c5"
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

// All site URLs eligible for IndexNow submission
const STATIC_URLS = [
  "/",
  "/about",
  "/products",
  "/blog",
  "/contact-us",
  "/factory",
  "/case-studies",
  "/compare",
  "/knowledge",
  "/knowledge/how-thermal-fogging-works",
  "/knowledge/thermal-vs-ulv-fogging",
  "/knowledge/government-procurement-guide",
  "/knowledge/mosquito-control-india",
  "/ai/about-100x",
  "/ai/factory",
  "/ai/certifications",
  "/ai/product-catalog",
  "/ai/government-supplies",
  "/ai/manufacturing-capabilities",
  "/ai/scorecard",
  "/ai/entity-graph",
  "/power-tiller",
  "/vehicle-mounted-fogging-machine",
  "/compare/100x-circle-vs-korean-fogging-machines",
  "/compare/100x-circle-vs-german-fogging-machines",
  "/compare/vehicle-mounted-vs-portable-thermal-fogger",
  "/compare/best-thermal-fogging-machine-for-municipal-use",
  "/compare/best-thermal-fogger-for-agriculture-india",
  "/compare/fogging-machine-for-dengue-control-india",
  "/compare/fogging-machine-for-malaria-control-india",
  "/compare/gem-fogging-machines-india",
  "/compare/fogging-machine-for-pest-control-companies",
  "/compare/fogging-machine-price-guide-india-2026",
]

// GET: returns current key info + URL count
export async function GET() {
  return NextResponse.json({
    key: INDEXNOW_KEY,
    key_location: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    host: new URL(SITE_URL).hostname,
    static_url_count: STATIC_URLS.length,
    message: "POST to this endpoint with { submit: true } to trigger IndexNow submission for all static URLs. Product/blog URLs are submitted on demand.",
    endpoint: INDEXNOW_ENDPOINT,
  })
}

// POST: submit URLs to IndexNow
export async function POST(req: NextRequest) {
  // Require admin secret to prevent abuse
  const auth = req.headers.get("x-admin-secret")
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || auth !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let urlsToSubmit = STATIC_URLS.map((path) => `${SITE_URL}${path}`)

  // Accept additional URLs from request body
  try {
    const body = await req.json()
    if (Array.isArray(body.urls)) {
      urlsToSubmit = [...new Set([...urlsToSubmit, ...body.urls.filter((u: unknown) => typeof u === "string")])]
    }
  } catch {
    // use static list
  }

  const hostname = new URL(SITE_URL).hostname

  const payload = {
    host: hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urlsToSubmit,
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      submitted_count: urlsToSubmit.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: "IndexNow submission failed", detail: String(err) },
      { status: 502 },
    )
  }
}
