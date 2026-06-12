/**
 * Schema Health Auditor — Google Rich Results field-level validation.
 *
 * Fetches live pages, extracts JSON-LD, validates each schema type against
 * Google's required/recommended fields, stores results in MongoDB.
 */

import clientPromise from "@/lib/mongodb"

const SITE_URL = "https://www.100xcircle.com"
const FETCH_TIMEOUT_MS = 10000

// ─── Types ────────────────────────────────────────────────────────────────────

export type Severity = "critical" | "warning"

export interface ValidationIssue {
  field: string
  message: string
  severity: Severity
}

export interface SchemaItemResult {
  type: string
  label: string        // human name: product name, "FAQPage (N questions)", etc.
  valid: boolean
  issues: ValidationIssue[]
}

export interface PageAuditResult {
  url: string
  pageType: "homepage" | "product" | "blog" | "landing" | "other"
  auditedAt: string
  fetchOk: boolean
  totalSchemas: number
  validSchemas: number
  invalidSchemas: number
  criticalCount: number
  warningCount: number
  schemas: SchemaItemResult[]
  duplicateTypes: string[]
}

export interface SchemaHealthReport {
  _type: "latest"
  auditedAt: string
  trigger: "manual" | "post_deploy" | "daily_sync"
  totalPages: number
  totalSchemas: number
  validSchemas: number
  invalidSchemas: number
  criticalIssues: number
  warnings: number
  pages: PageAuditResult[]
  affectedUrls: string[]
  summary: string
}

// ─── Validation rules ─────────────────────────────────────────────────────────

function typeOf(schema: Record<string, unknown>): string {
  const t = schema["@type"]
  if (Array.isArray(t)) return t[0] as string
  return String(t ?? "Unknown")
}

function validateProduct(schema: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!schema.name) {
    issues.push({ field: "name", message: "Required field missing: name", severity: "critical" })
  }
  if (!schema.image) {
    issues.push({ field: "image", message: "Required field missing: image (URL or ImageObject)", severity: "critical" })
  }

  const offersData = schema.offers as Record<string, unknown> | undefined
  const hasPrice = offersData && (offersData.price !== undefined || offersData.lowPrice !== undefined)
  const reviews = schema.review
  const hasReview = Array.isArray(reviews) ? reviews.length > 0 : !!reviews
  const aggRating = schema.aggregateRating as Record<string, unknown> | undefined
  const hasRating = aggRating && aggRating.ratingValue !== undefined

  if (!hasPrice && !hasReview && !hasRating) {
    issues.push({
      field: "offers / review / aggregateRating",
      message: "Required: at least one of offers (with price/lowPrice), review, or aggregateRating",
      severity: "critical",
    })
  } else if (offersData && !hasPrice) {
    issues.push({
      field: "offers.price",
      message: "offers present but missing price or lowPrice",
      severity: "critical",
    })
  }

  if (!schema.description) {
    issues.push({ field: "description", message: "Recommended: description improves snippet quality", severity: "warning" })
  }

  return issues
}

function validateFAQPage(
  schema: Record<string, unknown>,
  allTypesOnPage: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const faqCount = allTypesOnPage.filter(t => t === "FAQPage").length
  if (faqCount > 1) {
    issues.push({
      field: "@type (duplicate)",
      message: `Duplicate FAQPage: ${faqCount} FAQPage schemas on same URL — Google invalidates both`,
      severity: "critical",
    })
  }

  const entities = schema.mainEntity
  if (!entities || (Array.isArray(entities) && (entities as unknown[]).length === 0)) {
    issues.push({ field: "mainEntity", message: "Required: mainEntity array with at least one Question", severity: "critical" })
    return issues
  }

  const items = Array.isArray(entities) ? (entities as Record<string, unknown>[]) : [entities as Record<string, unknown>]
  items.forEach((q, i) => {
    if (q["@type"] !== "Question") {
      issues.push({ field: `mainEntity[${i}].@type`, message: `Expected Question, got ${q["@type"]}`, severity: "critical" })
    }
    if (!q.name) {
      issues.push({ field: `mainEntity[${i}].name`, message: "Question missing name", severity: "critical" })
    }
    const ans = q.acceptedAnswer as Record<string, unknown> | undefined
    if (!ans) {
      issues.push({ field: `mainEntity[${i}].acceptedAnswer`, message: "Question missing acceptedAnswer", severity: "critical" })
    } else if (!ans.text) {
      issues.push({ field: `mainEntity[${i}].acceptedAnswer.text`, message: "acceptedAnswer missing text", severity: "critical" })
    }
  })

  return issues
}

