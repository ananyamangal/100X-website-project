// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-workspace-isolation.test.mjs
// Owner-required: workspace isolation of lib/crm/db.ts against a real (in-memory) MongoDB.
// NOTE: WORKSPACES currently = ["fogging"] only, so "other_brand" docs are seeded through the
// raw Db and the wrapper is only ever opened for "fogging"; opening it for any other name must throw.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { crmDbFrom, CrmWorkspaceViolation, scopedLookup } from "../../lib/crm/db.ts"
import { COLL, LEGACY_COLL } from "../../lib/crm/model.ts"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"

const OTHER = "other_brand"
let m, db, fog
const raw = name => db.collection(name)

// Passes if fn throws (sync) or rejects with CrmWorkspaceViolation (optionally of `kind`).
async function violates(fn, kind, label = "") {
  let err
  try { await fn() } catch (e) { err = e }
  assert.ok(err, `expected CrmWorkspaceViolation ${label}`)
  assert.ok(err instanceof CrmWorkspaceViolation, `expected CrmWorkspaceViolation, got ${err && err.name}: ${err && err.message} ${label}`)
  if (kind) assert.equal(err.kind, kind, `kind ${label}: ${err.message}`)
}

async function seed() {
  for (const c of [COLL.contacts, COLL.deals, "plain_other"]) await raw(c).deleteMany({})
  await raw(COLL.contacts).insertMany([
    { _id: "f1", workspace: "fogging", name: "Fog One", tag: "x", n: 1 },
    { _id: "f2", workspace: "fogging", name: "Fog Two", tag: "y", n: 2 },
    { _id: "t1", workspace: OTHER, name: "Other One", tag: "x", n: 10 },
    { _id: "t2", workspace: OTHER, name: "Other Two", tag: "z", n: 20 },
  ])
  await raw(COLL.deals).insertMany([
    { _id: "fd1", workspace: "fogging", contactId: "f1" },
    { _id: "td1", workspace: OTHER, contactId: "t1" },
  ])
  await raw("plain_other").insertOne({ _id: "p1", secret: true })
}
const otherSnapshot = async () => JSON.stringify([
  await raw(COLL.contacts).find({ workspace: OTHER }).sort({ _id: 1 }).toArray(),
  await raw(COLL.deals).find({ workspace: OTHER }).sort({ _id: 1 }).toArray(),
])

before(async () => {
  m = await startMemoryMongo()
  if (!m.ok) return
  db = m.db
  fog = crmDbFrom(db, "fogging", { client: m.client })
  for (const c of [COLL.contacts, COLL.deals, "plain_other"]) await db.createCollection(c)
})
after(async () => { if (m) await m.stop() })

// DB test: skipped (with reason) when memory mongod is unavailable; asserts the other workspace is untouched afterwards.
function T(name, fn) {
  test(name, async t => {
    if (!m.ok) return t.skip(m.skip)
    await seed()
    const snap = await otherSnapshot()
    await fn(t)
    assert.equal(await otherSnapshot(), snap, "other_brand docs were mutated")
  })
}

test("wrapper refuses unknown workspaces and non-COLL collections", async t => {
  if (!m.ok) return t.skip(m.skip)
  await violates(() => crmDbFrom(db, OTHER), "bad_workspace")
  await violates(() => crmDbFrom(db, "FOGGING"), "bad_workspace")
  await violates(() => crmDbFrom(db, undefined), "bad_workspace")
  await violates(() => fog.collection("users"), "bad_collection")
  await violates(() => fog.collection("plain_other"), "bad_collection")
  await violates(() => fog.collection("crm_contacts "), "bad_collection")
  await violates(() => fog.collection(LEGACY_COLL.dealers), "bad_collection")
  await violates(() => fog.legacy("users"), "bad_collection")
})

