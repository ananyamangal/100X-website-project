/**
 * The Knowledge Base sync. ONE function, used by the admin "Rebuild Knowledge
 * Base" button and by the automatic sync on content saves, so the two can never
 * diverge. It takes a database handle (no Next imports), so it also runs from a
 * script for a dry run.
 *
 * Rules it enforces:
 *  - it only ever writes documents it generated (`sync` metadata present). A slug
 *    that belongs to a hand-written article is reported as an error, never touched.
 *  - an article an admin has edited (`sync.locked`) is left completely alone,
 *    including its published/draft state.
 *  - unchanged content is not rewritten (content hash).
 *  - content touching chemicals, dosing or safety lands as a draft (see build.ts).
 *  - a synced entry whose source was removed or unpublished is taken offline
 *    (unpublished, not deleted).
 *  - private source fields are never read: past-performance and case-study
 *    queries project only the public card fields.
 */
import type { Db } from "mongodb"
import { blogPostSlug } from "@/lib/blogSlug"
import { SITE_URL } from "@/lib/seo/site-config"
import { PRODUCT_LANDING_MAP } from "@/lib/seo/product-landing-map"
import { buildBlogDigest, buildCaseStudyIndex, buildProductPage, buildTrackRecord, productModelCode, type BuildContext, type BuiltEntry } from "./build"
import { totalsOf, type SourceResult } from "./jobs"

export const KNOWLEDGE_COLLECTION = "knowledge_articles"

/** Sources this sync can build. */
export const SYNC_SOURCES = ["blogs", "case_studies", "past_performance", "products"] as const
export type SyncSourceKey = (typeof SYNC_SOURCES)[number]

export const SOURCE_LABELS: Record<SyncSourceKey, string> = {
  blogs: "Blog posts",
  case_studies: "Case studies",
  past_performance: "Past performance",
  products: "Products",
}

export function isSyncSource(v: unknown): v is SyncSourceKey {
  return typeof v === "string" && (SYNC_SOURCES as readonly string[]).includes(v)
}

const slugSafe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/** entries to write, plus notes about source items that were skipped (shown to the owner, not errors). */
type Collector = (db: Db, now: Date) => Promise<{ entries: BuiltEntry[]; notes: string[] }>

const ctxFor = (slug: string, now: Date): BuildContext => ({ slug, siteUrl: SITE_URL, now, order: 0 })

export const COLLECTORS: Record<SyncSourceKey, Collector> = {
  async blogs(db, now) {
    const blogs = await db.collection("blogs").find({ isPublished: true }).sort({ publishedAt: -1 }).toArray()
    const seen = new Set<string>()
    const out: BuiltEntry[] = []
    for (const b of blogs) {
      const blogSlug = blogPostSlug(b as never)
      let slug = `blog-${slugSafe(blogSlug)}`
      if (seen.has(slug)) slug += `-${String(b._id).slice(-6)}`
      seen.add(slug)
      out.push(buildBlogDigest(b as never, blogSlug, ctxFor(slug, now)))
    }
    return { entries: out, notes: [] }
  },

  async case_studies(db, now) {
    const studies = await db
      .collection("case_studies")
      .find({ published: true, isSample: { $ne: true } })
      .project({ title: 1, slug: 1, customer: 1, state: 1, productUsed: 1, industry: 1, createdAt: 1, updatedAt: 1 })
      .sort({ createdAt: -1 })
      .toArray()
    const built = buildCaseStudyIndex(studies as never, ctxFor("case-study-index", now))
    return { entries: built ? [built] : [], notes: [] }
  },

  async past_performance(db, now) {
    // Public card fields only: notes, documents, orderValue, images are never read.
    const records = await db
      .collection("gov_past_performance")
      .find({ isPublic: true })
      .project({ organization: 1, department: 1, state: 1, product: 1, orderYear: 1, createdAt: 1, updatedAt: 1 })
      .toArray()
    const built = buildTrackRecord(records as never, ctxFor("government-supply-track-record", now))
    return { entries: built ? [built] : [], notes: [] }
  },

  async products(db, now) {
    // Published products only. Pricing, ratings, review counts and the product FAQs are never read.
    const docs = await db
      .collection("products")
      .find({ isPublished: { $ne: false } })
      .project({
        name: 1, slug: 1, category: 1, tagline: 1, shortDescription: 1, detailedDescription: 1,
        features: 1, specifications: 1, applications: 1, warrantyPeriod: 1, createdAt: 1, updatedAt: 1,
      })
      .sort({ order: 1 })
      .toArray()
    const entries: BuiltEntry[] = []
    const notes: string[] = []
    const used = new Map<string, string>()
    for (const p of docs) {
      const label = String(p.name ?? p._id)
      const code = productModelCode(p as never)
      if (!code) {
        notes.push(`Product "${label}" has no 100X model code; skipped.`)
        continue
      }
      if (used.has(code)) {
        notes.push(`Product "${label}" repeats model code ${code} (already used by "${used.get(code)}"); skipped.`)
        continue
      }
      used.set(code, label)
      // Same rule the sitemap uses: a product with a landing page canonicals to it, else /products/<slug>.
      const seg = (typeof p.slug === "string" && p.slug) || String(p._id)
      const landing = PRODUCT_LANDING_MAP[seg] ?? PRODUCT_LANDING_MAP[String(p._id)]
      const sourceUrl = landing ? `${SITE_URL}/${landing}` : `${SITE_URL}/products/${seg}`
      entries.push(buildProductPage(p as never, code, sourceUrl, ctxFor(`product-${code.toLowerCase()}`, now)))
    }
    return { entries, notes }
  },
}