function validateBreadcrumbList(schema: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const items = schema.itemListElement
  if (!items || (Array.isArray(items) && (items as unknown[]).length === 0)) {
    issues.push({ field: "itemListElement", message: "Required: itemListElement array", severity: "critical" })
    return issues
  }
  ;(Array.isArray(items) ? items : [items]).forEach((item, i) => {
    const it = item as Record<string, unknown>
    if (it.position === undefined) {
      issues.push({ field: `itemListElement[${i}].position`, message: "ListItem missing position", severity: "critical" })
    }
    if (!it.name && !it.item) {
      issues.push({ field: `itemListElement[${i}].name`, message: "ListItem missing name or item", severity: "warning" })
    }
  })
  return issues
}

function validateArticle(schema: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!schema.headline) {
    issues.push({ field: "headline", message: "Required: headline", severity: "critical" })
  }
  if (!schema.datePublished) {
    issues.push({ field: "datePublished", message: "Required: datePublished", severity: "critical" })
  }
  const author = schema.author as Record<string, unknown> | undefined | unknown[]
  if (!author) {
    issues.push({ field: "author", message: "Required: author (Person or Organization with name)", severity: "critical" })
  } else {
    // @id-only reference to a named entity (e.g. /#organization) is valid — skip name check
    const authorObj = Array.isArray(author) ? author[0] as Record<string, unknown> : author as Record<string, unknown>
    const isRef = authorObj?.["@id"]
    if (!isRef && !authorObj?.name) {
      issues.push({ field: "author.name", message: "author present but missing name", severity: "critical" })
    }
  }
  if (!schema.image) {
    issues.push({ field: "image", message: "Recommended: article image for Google Discover eligibility", severity: "warning" })
  }
  return issues
}

function validateOrganization(schema: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!schema.name) {
    issues.push({ field: "name", message: "Required: name", severity: "critical" })
  }
  // Skip url/logo warnings on @id supplement nodes (inherit from primary entity via graph merge)
  const isSupplementNode = schema["@id"] && !schema.url && !schema.logo && (schema.aggregateRating || schema.review)
  if (!isSupplementNode) {
    if (!schema.url) {
      issues.push({ field: "url", message: "Recommended: url for identity disambiguation", severity: "warning" })
    }
    if (!schema.logo) {
      issues.push({ field: "logo", message: "Recommended: logo (ImageObject)", severity: "warning" })
    }
  }
  return issues
}

function validateLocalBusiness(schema: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!schema.name) {
    issues.push({ field: "name", message: "Required: name", severity: "critical" })
  }
  const addr = schema.address as Record<string, unknown> | undefined
  if (!addr) {
    issues.push({ field: "address", message: "Required: address (PostalAddress)", severity: "critical" })
  }
  return issues
}

function validateSchema(
  schema: Record<string, unknown>,
  allTypesOnPage: string[]
): SchemaItemResult {
  const type = typeOf(schema)
  const name = (schema.name as string | undefined) || (schema.headline as string | undefined) || type
  let issues: ValidationIssue[] = []

  switch (type) {
    case "Product":
      issues = validateProduct(schema)
      break
    case "FAQPage":
      issues = validateFAQPage(schema, allTypesOnPage)
      break
    case "BreadcrumbList":
      issues = validateBreadcrumbList(schema)
      break
    case "Article":
    case "BlogPosting":
    case "NewsArticle":
      issues = validateArticle(schema)
      break
    case "Organization":
    case "Manufacturer":
      issues = validateOrganization(schema)
      break
    case "LocalBusiness":
      issues = validateLocalBusiness(schema)
      break
    // WebSite, HowTo, Service, WebPageElement — no blocking required fields
    default:
      break
  }

  const entities = schema.mainEntity
  const faqLabel = type === "FAQPage" && Array.isArray(entities) ? ` (${(entities as unknown[]).length} questions)` : ""
  return {
    type,
    label: String(name) + faqLabel,
    valid: issues.filter(i => i.severity === "critical").length === 0,
    issues,
  }
}

// ─── Extraction ───────────────────────────────────────────────────────────────

function extractSchemas(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item["@graph"]) {
          for (const g of item["@graph"] as Record<string, unknown>[]) out.push(g)
        } else {
          out.push(item as Record<string, unknown>)
        }
      }
    } catch { /* malformed JSON-LD — skip */ }
  }
  return out
}