T("reads never return other-workspace docs", async () => {
  const c = fog.collection(COLL.contacts)
  assert.deepEqual((await c.find({}).toArray()).map(d => d._id).sort(), ["f1", "f2"])
  assert.deepEqual((await c.find({ tag: "x" }).toArray()).map(d => d._id), ["f1"])
  assert.equal(await c.findOne({ _id: "t1" }), null)
  assert.equal(await c.findOne({ tag: "z" }), null)
  assert.equal((await c.findOne({ _id: "f1" }))._id, "f1")
  assert.equal(await c.countDocuments({}), 2)
  assert.equal(await c.countDocuments({ tag: "z" }), 0)
  assert.deepEqual((await c.distinct("tag")).sort(), ["x", "y"])
  assert.deepEqual(await c.distinct("workspace"), ["fogging"])
  assert.deepEqual(await c.aggregate([{ $group: { _id: "$workspace", n: { $sum: 1 } } }]).toArray(), [{ _id: "fogging", n: 2 }])
  assert.equal((await c.aggregate([{ $match: { tag: "z" } }]).toArray()).length, 0)
  assert.equal((await c.aggregate([{ $count: "n" }]).toArray())[0].n, 2)
  assert.equal(await c.countDocuments({ workspace: "fogging" }), 2)
  assert.equal(await c.countDocuments({ workspace: { $eq: "fogging" } }), 2)
  assert.deepEqual((await c.find({ $or: [{ tag: "z" }, { _id: "f1" }] }).toArray()).map(d => d._id), ["f1"])
  assert.equal((await c.find({}, { projection: { name: 1 } }).toArray()).length, 2)
})

T("writes only touch fogging docs", async () => {
  const c = fog.collection(COLL.contacts)
  let r = await c.updateMany({}, { $set: { touched: true } })
  assert.equal(r.matchedCount, 2)
  assert.equal(await raw(COLL.contacts).countDocuments({ touched: true, workspace: OTHER }), 0)
  r = await c.updateOne({ _id: "t1" }, { $set: { touched: 1 } })
  assert.equal(r.matchedCount, 0)
  assert.equal(await c.findOneAndUpdate({ _id: "t1" }, { $set: { a: 1 } }), null)
  const fo2 = await c.findOneAndUpdate({ _id: "f1" }, { $set: { a: 1 } }, { returnDocument: "after" })
  assert.equal(fo2.a, 1); assert.equal(fo2.workspace, "fogging")
  assert.equal(await c.findOneAndReplace({ _id: "t1" }, { name: "pwn" }), null)
  const rep = await c.findOneAndReplace({ _id: "f2" }, { name: "Replaced" }, { returnDocument: "after" })
  assert.equal(rep.workspace, "fogging"); assert.equal(rep.name, "Replaced")
  assert.equal((await c.replaceOne({ _id: "t2" }, { name: "pwn" })).matchedCount, 0)
  assert.equal(await c.findOneAndDelete({ _id: "t1" }), null)
  assert.equal((await c.deleteOne({ _id: "t2" })).deletedCount, 0)
  const d = await c.findOneAndDelete({ _id: "f1" })
  assert.equal(d._id, "f1")
  assert.equal((await c.deleteMany({})).deletedCount, 1) // only f2 left
  assert.equal(await raw(COLL.contacts).countDocuments({ workspace: OTHER }), 2)
})

T("inserts get workspace stamped; mismatching workspace throws", async () => {
  const c = fog.collection(COLL.contacts)
  await c.insertOne({ _id: "n1", name: "N" })
  assert.equal((await raw(COLL.contacts).findOne({ _id: "n1" })).workspace, "fogging")
  await c.insertMany([{ _id: "n2" }, { _id: "n3", workspace: "fogging" }])
  assert.equal(await raw(COLL.contacts).countDocuments({ _id: { $in: ["n2", "n3"] }, workspace: "fogging" }), 2)
  await violates(() => c.insertOne({ _id: "bad", workspace: OTHER }), "document")
  await violates(() => c.insertMany([{ _id: "b1" }, { _id: "b2", workspace: OTHER }]), "document")
  assert.equal(await raw(COLL.contacts).countDocuments({ _id: { $in: ["bad", "b1", "b2"] } }), 0, "no partial insert")
  await violates(() => c.replaceOne({ _id: "f1" }, { workspace: OTHER }), "document")
  await violates(() => c.replaceOne({ _id: "f1" }, { $set: { a: 1 } }), "document")
})

