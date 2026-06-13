/**
 * MongoDB filter that excludes test / QA submissions from all production queries.
 *
 * Two layers of defense:
 *   1. _test: true  — flag written by audit-test-leads.mjs (and set on future Playwright runs)
 *   2. Pattern match — catches untagged test data: Playwright names, hardcoded phones, test pages
 *
 * Add this filter to every `find()` and every `$match` stage that reads submissions
 * or rfq_popup_leads.
 */

export const PROD_FILTER = {
  _test: { $ne: true },
  name:  { $not: { $regex: '^(playwright|precommit-\\d)|^test\\s|\\btest\\b|\\btest lead\\b|playwright\\s+(test|mobile)|audittest', $options: 'i' } },
  phone: { $nin: ['9000000001', '9000000002'] },
}

/** Secondary runtime check (used where docs are fetched and classified in Node.js). */
const TEST_NAME_RE    = /^(playwright|precommit-\d+)|^test\s|\btest\b|\btest lead\b|playwright\s+(test|mobile)|audittest/i
const TEST_ORG_RE     = /playwright.*corp|precommit.*corp|test\s*(corp|org|municipal|company)/i
const TEST_MSG_RE     = /do not process|automated verification|precommit test|playwright|please ignore/i
const TEST_PHONES_SET = new Set(['9000000001', '9000000002'])
const TEST_PHONE_RE   = /^9000000/
const TEST_PAGE_RE    = /^\/(test-|verify-|staging-|_test|acceptance)/

export function isTestDoc(doc: Record<string, unknown>): boolean {
  // For popup leads, name lives in answers[<question-label>] — find first key containing "name"
  const answers    = (doc.answers as Record<string, string>) || {}
  const answerName = Object.entries(answers).find(([k]) => k.toLowerCase().includes('name'))?.[1] ?? ''
  const name  = String((doc.name as string) || answerName)
  const org   = String((doc.organization as string) || ((doc.answers as Record<string, string>)?.organization ?? ''))
  const msg   = String((doc.message as string) || (doc.requirement as string) || ((doc.answers as Record<string, string>)?.description ?? ''))
  const phone = String((doc.phone as string) || ((doc.answers as Record<string, string>)?.phone ?? '')).replace(/\D/g, '')
  const page  = String((doc.form_page_path as string) || (doc.pagePath as string) || '')

  return !!(
    doc._test === true
    || TEST_NAME_RE.test(name)
    || TEST_ORG_RE.test(org)
    || TEST_MSG_RE.test(msg)
    || TEST_PHONES_SET.has(phone)
    || (phone && TEST_PHONE_RE.test(phone))
    || (page && TEST_PAGE_RE.test(page))
  )
}
