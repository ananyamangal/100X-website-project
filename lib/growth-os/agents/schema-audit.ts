import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

const SITE_URL = "https://www.100xcircle.com"

// URL pattern → expected JSON-LD types + priority
function getExpected(path: string): { types: string[]; priority: "high" | "medium" | "low" } {
  if (path === "/") return { types: ["Organization", "WebSite", "LocalBusiness"], priority: "high" }

  const highFAQ = [
    "/gem-oem-authorization", "/become-a-dealer", "/gem-tender-support",
    "/dealer-application", "/dealers-and-government", "/is-14855-fogging-machine",
  ]
  if (highFAQ.includes(path)) return { types: ["FAQPage"], priority: "high" }

  const highProduct = [
    "/nhm-fogging-machine", "/nvbdcp-fogging-machine", "/municipal-fogging-programme",
    "/public-health-equipment", "/vector-control-equipment", "/fogging-machine-for-nagar-panchayat",
  ]
  if (highProduct.includes(path)) return { types: ["Product", "FAQPage"], priority: "high" }

  const medProduct = [
    "/gem-reverse-auction-fogging", "/make-in-india-fogging-machine",
    "/power-tiller", "/vehicle-mounted-fogging-machine",
  ]
  if (medProduct.includes(path)) return { types: ["Product", "FAQPage"], priority: "medium" }

  if (path.startsWith("/products/") && path !== "/products") return { types: ["Product"], priority: "medium" }
  if (path.startsWith("/blog/") && path !== "/blog") return { types: ["Article"], priority: "low" }
  if (path.startsWith("/knowledge/") && path !== "/knowledge") return { types: ["Article"], priority: "low" }

  return { types: [], priority: "low" }
}

