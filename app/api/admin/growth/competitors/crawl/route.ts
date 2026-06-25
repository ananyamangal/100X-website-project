/**
 * POST /api/admin/growth/competitors/crawl
 *
 * Lightweight HTTP-based competitor website crawler.
 * No browser required — uses fetch + regex HTML parsing.
 *
 * Extracts: title, meta description, H1, canonical, schema types,
 * internal link count, has pricing/dealer/gov pages, content hash.
 * Detects changes vs previous crawl stored in competitor_snapshots.
 */
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/mongodb"

const DB = "100xDB"

interface CrawlResult {
  url:         string
  reachable:   boolean
  statusCode?: number
  title?:      string
  metaDesc?:   string
  h1?:         string
  canonical?:  string
  schemaTypes: string[]
  linkCount:   number
  hasPricing:  boolean
  hasDealers:  boolean
  hasGov:      boolean
  hasDownloads:boolean
  contentHash: string
  crawledAt:   string
  durationMs:  number
  error?:      string
}

interface ChangeRecord {
  field:    string
  previous: string
  current:  string
}

// ── HTML extraction helpers ────────────────────────────────────────────────────
function extract(html: string, re: RegExp): string {
  return (html.match(re)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
}

function parseHtml(html: string) {
  const title      = extract(html, /<title[^>]*>([^<]{1,200})<\/title>/i)
  const metaDesc   = extract(html, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']{1,300})["']/i)
               || extract(html, /<meta[^>]*content=["']([^"']{1,300})["'][^>]*name=["']description["']/i)
  const h1         = extract(html, /<h1[^>]*>([^<]{1,150})<\/h1>/i)
  const canonical  = extract(html, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']{1,300})["']/i)

  const schemaTypes: string[] = []
  const schemaRe   = /"@type"\s*:\s*"([^"]+)"/g
  let m
  while ((m = schemaRe.exec(html)) !== null) schemaTypes.push(m[1])

  const allLinks   = [...html.matchAll(/href=["']([^"'#?]{4,})/g)].map(m => m[1])
  const linkCount  = allLinks.length

  const hasPricing  = /price|pricing|quote|quotation|tariff/i.test(html)
  const hasDealers  = /dealer|distributor|channel\s*partner|authorized\s*partner/i.test(html)
  const hasGov      = /government|gem\.gov|tender|GeM|municipal|defence/i.test(html)
  const hasDownloads = /\.pdf|brochure|catalogue|catalog|download/i.test(html)

  const contentHash = createHash("md5").update(html.slice(0, 50_000)).digest("hex")

  return { title, metaDesc, h1, canonical, schemaTypes: [...new Set(schemaTypes)], linkCount, hasPricing, hasDealers, hasGov, hasDownloads, contentHash }
}

// ── Crawl a single URL ────────────────────────────────────────────────────────
async function crawlUrl(url: string): Promise<CrawlResult> {
  const start = Date.now()
  const crawledAt = new Date().toISOString()

  // Ensure https
  const normalized = url.startsWith("http") ? url : `https://${url}`

  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 10_000) // 10s timeout

    const res = await fetch(normalized, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; 100xCircle-Intelligence/1.0; +https://100xcircle.com)",
        "Accept":     "text/html",
      },
      redirect: "follow",
    })
    clearTimeout(tid)

    const html = await res.text()
    const parsed = parseHtml(html)

    return {
      url: normalized,
      reachable:   true,
      statusCode:  res.status,
      crawledAt,
      durationMs:  Date.now() - start,
      ...parsed,
    }
  } catch (e: unknown) {
    return {
      url:         normalized,
      reachable:   false,
      schemaTypes: [],
      linkCount:   0,
      hasPricing:  false,
      hasDealers:  false,
      hasGov:      false,
      hasDownloads:false,
      contentHash: "",
      crawledAt,
      durationMs:  Date.now() - start,
      error:       e instanceof Error ? e.message : String(e),
    }
  }
}