T("upsert stamps the scoped workspace", async () => {
  const c = fog.collection(COLL.contacts)
  await c.updateOne({ _id: "up1" }, { $set: { a: 1 } }, { upsert: true })
  assert.equal((await raw(COLL.contacts).findOne({ _id: "up1" })).workspace, "fogging")
  await c.findOneAndUpdate({ _id: "up2" }, { $set: { a: 1 } }, { upsert: true })
  assert.equal((await raw(COLL.contacts).findOne({ _id: "up2" })).workspace, "fogging")
  // an upsert on an _id that exists only in the other workspace must not hijack it (dup key), nor mutate it
  await assert.rejects(c.updateOne({ _id: "t1" }, { $set: { a: 1 } }, { upsert: true }))
})

T("bulkWrite is scoped per op", async () => {
  const c = fog.collection(COLL.contacts)
  const r = await c.bulkWrite([
    { insertOne: { document: { _id: "bw1" } } },
    { updateMany: { filter: {}, update: { $set: { bw: 1 } } } },
    { updateOne: { filter: { _id: "t1" }, update: { $set: { bw: 1 } } } },
    { replaceOne: { filter: { _id: "t2" }, replacement: { name: "x" } } },
    { deleteOne: { filter: { _id: "t1" } } },
    { deleteMany: { filter: { tag: "z" } } },
  ])
  assert.equal(r.insertedCount, 1)
  assert.equal((await raw(COLL.contacts).findOne({ _id: "bw1" })).workspace, "fogging")
  assert.equal(await raw(COLL.contacts).countDocuments({ bw: 1, workspace: OTHER }), 0)
  await violates(() => c.bulkWrite([{ insertOne: { document: { workspace: OTHER } } }]), "document")
  await violates(() => c.bulkWrite([{ updateOne: { filter: { workspace: OTHER }, update: { $set: { a: 1 } } } }]), "filter")
  await violates(() => c.bulkWrite([{ updateOne: { filter: {}, update: { $set: { workspace: OTHER } } } }]), "update")
  await violates(() => c.bulkWrite([{ replaceOne: { filter: {}, replacement: { workspace: OTHER } } }]), "document")
  await violates(() => c.bulkWrite([{ deleteMany: { filter: { $or: [{ workspace: OTHER }] } } }]), "filter")
  await violates(() => c.bulkWrite([{ updateMany: { filter: {}, update: [{ $set: { workspace: OTHER } }] } }]), "update")
  await violates(() => c.bulkWrite([]), "bulk_write")
  await violates(() => c.bulkWrite([{ insertOne: { document: {} }, deleteOne: { filter: {} } }]), "bulk_write")
  await violates(() => c.bulkWrite([{ unknownOp: {} }]), "bulk_write")
})

