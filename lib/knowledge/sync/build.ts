/**
 * Pure builders: source documents in, a KnowledgeArticle + sync metadata out.
 * No database, no Next, no repo-alias imports, so these run under plain Node in
 * the unit tests. Slugs and site origin come from the caller.
 *
 * Every synced page is a derived view of a page that already exists, so its
 * canonical points at that source page (a new URL must never compete with the
 * page that already ranks). Nothing here emits FAQs or free-form generated
 * claims: pages carry only what the source itself says, plus counts computed
 * from it.
 */
import { createHash } from "node:crypto"
import { parseDocument } from "htmlparser2"
import { findAll, textContent } from "domutils"
import type { KnowledgeArticle, KnowledgeBlock, KnowledgeSyncMeta, KnowledgeSyncSource } from "../types"

// ── sensitivity gate ─────────────────────────────────────────────────────────

// Sensitivity gate for generated Knowledge Base content.
// 
// Owner rule (2026-09-25): generated content that touches chemicals, dosing or
// safety guidance stays a DRAFT pending the owner's review; everything else may
// auto-publish. When a page mixes both, the whole page is held, so this errs on
// the side of drafting: a single hit is enough. Reasons are stored so a reviewer
// can see why an entry was held.

const RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ["dosing", /\bdos(?:e|es|age|ing)\b/i],
  ["dilution", /\bdilut(?:e|es|ed|ion|ing)\b|\b(?:mix(?:ing)?|dilution) ratio\b/i],
  ["application rate", /\b(?:ml|litres?|liters?|l)\s*(?:\/|per)\s*(?:ha|hectare|acre|litre|liter|l|m2|m3)\b/i],
  ["concentration", /\bppm\b|\bconcentrations?\b|\bactive ingredients?\b/i],
  ["chemicals", /\bchemicals?\b|\b(?:insecticides?|pesticides?|larvicides?|adulticides?|rodenticides?|herbicides?|fungicides?|disinfectants?|sanitizers?)\b/i],
  [
    "named chemical",
    /\b(?:malathion|deltamethrin|cypermethrin|permethrin|pyrethr(?:um|oid|oids)|temephos|lambda[- ]cyhalothrin|fenthion|dichlorvos|chlorpyrifos|formalin|formaldehyde|hypochlorite|quaternary ammonium)\b/i,
  ],
  ["toxicity", /\b(?:toxic|toxicity|poison(?:ing|ous)?|hazard(?:s|ous)?|carcinogen\w*|irritants?|antidote|overexposure)\b/i],
  [
    "safety",
    /\bsafety\b|\bsafe (?:distance|use|handling|operation|exposure)\b|\bppe\b|\brespirators?\b|\bprotective (?:gear|equipment|clothing)\b|\bfirst aid\b/i,
  ],
]

export interface Sensitivity {
  sensitive: boolean
  /** Distinct labels of the rules that matched. */
  reasons: string[]
}

export function classifySensitivity(...texts: Array<string | null | undefined>): Sensitivity {
  const haystack = texts.filter((t): t is string => typeof t === "string" && t.length > 0).join("\n")
  const reasons = RULES.filter(([, re]) => re.test(haystack)).map(([label]) => label)
  return { sensitive: reasons.length > 0, reasons }
}

export interface BuiltEntry {
  article: KnowledgeArticle
  sync: KnowledgeSyncMeta
}

export interface BuildContext {
  /** Slug of the generated page. */
  slug: string
  siteUrl: string
  now: Date
  /** Hub sort order (synced entries sort after the hand-written ones). */
  order: number
  /**
   * Blog digests are classified on what the page actually says (title, excerpt,
   * section headings). Set true to hold a digest whenever the WHOLE source post
   * touches chemicals / dosing / safety, even though none of that body text is
   * copied. Off by default: it drafts most of the blog library.
   */
  holdOnSourceBody?: boolean
}

const AUTHOR = "100X Circle Pvt Ltd"
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// ── text helpers ─────────────────────────────────────────────────────────────

