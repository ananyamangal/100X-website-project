import { getPersistedAttribution } from "@/lib/gtm"

/** sessionStorage flag set when a QA/test lead is submitted in this tab. */
export const TEST_LEAD_SESSION_KEY = "qa_test_lead"

const TEST_NAME_RE = /^\s*test\s*-\s*ignore\s*$/i
const TEST_UTM_SOURCE = "qa-test"

/**
 * Pure check: a lead is a QA/test lead when the submitted name is
 * "TEST - ignore" (case/space tolerant) or the attribution utm_source is "qa-test".
 */
export function isTestLead(input: {
  name?: unknown
  attribution?: { utm_source?: unknown } | null
}): boolean {
  const name = typeof input?.name === "string" ? input.name : ""
  if (TEST_NAME_RE.test(name)) return true
  const src = input?.attribution?.utm_source
  return typeof src === "string" && src.trim().toLowerCase() === TEST_UTM_SOURCE
}

/** Remember in this browser session that a test lead was submitted. */
export function markTestLeadSession(): void {
  try {
    sessionStorage.setItem(TEST_LEAD_SESSION_KEY, "1")
  } catch {
    /* storage unavailable — no-op */
  }
}

function hasTestLeadSessionFlag(): boolean {
  try {
    return sessionStorage.getItem(TEST_LEAD_SESSION_KEY) === "1"
  } catch {
    return false
  }
}

/** Client check: name, persisted attribution, or the session flag. */
export function isTestLeadClient(name?: unknown): boolean {
  if (typeof window === "undefined") return false
  return (
    isTestLead({ name, attribution: getPersistedAttribution() }) ||
    hasTestLeadSessionFlag()
  )
}

/**
 * Client helper for submit sites: returns true (and marks the session) when
 * the lead is a test lead, so the caller can skip only generate_lead.
 */
export function shouldSkipGenerateLead(name?: unknown): boolean {
  if (!isTestLeadClient(name)) return false
  markTestLeadSession()
  return true
}
