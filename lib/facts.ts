// Single source of truth for public claims in code. Mirrors docs/FACTS.md.
// If a fact is not here or in docs/FACTS.md, do not publish it (see docs/OPEN_FACTS.md).

export const FOUNDED_YEAR = 2020

/** Whole calendar years since FOUNDED_YEAR. Never read this from the database. */
export function yearsInBusiness(now: Date = new Date()): number {
  return now.getFullYear() - FOUNDED_YEAR
}

/** Fogging machine models in the live catalogue (the baggage trolley is not a fogger). */
export const FOGGER_MODEL_COUNT = 9

/** States with a verified government order or case study. */
export const VERIFIED_STATES = [
  "Bihar",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Kerala",
  "Maharashtra",
  "Rajasthan",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const

export const VERIFIED_STATE_COUNT = VERIFIED_STATES.length // 12

/** Rounded down from 122 published spare-part records. */
export const SPARE_PARTS_CLAIM = "120+"

export const RESPONSE_PROMISE = "within 24 hours on working days"

export const SPARE_DISPATCH = "24-48 hours"

/** Government buyers on the past-performance register. */
export const GOV_BUYERS_LISTED = 23

/** Published case studies. */
export const CASE_STUDY_COUNT = 24
