// Run: node --import ./tests/support/register.mjs --test tests/unit/attribution-storage.test.mjs
// Pins lib/gtm.ts campaign attribution persistence (localStorage, 30-day expiry,
// sessionStorage fallback, new click ids overwrite) and the server-side
// sanitizeAttribution whitelist.
import test from "node:test"
import assert from "node:assert/strict"
import {
  parseStoredCampaign,
  migrateLegacyCampaign,
  mergePersistedAttributionFromUrl,
  getPersistedAttribution,
  ATTRIBUTION_STORAGE_KEY,
  ATTRIBUTION_TTL_MS,
} from "../../lib/gtm.ts"
import { sanitizeAttribution } from "../../lib/attribution-sanitize.ts"

function memStore(throwing = false) {
  const m = new Map()
  return {
    getItem: (k) => { if (throwing) throw new Error("denied"); return m.has(k) ? m.get(k) : null },
    setItem: (k, v) => { if (throwing) throw new Error("denied"); m.set(k, String(v)) },
    removeItem: (k) => { if (throwing) throw new Error("denied"); m.delete(k) },
  }
}

function setup({ search = "", local = memStore(), session = memStore() } = {}) {
  globalThis.window = { location: { search, pathname: "/" } }
  globalThis.localStorage = local
  globalThis.sessionStorage = session
  return { local, session }
}

test("parseStoredCampaign: fresh ok, expired and malformed are null", () => {
  const now = Date.now()
  const wrap = (ts) => JSON.stringify({ ts, data: { gclid: "abc" } })
  assert.deepEqual(parseStoredCampaign(wrap(now - 1000), now), { gclid: "abc" })
  assert.equal(parseStoredCampaign(wrap(now - ATTRIBUTION_TTL_MS - 1), now), null)
  assert.equal(parseStoredCampaign("not json", now), null)
  assert.equal(parseStoredCampaign(JSON.stringify({ gclid: "abc" }), now), null)
  assert.equal(parseStoredCampaign(null, now), null)
})

test("merge stores utm + click ids (incl. gbraid/wbraid) in localStorage", () => {
  const { local } = setup({ search: "?utm_source=google&gbraid=G1&wbraid=W1&other=x" })
  mergePersistedAttributionFromUrl()
  const stored = JSON.parse(local.getItem(ATTRIBUTION_STORAGE_KEY))
  assert.equal(typeof stored.ts, "number")
  assert.deepEqual(stored.data, { utm_source: "google", gbraid: "G1", wbraid: "W1" })
  assert.equal(getPersistedAttribution().gbraid, "G1")
})

test("a new click id overwrites; unrelated stored keys are kept", () => {
  setup({ search: "?gclid=OLD&utm_campaign=c1" })
  mergePersistedAttributionFromUrl()
  globalThis.window.location.search = "?gclid=NEW"
  mergePersistedAttributionFromUrl()
  const a = getPersistedAttribution()
  assert.equal(a.gclid, "NEW")
  assert.equal(a.utm_campaign, "c1")
})

test("entries older than 30 days are ignored and cleared", () => {
  const local = memStore()
  local.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ ts: Date.now() - ATTRIBUTION_TTL_MS - 5000, data: { gclid: "stale" } }))
  setup({ local })
  assert.equal(getPersistedAttribution().gclid, undefined)
  assert.equal(local.getItem(ATTRIBUTION_STORAGE_KEY), null)
})

test("falls back to sessionStorage when localStorage throws", () => {
  const session = memStore()
  setup({ search: "?fbclid=F1", local: memStore(true), session })
  mergePersistedAttributionFromUrl()
  assert.ok(session.getItem(ATTRIBUTION_STORAGE_KEY))
  assert.equal(getPersistedAttribution().fbclid, "F1")
})

test("no storage at all: no throw, empty attribution", () => {
  setup({ search: "?gclid=X", local: memStore(true), session: memStore(true) })
  assert.doesNotThrow(() => mergePersistedAttributionFromUrl())
  assert.deepEqual(getPersistedAttribution(), {})
})

test("sanitizeAttribution: whitelist, string-only, length cap, empty -> undefined", () => {
  const out = sanitizeAttribution({ gclid: "g".repeat(1000), utm_source: " s ", evil: "x", landingPage: 5, $where: "1" })
  assert.deepEqual(Object.keys(out).sort(), ["gclid", "utm_source"])
  assert.equal(out.gclid.length, 300)
  assert.equal(out.utm_source, "s")
  assert.equal(sanitizeAttribution({}), undefined)
  assert.equal(sanitizeAttribution(null), undefined)
  assert.equal(sanitizeAttribution([1]), undefined)
  assert.equal(sanitizeAttribution("x"), undefined)
})

test("migrateLegacyCampaign: keeps campaign keys from the old flat sessionStorage entry", () => {
  const legacy = JSON.stringify({ utm_source: "google", gclid: "g1", landingPage: "/x", sessionPageCount: "3" })
  assert.deepEqual(migrateLegacyCampaign(legacy), { utm_source: "google", gclid: "g1" })
  assert.equal(migrateLegacyCampaign(JSON.stringify({ ts: 1, data: { gclid: "g" } })), null)
  assert.equal(migrateLegacyCampaign(JSON.stringify({ landingPage: "/x" })), null)
  assert.equal(migrateLegacyCampaign("not json"), null)
  assert.equal(migrateLegacyCampaign(null), null)
})
