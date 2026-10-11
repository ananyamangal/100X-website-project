/**
 * Keyword tagging (STEP 8): whole-word, case-insensitive matches of crm_settings.keywordRules in an
 * inbound text become `contact.suggestions[]` (status pending) for a human to accept or reject.
 * Unicode-aware word boundaries, so Hindi keywords work too.
 */
import type { KeywordRule } from "./settings"

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Rules whose keyword occurs in `text` as a whole word (multi-word keywords allowed; spaces flexible). */
export function matchKeywordRules(text: string | null | undefined, rules: readonly KeywordRule[]): KeywordRule[] {
  if (!text || !rules.length) return []
  const hay = text.normalize("NFC")
  const out: KeywordRule[] = []
  for (const r of rules) {
    const kw = r.keyword.trim().normalize("NFC")
    if (!kw) continue
    const pattern = kw.split(/\s+/).map(escape).join("\\s+")
    const re = new RegExp(`(^|[^\\p{L}\\p{N}\\p{M}])${pattern}(?=$|[^\\p{L}\\p{N}\\p{M}])`, "iu")
    if (re.test(hay)) out.push(r)
  }
  return out
}
