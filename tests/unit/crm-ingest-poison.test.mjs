// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-ingest-poison.test.mjs
// Poison event: a worker claims it and never finishes (function killed / hangs), every time.
// The lease-expired re-claim must still count attempts, stop at maxAttempts, mark the row dead,
// and not starve the drain for other events.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { loadFixture } from "./crm/helpers/wa-sign.mjs"
import { freshCrm, post, all, mockUploader, NOW, ingestDeps } from "./crm/helpers/wa-harness.mjs"
import { drainStaleEvents } from "../../lib/crm/whatsapp/ingest.ts"
import { COLL, CRM_DEFAULTS } from "../../lib/crm/model.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

/** fetch that never settles: the worker holding the lease is stuck forever (simulated kill). */
const hangingFetch = () => new Promise(() => {})
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function waitFor(fn, ms = 3000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) return null
    await sleep(20)
  }
}

test("poison event: lease-expired re-claims stop at maxAttempts, row turns dead, drain not starved", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, loadFixture("image"), { runAfter: false })
  const [ev0] = await all(crm, COLL.waEvents)
  const max = ev0.maxAttempts
  assert.equal(max, CRM_DEFAULTS.jobMaxAttempts)

  const leaseMs = CRM_DEFAULTS.jobLeaseMs
  let clock = NOW().getTime()
  let lastAttempts = 0
  // Far more rounds than maxAttempts: each round a fresh worker claims (if allowed) and hangs.
  for (let round = 0; round < max + 4; round++) {
    clock += leaseMs + 1000
    const at = new Date(clock)
    drainStaleEvents(crm, ingestDeps({ fetch: hangingFetch, upload: mockUploader().upload, now: () => at })) // never awaited
    const ev = await waitFor(async () => {
      const [e] = await all(crm, COLL.waEvents, { _id: ev0._id })
      return e.attempts > lastAttempts || e.status === "dead" ? e : null
    }, 1500)
    const [cur] = await all(crm, COLL.waEvents, { _id: ev0._id })
    assert.ok(cur.attempts <= max, `attempts ${cur.attempts} exceeded maxAttempts ${max}`)
    if (ev) lastAttempts = ev.attempts
  }
  // One more sweep after the last lease expired settles the row.
  clock += leaseMs + 1000
  const settleAt = new Date(clock)
  // a healthy event queued meanwhile must still be processed by a normal drain
  await post(crm, loadFixture("text"), { runAfter: false, now: () => settleAt })
  const tally = await drainStaleEvents(crm, ingestDeps({ upload: mockUploader().upload, now: () => settleAt }))
  const evs = await all(crm, COLL.waEvents)
  const poison = evs.find(e => String(e._id) === String(ev0._id))
  const healthy = evs.find(e => String(e._id) !== String(ev0._id))
  assert.equal(poison.attempts, max)
  assert.equal(poison.status, "dead")
  assert.equal(poison.lastError?.code, "lease_expired_max_attempts")
  assert.equal(healthy.status, "done", `healthy event starved: ${JSON.stringify(tally)}`)
})