async function fetchSitemapPaths(): Promise<string[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${SITE_URL}/sitemap.xml`, {
      signal: controller.signal,
      headers: { "User-Agent": "100XCircle-GrowthOS-SchemaAudit/1.0", "Cache-Control": "no-cache" },
    })
    clearTimeout(timer)
    if (!res.ok) return []
    const xml = await res.text()
    const matches = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)]
    return matches
      .map(m => m[1].trim())
      .filter(url => url.startsWith(SITE_URL))
      .map(url => {
        const path = url.replace(SITE_URL, "")
        return path === "" ? "/" : path
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
      headers: { "User-Agent": "100XCircle-GrowthOS-SchemaAudit/1.0", "Cache-Control": "no-cache" },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseJsonLd(html: string): { types: string[]; invalid: boolean } {
  const types: string[] = []
  let invalid = false
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const pushType = (t: unknown) => {
          if (typeof t === "string") types.push(t)
          else if (Array.isArray(t)) t.forEach(x => typeof x === "string" && types.push(x))
        }
        pushType(item["@type"])
        if (item["@graph"]) {
          for (const g of item["@graph"]) pushType(g["@type"])
        }
      }
    } catch {
      invalid = true
    }
  }
  return { types: [...new Set(types)], invalid }
}

export interface SchemaAuditResult {
  summary: string
  pagesFromSitemap: number
  pagesAudited: number
  findings: {
    noSchema: string[]
    invalidSchema: string[]
    missingFAQ: string[]
    missingProduct: string[]
    passing: string[]
  }
  details: Array<{
    path: string
    priority: "high" | "medium" | "low"
    foundTypes: string[]
    missingTypes: string[]
    status: "pass" | "partial" | "no_schema" | "invalid" | "error"
  }>
}

export async function runSchemaAuditAgent(): Promise<SchemaAuditResult> {
  const db = (await clientPromise).db()

  // Fetch live sitemap
  const allPaths = await fetchSitemapPaths()

  // Audit only pages with schema expectations, capped to avoid timeout
  const toAudit = allPaths
    .map(path => ({ path, ...getExpected(path) }))
    .filter(p => p.types.length > 0)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 30) // 30 pages × ~7s timeout = max ~3.5 min; batched in 5s

  const details: SchemaAuditResult["details"] = []
  const findings: SchemaAuditResult["findings"] = {
    noSchema: [], invalidSchema: [], missingFAQ: [], missingProduct: [], passing: [],
  }

  // Fetch in batches of 4
  for (let i = 0; i < toAudit.length; i += 4) {
    const batch = toAudit.slice(i, i + 4)
    const results = await Promise.allSettled(
      batch.map(async ({ path, types, priority }) => {
        const html = await fetchPage(`${SITE_URL}${path}`)
        if (!html) return { path, priority, foundTypes: [], missingTypes: types, status: "error" as const }
        const { types: found, invalid } = parseJsonLd(html)
        const missing = types.filter(t => !found.includes(t))
        let status: SchemaAuditResult["details"][0]["status"]
        if (invalid && found.length === 0) status = "invalid"
        else if (found.length === 0) status = "no_schema"
        else if (missing.length === 0) status = "pass"
        else status = "partial"
        return { path, priority, foundTypes: found, missingTypes: missing, status }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") details.push(r.value)
    }
    if (i + 4 < toAudit.length) await new Promise(r => setTimeout(r, 150))
  }

  // Categorize findings
  for (const d of details) {
    if (d.status === "no_schema" || d.status === "error") findings.noSchema.push(d.path)
    if (d.status === "invalid") findings.invalidSchema.push(d.path)
    if (d.missingTypes.includes("FAQPage")) findings.missingFAQ.push(d.path)
    if (d.missingTypes.includes("Product")) findings.missingProduct.push(d.path)
    if (d.status === "pass") findings.passing.push(d.path)
  }

  // Create opportunities for high-priority gaps
  const criticalGaps = details.filter(d => d.priority === "high" && d.missingTypes.length > 0)
  for (const gap of criticalGaps.slice(0, 5)) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: `Schema.*${gap.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" } },
      {
        $setOnInsert: {
          title: `Fix schema on ${gap.path}: add ${gap.missingTypes.join(", ")}`,
          description: `Schema audit found missing schemas. Expected: ${gap.missingTypes.join(", ")}. Found: ${gap.foundTypes.join(", ") || "none"}. High-priority page — fix for AI Overview and rich result eligibility.`,
          module: "seo",
          source: "agent",
          businessValue: "medium",
          seoValue: "high",
          geoValue: "high",
          dealerImpact: "low",
          effort: "low",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )
  }

  // Persist full audit results
  await db.collection("growth_os_schema_audit").replaceOne(
    { _type: "latest" },
    {
      _type: "latest",
      findings,
      details,
      pagesFromSitemap: allPaths.length,
      pagesAudited: details.length,
      auditedAt: new Date().toISOString(),
    },
    { upsert: true }
  )

  const totalIssues = findings.noSchema.length + findings.invalidSchema.length + findings.missingFAQ.length + findings.missingProduct.length
  const summary = `Audited ${details.length} pages (${allPaths.length} in sitemap). ${findings.passing.length} passing, ${totalIssues} total issues — ${findings.missingFAQ.length} missing FAQ schema, ${findings.missingProduct.length} missing Product schema, ${findings.noSchema.length} with no JSON-LD.`

  await logAgentRun(db, {
    agent: "Schema Audit Agent",
    action: summary,
    reason: "Live sitemap schema verification",
    expectedImpact: "Fix JSON-LD gaps for rich results and AI Overview eligibility",
    actualImpact: `${totalIssues} issues across ${details.length} pages`,
    level: totalIssues > 0 ? "warning" : "success",
    module: "seo",
    after: JSON.stringify({
      passing: findings.passing.length,
      noSchema: findings.noSchema,
      missingFAQ: findings.missingFAQ,
      missingProduct: findings.missingProduct,
    }),
  })

  return { summary, pagesFromSitemap: allPaths.length, pagesAudited: details.length, findings, details }
}