T("attacks: filter widening / foreign workspace values", async () => {
  const c = fog.collection(COLL.contacts)
  await violates(() => c.find({ workspace: OTHER }), "filter")
  await violates(() => c.findOne({ workspace: OTHER }), "filter")
  await violates(() => c.countDocuments({ workspace: OTHER }), "filter")
  await violates(() => c.distinct("name", { workspace: OTHER }), "filter")
  await violates(() => c.updateMany({ workspace: OTHER }, { $set: { a: 1 } }), "filter")
  await violates(() => c.deleteMany({ workspace: OTHER }), "filter")
  await violates(() => c.findOneAndUpdate({ workspace: OTHER }, { $set: { a: 1 } }), "filter")
  await violates(() => c.findOneAndDelete({ workspace: OTHER }), "filter")
  await violates(() => c.findOneAndReplace({ workspace: OTHER }, { a: 1 }), "filter")
  await violates(() => c.find({ $or: [{ workspace: OTHER }, { workspace: "fogging" }] }), "filter", "$or widening")
  // $nor on its own workspace is legal but still ANDed with the scope: must not surface other-workspace docs
  assert.equal((await c.find({ $nor: [{ workspace: "fogging" }] }).toArray()).length, 0, "$nor stays scoped")
  await violates(() => c.find({ $and: [{ workspace: { $in: [OTHER, "fogging"] } }] }), "filter", "$in")
  await violates(() => c.find({ workspace: { $ne: "fogging" } }), "filter", "$ne")
  await violates(() => c.find({ workspace: { $exists: true } }), "filter", "$exists")
  await violates(() => c.find({ workspace: { $regex: ".*" } }), "filter", "$regex")
  await violates(() => c.find({ "workspace.x": 1 }), "filter", "dotted path")
  await violates(() => c.find({ $where: "true" }), "filter", "$where")
  await violates(() => c.find({ $expr: { $eq: ["$workspace", OTHER] } }), "filter", "$expr")
  await violates(() => c.find({ $expr: { $ne: ["$$ROOT.workspace", "x"] } }), "filter", "$expr ROOT")
  await violates(() => c.find({ tags: { $elemMatch: { workspace: OTHER } } }), "filter", "$elemMatch")
  await violates(() => c.find("workspace"), "filter", "non-object filter")
  await violates(() => c.aggregate([{ $match: { $or: [{ workspace: OTHER }] } }]), "filter", "$match widen")
  await violates(() => c.aggregate([{ $match: { workspace: OTHER } }]), "filter", "$match other")
  // stays scoped: $or that does not mention workspace is ANDed with the scope
  assert.equal((await c.find({ $or: [{ _id: "t1" }, { _id: "t2" }] }).toArray()).length, 0)
})

T("attacks: update operators touching workspace", async () => {
  const c = fog.collection(COLL.contacts)
  const u = (upd, opts) => () => c.updateOne({ _id: "f1" }, upd, opts)
  await violates(u({ $set: { workspace: OTHER } }), "update", "$set")
  await violates(u({ $set: { workspace: "fogging" } }), "update", "$set same value")
  await violates(u({ $set: { "workspace.x": 1 } }), "update", "$set dotted")
  await violates(u({ $unset: { workspace: "" } }), "update", "$unset")
  await violates(u({ $rename: { name: "workspace" } }), "update", "$rename into")
  await violates(u({ $rename: { workspace: "name" } }), "update", "$rename from")
  await violates(u({ $setOnInsert: { workspace: OTHER } }, { upsert: true }), "update", "$setOnInsert")
  await violates(u({ $inc: { workspace: 1 } }), "update", "$inc")
  await violates(u({ $push: { workspace: 1 } }), "update", "$push")
  await violates(u({ $min: { workspace: "a" } }), "update", "$min")
  await violates(u({ $max: { workspace: "z" } }), "update", "$max")
  await violates(u({ $currentDate: { workspace: true } }), "update", "$currentDate")
  await violates(u({ $bogus: { a: 1 } }), "update", "unknown operator")
  await violates(u({}), "update", "empty")
  await violates(u({ name: "replacement-style" }), "update", "replacement doc as update")
  await violates(u([{ $set: { workspace: OTHER } }]), "update", "pipeline $set")
  await violates(u([{ $addFields: { workspace: OTHER } }]), "update", "pipeline $addFields")
  await violates(u([{ $unset: "workspace" }]), "update", "pipeline $unset")
  await violates(u([{ $project: { workspace: 0 } }]), "update", "pipeline $project drop")
  await violates(u([{ $replaceRoot: { newRoot: { workspace: OTHER } } }]), undefined, "pipeline $replaceRoot")
  await violates(u([{ $replaceWith: { workspace: OTHER } }]), undefined, "pipeline $replaceWith")
  await violates(u([{ $set: { a: "$workspace" } }]), undefined, "expr refs workspace")
  await violates(u([{ $lookup: { from: COLL.deals, as: "d", pipeline: [] } }]), "update", "pipeline $lookup")
  await violates(u([{ $out: "x" }]), "update", "pipeline $out")
  await violates(u([]), "update", "empty pipeline")
  assert.equal((await raw(COLL.contacts).findOne({ _id: "f1" })).workspace, "fogging")
  // legitimate pipeline update works and keeps workspace
  await c.updateOne({ _id: "f1" }, [{ $set: { name: { $concat: ["$name", "!"] } } }])
  const f1 = await raw(COLL.contacts).findOne({ _id: "f1" })
  assert.equal(f1.name, "Fog One!"); assert.equal(f1.workspace, "fogging")
  await c.updateOne({ _id: "f1" }, { $set: { a: 1 }, $inc: { n: 1 }, $push: { arr: 1 } })
  assert.equal((await raw(COLL.contacts).findOne({ _id: "f1" })).n, 2)
})

