import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"

const INDEXNOW_KEY = "a4f8c2b9e1d3f7a5b0c6e2d8f4a1b3c5"
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

const STATIC_URLS = [
  // Core pages
  "/",
  "/about",
  "/contact-us",
  "/factory",
  "/videos",
  "/deployments",

  // Products
  "/products",
  "/products/100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-aa3d69",
  "/products/100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-f377e0",
  "/products/thermal-cold-fogging-machine-100xtfs50-90602f",
  "/products/thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8",
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde",
  "/products/small-mini-fogger-100xkb200-f377e1",
  "/products/passenger-baggage-trolleys-stainless-steel-with-brakes-100xa-00664d",
  "/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1",

  // Spare parts
  "/spare-parts",

  // Blog
  "/blog",

  // Case Studies
  "/case-studies",

  // Compare hub + all pages
  "/compare",
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
  "/compare/double-barrel-vs-single-barrel-thermal-fogger",
  "/compare/fogging-machine-buyer-guide-india",
  "/compare/fogging-machine-export-india",
  "/compare/fogging-machine-for-agricultural-cooperatives",
  "/compare/fogging-machine-for-hospitals-healthcare",
  "/compare/fogging-machine-for-small-municipalities-nagar-panchayat",
  "/compare/iso-certified-fogging-machines-india",
  "/compare/make-in-india-fogging-machines",
  "/compare/msme-fogging-machine-manufacturers-india",
  "/compare/fogging-machine-for-malaria-control-india",

  // Knowledge Hub
  "/knowledge",
  "/knowledge/how-thermal-fogging-works",
  "/knowledge/thermal-vs-ulv-fogging",
  "/knowledge/government-procurement-guide",
  "/knowledge/mosquito-control-india",

  // AI pages
  "/ai/about-100x",
  "/ai/factory",
  "/ai/certifications",
  "/ai/product-catalog",
  "/ai/government-supplies",
  "/ai/manufacturing-capabilities",
  "/ai/scorecard",
  "/ai/entity-graph",

  // Landing pages
  "/power-tiller",
  "/vehicle-mounted-fogging-machine",
  "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "/thermal-and-cold-fogging-machine-100xtfs50",
  "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "/dengue-control-fogging-machine",
  "/gem-approved-fogging-machine-oem",
  "/fogging-machine-supplier-in-bihar",
  "/fogging-machine-supplier-in-uttar-pradesh",
  "/fogging-machine-buying-guide",
  "/thermal-vs-cold-fogging-machine",

  // Policy pages
  "/privacy-policy",
  "/terms-and-conditions",
  "/return-policy",
  "/shipping-policy",
  "/warranty-policy",
  "/refund-policy",
  "/disclaimer",
  "/cookie-policy",
]

// GET: returns current key info + URL count
export async function GET() {
  return NextResponse.json({
    key: INDEXNOW_KEY,
    key_location: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    host: new URL(SITE_URL).hostname,
    static_url_count: STATIC_URLS.length,
    message: "POST to this endpoint with x-admin-secret header to trigger IndexNow submission. Dynamic URLs (blogs, case studies, spare parts) are fetched from DB at submission time.",
    endpoint: INDEXNOW_ENDPOINT,
  })
}

// POST: submit all URLs to IndexNow
export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret")
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || auth !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let urlsToSubmit = STATIC_URLS.map((path) => `${SITE_URL}${path}`)

  // Fetch dynamic URLs from DB
  try {
    const client = await clientPromise
    const db = client.db()

    // Blog posts
    const blogs = await db.collection("blogs").find({ isPublished: true }, { projection: { slug: 1 } }).toArray()
    for (const b of blogs) {
      if (b.slug) urlsToSubmit.push(`${SITE_URL}/blog/${b.slug}`)
    }

    // Case studies
    const caseStudies = await db.collection("case_studies").find({ published: true }, { projection: { slug: 1 } }).toArray()
    for (const c of caseStudies) {
      if (c.slug) urlsToSubmit.push(`${SITE_URL}/case-studies/${c.slug}`)
    }
  } catch {
    // proceed with static list if DB unavailable
  }

  // Accept additional URLs from request body
  try {
    const body = await req.json()
    if (Array.isArray(body.urls)) {
      urlsToSubmit = [...new Set([...urlsToSubmit, ...body.urls.filter((u: unknown) => typeof u === "string")])]
    }
  } catch {
    // use built list
  }

  // Deduplicate
  urlsToSubmit = [...new Set(urlsToSubmit)]

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
      urls: urlsToSubmit,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: "IndexNow submission failed", detail: String(err) },
      { status: 502 },
    )
  }
}
