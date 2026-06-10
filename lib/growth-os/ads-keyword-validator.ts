/**
 * Growth OS — Keyword Eligibility Layer.
 *
 * Hard-filters generated keywords BEFORE any Google Ads mutate call.
 * Prevents AI Search / FAQ / content-style phrases from entering campaigns.
 *
 * ALLOW:
 *   Product keywords, dealer keywords, distributor keywords,
 *   OEM keywords, manufacturer keywords, commercial purchase keywords,
 *   GeM-related procurement keywords.
 *
 * REJECT:
 *   Questions, sentences, FAQ phrases, blog titles, comparison articles,
 *   informational content, event/party content, consumer/home-use content.
 *
 * Hard reject triggers (any one fails the keyword):
 *   - Contains ?
 *   - More than 8 words
 *   - Starts with: who/what/when/where/why/how/should/can/does/is/are/which/do/will
 *   - Contains FAQ phrasing (should i, consider when, how to choose, benefits of…)
 *   - Event or party context (event, party, wedding, bubble machine…)
 *   - Consumer / home-use context (home use, domestic, garden fog…)
 *   - Pure informational / blog content (review, meaning, tutorial, vs…)
 *   - No commercial signal at all
 *
 * Must be called from runKeywordIntelligence() before dedup/selection, AND
 * from every Google Ads mutate path before createKeywords().
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type RejectionCategory =
  | "question_mark"
  | "too_long"
  | "interrogative_start"
  | "faq_phrase"
  | "event_party"
  | "consumer_home_use"
  | "informational_blog"
  | "no_commercial_signal"

export interface ValidatedKeyword {
  text:               string
  eligible:           boolean
  rejectionCategory?: RejectionCategory
  rejectionReason?:   string
}

export interface ValidationResult {
  eligible:              ValidatedKeyword[]
  rejected:              ValidatedKeyword[]
  eligibleCount:         number
  rejectedCount:         number
  eligibilityRate:       number   // 0–100 %
  rejectionsByCategory:  Partial<Record<RejectionCategory, number>>
}

// ── Reject rules ─────────────────────────────────────────────────────────────

interface RejectRule {
  category: RejectionCategory
  reason:   string
  test:     (normalised: string) => boolean
}

// Minimum commercial signal — must contain at least one fogging-domain or
// commercial-intent keyword to be eligible. Prevents generic content from slipping through.
const COMMERCIAL_SIGNAL_RE = /\b(fog(?:ger|ging|s)?|ulv|mist\s*blow|thermal|mosquito|vector\s*control|dengue|malaria|pest|disinfect|sanitiz|public\s*health|dealer|dealership|distributor|reseller|oem|franchise|manufacturer|gem\s*(portal|seller|vendor|resell|auth)|government|procurement|tender|quotation|enquir|supplier|wholesaler|exporter|industrial|fogging)\b/i

const REJECT_RULES: RejectRule[] = [
  {
    category: "question_mark",
    reason:   "Contains '?' — questions are not valid Google Ads keywords",
    test:     (q) => q.includes("?"),
  },
  {
    category: "too_long",
    reason:   "More than 8 words — too long for a search keyword; likely a sentence or FAQ phrase",
    test:     (q) => q.trim().split(/\s+/).length > 8,
  },
  {
    category: "interrogative_start",
    reason:   "Starts with interrogative word — these are questions, not commercial search queries",
    test:     (q) => /^(what|when|where|who|why|how|should|can|does|is|are|will|which|do|am|was|were|has|have|had|could|would|shall)\b/.test(q),
  },
  {
    category: "faq_phrase",
    reason:   "Contains FAQ or blog-article phrasing — not a commercial query",
    test:     (q) => /\b(should\s+i|consider\s+when|what\s+to\s+look\s+for|benefits\s+of|advantages\s+of|disadvantages\s+of|how\s+to\s+choose|which\s+is\s+better|vs\s+|versus\s|difference\s+between|guide\s+to|tips\s+for|best\s+practices|step\s+by\s+step|for\s+my\s+event|for\s+my\s+party|for\s+my\s+venue|things\s+to|reasons\s+to|ways\s+to)\b/.test(q),
  },
  {
    category: "event_party",
    reason:   "Event or party-use keyword — not a commercial fogging machine buyer",
    test:     (q) => /\b(event|party|wedding|birthday|halloween|disco|nightclub|theatre|theater|stage\s+fog|bubble\s+machine|fog\s+machine\s+for\s+party|fog\s+effect|atmospheric\s+fog|fog\s+juice|dance\s+floor|special\s+effect|concert|venue\s+fog)\b/.test(q),
  },
  {
    category: "consumer_home_use",
    reason:   "Consumer or home-use keyword — not a B2B/commercial buyer",
    test:     (q) => /\b(home\s+use|for\s+home|domestic\s+use|residential|personal\s+use|garden\s+fog|diy\s+fog|buy\s+online|amazon|flipkart|for\s+garden|for\s+backyard|for\s+small\s+farm|hobby|craft)\b/.test(q),
  },
  {
    category: "informational_blog",
    reason:   "Informational or research phrase — not a commercial purchase intent",
    test:     (q) => /\b(meaning|definition|what\s+is\s+a|types\s+of|history\s+of|wikipedia|article|review\b|comparison\b|pros\s+and\s+cons|specification(?!s\s+required)|manual\b|tutorial|video\b|youtube|interview|case\s+study\b|overview\b|introduction\s+to)\b/.test(q),
  },
  {
    category: "no_commercial_signal",
    reason:   "No commercial signal — must contain a product, role, or commercial intent keyword",
    test:     (q) => !COMMERCIAL_SIGNAL_RE.test(q),
  },
]

// ── Core validator ────────────────────────────────────────────────────────────

export function validateKeyword(text: string): ValidatedKeyword {
  const normalised = text.trim().toLowerCase()

  if (!normalised || normalised.length < 2) {
    return {
      text,
      eligible:          false,
      rejectionCategory: "no_commercial_signal",
      rejectionReason:   "Empty or too short",
    }
  }

  for (const rule of REJECT_RULES) {
    if (rule.test(normalised)) {
      return {
        text,
        eligible:          false,
        rejectionCategory: rule.category,
        rejectionReason:   rule.reason,
      }
    }
  }

  return { text, eligible: true }
}

export function validateKeywords(texts: string[]): ValidationResult {
  const results = texts.map(validateKeyword)
  const eligible = results.filter(r => r.eligible)
  const rejected = results.filter(r => !r.eligible)

  const rejectionsByCategory: Partial<Record<RejectionCategory, number>> = {}
  for (const r of rejected) {
    if (r.rejectionCategory) {
      rejectionsByCategory[r.rejectionCategory] = (rejectionsByCategory[r.rejectionCategory] ?? 0) + 1
    }
  }

  return {
    eligible,
    rejected,
    eligibleCount:        eligible.length,
    rejectedCount:        rejected.length,
    eligibilityRate:      texts.length > 0 ? Math.round((eligible.length / texts.length) * 100) : 0,
    rejectionsByCategory,
  }
}

// ── Pipeline audit ────────────────────────────────────────────────────────────
// Accepts GeneratedKeyword-shaped objects — validates and annotates in place.

export interface KeywordPipelineAuditEntry {
  source:     string
  theme:      string
  keyword:    string
  eligible:   boolean
  rejectionCategory?: RejectionCategory
  rejectionReason?:   string
}

export function auditKeywordPipeline(
  keywords: Array<{ text: string; source: string; adGroupTheme: string }>,
): KeywordPipelineAuditEntry[] {
  return keywords.map(kw => {
    const v = validateKeyword(kw.text)
    return {
      source:            kw.source,
      theme:             kw.adGroupTheme,
      keyword:           kw.text,
      eligible:          v.eligible,
      rejectionCategory: v.rejectionCategory,
      rejectionReason:   v.rejectionReason,
    }
  })
}
