// Pure part of the case-study sitemap rows (B6); no DB import so it is unit-testable.
export type CaseStudySitemapRow = { slug: string; lastModified?: string }

function isoOf(v: unknown): string | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString()
  if (typeof v === "string" && v) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
  }
  return undefined
}

/** Pure: DB docs -> sitemap rows (published, real slug, honest lastmod, de-duplicated). */
export function toCaseStudySitemapRows(docs: ReadonlyArray<Record<string, unknown>>): CaseStudySitemapRow[] {
  const seen = new Set<string>()
  const rows: CaseStudySitemapRow[] = []
  for (const d of docs) {
    if (d.published !== true || d.isSample === true) continue
    const slug = typeof d.slug === "string" ? d.slug.trim() : ""
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    rows.push({ slug, lastModified: isoOf(d.updatedAt) ?? isoOf(d.createdAt) })
  }
  return rows
}
