/**
 * Opportunity Engine configuration — Version 1
 * --------------------------------------------
 * SINGLE SOURCE OF TRUTH for taxonomy, scoring weights, and thresholds.
 * Nothing here is hard-coded into the engines; both the Dealer Opportunity
 * Engine and the Machine Buyer Opportunity Engine read from this config so
 * recommendation logic can be tuned later WITHOUT redesigning the system.
 *
 * Bump SCORING_VERSION when weights/thresholds change.
 * Bump TAXONOMY_VERSION when category patterns change.
 * Both versions are stamped onto every stored recommendation so future
 * tuning can be evaluated against historical runs.
 */

export const SCORING_VERSION = "v1.0.0"
export const TAXONOMY_VERSION = "v1.0.0"

export type Segment = "dealer" | "machine_buyer"
export type Confidence = "high" | "medium" | "low"

// ── Product-fit taxonomy (regex source fragments, compiled at runtime) ──────────
// Primary signal is product_name / product_desc text. category_name is corrupted
// and category_path is empty in the current GeM corpus, so they are not relied on.
export interface Taxonomy {
  tierA: string[] // fogging / ULV / sprayer machines — core 100X equipment
  tierB: string[] // adjacent agri machinery in the 100X range
  chemical: string[] // ULV / larvicide chemicals — machine-BUYER intent signal
  exclude: string[] // explicit noise: consumer/medical/cleaning false positives
}

export const TAXONOMY: Taxonomy = {
  tierA: [
    "thermal\\s*fog", "\\bfogger\\b", "fogging\\s*machine", "fog\\s*sanitizer",
    "cold\\s*fog", "mist\\s*blow", "aero\\s*blast", "power\\s*sprayer",
    "knapsack\\s*sprayer", "compression\\s*knapsack", "hand\\s*operated\\s*sprayer",
    "tractor\\s*(operated|mounted)\\s*sprayer", "vehicle\\s*mount\\w*\\s*fog", "\\bULV\\b",
  ],
  tierB: [
    "brush\\s*cutter", "power\\s*tiller", "power\\s*weeder", "\\breaper\\b", "chaff\\s*cutter",
  ],
  chemical: [
    "deltamethrin", "cypermethrin", "malathion", "temephos", "permethrin",
    "fenitrothion", "propoxur", "larvicid", "adulticid", "super\\s*white\\s*fog",
    "kingfog", "pyrethr",
  ],
  // v1 false-positive exclusions discovered during validation:
  // air fresheners, mosquito nets, repellents, medical nebulizers, dusters, fans.
  exclude: [
    "air\\s*freshener", "freshener", "mosquito\\s*net", "netting",
    "repell[ae]nt\\s*(lotion|spray|refill|coil|cream)", "mosquito\\s*coil",
    "shuttlecock", "forceps", "naphthalene", "incense", "agarbatti", "duster",
    "white\\s*board", "vaporizer", "nebuliz", "atomiz", "pedestal\\s*fan",
    "room\\s*spray", "mist\\s*fan",
  ],
}

// ── Scoring weights (0–100 scale; each component is a 0–1 factor × weight) ───────
export interface DealerWeights { fit: number; volume: number; recency: number; contact: number }
export interface BuyerWeights { intent: number; typeFit: number; recency: number; contact: number }

export const DEALER_WEIGHTS: DealerWeights = { fit: 45, volume: 20, recency: 20, contact: 15 }
export const BUYER_WEIGHTS: BuyerWeights = { intent: 45, typeFit: 20, recency: 15, contact: 20 }

// Product-fit tier → 0–1 factor (Dealer engine)
export const FIT_TIER_VALUE: Record<"A" | "B", number> = { A: 1.0, B: 0.6 }

// Machine-buyer intent by purchase signal → 0–1 factor
//  chemical   = buys fogging chemicals, likely needs a machine (highest intent)
//  machine    = already bought a fogging/sprayer machine (repeat / AMC / upgrade)
//  equipment  = bought adjacent agri equipment (lower intent)
export const BUYER_INTENT_VALUE: Record<"chemical" | "machine" | "equipment", number> = {
  chemical: 1.0,
  machine: 0.8,
  equipment: 0.55,
}

// Recency buckets (days since last GeM activity) → 0–1 factor
export const RECENCY_BUCKETS: Array<{ maxDays: number; value: number }> = [
  { maxDays: 90, value: 1.0 },
  { maxDays: 180, value: 0.8 },
  { maxDays: 365, value: 0.6 },
  { maxDays: 730, value: 0.3 },
  { maxDays: Infinity, value: 0.1 },
]

// Buyer-type fit: government segments that genuinely run fogging/vector-control ops
export const BUYER_TYPE_PATTERN =
  "municipal|nagar|panchayat|corporation|cantonment|\\bhealth\\b|medical|nvbdcp|\\bnhm\\b|malaria|vector|forest|agricultur|horticultur|urban|public\\s*health|nigam|parishad"
export const BUYER_TYPE_MATCH_VALUE = 1.0
export const BUYER_TYPE_DEFAULT_VALUE = 0.4

// ── Confidence thresholds (config-driven) ───────────────────────────────────────
// High: strong score AND contactable AND a top-tier fit/intent signal.
// Medium: decent score. Low: everything else.
export const CONFIDENCE = {
  highScore: 70,
  mediumScore: 50,
}

// ── Output sizing ───────────────────────────────────────────────────────────────
export const TOP_N_PER_SEGMENT = 20
export const TOP_N_COMBINED = 50

// ── Dealer Action Status workflow ───────────────────────────────────────────────
export const ACTION_STATUSES = [
  "New", "Contacted", "Interested", "OEM Sent", "Follow-up", "Won", "Lost", "Ignore",
] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]
export const SUPPRESSED_STATUSES: ActionStatus[] = ["Won", "Lost", "Ignore"]
export const IN_PROGRESS_STATUSES: ActionStatus[] = ["Contacted", "Interested", "OEM Sent", "Follow-up"]
export const IN_PROGRESS_DOWNGRADE = 0.4 // surface fresh "New" entities ahead of in-progress ones