T("attacks: aggregation stages", async () => {
  const c = fog.collection(COLL.contacts)
  const agg = p => () => c.aggregate(p)
  await violates(agg([{ $unionWith: COLL.contacts }]), "pipeline", "$unionWith")
  await violates(agg([{ $unionWith: { coll: "plain_other", pipeline: [] } }]), "pipeline", "$unionWith obj")
  await violates(agg([{ $out: "stolen" }]), "pipeline", "$out")
  await violates(agg([{ $out: { db: "x", coll: "y" } }]), "pipeline", "$out obj")
  await violates(agg([{ $merge: { into: "stolen" } }]), "pipeline", "$merge")
  await violates(agg([{ $graphLookup: { from: COLL.contacts, startWith: "$a", connectFromField: "a", connectToField: "b", as: "g" } }]), "pipeline", "$graphLookup")
  await violates(agg([{ $collStats: {} }]), "pipeline", "$collStats")
  await violates(agg([{ $indexStats: {} }]), "pipeline", "$indexStats")
  await violates(agg([{ $currentOp: {} }]), "pipeline", "$currentOp")
  await violates(agg([{ $documents: [{ a: 1 }] }]), "pipeline", "$documents")
  await violates(agg([{ $changeStream: {} }]), "pipeline", "$changeStream")
  await violates(agg([{ $facet: { a: [{ $out: "x" }] } }]), "pipeline", "$facet with $out")
  await violates(agg([{ $facet: { a: [{ $merge: { into: "x" } }] } }]), "pipeline", "$facet with $merge")
  await violates(agg([{ $facet: { a: [{ $unionWith: "plain_other" }] } }]), "pipeline", "$facet with $unionWith")
  await violates(agg([{ $facet: { a: [{ $lookup: { from: "plain_other", as: "z", pipeline: [] } }] } }]), "pipeline", "$facet with bad lookup")
  await violates(agg([{ $facet: { a: [{ $match: { workspace: OTHER } }] } }]), "filter", "$facet other ws")
  await violates(agg([{ $facet: [] }]), "pipeline", "$facet array")
  await violates(agg("nope"), "pipeline", "non-array")
  await violates(agg([{ $match: {}, $limit: 1 }]), "pipeline", "multi-key stage")
  await violates(agg([5]), "pipeline", "non-object stage")
  // $lookup
  await violates(agg([{ $lookup: { from: "plain_other", localField: "_id", foreignField: "_id", as: "x" } }]), "pipeline", "non-CRM lookup")
  await violates(agg([{ $lookup: { from: "users", as: "x", pipeline: [{ $match: { workspace: "fogging" } }] } }]), "pipeline", "non-CRM lookup w/ match")
  await violates(agg([{ $lookup: { from: LEGACY_COLL.dealers, as: "x", pipeline: [{ $match: { workspace: "fogging" } }] } }]), "pipeline", "legacy lookup")
  await violates(agg([{ $lookup: { from: COLL.deals, localField: "_id", foreignField: "contactId", as: "d" } }]), "pipeline", "unscoped lookup (no pipeline)")
  await violates(agg([{ $lookup: { from: COLL.deals, as: "d", pipeline: [] } }]), "pipeline", "empty lookup pipeline")
  await violates(agg([{ $lookup: { from: COLL.deals, as: "d", pipeline: [{ $match: { contactId: "t1" } }] } }]), "pipeline", "lookup pipeline w/o ws match")
  await violates(agg([{ $lookup: { from: COLL.deals, as: "d", pipeline: [{ $match: { workspace: OTHER } }] } }]), "pipeline", "lookup other ws")
  await violates(agg([{ $lookup: { from: COLL.deals, as: "d", pipeline: [{ $limit: 1 }, { $match: { workspace: "fogging" } }] } }]), "pipeline", "lookup match not first")
  await violates(agg([{ $lookup: { from: COLL.deals, as: "d", pipeline: [{ $match: { workspace: "fogging" } }, { $unionWith: "plain_other" }] } }]), "pipeline", "lookup nested $unionWith")
  await violates(agg([{ $lookup: { from: { db: "x", coll: "y" }, as: "d", pipeline: [] } }]), "pipeline", "lookup from object")
  // legit scoped lookups
  const out = await c.aggregate([
    scopedLookup("fogging", { from: COLL.deals, as: "deals", localField: "_id", foreignField: "contactId" }),
    { $sort: { _id: 1 } },
  ]).toArray()
  assert.deepEqual(out.map(d => [d._id, d.deals.map(x => x._id)]), [["f1", ["fd1"]], ["f2", []]])
  const out2 = await c.aggregate([{ $lookup: { from: COLL.deals, as: "d", pipeline: [{ $match: { workspace: "fogging" } }] } }]).toArray()
  assert.ok(out2.length > 0 && out2.every(r => r.d.every(x => x.workspace === "fogging")))
  // $facet without per-branch $match stays scoped by the prepended top-level match
  const fac = await c.aggregate([{ $facet: { all: [{ $count: "n" }], x: [{ $match: { tag: "x" } }] } }]).toArray()
  assert.equal(fac[0].all[0].n, 2); assert.equal(fac[0].x.length, 1)
  await violates(() => scopedLookup("other_brand", { from: COLL.deals, as: "d" }), "bad_workspace")
  await violates(() => scopedLookup("fogging", { from: "users", as: "d" }), "pipeline")
})

