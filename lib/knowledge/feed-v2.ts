/**
 * /api/ai/knowledge, version 2 of the item list (SEO/AEO program item E2, 2026-10).
 *
 * Built on top of mergeKnowledgeFeed (unchanged) and adds:
 *  - per-item dates: `date_modified` on every item, `date_published` where known;
 *  - `type` (article | product | page | guide | faq) and `canonical_url`;
 *  - mirrors marked: Knowledge Base entries copied from a blog post or product
 *    page carry `is_mirror: true` and `canonical_url` = the original page;
 *  - mirrors dropped when the original page is itself in the feed (no duplicates);
 *  - product coverage for all nine fogger models (incl. MCF42, ULV22, ULVSS10),
 *    the GeM landing page, IS 14855, government procurement, the procurement
 *    guides, and FAQ items (only FAQs that are visible on the linked page).
 *
 * Facts: FACTS.md + product DB specs via lib/seo/answer-summaries.ts. Published
 * site claims may be used (owner rule 2026-10-09). Pure: no DB, no Next.
 */
import type { KnowledgeArticle } from "./types"
import { mergeKnowledgeFeed, type FeedItem } from "./feed"
import { ANSWER_SUMMARIES } from "../seo/answer-summaries"
import { PROCUREMENT_GUIDES } from "../seo/procurement-guides"

export type FeedItemType = "article" | "product" | "page" | "guide" | "faq"

export interface FeedItemV2 extends FeedItem {
  type: FeedItemType
  canonical_url: string
  date_modified: string
  date_published?: string
  is_mirror?: boolean
  model?: string
  question?: string
  answer?: string
}

/** The nine fogging machine models (FACTS.md) and their canonical pages. */
export const FEED_PRODUCTS: ReadonlyArray<{ model: string; name: string; path: string }> = [
  { model: "100XTFS50", name: "100XTFS50 Thermal & Cold Fogging Machine", path: "/thermal-and-cold-fogging-machine-100xtfs50" },
  { model: "100XDB400", name: "100XDB400 Double Barrel Thermal Fogging Machine (Vehicle Mountable)", path: "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400" },
  { model: "100XSSMA20", name: "100XSSMA20 Thermal Fogging Machine with Stainless Steel Tank", path: "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20" },
  { model: "100XHM20", name: "100XHM20 ISI Marked Thermal Fogging Machine with HDPE Tank", path: "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde" },
  { model: "100XHBL22", name: "100XHBL22 Pulse Jet Thermal Fogging Machine with HDPE Tank (ISI Marked)", path: "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75" },
  { model: "100XMCF42", name: "100XMCF42 Cold Fogger Machine with 2-Stroke Engine", path: "/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1" },
  { model: "100XULV22", name: "100XULV22 ULV Cold Fogger (Electric)", path: "/products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv" },
  { model: "100XULVSS10", name: "100XULVSS10 ULV Electric Cold Fogger / Mist Sprayer", path: "/products/100xulvss10-5e46c5" },
  { model: "100XBF102", name: "100XBF102 Mini Fogger", path: "/products/mini-fogger-100xbf102-2d9887" },
]

/** Key topic pages with an answer-first summary. */
export const FEED_PAGES: ReadonlyArray<{ title: string; path: string }> = [
  { title: "Fogging Machines on GeM: Buying and OEM Authorization", path: "/gem-approved-fogging-machine-oem" },
  { title: "IS 14855 Fogging Machines", path: "/is-14855-fogging-machine" },
  { title: "Government Procurement of Fogging Machines", path: "/fogging-machine-government-procurement" },
  { title: "Thermal vs Cold Fogging Machine", path: "/thermal-vs-cold-fogging-machine" },
]

const day = (d: string | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : undefined)
const slugOf = (url: string) => url.split("/knowledge/")[1]?.split(/[?#/]/)[0] ?? ""

function typeForDbSlug(slug: string): FeedItemType {
  if (slug.startsWith("product-")) return "product"
  if (slug.startsWith("blog-")) return "article"
  if (slug === "case-study-index" || slug === "government-supply-track-record") return "page"
  return "article"
}

/** Items the site adds on top of the curated list and the Knowledge Base. */
export function buildFeedExtras(siteUrl: string): FeedItemV2[] {
  const items: FeedItemV2[] = []
  for (const p of FEED_PRODUCTS) {
    const s = ANSWER_SUMMARIES[p.path]
    if (!s) continue
    const url = `${siteUrl}${p.path}`
    items.push({ type: "product", model: p.model, title: p.name, url, canonical_url: url, summary: s.summary, date_modified: s.updated })
  }
  for (const p of FEED_PAGES) {
    const s = ANSWER_SUMMARIES[p.path]
    if (!s) continue
    const url = `${siteUrl}${p.path}`
    items.push({ type: "page", title: p.title, url, canonical_url: url, summary: s.summary, date_modified: s.updated })
  }
  for (const g of PROCUREMENT_GUIDES) {
    const url = `${siteUrl}${g.path}`
    items.push({
      type: "guide",
      title: g.h1,
      url,
      canonical_url: url,
      summary: g.summary,
      date_published: g.datePublished,
      date_modified: g.dateModified,
    })
  }
  for (const g of PROCUREMENT_GUIDES) {
    for (const f of g.faqs) {
      const answer = f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      items.push({
        type: "faq",
        title: f.q,
        question: f.q,
        answer,
        summary: answer,
        url: `${siteUrl}${g.path}#guide-faq`,
        canonical_url: `${siteUrl}${g.path}`,
        date_modified: g.dateModified,
      })
    }
  }
  return items
}

export function buildKnowledgeFeedV2(
  curated: readonly FeedItem[],
  published: readonly KnowledgeArticle[],
  siteUrl: string,
  curatedDate: string,
): { items: FeedItemV2[]; lastUpdated: string } {
  const merged = mergeKnowledgeFeed(curated, published, siteUrl, curatedDate)
  const bySlug = new Map(published.map((a) => [a.slug, a]))
  const curatedUrls = new Set(curated.map((c) => c.url))

  const base: FeedItemV2[] = merged.items.map((it) => {
    const fromDb = !curatedUrls.has(it.url) ? bySlug.get(slugOf(it.url)) : undefined
    const canonical = it.source_url || it.url
    const out: FeedItemV2 = {
      ...it,
      type: fromDb ? typeForDbSlug(fromDb.slug) : "article",
      canonical_url: canonical,
      date_modified: (fromDb && day(fromDb.dateModified)) || curatedDate,
    }
    const published = fromDb && day(fromDb.datePublished)
    if (published) out.date_published = published
    if (canonical !== it.url) out.is_mirror = true
    return out
  })

  const extras = buildFeedExtras(siteUrl)
  // Pages that are themselves in the feed (non-FAQ extras and non-mirror items).
  const originals = new Set<string>([
    ...extras.filter((e) => e.type !== "faq").map((e) => e.url),
    ...base.filter((b) => !b.is_mirror).map((b) => b.url),
  ])

  const items: FeedItemV2[] = []
  const seen = new Set<string>()
  for (const it of [...base, ...extras]) {
    // A mirror is dropped when its original page is listed in the feed.
    if (it.is_mirror && originals.has(it.canonical_url)) continue
    const key = it.type === "faq" ? `faq:${it.question}` : it.canonical_url
    if (seen.has(key)) continue
    seen.add(key)
    items.push(it)
  }

  const lastUpdated = items.map((i) => i.date_modified).sort().at(-1) ?? curatedDate
  return { items, lastUpdated }
}
