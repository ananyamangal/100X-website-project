// Pure matching for the B9 internal-link blocks: product pages <-> case
// studies <-> knowledge guides <-> the GeM page. Matching is by machine type
// (vehicle-mounted / cold-ULV / hand-carried thermal) read from the DB
// product name/category and the case study's `productUsed`. No DB access here.
import { getProductCanonicalUrl } from "@/lib/seo/product-landing-map"

export type FoggerKind = "vehicle" | "cold" | "handheld"
export type RelatedLink = { href: string; label: string }

export type RelatedProductRow = {
  id: string
  slug?: string
  name: string
  category?: string
  order?: number
}

export type RelatedCaseStudyRow = {
  slug: string
  customer?: string
  title?: string
  state?: string
  productUsed?: string
  updatedAt?: string
}

/** Product URLs never linked (404 or retired), even if a record reappears. */
const NEVER_LINK_PRODUCT_PATHS = new Set(["/products/100x-thermal-fogger-bf150"])

export const GEM_PAGE_LINK: RelatedLink = {
  href: "/gem-approved-fogging-machine-oem",
  label: "Buying 100X fogging machines through GeM",
}

export const GEM_OEM_GUIDE_LINK: RelatedLink = {
  href: "/knowledge/gem-oem-authorization-process",
  label: "GeM OEM authorization process, step by step",
}

/** One buying guide per machine type (all static or published pages). */
export const GUIDE_BY_KIND: Record<FoggerKind, RelatedLink> = {
  vehicle: {
    href: "/compare/vehicle-mounted-vs-portable-thermal-fogger",
    label: "Vehicle-mounted vs portable thermal foggers compared",
  },
  cold: {
    href: "/knowledge/thermal-vs-ulv-fogging",
    label: "Thermal vs cold (ULV) fogging: which method to use",
  },
  handheld: {
    href: "/knowledge/how-to-choose-fogging-machine",
    label: "How to choose a thermal fogging machine",
  },
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/ /g, " ").replace(/\s*\|\s*/g, ", ").replace(/\s+/g, " ").replace(/,\s*$/, "").trim()
}

export function isFogger(name: string, category?: string): boolean {
  return !/trolley|baggage|airport/i.test(`${name} ${category ?? ""}`)
}

export function productKind(name: string, category?: string): FoggerKind | null {
  if (!isFogger(name, category)) return null
  const text = `${name} ${category ?? ""}`
  if (/vehicle|double\s*barrel|db\s*-?\s*[46]00/i.test(text)) return "vehicle"
  // "Thermal & Cold" (100XTFS50) is a portable thermal unit; only pure cold/ULV units are "cold".
  if (/\bcold\b|\bulv\b/i.test(text) && !/thermal/i.test(name)) return "cold"
  return "handheld"
}

export function caseStudyKind(productUsed: string | undefined): FoggerKind | null {
  const t = productUsed ?? ""
  if (/vehicle|double\s*barrel|db\s*-?\s*[46]00/i.test(t)) return "vehicle"
  if (/\bcold\b|\bulv\b/i.test(t)) return "cold"
  if (/hand|portable|carried|knapsack|mini/i.test(t)) return "handheld"
  return null
}

export function productHref(p: RelatedProductRow): string {
  return getProductCanonicalUrl(p.slug || p.id)
}

export function productLabel(p: RelatedProductRow): string {
  return clean(p.name)
}

export function caseStudyLabel(c: RelatedCaseStudyRow): string {
  const who = clean(c.customer) || clean(c.title) || c.slug
  const where = clean(c.state)
  const place = where && !who.includes(where) ? `${who}, ${where}` : who
  const used = clean(c.productUsed)
  return used ? `Case study: ${place} (${used})` : `Case study: ${place}`
}

/** Stable small hash so different pages start at different rows (spreads links, stays deterministic). */
function seedOffset(seed: string | undefined, n: number): number {
  if (!seed || n <= 1) return 0
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % n
}

function rotate<T>(rows: T[], by: number): T[] {
  return by ? [...rows.slice(by), ...rows.slice(0, by)] : rows
}

/** Round-robin over `kinds` so a mixed list is not all one machine type. */
function pickByKinds<T>(rows: T[], kindOf: (r: T) => FoggerKind | null, kinds: FoggerKind[], limit: number, seed?: string): T[] {
  const buckets = kinds.map((k) => {
    const b = rows.filter((r) => kindOf(r) === k)
    return rotate(b, seedOffset(seed, b.length))
  })
  const out: T[] = []
  for (let i = 0; out.length < limit; i++) {
    let added = false
    for (const b of buckets) {
      if (i < b.length && out.length < limit) {
        out.push(b[i])
        added = true
      }
    }
    if (!added) break
  }
  return out
}

function sortCaseStudies(rows: RelatedCaseStudyRow[]): RelatedCaseStudyRow[] {
  return [...rows].sort((a, b) => {
    const t = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
    return t !== 0 ? t : a.slug.localeCompare(b.slug)
  })
}

function sortProducts(rows: RelatedProductRow[]): RelatedProductRow[] {
  return [...rows].sort((a, b) => {
    const o = (a.order ?? 1e9) - (b.order ?? 1e9)
    return o !== 0 ? o : a.name.localeCompare(b.name)
  })
}

export function caseStudyLinks(
  rows: RelatedCaseStudyRow[],
  kinds: FoggerKind[],
  limit: number,
  excludeSlugs: readonly string[] = [],
  seed?: string,
): RelatedLink[] {
  const skip = new Set(excludeSlugs)
  const pool = sortCaseStudies(rows.filter((r) => r.slug && !skip.has(r.slug)))
  return pickByKinds(pool, (r) => caseStudyKind(r.productUsed), kinds, limit, seed).map((c) => ({
    href: `/case-studies/${encodeURIComponent(c.slug)}`,
    label: caseStudyLabel(c),
  }))
}

export function productLinks(
  rows: RelatedProductRow[],
  kinds: FoggerKind[],
  limit: number,
  excludeIds: readonly string[] = [],
  seed?: string,
): RelatedLink[] {
  const skip = new Set(excludeIds)
  const seen = new Set<string>()
  const pool = sortProducts(
    rows.filter((p) => {
      if (skip.has(p.id) || (p.slug && skip.has(p.slug))) return false
      const href = productHref(p)
      if (NEVER_LINK_PRODUCT_PATHS.has(href) || seen.has(href)) return false
      seen.add(href)
      return true
    }),
  )
  return pickByKinds(pool, (p) => productKind(p.name, p.category), kinds, limit, seed).map((p) => ({
    href: productHref(p),
    label: productLabel(p),
  }))
}