T("attacks: blocked methods and cursor builders", async () => {
  const c = fog.collection(COLL.contacts)
  const blockedCalls = {
    estimatedDocumentCount: () => c.estimatedDocumentCount(),
    watch: () => c.watch(),
    drop: () => c.drop(),
    rename: () => c.rename("x"),
    createIndex: () => c.createIndex({ a: 1 }),
    createIndexes: () => c.createIndexes([]),
    dropIndex: () => c.dropIndex("a"),
    dropIndexes: () => c.dropIndexes(),
    initializeOrderedBulkOp: () => c.initializeOrderedBulkOp(),
    initializeUnorderedBulkOp: () => c.initializeUnorderedBulkOp(),
  }
  for (const [name, fn] of Object.entries(blockedCalls)) await violates(fn, "blocked_method", name)
  await violates(() => c.aggregate([]).addStage({ $match: { workspace: OTHER } }), "cursor", "addStage")
  await violates(() => c.aggregate([]).addStage({ $out: "x" }), "cursor", "addStage $out")
  await violates(() => c.aggregate([]).out("x"), "cursor", "out")
  await violates(() => c.aggregate([]).lookup({}), "cursor", "lookup")
  await violates(() => c.aggregate([]).match({}), "cursor", "match")
  await violates(() => c.aggregate([]).group({}), "cursor", "group")
  await violates(() => c.find({}).filter({ workspace: OTHER }), "cursor", "filter")
  await violates(() => c.find({}).filter({}), "cursor", "filter {}")
  await violates(() => c.find({}).limit(1).sort({ _id: 1 }).filter({}), "cursor", "chained filter")
  await violates(() => c.find({}).clone().filter({}), "cursor", "clone filter")
  await violates(() => c.aggregate([]).clone().addStage({}), "cursor", "clone addStage")
  assert.throws(() => { c.find({}).foo = 1 }, CrmWorkspaceViolation)
  assert.equal((await c.find({}).sort({ _id: 1 }).limit(1).toArray())[0]._id, "f1")
  assert.equal((await c.aggregate([{ $sort: { _id: 1 } }]).limit(5).toArray()).length, 2)
  for (const k of ["collection", "db", "client", "s"]) {
    const v = c[k]
    assert.ok(v === undefined || typeof v === "function" || typeof v !== "object" || !("insertOne" in v), `raw collection leaked via .${k}`)
  }
  assert.equal(Object.values(c).some(v => v && typeof v === "object" && typeof v.insertOne === "function"), false, "raw collection is an own enumerable property")
})

