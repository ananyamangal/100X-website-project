// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-indexes.test.mjs
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { INDEX_SPECS, COLL } from "../../lib/crm/model.ts"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { applyIndexSpecs, validateIndexSpecs } from "../../lib/crm/indexes.ts"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })

test("every non-TTL index spec leads with workspace; names unique per collection; TTL specs are the only exceptions", () => {
  assert.ok(INDEX_SPECS.length > 20)
  const seen = new Set()
  for (const s of INDEX_SPECS) {
    const label = s.collection + "." + s.name
    assert.ok(!seen.has(label), "duplicate " + label)
    seen.add(label)
    assert.ok(Object.values(COLL).includes(s.collection), "unknown collection " + s.collection)
    if (s.expireAfterSeconds === undefined) assert.equal(Object.keys(s.key)[0], "workspace", label + " must lead with workspace")
    else assert.equal(Object.keys(s.key).length, 1, label + " TTL index must be single-field")
  }
  assert.doesNotThrow(() => validateIndexSpecs(INDEX_SPECS))
})

test("validateIndexSpecs rejects a non-TTL spec that does not lead with workspace, and duplicates", () => {
  assert.throws(() => validateIndexSpecs([{ collection: COLL.contacts, name: "bad", key: { phoneE164: 1 } }]), /workspace/)
  assert.throws(() => validateIndexSpecs([{ collection: COLL.contacts, name: "a", key: { workspace: 1, a: 1 } }, { collection: COLL.contacts, name: "a", key: { workspace: 1, b: 1 } }]), /duplicate/)
  assert.doesNotThrow(() => validateIndexSpecs([{ collection: COLL.contacts, name: "ttl", key: { expireAt: 1 }, expireAfterSeconds: 0 }]))
})

test("dry run creates nothing", async t => {
  if (!m.ok) return t.skip(m.skip)
  const db = m.client.db("crm_idx_dry")
  const crm = crmDbFrom(db, "fogging")
  const r = await crm.ensureIndexes(undefined, { dryRun: true })
  assert.equal(r.dryRun, true)
  assert.equal(r.created.length, INDEX_SPECS.length)
  assert.equal((await db.listCollections().toArray()).length, 0, "dry run must not create collections")
})

test("applyIndexSpecs is idempotent on a real mongod: second run creates nothing, drops nothing, no conflicts", async t => {
  if (!m.ok) return t.skip(m.skip)
  const db = m.client.db("crm_idx_apply")
  const crm = crmDbFrom(db, "fogging")
  const first = await crm.ensureIndexes()
  assert.deepEqual(first.conflicts, [], JSON.stringify(first.conflicts))
  assert.equal(first.created.length, INDEX_SPECS.length)

  const snapshot = async () => {
    const out = {}
    for (const c of new Set(INDEX_SPECS.map(s => s.collection))) {
      out[c] = (await db.collection(c).listIndexes().toArray()).map(i => i.name).sort()
    }
    return out
  }
  const before1 = await snapshot()
  // every spec exists under its name
  for (const s of INDEX_SPECS) assert.ok(before1[s.collection].includes(s.name), s.collection + "." + s.name)

  const second = await crm.ensureIndexes()
  assert.deepEqual(second.created, [])
  assert.deepEqual(second.conflicts, [], JSON.stringify(second.conflicts))
  assert.equal(second.existing.length, INDEX_SPECS.length)
  assert.deepEqual(await snapshot(), before1, "index set unchanged")

  // third run via the raw function with a pass-through accessor
  const third = await applyIndexSpecs(name => db.collection(name))
  assert.deepEqual(third.created, [])
  assert.deepEqual(third.conflicts, [])
  assert.deepEqual(await snapshot(), before1)
})

test("a same-name index with a different shape is reported as a conflict and never dropped or rebuilt", async t => {
  if (!m.ok) return t.skip(m.skip)
  const db = m.client.db("crm_idx_conflict")
  const target = INDEX_SPECS.find(s => s.collection === COLL.contacts && s.name === "altPhones")
  await db.collection(COLL.contacts).createIndex({ other: 1 }, { name: target.name })
  const r = await crmDbFrom(db, "fogging").ensureIndexes()
  assert.ok(r.conflicts.some(c => c.index === COLL.contacts + "." + target.name), "conflict reported")
  const idx = (await db.collection(COLL.contacts).listIndexes().toArray()).find(i => i.name === target.name)
  assert.deepEqual(idx.key, { other: 1 }, "existing index untouched")
})

test("partial/unique specs are enforced by the real index (unique phone per workspace)", async t => {
  if (!m.ok) return t.skip(m.skip)
  const db = m.client.db("crm_idx_unique")
  const crm = crmDbFrom(db, "fogging")
  await crm.ensureIndexes()
  const c = crm.collection(COLL.contacts)
  await c.insertOne({ phoneE164: "+919876543210" })
  await assert.rejects(c.insertOne({ phoneE164: "+919876543210" }), /duplicate key|E11000/)
  // same phone in another workspace (raw insert) is allowed because the unique key leads with workspace
  await db.collection(COLL.contacts).insertOne({ workspace: "other_brand", phoneE164: "+919876543210" })
})
