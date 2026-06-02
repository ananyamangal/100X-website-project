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
    productFaqs: toStringArray(raw.productFaqs),
    // Object-array fields
    filmChapters: toObjectArray(raw.filmChapters),
    boxContents: toObjectArray(raw.boxContents),
    linkedCaseStudyIds: toObjectArray(raw.linkedCaseStudyIds),
    // Image URLs — unified
    imageUrls,
  }
}

/** Normalize an array of products in one call. */
export function normalizeProducts(raws: any[]): any[] {
  return raws.map(normalizeProduct)
}