T("raw driver collection is not reachable at runtime (doc: 'not reachable from outside this file')", async () => {
  const c = fog.collection(COLL.contacts)
  const leaked = []
  for (const k of ["raw", "_raw", "rawCollection", "inner", "target", "coll"]) {
    const v = c[k]
    if (v && typeof v === "object" && typeof v.insertOne === "function") leaked.push(k)
  }
  assert.deepEqual(leaked, [], "ScopedCollection exposes the unscoped driver collection via: " + leaked.join(","))
})

// A driver handle (MongoClient / Db / Collection / ClientSession) reachable from a wrapper object.
const isDriverHandle = v =>
  !!v && typeof v === "object" &&
  (typeof v.db === "function" || typeof v.collection === "function" || typeof v.insertOne === "function" || typeof v.startSession === "function" || typeof v.startTransaction === "function")
function leaksOf(obj) {
  const out = []
  for (const k of ["client", "session", "db", "collection", "namespace", "parent", "s", "_client", "cursorSession"]) {
    let v
    try { v = obj[k] } catch { continue }
    if (isDriverHandle(v)) out.push(k)
  }
  return out
}

T("cursors (find, aggregate, legacy) do not expose MongoClient/Db/Collection/ClientSession", async () => {
  const c = fog.collection(COLL.contacts)
  const fc = c.find({})
  const ac = c.aggregate([])
  assert.deepEqual(leaksOf(fc), [], "find cursor")
  assert.deepEqual(leaksOf(fc.clone()), [], "find cursor clone")
  assert.deepEqual(leaksOf(c.find({}).limit(1)), [], "find cursor chain")
  assert.deepEqual(leaksOf(ac), [], "aggregate cursor")
  assert.equal((await fc.toArray()).length, 2)
  assert.equal((await ac.toArray()).length, 2)
  await db.collection(LEGACY_COLL.dealers).insertOne({ _id: "dl1" })
  const lc = fog.legacy(LEGACY_COLL.dealers).find({})
  assert.deepEqual(leaksOf(lc), [], "legacy cursor")
  assert.equal((await lc.toArray()).length, 1)
  await db.collection(LEGACY_COLL.dealers).drop()
})

T("transaction callback session does not expose the MongoClient but still works as {session}", async t => {
  const c = fog.collection(COLL.contacts)
  await fog.withTransaction(async session => {
    assert.deepEqual(leaksOf(session), [], "session")
    await c.updateOne({ _id: "f1" }, { $set: { txs: 1 } }, { session })
    assert.equal(await raw(COLL.contacts).countDocuments({ txs: 1 }), 0, "write is inside the txn")
  })
  assert.equal(await raw(COLL.contacts).countDocuments({ txs: 1 }), 1)
})

