import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

const SITE_URL = "https://www.100xcircle.com"
const SITE_DOMAIN = "100xcircle.com"

async function fetchSitemapEntries(): Promise<Array<{ path: string; priority: number }>> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${SITE_URL}/sitemap.xml`, {
      signal: controller.signal,
      headers: { "User-Agent": "100XCircle-GrowthOS-LinkBot/1.0", "Cache-Control": "no-cache" },
    })
    clearTimeout(timer)
    if (!res.ok) return []
    const xml = await res.text()

    // Parse <url><loc>...</loc><priority>...</priority></url> blocks
    const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    return urlBlocks.flatMap(block => {
      const locMatch = block[1].match(/<loc>([\s\S]*?)<\/loc>/)
      const prioMatch = block[1].match(/<priority>([\s\S]*?)<\/priority>/)
      if (!locMatch) return []
      const url = locMatch[1].trim()
      if (!url.startsWith(SITE_URL)) return []
      const path = url.replace(SITE_URL, "") || "/"
      const priority = prioMatch ? parseFloat(prioMatch[1]) : 0.5
      return [{ path, priority }]
    })
  } catch {
    return []
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
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
  const absoluteRe = new RegExp(
    `href=["']https?://(?:www\\.)?${SITE_DOMAIN}(/[^"'#?]*)[^"']*["']`,
    "gi"
  )
  const relativeRe = /href=["'](\/[^"'#?][^"']*)[^"']*["']/gi

  for (const re of [absoluteRe, relativeRe]) {
    let m
    while ((m = re.exec(html)) !== null) {
      const path = m[1]
      if (!path) continue
      if (path.startsWith("/api/") || path.startsWith("/_next/") || path.startsWith("/admin/")) continue
      if (/\.(json|xml|pdf|jpg|png|svg|ico|css|js)$/.test(path)) continue
      const clean = path.replace(/\/$/, "") || "/"
      links.add(clean)
    }
  }
  return [...links]
}

export interface InternalLinkResult {
  summary: string
  sourcesAnalyzed: number
  authorityPagesTracked: number
  orphanPages: Array<{ path: string; priority: number; addLinkFrom: string[] }>
  weakPages: Array<{ path: string; priority: number; inboundCount: number; linkedBy: string[]; addLinkFrom: string[] }>
  strongPages: Array<{ path: string; inboundCount: number }>
  recommendations: Array<{ from: string; to: string; reason: string }>
}