// ── Detect changes vs previous crawl ─────────────────────────────────────────
function detectChanges(prev: CrawlResult | null, curr: CrawlResult): ChangeRecord[] {
  if (!prev) return []
  const changes: ChangeRecord[] = []
  const fields = ["title", "metaDesc", "h1", "canonical", "contentHash", "hasPricing", "hasDealers", "hasGov"] as const
  for (const f of fields) {
    const p = String(prev[f] ?? "")
    const c = String(curr[f] ?? "")
    if (p !== c) changes.push({ field: f, previous: p, current: c })
  }
  return changes
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({})) as { limit?: number; filter?: string }
  const limit  = Math.min(body.limit ?? 10, 20)  // max 20 per run (rate limiting)
  const filter = body.filter                      // "oem" | "dealer" | undefined

  const client = await clientPromise
  const db     = client.db(DB)

  // Fetch competitors with websites
  const query: Record<string, unknown> = { website: { $exists: true, $ne: null } }
  if (filter) query.competitor_type = filter

  const competitors = await db.collection("seo_competitors")
    .find(query, { projection: { name: 1, website: 1, competitor_type: 1 } })
    .limit(limit)
    .toArray()

  if (competitors.length === 0) {
    return NextResponse.json({ ok: true, summary: "No competitors with websites found", crawled: 0, changed: 0 })
  }

  const today   = new Date().toISOString().slice(0, 10)
  const execId  = `crawl_${today}_${Date.now()}`
  const t0      = Date.now()
  const results: Array<{ name: string; changes: ChangeRecord[]; result: CrawlResult }> = []

  for (const comp of competitors) {
    const website = comp.website as string

    // Fetch previous crawl for change detection
    const prevSnap = await db.collection("competitor_snapshots").findOne(
      { "crawl_data.url": { $regex: website.replace(/https?:\/\//, "").split("/")[0] } },
      { sort: { date: -1 }, projection: { crawl_data: 1 } }
    )
    const prevCrawl = prevSnap?.crawl_data ?? null

    // Crawl
    const crawlResult = await crawlUrl(website)
    const changes     = detectChanges(prevCrawl, crawlResult)

    results.push({ name: comp.name as string, changes, result: crawlResult })

    // Upsert snapshot with crawl data
    await db.collection("competitor_snapshots").updateOne(
      { date: today, competitor_name: comp.name },
      { $set: {
        date:             today,
        competitor_name:  comp.name,
        competitor_type:  comp.competitor_type,
        website,
        crawl_data:       crawlResult,
        changes,
        hasChanges:       changes.length > 0,
        executionId:      execId,
        createdAt:        new Date().toISOString(),
        version:          "v1.4",
      }},
      { upsert: true }
    )

    // Log significant changes
    if (changes.length > 0) {
      await db.collection("growth_os_logs").insertOne({
        ts:       new Date().toISOString(),
        agent:    "website-crawler",
        action:   "competitor_page_changed",
        module:   "competitors",
        level:    "warn",
        competitor: comp.name,
        website,
        changes,
        executionId: execId,
      })
    }
  }

  // Write summary log
  const changedCount = results.filter(r => r.changes.length > 0).length
  const unreachable  = results.filter(r => !r.result.reachable).length

  await db.collection("growth_os_logs").insertOne({
    ts:          new Date().toISOString(),
    agent:       "website-crawler",
    action:      "competitor_crawl_complete",
    module:      "competitors",
    level:       "info",
    crawled:     results.length,
    changed:     changedCount,
    unreachable,
    durationMs:  Date.now() - t0,
    executionId: execId,
  })

  const summary = `Crawled ${results.length} sites — ${changedCount} changed, ${unreachable} unreachable (${Date.now() - t0}ms)`

  return NextResponse.json({
    ok:          true,
    executionId: execId,
    summary,
    crawled:     results.length,
    changed:     changedCount,
    unreachable,
    durationMs:  Date.now() - t0,
    results: results.map(r => ({
      name:      r.name,
      url:       r.result.url,
      reachable: r.result.reachable,
      title:     r.result.title,
      changes:   r.changes,
      durationMs:r.result.durationMs,
    })),
  })
}

// ── GET handler — return crawl results ────────────────────────────────────────
export async function GET() {
  const client = await clientPromise
  const db     = client.db(DB)

  // Get most recent crawl per competitor
  const results = await db.collection("competitor_snapshots")
    .find({ crawl_data: { $exists: true } })
    .sort({ date: -1, createdAt: -1 })
    .limit(100)
    .toArray()

  const byComp: Record<string, typeof results[number]> = {}
  for (const r of results) {
    const k = String(r.competitor_name ?? r.date)
    if (!byComp[k]) byComp[k] = r
  }

  return NextResponse.json({
    crawlResults: Object.values(byComp).map(r => ({
      id:           String(r._id),
      name:         r.competitor_name,
      type:         r.competitor_type,
      website:      r.website,
      date:         r.date,
      reachable:    r.crawl_data?.reachable ?? false,
      title:        r.crawl_data?.title,
      hasChanges:   r.hasChanges ?? false,
      changes:      r.changes ?? [],
      durationMs:   r.crawl_data?.durationMs,
    })),
    totalCrawled: Object.keys(byComp).length,
  })
}