// Slugs each aggregate source owns, so a source that now yields nothing can retire its page.
const OWNED_SLUGS: Partial<Record<SyncSourceKey, string[]>> = {
  case_studies: ["case-study-index"],
  past_performance: ["government-supply-track-record"],
}

export interface RunOptions {
  sources?: SyncSourceKey[]
  /** Compute and report everything, write nothing. */
  dryRun?: boolean
  now?: Date
  onProgress?: (p: { done: number; total: number; current: string | null }, results: SourceResult[]) => void | Promise<void>
}

export async function runKnowledgeSync(db: Db, opts: RunOptions = {}) {
  const sources = opts.sources?.length ? opts.sources : [...SYNC_SOURCES]
  const now = opts.now ?? new Date()
  const dry = !!opts.dryRun
  const col = db.collection(KNOWLEDGE_COLLECTION)
  const results: SourceResult[] = []

  const top = await col.find({ "sync.source": { $exists: true } }).sort({ order: -1 }).limit(1).project({ order: 1 }).toArray()
  let nextOrder = Math.max(1000, ((top[0]?.order as number | undefined) ?? 999) + 1)

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const res: SourceResult = { source, scanned: 0, created: 0, updated: 0, unchanged: 0, published: 0, drafted: 0, skippedLocked: 0, unpublished: 0, errors: [], notes: [] }
    await opts.onProgress?.({ done: i, total: sources.length, current: source }, results)

    try {
      const { entries, notes } = await COLLECTORS[source](db, now)
      res.notes.push(...notes)
      res.scanned = entries.length
      const slugs = entries.map((e) => e.article.slug)

      const existing = await col.find({ slug: { $in: slugs } }).project({ slug: 1, sync: 1 }).toArray()
      const bySlug = new Map(existing.map((d) => [d.slug as string, d]))
      const ops: Array<Record<string, unknown>> = []

      for (const e of entries) {
        const { article, sync } = e
        const ex = bySlug.get(article.slug) as { sync?: { source?: string; hash?: string; locked?: boolean } } | undefined
        const count = () => (article.isPublished ? res.published++ : res.drafted++)

        if (!ex) {
          ops.push({ insertOne: { document: { ...article, order: nextOrder++, sync, createdAt: now, updatedAt: now } } })
          res.created++
          count()
        } else if (!ex.sync || ex.sync.source !== source) {
          res.errors.push(`"${article.slug}" already exists and was not generated by the ${source} sync; left untouched.`)
        } else if (ex.sync.locked) {
          res.skippedLocked++
        } else if (ex.sync.hash === sync.hash) {
          res.unchanged++
        } else {
          const { order, ...rest } = article
          void order
          ops.push({ updateOne: { filter: { slug: article.slug }, update: { $set: { ...rest, sync, updatedAt: now } } } })
          res.updated++
          count()
        }
      }

      // Take offline what this source no longer produces (never delete; never touch locked ones).
      const owned = OWNED_SLUGS[source]
      const orphanFilter: Record<string, unknown> = {
        "sync.source": source,
        "sync.locked": { $ne: true },
        isPublished: true,
        slug: { $nin: slugs },
        ...(owned ? { slug: { $in: owned.filter((s) => !slugs.includes(s)) } } : {}),
      }
      const orphans = await col.countDocuments(orphanFilter)
      res.unpublished = orphans

      if (!dry) {
        if (ops.length) await col.bulkWrite(ops as never, { ordered: false })
        if (orphans) {
          await col.updateMany(orphanFilter, {
            $set: { isPublished: false, "sync.policy": "draft-review", "sync.reasons": ["source removed or unpublished"], updatedAt: now },
          })
        }
      }
    } catch (err) {
      res.errors.push(err instanceof Error ? err.message : String(err))
    }

    results.push(res)
    await opts.onProgress?.({ done: i + 1, total: sources.length, current: i + 1 < sources.length ? sources[i + 1] : null }, results)
  }

  return { results, totals: totalsOf(results), dryRun: dry }
}