/** Visible text of an HTML fragment: NBSP folded to a space, whitespace collapsed. */
export function plainText(html: unknown): string {
  if (typeof html !== "string" || !html) return ""
  const doc = parseDocument(html)
  return textContent(doc).replace(/ /g, " ").replace(/\s+/g, " ").trim()
}

/** Make text safe for the inline mini-markup (`[label](/path)`, `**bold**`). */
export function inline(text: string): string {
  return text.replace(/ /g, " ").replace(/\*/g, "").replace(/\[/g, "(").replace(/\]/g, ")").replace(/\s+/g, " ").trim()
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const at = cut.lastIndexOf(" ")
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.\-–—]+$/, "") + "…"
}

export function headingsOf(html: unknown, limit = 12): string[] {
  if (typeof html !== "string" || !html) return []
  const doc = parseDocument(html)
  const out: string[] = []
  for (const el of findAll((e) => e.name === "h2" || e.name === "h3", doc.children)) {
    const t = plainText(textContent(el))
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= limit) break
  }
  return out
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length
const readTime = (n: number) => `${Math.max(1, Math.round(n / 200))} min read`

function isoDay(v: unknown, fallback: Date): string {
  const d = v instanceof Date ? v : typeof v === "string" || typeof v === "number" ? new Date(v) : null
  return (d && !Number.isNaN(d.getTime()) ? d : fallback).toISOString().slice(0, 10)
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-")
  return `Updated ${MONTHS[Number(m) - 1] ?? ""} ${y}`.replace("  ", " ")
}

function articleSchema(
  a: { title: string; description: string; url: string; datePublished: string; dateModified: string; about?: Record<string, unknown> },
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    url: a.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": a.url },
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { "@type": "Organization", name: AUTHOR, url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    ...(a.about ? { about: a.about } : {}),
  }
}

/** Stable hash of what the page says (dates and sync timestamps excluded). */
function contentHash(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32)
}

function finish(
  source: KnowledgeSyncSource,
  sourceId: string,
  sourceUrl: string,
  ctx: BuildContext,
  core: Omit<KnowledgeArticle, "structuredData" | "datePublished" | "dateModified" | "isPublished" | "order" | "canonicalUrl" | "sync">,
  dates: { published: unknown; modified: unknown },
  sensitivityTexts: string[],
  about?: Record<string, unknown>,
): BuiltEntry {
  const sens = classifySensitivity(...sensitivityTexts)
  const hasSourceDate = !Number.isNaN(new Date(String(dates.modified ?? "")).getTime()) && dates.modified != null
  const datePublished = isoDay(dates.published, ctx.now)
  const dateModified = isoDay(dates.modified, ctx.now)
  const url = `${ctx.siteUrl}/knowledge/${ctx.slug}`
  const article: KnowledgeArticle = {
    ...core,
    structuredData: articleSchema({ title: core.title, description: core.metaDescription, url, datePublished, dateModified, about }, ctx.siteUrl),
    datePublished,
    dateModified,
    isPublished: !sens.sensitive,
    order: ctx.order,
    canonicalUrl: sourceUrl,
  }
  const sync: KnowledgeSyncMeta = {
    source,
    sourceId,
    sourceUrl,
    // The "Updated <month>" label only counts toward the hash when it comes from a real source date;
    // a fallback to today would make an unchanged page look changed every month.
    hash: contentHash({
      core: hasSourceDate ? core : { ...core, byline: { ...core.byline, updatedLabel: "" } },
      sourceUrl,
      sens: sens.reasons,
    }),
    syncedAt: ctx.now.toISOString(),
    policy: sens.sensitive ? "draft-review" : "auto",
    reasons: sens.reasons,
  }
  return { article, sync }
}

const metaTitle = (t: string) => (t.length + 13 <= 70 ? `${t} | 100X Circle` : t)

// ── blogs ────────────────────────────────────────────────────────────────────

