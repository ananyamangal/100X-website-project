import { navThumbUrl } from "@/lib/navProducts"

/**
 * Data for the header "Performance" menu: every published case study with its
 * detail URL and a small thumbnail. Database-free so the shaping is unit-tested
 * on plain objects; the cached reader is getNavPerformance() in lib/layoutData.ts.
 * The quick links are static pages and live in components/NavPerformanceMenu.tsx.
 */
export interface NavCaseStudy {
  /** Customer / organisation when set (short), else the case-study title. */
  label: string
  /** State, shown as a muted second line; null when unknown. */
  state: string | null
  /** /case-studies/<slug> — the same URL the /case-studies cards link to. */
  href: string
  /** ~160x160 Cloudinary rendition, or null (the menu draws a placeholder). */
  thumb: string | null
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)

function time(v: unknown): number {
  const t = v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : 0
}

/**
 * Raw case_studies documents → menu items. Published only (published === true,
 * the rule /case-studies and /case-studies/[slug] use), a slug is required (no
 * detail page otherwise), newest first like the /case-studies grid.
 */
export function shapeNavCaseStudies(docs: Record<string, unknown>[]): NavCaseStudy[] {
  return docs
    .filter((d) => d && d.published === true && str(d.slug) && (str(d.customer) || str(d.title)))
    .sort((a, b) => time(b.createdAt) - time(a.createdAt))
    .map((d) => ({
      label: (str(d.customer) || str(d.title))!,
      state: str(d.state),
      href: `/case-studies/${str(d.slug)}`,
      thumb: navThumbUrl(Array.isArray(d.images) ? d.images[0] : undefined),
    }))
}
