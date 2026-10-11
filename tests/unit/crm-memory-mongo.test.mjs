// The shared in-memory Mongo helper retries transient connect resets (Windows flake) and nothing else.
import test from "node:test"
import assert from "node:assert/strict"
import { connectWithRetry } from "./crm/helpers/memory-mongo.mjs"

const fakeClient = () => ({ db: () => ({ command: async () => ({ ok: 1 }) }) })
const reset = () => Object.assign(new Error("read ECONNRESET"), { name: "MongoNetworkError", cause: { code: "ECONNRESET" } })

test("connectWithRetry: transient ECONNRESET is retried, then succeeds", async () => {
  let n = 0
  const c = await connectWithRetry(async () => { if (++n < 3) throw reset(); return fakeClient() }, { delayMs: 1 })
  assert.ok(c); assert.equal(n, 3)
})

test("connectWithRetry: gives up after the attempt limit with the last error", async () => {
  let n = 0
  await assert.rejects(connectWithRetry(async () => { n++; throw reset() }, { attempts: 3, delayMs: 1 }), /ECONNRESET/)
  assert.equal(n, 3)
})

test("connectWithRetry: a non-network error is not retried", async () => {
  let n = 0
  await assert.rejects(connectWithRetry(async () => { n++; throw new TypeError("bad uri") }, { delayMs: 1 }), TypeError)
  assert.equal(n, 1)
})
