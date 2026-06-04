import clientPromise from "@/lib/mongodb"

const SITE_URL = "https://www.100xcircle.com"
const SITE_DOMAIN = "100xcircle.com"

// Authority pages we care about for the link graph
const TRACKED_PATHS = [
  "/gem-oem-authorization",
  "/become-a-dealer",
  "/dealer-application",
  "/gem-tender-support",
  "/is-14855-fogging-machine",
  "/municipal-fogging-programme",
  "/nhm-fogging-machine",
  "/nvbdcp-fogging-machine",
  "/vector-control-equipment",
  "/fogging-machine-for-nagar-panchayat",
  "/gem-reverse-auction-fogging",
  "/make-in-india-fogging-machine",
  "/dealers-and-government",
  "/public-health-equipment",
  "/knowledge/gem-oem-authorization-process",
  "/knowledge/gem-reseller-guide",
  "/knowledge/government-procurement-guide",
  "/knowledge/fogging-machine-for-pest-control-business",
]

// Pages to crawl FROM (the ones that should contain internal links)
const SOURCE_PAGES = [
  "/",
  "/gem-oem-authorization",
  "/become-a-dealer",
  "/dealers-and-government",
  "/gem-tender-support",
  "/is-14855-fogging-machine",
  "/municipal-fogging-programme",
  "/nhm-fogging-machine",
  "/nvbdcp-fogging-machine",
  "/vector-control-equipment",
  "/fogging-machine-for-nagar-panchayat",
  "/gem-reverse-auction-fogging",
  "/make-in-india-fogging-machine",
  "/public-health-equipment",
]

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "100XCircle-GrowthOS-LinkBot/1.0", "Cache-Control": "no-cache" },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractInternalLinks(html: string): string[] {
  const links = new Set<string>()
  // Match href="..." patterns
  const patterns = [
    /href=["'](\/[^"'#?]*)[^"']*["']/g,
    new RegExp(`href=["']https?://(www\\.)?${SITE_DOMAIN}(/[^"'#?]*)[^"']*["']`, 'g'),
  ]
  for (const pattern of patterns) {
    let match
    const re = new RegExp(pattern.source, pattern.flags)
    while ((match = re.exec(html)) !== null) {
      const path = match[1].startsWith("/") ? match[1] : match[2]
      if (!path) continue
      // Filter out non-page paths
      if (path.startsWith("/api/") || path.startsWith("/_next/") || path.startsWith("/admin/")) continue
      if (path.endsWith(".json") || path.endsWith(".xml") || path.endsWith(".pdf")) continue
      // Normalize trailing slashes
      const clean = path.replace(/\/$/, "") || "/"
      links.add(clean)
    }
  }
  return [...links]
}

export interface InternalLinkResult {
  summary: string
  pagesCrawled: number
  orphanPages: string[]
  weakPages: Array<{ path: string; inboundCount: number; linkedBy: string[] }>
  linkGraph: Record<string, string[]>
  recommendations: string[]
}

export async function runInternalLinkAgent(): Promise<InternalLinkResult> {
  const db = (await clientPromise).db()

  // Crawl source pages in batches of 3
  const crawlResults: Record<string, string[]> = {}
  for (let i = 0; i < SOURCE_PAGES.length; i += 3) {
    const batch = SOURCE_PAGES.slice(i, i + 3)
    const results = await Promise.allSettled(
      batch.map(async path => {
        const html = await fetchPage(`${SITE_URL}${path}`)
        return { path, links: html ? extractInternalLinks(html) : [] }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") {
        crawlResults[r.value.path] = r.value.links
      }
    }
    if (i + 3 < SOURCE_PAGES.length) await new Promise(r => setTimeout(r, 200))
  }

  // Build inbound link count for tracked pages
  const inboundLinks: Record<string, string[]> = {}
  for (const tracked of TRACKED_PATHS) {
    inboundLinks[tracked] = []
  }

  for (const [sourcePath, links] of Object.entries(crawlResults)) {
    for (const link of links) {
      if (inboundLinks[link] !== undefined) {
        if (!inboundLinks[link].includes(sourcePath)) {
          inboundLinks[link].push(sourcePath)
        }
      }
    }
  }

  // Find orphan pages (0 inbound links from tracked sources)
  const orphanPages = TRACKED_PATHS.filter(p => inboundLinks[p]?.length === 0)
  const weakPages = TRACKED_PATHS
    .filter(p => inboundLinks[p]?.length === 1)
    .map(p => ({ path: p, inboundCount: 1, linkedBy: inboundLinks[p] }))

  // Build recommendations
  const recommendations: string[] = []
  if (orphanPages.length > 0) {
    recommendations.push(`Orphan pages (0 inbound links): ${orphanPages.join(", ")} — add links from relevant pages`)
  }
  if (weakPages.length > 0) {
    recommendations.push(`Weak pages (1 inbound link): ${weakPages.map(p => p.path).join(", ")} — add 1-2 more inbound links`)
  }

  // Create opportunities for orphan pages
  for (const page of orphanPages.slice(0, 3)) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: `Internal link.*${page}`, $options: "i" } },
      {
        $setOnInsert: {
          title: `Add internal links to orphan page: ${page}`,
          description: `The page ${page} has 0 inbound internal links from other tracked pages. It cannot be discovered by crawlers or users browsing the site. Add at least 2 links from related pages.`,
          module: "seo",
          source: "agent",
          businessValue: "medium",
          seoValue: "high",
          geoValue: "low",
          dealerImpact: "medium",
          effort: "low",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    )
  }

  // Store results
  await db.collection("growth_os_link_graph").replaceOne(
    { _type: "latest" },
    { _type: "latest", inboundLinks, orphanPages, weakPages, auditedAt: new Date().toISOString() },
    { upsert: true }
  )

  const summary = `Crawled ${Object.keys(crawlResults).length} pages. Tracked ${TRACKED_PATHS.length} authority pages. Orphans: ${orphanPages.length}, Weak: ${weakPages.length}.${orphanPages.length > 0 ? ` Fix: ${orphanPages.slice(0, 3).join(", ")}` : " All pages linked."}`

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "Internal Link Agent",
    action: `Link audit: ${orphanPages.length} orphan pages, ${weakPages.length} weak pages`,
    reason: "Internal link authority analysis",
    expectedImpact: "Improve crawlability and internal PageRank distribution",
    actualImpact: `${recommendations.length} recommendations generated`,
    level: orphanPages.length > 0 ? "warning" : "success",
    module: "seo",
    after: JSON.stringify({ orphanPages, weakPages: weakPages.map(p => p.path) }),
  })

  return {
    summary,
    pagesCrawled: Object.keys(crawlResults).length,
    orphanPages,
    weakPages,
    linkGraph: inboundLinks,
    recommendations,
  }
}