export async function runInternalLinkAgent(): Promise<InternalLinkResult> {
  const db = (await clientPromise).db()

  // Get all sitemap entries
  const entries = await fetchSitemapEntries()
  if (entries.length === 0) {
    return {
      summary: "Could not fetch sitemap — audit skipped.",
      sourcesAnalyzed: 0, authorityPagesTracked: 0,
      orphanPages: [], weakPages: [], strongPages: [], recommendations: [],
    }
  }

  // Authority pages to track inbound links for: priority >= 0.8
  const authorityPaths = entries
    .filter(e => e.priority >= 0.8 && !e.path.startsWith("/blog/") && !e.path.startsWith("/knowledge/") && !e.path.startsWith("/compare/") && !e.path.startsWith("/products/"))
    .map(e => e.path)

  // Source pages to crawl: high-priority hubs (priority >= 0.75), capped at 18
  const sourcePaths = entries
    .filter(e => e.priority >= 0.75 && !e.path.startsWith("/blog/") && !e.path.startsWith("/knowledge/") && !e.path.startsWith("/compare/") && !e.path.startsWith("/products/") && !e.path.startsWith("/ai/"))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 18)
    .map(e => e.path)

  // Initialize inbound link map
  const inboundLinks: Record<string, string[]> = {}
  for (const p of authorityPaths) inboundLinks[p] = []

  // Crawl source pages in batches of 4
  const crawledLinks: Record<string, string[]> = {}
  for (let i = 0; i < sourcePaths.length; i += 4) {
    const batch = sourcePaths.slice(i, i + 4)
    const results = await Promise.allSettled(
      batch.map(async path => {
        const html = await fetchPage(`${SITE_URL}${path}`)
        return { path, links: html ? extractInternalLinks(html) : [] }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") {
        crawledLinks[r.value.path] = r.value.links
        for (const link of r.value.links) {
          // Exclude self-links — a page linking to itself doesn't count as an inbound link
          if (inboundLinks[link] !== undefined && link !== r.value.path && !inboundLinks[link].includes(r.value.path)) {
            inboundLinks[link].push(r.value.path)
          }
        }
      }
    }
    if (i + 4 < sourcePaths.length) await new Promise(r => setTimeout(r, 150))
  }

  // Build priority map for authority pages
  const priorityMap: Record<string, number> = {}
  for (const e of entries) priorityMap[e.path] = e.priority

  // Classify pages
  const orphanPages: InternalLinkResult["orphanPages"] = []
  const weakPages: InternalLinkResult["weakPages"] = []
  const strongPages: InternalLinkResult["strongPages"] = []

  for (const path of authorityPaths) {
    const inbound = inboundLinks[path] || []
    const prio = priorityMap[path] || 0.5
    if (inbound.length === 0) {
      // Find 2 most relevant source pages to add links from
      const candidates = sourcePaths.filter(s => s !== path && !inbound.includes(s)).slice(0, 3)
      orphanPages.push({ path, priority: prio, addLinkFrom: candidates })
    } else if (inbound.length <= 2) {
      const candidates = sourcePaths.filter(s => s !== path && !inbound.includes(s)).slice(0, 2)
      weakPages.push({ path, priority: prio, inboundCount: inbound.length, linkedBy: inbound, addLinkFrom: candidates })
    } else {
      strongPages.push({ path, inboundCount: inbound.length })
    }
  }

  // Sort by priority descending
  orphanPages.sort((a, b) => b.priority - a.priority)
  weakPages.sort((a, b) => b.priority - a.priority)
  strongPages.sort((a, b) => b.inboundCount - a.inboundCount)

  // Generate specific recommendations
  const recommendations: InternalLinkResult["recommendations"] = []
  for (const orphan of orphanPages.slice(0, 5)) {
    for (const from of orphan.addLinkFrom.slice(0, 2)) {
      recommendations.push({
        from,
        to: orphan.path,
        reason: `${orphan.path} has 0 inbound links — add from ${from} (high-traffic hub)`,
      })
    }
  }
  for (const weak of weakPages.slice(0, 3)) {
    const from = weak.addLinkFrom[0]
    if (from) {
      recommendations.push({
        from,
        to: weak.path,
        reason: `${weak.path} has only ${weak.inboundCount} inbound link${weak.inboundCount > 1 ? "s" : ""} — strengthen with link from ${from}`,
      })
    }
  }

  // Create opportunities for orphan authority pages
  for (const orphan of orphanPages.filter(p => p.priority >= 0.85).slice(0, 4)) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: `internal.?link.*${orphan.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" } },
      {
        $setOnInsert: {
          title: `Link orphan page: ${orphan.path}`,
          description: `${orphan.path} (priority ${orphan.priority}) has 0 inbound internal links from any tracked page. Crawlers cannot discover it. Add links from: ${orphan.addLinkFrom.slice(0, 2).join(", ")}.`,
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
        },
      },
      { upsert: true }
    )
  }

  // Persist results
  await db.collection("growth_os_link_graph").replaceOne(
    { _type: "latest" },
    {
      _type: "latest",
      inboundLinks,
      orphanPages,
      weakPages,
      strongPages,
      recommendations,
      sourcesAnalyzed: Object.keys(crawledLinks).length,
      authorityPagesTracked: authorityPaths.length,
      auditedAt: new Date().toISOString(),
    },
    { upsert: true }
  )

  const summary = `Crawled ${Object.keys(crawledLinks).length} source pages. Tracked ${authorityPaths.length} authority pages. Orphans: ${orphanPages.length} (0 inbound), Weak: ${weakPages.length} (≤2 inbound), Strong: ${strongPages.length}. ${recommendations.length} specific link recommendations generated.`

  await logAgentRun(db, {
    agent: "Internal Link Agent",
    action: summary,
    reason: "Internal link authority audit from live sitemap",
    expectedImpact: "Improve crawlability and internal PageRank flow to authority pages",
    actualImpact: `${orphanPages.length} orphan pages, ${weakPages.length} weak pages, ${recommendations.length} recommendations`,
    level: orphanPages.length > 0 ? "warning" : "success",
    module: "seo",
    after: JSON.stringify({
      orphans: orphanPages.map(p => p.path),
      weak: weakPages.map(p => p.path),
      recommendations: recommendations.slice(0, 5),
    }),
  })

  return {
    summary,
    sourcesAnalyzed: Object.keys(crawledLinks).length,
    authorityPagesTracked: authorityPaths.length,
    orphanPages,
    weakPages,
    strongPages,
    recommendations,
  }
}
