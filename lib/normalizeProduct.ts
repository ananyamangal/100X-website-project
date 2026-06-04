/**
 * Canonical product normalization layer.
 *
 * Call this on every product document that leaves MongoDB — in every GET handler —
 * so all consumers (admin form, product detail page, listing page) always receive
 * clean, type-consistent data regardless of when the product was created.
 *
 * Handles: string | string[] | null | undefined → string[]
 *          legacy imageUrl → imageUrls[]
 *          missing object-array fields → []
 */

/** Coerce any string-or-array field into a clean string[]. */
export function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return (val as unknown[]).filter((v) => typeof v === "string" && v.trim()) as string[]
  if (typeof val === "string" && val.trim()) {
    return val
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** Coerce any value into a typed object array (filmChapters, boxContents, etc.). */
export function toObjectArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  return []
}

/**
 * Normalize productFaqs into [{q, a}] format.
 * Accepts:
 *   - Array of {q, a} objects (new format)
 *   - Array of "Q: ... | A: ..." strings (legacy format)
 *   - Mixed arrays
 */
export function toFaqArray(val: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(val)) return []
  return val
    .map((item: unknown) => {
      if (item && typeof item === "object" && "q" in item) {
        const f = item as { q?: unknown; a?: unknown }
        return { q: String(f.q ?? "").trim(), a: String(f.a ?? "").trim() }
      }
      if (typeof item === "string") {
        const sep = item.indexOf(" | A:")
        if (sep !== -1) {
          const q = item.slice(0, sep).replace(/^Q:\s*/i, "").trim()
          const a = item.slice(sep + 5).trim()
          return { q, a }
        }
        // Fallback: treat whole string as a question
        return { q: item.replace(/^Q:\s*/i, "").trim(), a: "" }
      }
      return null
    })
    .filter((f): f is { q: string; a: string } => f !== null && Boolean(f.q))
}

/** Normalize a raw MongoDB product document to the canonical Product shape. */
export function normalizeProduct(raw: any): any {
  if (!raw) return raw

  // imageUrls: string → array (legacy: single imageUrl field)
  let imageUrls: string[] = []
  if (Array.isArray(raw.imageUrls) && raw.imageUrls.length > 0) {
    imageUrls = raw.imageUrls.filter(Boolean)
  } else if (typeof raw.imageUrls === "string" && raw.imageUrls.trim()) {
    imageUrls = raw.imageUrls
      .split(/\r?\n/)
      .map((u: string) => u.trim())
      .filter(Boolean)
  } else if (typeof raw.imageUrl === "string" && raw.imageUrl.trim()) {
    imageUrls = [raw.imageUrl]
  } else if (typeof raw.image === "string" && raw.image.trim()) {
    imageUrls = [raw.image]
  }

  return {
    ...raw,
    // Core array fields — safe for both new and legacy products
    features: toStringArray(raw.features),
    specifications: toStringArray(raw.specifications),
    applications: toStringArray(raw.applications),
    badges: toStringArray(raw.badges),
    certifications: toStringArray(raw.certifications),
    performanceMetrics: toStringArray(raw.performanceMetrics),
    productFaqs: toFaqArray(raw.productFaqs),
    // Object-array fields
    filmChapters: toObjectArray(raw.filmChapters),
    boxContents: toObjectArray(raw.boxContents),
    linkedCaseStudyIds: toObjectArray(raw.linkedCaseStudyIds),
    // UGC deployment carousel
    ugcImages: toStringArray(raw.ugcImages),
    // Image URLs — unified
    imageUrls,
  }
}

/** Normalize an array of products in one call. */
export function normalizeProducts(raws: any[]): any[] {
  return raws.map(normalizeProduct)
}
