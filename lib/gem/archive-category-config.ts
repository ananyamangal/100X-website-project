/**
 * lib/gem/archive-category-config.ts
 *
 * Server-side category allow-list for archive writes.
 * ARCHIVE_POLICY is the runtime gate — only category IDs listed in
 * approvedCategoryIds are active. Changing scope requires a code deploy.
 *
 * Approved 2026-06-13, Phase 3 Layer 1 Design.
 */

// ─── Policy ───────────────────────────────────────────────────────────────────

export const ARCHIVE_POLICY = {
  version: "1.0.0",
  approvedCategoryIds: [
    "FOGGING_MACHINE_V2_IS_14855_PART_1",
  ],
  approvedBy: "Phase 3 Layer 1 Design",
  approvedAt: "2026-06-13",
} as const

/** Maximum number of contracts a single approval token may archive. */
export const MAX_CONTRACTS_PER_RUN = 10 as const

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryRule {
  categoryId: string
  displayName: string
  /** product_name must match at least one */
  allowPatterns: RegExp[]
  /** product_name must match none */
  rejectPatterns: RegExp[]
  /** advisory — logged, does not block */
  specMarkers?: RegExp[]
}

export interface CategoryValidationResult {
  allowed: boolean
  categoryId: string | null
  displayName: string | null
  matchedAllowPattern: string | null
  matchedRejectPattern: string | null
  reason:
    | "ALLOWED"
    | "MISSING_PRODUCT_NAME"
    | "REJECTED_SUBCATEGORY"
    | "CATEGORY_NOT_IN_SCOPE"
  specMarkersFound: string[]
}

// ─── Category definitions ─────────────────────────────────────────────────────

const ALLOWED_CATEGORIES: CategoryRule[] = [
  {
    categoryId: "FOGGING_MACHINE_V2_IS_14855_PART_1",
    displayName: "Fogging Machine (V2) as per IS 14855 (Part 1)",
    allowPatterns: [
      /fogg/i,
      /thermal\s*fog/i,
    ],
    rejectPatterns: [
      /vehicle\s*mount/i,
      /truck\s*mount/i,
      /mount.*fog/i,
      /fog.*mount/i,
      /\bvmf\b/i,
      /mini.*fog/i,
      /fog.*mini/i,
      /\bULV\b/i,
      /mist\s*blow/i,
      /thermal\s*fog.*sprayer/i,
    ],
    specMarkers: [
      /IS\s*14855/i,
      /Part\s*1/i,
      /V2/i,
    ],
  },
]

// ─── Validation function ──────────────────────────────────────────────────────

/**
 * Validates a product_name from gem_contracts against the active archive policy.
 * Always uses product_name from MongoDB — never trust client-provided values.
 */
export function validateArchiveCategory(
  productName: string | null | undefined,
): CategoryValidationResult {
  if (!productName?.trim()) {
    return {
      allowed: false, categoryId: null, displayName: null,
      matchedAllowPattern: null, matchedRejectPattern: null,
      reason: "MISSING_PRODUCT_NAME", specMarkersFound: [],
    }
  }

  const approved = ARCHIVE_POLICY.approvedCategoryIds as readonly string[]
  const activeRules = ALLOWED_CATEGORIES.filter(r => approved.includes(r.categoryId))

  for (const rule of activeRules) {
    for (const rp of rule.rejectPatterns) {
      if (rp.test(productName)) {
        return {
          allowed: false,
          categoryId: rule.categoryId,
          displayName: rule.displayName,
          matchedAllowPattern: null,
          matchedRejectPattern: rp.toString(),
          reason: "REJECTED_SUBCATEGORY",
          specMarkersFound: [],
        }
      }
    }
    for (const ap of rule.allowPatterns) {
      if (ap.test(productName)) {
        const specMarkersFound = (rule.specMarkers ?? [])
          .filter(sm => sm.test(productName))
          .map(sm => sm.toString())
        return {
          allowed: true,
          categoryId: rule.categoryId,
          displayName: rule.displayName,
          matchedAllowPattern: ap.toString(),
          matchedRejectPattern: null,
          reason: "ALLOWED",
          specMarkersFound,
        }
      }
    }
  }

  return {
    allowed: false, categoryId: null, displayName: null,
    matchedAllowPattern: null, matchedRejectPattern: null,
    reason: "CATEGORY_NOT_IN_SCOPE", specMarkersFound: [],
  }
}
