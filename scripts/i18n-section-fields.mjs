// Shared spec: which string fields within each LandingSection `kind` are
// human-copy (must be translated) vs structural/non-copy (URLs, asset paths,
// category filters, icon glyphs, proper-noun-free but intentionally-generic
// placeholders like trust-strip numeric stats) that must be preserved verbatim.
//
// Used by both scripts/check-i18n-completeness.mjs (the gate) and the
// translation-generation instructions given to per-language subagents, so
// the two stay in sync by construction instead of by convention.
//
// Every entry is a list of "paths" relative to one section object, where an
// array segment named `[]` means "for each item in this array".

export const SECTION_TRANSLATABLE_PATHS = {
  "rich-text": ["h2", "paragraphs[]"],
  "trust-strip": ["metrics[].label"], // .value is mostly numeric/stat codes (10,000+, GeM Q2) — not required
  "video": ["title", "description"],
  "benefits-grid": ["eyebrow", "title", "items[].title", "items[].description"],
  "process-timeline": ["eyebrow", "title", "steps[].title", "steps[].description"],
  "comparison-table": ["eyebrow", "title", "columns[]", "rows[].label", "rows[].cells[]", "note"],
  "case-studies": ["eyebrow", "title", "items[].client", "items[].location", "items[].result", "items[].quote"],
  "recommended-products": ["eyebrow", "title"],
  "related-landings": ["eyebrow", "title"],
  "faq": ["eyebrow", "title"], // inline faqs[] (if present) follow the top-level faqs shape, not checked here
  "form": ["eyebrow", "title", "sub", "checklist[]"],
  "cta-band": ["band.heading", "band.sub", "band.primary.label", "band.secondary.label"],
}

// Top-level (non-section) translatable paths on a landing page def.
export const TOP_LEVEL_TRANSLATABLE_PATHS = [
  "hero.eyebrow",
  "hero.sub",
  "hero.headline", // string, or array of {text, accent} parts — text is translatable
  "hero.primary.label",
  "hero.secondary.label",
  "faqs[].q",
  "faqs[].a",
  "metadata.title",
  "metadata.description",
]

function getByPath(obj, path) {
  // Returns an array of {value, setter} leaves matched by `path`, expanding
  // `[]` segments. setter is used by nothing here (read-only) but kept
  // symmetrical with a mutate-in-place variant if ever needed.
  const segs = path.split(".")
  let nodes = [obj]
  for (const seg of segs) {
    const isArray = seg.endsWith("[]")
    const key = isArray ? seg.slice(0, -2) : seg
    const next = []
    for (const n of nodes) {
      if (n == null) continue
      const v = key ? n[key] : n
      if (isArray) {
        if (Array.isArray(v)) next.push(...v)
      } else {
        next.push(v)
      }
    }
    nodes = next
  }
  return nodes
}

/**
 * Extracts every translatable leaf string for a full landing page def
 * ({hero, sections, faqs, metadata}), as a flat array of strings.
 * Handles hero.headline's two shapes (plain string vs HeroHeadlinePart[]).
 */
export function extractTranslatableStrings(pageDef) {
  const out = []
  for (const path of TOP_LEVEL_TRANSLATABLE_PATHS) {
    if (path === "hero.headline") {
      const h = pageDef?.hero?.headline
      if (typeof h === "string") out.push(h)
      else if (Array.isArray(h)) for (const part of h) if (part?.text) out.push(part.text)
      continue
    }
    for (const v of getByPath(pageDef, path)) {
      if (typeof v === "string" && v.length > 0) out.push(v)
    }
  }
  for (const section of pageDef?.sections || []) {
    const paths = SECTION_TRANSLATABLE_PATHS[section.kind] || []
    for (const path of paths) {
      for (const v of getByPath(section, path)) {
        if (typeof v === "string" && v.length > 0) out.push(v)
      }
    }
  }
  return out
}