export interface BlogSource {
  _id?: unknown
  title?: string
  excerpt?: string
  content?: string
  category?: string
  publishedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/** A short digest of a blog post: its excerpt and section outline, linking to the full post. */
export function buildBlogDigest(blog: BlogSource, blogSlug: string, ctx: BuildContext): BuiltEntry {
  const title = inline(plainText(blog.title) || "Untitled")
  const bodyText = plainText(blog.content)
  const excerpt = inline(plainText(blog.excerpt) || truncate(bodyText, 300))
  const heads = headingsOf(blog.content).map(inline)
  const path = `/blog/${blogSlug}`

  const blocks: KnowledgeBlock[] = []
  if (excerpt) blocks.push({ type: "paragraph", text: excerpt })
  if (heads.length) {
    blocks.push({ type: "heading", level: 2, text: "What the article covers" })
    blocks.push({ type: "list", ordered: false, items: heads })
  }
  blocks.push({ type: "callout", variant: "info", label: "Read the full article", text: `[${title}](${path})` })

  // Title, H1 and description are deliberately NOT the source post's: a synced page must never
  // collide with the page it canonicals to. The description is built from the section outline.
  const pageTitle = `Key points: ${title}`
  const covers = heads.length ? `Covers ${truncate(heads.slice(0, 6).join("; "), 100)}.` : `A short summary of "${truncate(title, 80)}".`
  const description = `${covers} Read the full guide for details.`
  const digestWords = words(excerpt) + heads.reduce((n, h) => n + words(h), 0)
  const category = inline(plainText(blog.category))

  return finish(
    "blogs",
    String(blog._id ?? blogSlug),
    `${ctx.siteUrl}${path}`,
    ctx,
    {
      slug: ctx.slug,
      title: pageTitle,
      metaTitle: metaTitle(pageTitle),
      metaDescription: description,
      tags: ["Blog", ...(category ? [category] : [])],
      byline: { author: AUTHOR, readTime: readTime(digestWords), updatedLabel: monthLabel(isoDay(blog.updatedAt ?? blog.publishedAt ?? blog.createdAt, ctx.now)) },
      breadcrumbLabel: title,
      maxWidth: "3xl",
      h1: pageTitle,
      blocks,
      faqs: [],
    },
    { published: blog.publishedAt ?? blog.createdAt, modified: blog.updatedAt ?? blog.publishedAt ?? blog.createdAt },
    // What the page says. Body text is not copied, so it is classified only when holdOnSourceBody is set.
    [title, excerpt, category, heads.join("\n"), ...(ctx.holdOnSourceBody ? [bodyText] : [])],
  )
}

// ── past performance (public card fields only) ───────────────────────────────

export interface PastPerformanceSource {
  organization?: string
  department?: string
  state?: string
  product?: string
  orderYear?: number
  updatedAt?: unknown
  createdAt?: unknown
}

export function buildTrackRecord(records: PastPerformanceSource[], ctx: BuildContext): BuiltEntry | null {
  const rows = records
    .filter((r) => r.organization)
    .sort((a, b) => (b.orderYear ?? 0) - (a.orderYear ?? 0) || String(a.organization).localeCompare(String(b.organization)))
  if (rows.length === 0) return null

  const states = new Set(rows.map((r) => r.state).filter(Boolean))
  const depts = new Set(rows.map((r) => r.department).filter(Boolean))
  const years = rows.map((r) => r.orderYear).filter((y): y is number => typeof y === "number")
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : ""
  const intro =
    `100X Circle lists ${rows.length} public government supply records` +
    (states.size ? ` across ${states.size} state${states.size === 1 ? "" : "s"}` : "") +
    (depts.size ? ` and ${depts.size} department type${depts.size === 1 ? "" : "s"}` : "") +
    (span ? `, ordered between ${span}` : "") +
    "."

  const blocks: KnowledgeBlock[] = [
    { type: "paragraph", text: intro },
    { type: "heading", level: 2, text: "Supply records" },
    {
      type: "table",
      columns: [{ text: "Organization" }, { text: "Department" }, { text: "State" }, { text: "Product" }, { text: "Year" }],
      rows: rows.map((r) => [inline(r.organization ?? ""), inline(r.department ?? ""), inline(r.state ?? ""), inline(r.product ?? ""), r.orderYear ? String(r.orderYear) : ""]),
      variant: "bordered",
    },
    { type: "callout", variant: "info", label: "Full record", text: "[Government past performance](/past-performance-government)" },
  ]
  const title = "Government Supply Track Record: Departments and States Served"
  const latest = rows.reduce<unknown>((m, r) => {
    const t = new Date(String(r.updatedAt ?? r.createdAt ?? 0)).getTime()
    return t > new Date(String(m ?? 0)).getTime() ? (r.updatedAt ?? r.createdAt) : m
  }, undefined)

  return finish(
    "past_performance",
    "all",
    `${ctx.siteUrl}/past-performance-government`,
    ctx,
    {
      slug: ctx.slug,
      title,
      metaTitle: metaTitle(title),
      metaDescription: truncate(intro, 155),
      tags: ["Government", "Past Performance", "Procurement"],
      byline: { author: AUTHOR, readTime: readTime(words(intro) + rows.length * 6), updatedLabel: monthLabel(isoDay(latest, ctx.now)) },
      breadcrumbLabel: "Supply track record",
      maxWidth: "4xl",
      h1: title,
      blocks,
      faqs: [],
    },
    { published: ctx.now, modified: latest },
    [title, intro, ...rows.map((r) => `${r.product ?? ""} ${r.department ?? ""}`)],
  )
}

// ── case studies ─────────────────────────────────────────────────────────────

export interface CaseStudySource {
  title?: string
  slug?: string
  customer?: string
  state?: string
  industry?: string
  productUsed?: string
  updatedAt?: unknown
  createdAt?: unknown
}

/** An index of the published case studies (titles, customers, states, product used). Narrative fields and testimonials are not copied. */
export function buildCaseStudyIndex(studies: CaseStudySource[], ctx: BuildContext): BuiltEntry | null {
  const rows = studies.filter((s) => s.title && s.slug)
  if (rows.length === 0) return null

  const intro = `${rows.length} published 100X Circle case studies: which organisations used which fogging machines, and where.`
  const blocks: KnowledgeBlock[] = [
    { type: "paragraph", text: intro },
    { type: "heading", level: 2, text: "Case studies" },
    {
      type: "table",
      columns: [{ text: "Case study" }, { text: "Customer" }, { text: "State" }, { text: "Product used" }],
      rows: rows.map((s) => [`[${inline(s.title ?? "")}](/case-studies/${s.slug})`, inline(s.customer ?? ""), inline(s.state ?? ""), inline(s.productUsed ?? "")]),
      variant: "bordered",
    },
    { type: "callout", variant: "info", label: "All case studies", text: "[Browse case studies](/case-studies)" },
  ]
  const title = "Fogging Machine Case Studies: Customers, States and Products"
  const latest = rows.reduce<unknown>((m, r) => {
    const t = new Date(String(r.updatedAt ?? r.createdAt ?? 0)).getTime()
    return t > new Date(String(m ?? 0)).getTime() ? (r.updatedAt ?? r.createdAt) : m
  }, undefined)

  return finish(
    "case_studies",
    "all",
    `${ctx.siteUrl}/case-studies`,
    ctx,
    {
      slug: ctx.slug,
      title,
      metaTitle: metaTitle(title),
      metaDescription: truncate(intro, 155),
      tags: ["Case Studies", "Government", "Deployments"],
      byline: { author: AUTHOR, readTime: readTime(words(intro) + rows.length * 12), updatedLabel: monthLabel(isoDay(latest, ctx.now)) },
      breadcrumbLabel: "Case study index",
      maxWidth: "4xl",
      h1: title,
      blocks,
      faqs: [],
    },
    { published: ctx.now, modified: latest },
    [title, intro, ...rows.map((s) => `${s.title ?? ""} ${s.productUsed ?? ""} ${s.industry ?? ""}`)],
  )
}

// ── products ─────────────────────────────────────────────────────────────────

export interface ProductSource {
  _id?: unknown
  name?: string
  category?: string
  tagline?: string
  shortDescription?: string
  detailedDescription?: string
  features?: Array<{ title?: string; value?: string; order?: number }>
  specifications?: Array<{ label?: string; value?: string; order?: number }>
  applications?: Array<{ title?: string; description?: string; order?: number }>
  warrantyPeriod?: string
  createdAt?: unknown
  updatedAt?: unknown
}

const MODEL_CODE = /\b100X[A-Z0-9]{3,}\b/i

/** The 100X model code in a product's name (preferred) or slug, upper-cased; null when it has none. */
export function productModelCode(product: { name?: string; slug?: string }): string | null {
  const m = String(product.name ?? "").match(MODEL_CODE) ?? String(product.slug ?? "").match(MODEL_CODE)
  return m ? m[0].toUpperCase() : null
}

const byOrder = <T extends { order?: number }>(list: T[] | undefined) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

/**
 * A factual page for one published product: its own description, features, spec
 * table, applications and warranty. Pricing, ratings, review counts and the
 * product FAQs (which discuss chemicals) are never read. A product whose page
 * touches chemicals, dosing or safety (a spec row mentioning the chemical tank,
 * say) is held whole as a draft rather than guessing which parts are safe.
 */
export function buildProductPage(product: ProductSource, code: string, sourceUrl: string, ctx: BuildContext): BuiltEntry {
  const name = inline(plainText(product.name) || code)
  const summary = inline(plainText(product.shortDescription) || truncate(plainText(product.detailedDescription), 300))
  const detail = inline(plainText(product.detailedDescription))

  const features = byOrder(product.features)
    .map((f) => [inline(plainText(f.title)), inline(plainText(f.value))] as const)
    .filter(([t, v]) => t || v)
    .map(([t, v]) => (t && v ? `**${t}:** ${v}` : t || v))
  const specs = byOrder(product.specifications)
    .map((r) => [inline(plainText(r.label)), inline(plainText(r.value))] as const)
    .filter(([l, v]) => l && v)
  const apps = byOrder(product.applications)
    .map((a) => [inline(plainText(a.title)), inline(plainText(a.description))] as const)
    .filter(([t, d]) => t || d)
    .map(([t, d]) => (t && d ? `**${t}:** ${d}` : t || d))
  const warranty = inline(plainText(product.warrantyPeriod))

  const blocks: KnowledgeBlock[] = []
  if (summary) blocks.push({ type: "paragraph", text: summary })
  if (detail && detail !== summary) blocks.push({ type: "paragraph", text: detail })
  if (features.length) blocks.push({ type: "heading", level: 2, text: "Key features" }, { type: "list", ordered: false, items: features })
  if (specs.length) {
    blocks.push(
      { type: "heading", level: 2, text: "Specifications" },
      { type: "table", columns: [{ text: "Specification" }, { text: "Value" }], rows: specs.map(([l, v]) => [l, v]), variant: "bordered" },
    )
  }
  if (apps.length) blocks.push({ type: "heading", level: 2, text: "Applications" }, { type: "list", ordered: false, items: apps })
  if (warranty) blocks.push({ type: "callout", variant: "note", label: "Warranty", text: warranty })
  blocks.push({ type: "callout", variant: "info", label: "Product page", text: `[${name}](${sourceUrl.replace(ctx.siteUrl, "")})` })

  const title = `${name}: Specifications and Features`
  const category = inline(plainText(product.category))
  // Never the product's own meta/short description (the product page already uses it).
  const description = truncate(`Specifications, key features and applications of the ${name}.`, 155)
  const allText = [name, summary, detail, ...features, ...specs.flat(), ...apps, warranty]

  return finish(
    "products",
    String(product._id ?? code),
    sourceUrl,
    ctx,
    {
      slug: ctx.slug,
      title,
      metaTitle: metaTitle(title),
      metaDescription: description,
      tags: ["Product", code, ...(category ? [category] : [])],
      byline: {
        author: AUTHOR,
        readTime: readTime(words(allText.join(" "))),
        updatedLabel: monthLabel(isoDay(product.updatedAt ?? product.createdAt, ctx.now)),
      },
      breadcrumbLabel: name,
      maxWidth: "3xl",
      h1: title,
      blocks,
      faqs: [],
    },
    { published: product.createdAt, modified: product.updatedAt ?? product.createdAt },
    allText,
    // "Thing", not "Product": a Product node without offers/reviews can raise Product-snippet errors in Search Console.
    { "@type": "Thing", name: `${name} (${code})`, url: sourceUrl },
  )
}