function getPageType(url: string): PageAuditResult["pageType"] {
  if (url === SITE_URL || url === SITE_URL + "/") return "homepage"
  if (url.includes("/products/")) return "product"
  if (url.includes("/blog/")) return "blog"
  return "landing"
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "100XCircle-SchemaHealthAudit/2.0", "Cache-Control": "no-cache" },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function auditPage(url: string): Promise<PageAuditResult> {
  const now = new Date().toISOString()
  const html = await fetchHtml(url)

  if (!html) {
    return {
      url,
      pageType: getPageType(url),
      auditedAt: now,
      fetchOk: false,
      totalSchemas: 0,
      validSchemas: 0,
      invalidSchemas: 0,
      criticalCount: 0,
      warningCount: 0,
      schemas: [],
      duplicateTypes: [],
    }
  }

  const rawSchemas = extractSchemas(html)
  const allTypes = rawSchemas.map(typeOf)

  // Detect duplicate types
  const typeCounts: Record<string, number> = {}
  for (const t of allTypes) typeCounts[t] = (typeCounts[t] ?? 0) + 1
  const duplicateTypes = Object.entries(typeCounts).filter(([, c]) => c > 1).map(([t]) => t)

  const schemas = rawSchemas
    .filter(s => {
      const t = typeOf(s)
      // Only validate types we have rules for
      return ["Product", "FAQPage", "BreadcrumbList", "Article", "BlogPosting",
               "NewsArticle", "Organization", "Manufacturer", "LocalBusiness"].includes(t)
    })
    .map(s => validateSchema(s, allTypes))

  const validSchemas = schemas.filter(s => s.valid).length
  const invalidSchemas = schemas.filter(s => !s.valid).length
  const criticalCount = schemas.reduce((n, s) => n + s.issues.filter(i => i.severity === "critical").length, 0)
  const warningCount = schemas.reduce((n, s) => n + s.issues.filter(i => i.severity === "warning").length, 0)

  return {
    url,
    pageType: getPageType(url),
    auditedAt: now,
    fetchOk: true,
    totalSchemas: schemas.length,
    validSchemas,
    invalidSchemas,
    criticalCount,
    warningCount,
    schemas,
    duplicateTypes,
  }
}

// ─── Target URL builder ───────────────────────────────────────────────────────

async function buildTargetUrls(): Promise<string[]> {
  const db = (await clientPromise).db()

  const [productSlugs, blogSlugs] = await Promise.all([
    db.collection("products")
      .find({ isPublished: true, slug: { $exists: true, $ne: "" } })
      .project({ slug: 1 })
      .sort({ order: 1 })
      .limit(5)
      .toArray(),
    db.collection("blogs")
      .find({ isPublished: true, slug: { $exists: true, $ne: "" } })
      .project({ slug: 1 })
      .sort({ publishedAt: -1 })
      .limit(5)
      .toArray(),
  ])

  const urls: string[] = [
    SITE_URL + "/",
    // Landing pages
    SITE_URL + "/thermal-vs-cold-fogging-machine",
    SITE_URL + "/gem-approved-fogging-machine-oem",
    SITE_URL + "/dengue-control-fogging-machine",
    // Products
    ...productSlugs.map((p: { slug: string }) => `${SITE_URL}/products/${p.slug}`),
    // Blogs
    ...blogSlugs.map((b: { slug: string }) => `${SITE_URL}/blog/${b.slug}`),
  ]

  return [...new Set(urls)]
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runSchemaHealthAudit(
  trigger: SchemaHealthReport["trigger"] = "manual"
): Promise<SchemaHealthReport> {
  const db = (await clientPromise).db()
  const targetUrls = await buildTargetUrls()
  const auditedAt = new Date().toISOString()

  // Fetch pages in batches of 3 to avoid overwhelming the server
  const pageResults: PageAuditResult[] = []
  for (let i = 0; i < targetUrls.length; i += 3) {
    const batch = targetUrls.slice(i, i + 3)
    const settled = await Promise.allSettled(batch.map(auditPage))
    for (const r of settled) {
      if (r.status === "fulfilled") pageResults.push(r.value)
    }
    if (i + 3 < targetUrls.length) await new Promise(res => setTimeout(res, 200))
  }

  const totalSchemas = pageResults.reduce((n, p) => n + p.totalSchemas, 0)
  const validSchemas = pageResults.reduce((n, p) => n + p.validSchemas, 0)
  const invalidSchemas = pageResults.reduce((n, p) => n + p.invalidSchemas, 0)
  const criticalIssues = pageResults.reduce((n, p) => n + p.criticalCount, 0)
  const warnings = pageResults.reduce((n, p) => n + p.warningCount, 0)
  const affectedUrls = pageResults.filter(p => p.invalidSchemas > 0 || p.criticalCount > 0).map(p => p.url)

  const summary = `Audited ${pageResults.length} pages · ${validSchemas}/${totalSchemas} schemas valid · ${criticalIssues} critical errors · ${warnings} warnings`

  const report: SchemaHealthReport = {
    _type: "latest",
    auditedAt,
    trigger,
    totalPages: pageResults.length,
    totalSchemas,
    validSchemas,
    invalidSchemas,
    criticalIssues,
    warnings,
    pages: pageResults,
    affectedUrls,
    summary,
  }

  await db.collection("schema_health_results").replaceOne(
    { _type: "latest" },
    report,
    { upsert: true }
  )

  return report
}

export async function getLatestSchemaHealth(): Promise<SchemaHealthReport | null> {
  const db = (await clientPromise).db()
  const doc = await db.collection("schema_health_results").findOne({ _type: "latest" })
  if (!doc) return null
  return JSON.parse(JSON.stringify(doc)) as SchemaHealthReport
}
