import clientPromise from "@/lib/mongodb"

const SITE_URL = "https://www.100xcircle.com"

// Pages and their expected schema types
const AUDIT_PAGES: Array<{ path: string; expected: string[]; priority: "high" | "medium" }> = [
  { path: "/", expected: ["Organization", "WebSite", "LocalBusiness"], priority: "high" },
  { path: "/gem-oem-authorization", expected: ["HowTo", "FAQPage"], priority: "high" },
  { path: "/become-a-dealer", expected: ["FAQPage"], priority: "high" },
  { path: "/gem-tender-support", expected: ["FAQPage"], priority: "high" },
  { path: "/is-14855-fogging-machine", expected: ["Product", "FAQPage"], priority: "high" },
  { path: "/municipal-fogging-programme", expected: ["FAQPage"], priority: "high" },
  { path: "/nhm-fogging-machine", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/nvbdcp-fogging-machine", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/vector-control-equipment", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/fogging-machine-for-nagar-panchayat", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/gem-reverse-auction-fogging", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/make-in-india-fogging-machine", expected: ["Product", "FAQPage"], priority: "medium" },
  { path: "/dealers-and-government", expected: [], priority: "medium" },
  { path: "/dealer-application", expected: [], priority: "medium" },
]

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
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

function extractJsonLdTypes(html: string): string[] {
  const types: string[] = []
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item["@type"]) {
          const t = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]]
          types.push(...t)
        }
        // Check @graph
        if (item["@graph"]) {
          for (const g of item["@graph"]) {
            if (g["@type"]) {
              const t = Array.isArray(g["@type"]) ? g["@type"] : [g["@type"]]
              types.push(...t)
            }
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return [...new Set(types)]
}

export interface SchemaAuditResult {
  summary: string
  pagesAudited: number
  pagesPassing: number
  pagesMissingSchema: number
  findings: Array<{
    path: string
    priority: "high" | "medium"
    foundTypes: string[]
    missingTypes: string[]
    status: "pass" | "partial" | "missing" | "error"
  }>
}

export async function runSchemaAuditAgent(): Promise<SchemaAuditResult> {
  const db = (await clientPromise).db()
  const findings: SchemaAuditResult["findings"] = []

  // Run pages in batches of 3 to avoid timeout
  for (let i = 0; i < AUDIT_PAGES.length; i += 3) {
    const batch = AUDIT_PAGES.slice(i, i + 3)
    const results = await Promise.allSettled(
      batch.map(async page => {
        const html = await fetchPage(`${SITE_URL}${page.path}`)
        const found = html ? extractJsonLdTypes(html) : []
        const missing = page.expected.filter(e => !found.includes(e))
        const status = !html ? "error"
          : missing.length === 0 ? "pass"
          : missing.length < page.expected.length ? "partial"
          : page.expected.length === 0 ? "pass"
          : "missing"
        return { path: page.path, priority: page.priority, foundTypes: found, missingTypes: missing, status }
      })
    )
    results.forEach((r, j) => {
      if (r.status === "fulfilled") findings.push(r.value as SchemaAuditResult["findings"][0])
      else findings.push({ path: batch[j].path, priority: batch[j].priority, foundTypes: [], missingTypes: batch[j].expected, status: "error" })
    })
    // Small delay between batches to avoid hammering the server
    if (i + 3 < AUDIT_PAGES.length) await new Promise(r => setTimeout(r, 200))
  }

  const passing = findings.filter(f => f.status === "pass").length
  const missing = findings.filter(f => f.status === "missing" || f.status === "error").length

  // Create opportunities for pages with missing high-priority schemas
  const highPriorityMissing = findings.filter(f => f.priority === "high" && f.missingTypes.length > 0)
  for (const page of highPriorityMissing.slice(0, 3)) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: `Schema.*${page.path}`, $options: "i" } },
      {
        $setOnInsert: {
          title: `Add missing schema on ${page.path}: ${page.missingTypes.join(", ")}`,
          description: `Schema audit found ${page.missingTypes.join(", ")} missing. Found: ${page.foundTypes.join(", ") || "none"}. This is a high-priority page.`,
          module: "seo",
          source: "agent",
          businessValue: "medium",
          seoValue: "high",
          geoValue: "medium",
          dealerImpact: "low",
          effort: "low",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    )
  }

  // Store full audit results
  await db.collection("growth_os_schema_audit").replaceOne(
    { _type: "latest" },
    { _type: "latest", findings, auditedAt: new Date().toISOString() },
    { upsert: true }
  )

  const summary = `Audited ${findings.length} pages — ${passing} passing, ${missing} with missing schema. High-priority gaps: ${highPriorityMissing.map(p => p.path).join(", ") || "none"}.`

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "Schema Audit Agent",
    action: `Schema audit: ${passing}/${findings.length} pages passing`,
    reason: "Periodic structured data verification",
    expectedImpact: "Identify and fix SEO schema gaps",
    actualImpact: `${missing} pages need schema fixes`,
    level: missing > 0 ? "warning" : "success",
    module: "seo",
    after: JSON.stringify(findings.map(f => ({ path: f.path, status: f.status, missing: f.missingTypes }))),
  })

  return { summary, pagesAudited: findings.length, pagesPassing: passing, pagesMissingSchema: missing, findings }
}
