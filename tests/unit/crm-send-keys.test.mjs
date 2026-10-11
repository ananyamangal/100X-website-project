// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-send-keys.test.mjs
// Inbox / template sends: when the idempotency key must change before a retry (review 2 #3).
import test from "node:test"
import assert from "node:assert/strict"
import { ApiError, errorText, rotateKeyAfter, sentMessageFailed, UiError } from "../../components/admin/crm/api.ts"

test("a definite failure gets a new key; an uncertain one keeps it (no second copy possible)", () => {
  assert.equal(rotateKeyAfter(new ApiError(502, "send_failed", {}, [], [], { retryQueued: false, retryable: false, outcomeUnknown: false })), true)
  assert.equal(rotateKeyAfter(new ApiError(400, "validation")), true)
  assert.equal(rotateKeyAfter(new ApiError(502, "send_failed", {}, [], [], { retryQueued: true })), false, "a retry job will send it")
  assert.equal(rotateKeyAfter(new ApiError(502, "send_failed", {}, [], [], { outcomeUnknown: true })), false, "Meta may have it")
  assert.equal(rotateKeyAfter(new TypeError("fetch failed")), false, "no answer at all")
})

test("a 200 dedupe to a failed earlier attempt is not a success; UiError text is shown as written", () => {
  assert.equal(sentMessageFailed({ deduped: true, message: { status: "failed" } }), true)
  assert.equal(sentMessageFailed({ deduped: false, message: { status: "sent" } }), false)
  assert.equal(sentMessageFailed(null), false)
  assert.equal(errorText(new UiError("Check the thread")), "Check the thread")
  assert.match(errorText(new ApiError(413, "audience_too_large")), /too big to store/)
})