T("TOCTOU: mutating arguments after the call (before await) cannot smuggle workspace", async () => {
  const c = fog.collection(COLL.contacts)
  const update = { $set: { tag: "safe" } }
  const p = c.updateOne({ _id: "f1" }, update)
  update.$set.workspace = OTHER
  await p
  const filter = { _id: "f2" }
  const p2 = c.updateOne(filter, { $set: { tag: "ok2" } })
  filter.workspace = OTHER
  filter._id = "t1"
  await p2
  const doc = { _id: "ins1", n: 5 }
  const p3 = c.insertOne(doc)
  doc.workspace = OTHER
  await p3
  const pipeline = [{ $match: { n: 1 } }]
  const cur = c.aggregate(pipeline)
  pipeline.push({ $out: "plain_other" })
  pipeline[0].$match.workspace = OTHER
  const rows = await cur.toArray()
  assert.deepEqual(rows.map(r => r._id), ["f1"])
  const ops = [{ updateOne: { filter: { _id: "f2" }, update: { $set: { tag: "b" } } } }]
  const p4 = c.bulkWrite(ops)
  ops[0].updateOne.update.$set.workspace = OTHER
  await p4
  assert.equal(await raw(COLL.contacts).countDocuments({ workspace: "fogging" }), 3)
  assert.equal((await raw(COLL.contacts).findOne({ _id: "ins1" })).workspace, "fogging")
  assert.equal(await raw("plain_other").countDocuments({}), 1)
})

T("legacy() is read-only", async () => {
  await db.collection(LEGACY_COLL.dealers).insertOne({ _id: "d1", a: 1 })
  const l = fog.legacy(LEGACY_COLL.dealers)
  assert.equal((await l.findOne({ _id: "d1" }))._id, "d1")
  assert.equal(await l.countDocuments({}), 1)
  for (const k of ["insertOne", "updateOne", "deleteMany", "aggregate", "drop", "bulkWrite"]) assert.equal(l[k], undefined, k)
  await violates(() => fog.legacy(COLL.contacts), "bad_collection")
  await db.collection(LEGACY_COLL.dealers).drop()
})

test("session is forwarded: aborted transaction rolls back wrapper writes, commit persists", async t => {
  if (!m.ok) return t.skip(m.skip)
  await seed()
  const c = fog.collection(COLL.contacts)
  await assert.rejects(fog.withTransaction(async session => {
    await c.insertOne({ _id: "tx1" }, { session })
    await c.updateOne({ _id: "f1" }, { $set: { tx: 1 } }, { session })
    await c.bulkWrite([{ insertOne: { document: { _id: "tx2" } } }], { session })
    await c.deleteOne({ _id: "f2" }, { session })
    assert.equal(await c.countDocuments({ _id: "tx1" }, { session }), 1, "visible inside txn")
    assert.equal(await raw(COLL.contacts).countDocuments({ _id: "tx1" }), 0, "invisible outside txn (session really used)")
    throw new Error("abort")
  }), /abort/)
  assert.equal(await raw(COLL.contacts).countDocuments({ _id: { $in: ["tx1", "tx2"] } }), 0)
  assert.equal((await raw(COLL.contacts).findOne({ _id: "f1" })).tx, undefined)
  assert.ok(await raw(COLL.contacts).findOne({ _id: "f2" }))
  await fog.withTransaction(async session => {
    await c.insertOne({ _id: "tx3" }, { session })
    assert.equal((await c.findOne({ _id: "tx3" }, { session })).workspace, "fogging")
    assert.equal((await c.find({ _id: "tx3" }, { session }).toArray()).length, 1)
    assert.equal((await c.aggregate([{ $match: { _id: "tx3" } }], { session }).toArray()).length, 1)
  })
  assert.equal(await raw(COLL.contacts).countDocuments({ _id: "tx3", workspace: "fogging" }), 1)
  await violates(() => crmDbFrom(db, "fogging").withTransaction(async () => 1), "db_guard")
})
