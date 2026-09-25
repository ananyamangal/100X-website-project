// Minimal in-memory stand-in for the parts of the MongoDB driver the sync uses.
// Supports: equality, $in, $nin, $ne, $exists, $lt filters (with dotted paths);
// find().project().sort().limit().toArray(), findOne, insertOne, updateOne/updateMany
// ($set with dotted paths, $addToSet + $each), findOneAndUpdate, countDocuments, bulkWrite.

const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o)
const setPath = (o, p, v) => {
  const ks = p.split(".")
  let cur = o
  ks.slice(0, -1).forEach((k) => (cur = cur[k] ??= {}))
  cur[ks.at(-1)] = v
}

function matchOne(doc, key, cond) {
  const v = get(doc, key)
  if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => {
      if (op === "$in") return arg.includes(v)
      if (op === "$nin") return !arg.includes(v)
      if (op === "$ne") return v !== arg
      if (op === "$exists") return arg ? v !== undefined : v === undefined
      if (op === "$lt") return v < arg
      throw new Error("fake-db: unsupported operator " + op)
    })
  }
  return v === cond
}
const matches = (doc, filter = {}) => Object.entries(filter).every(([k, c]) => matchOne(doc, k, c))

class Cursor {
  constructor(docs, log) { this.docs = docs; this.log = log }
  project(p) { this.log.projection = p; this.proj = p; return this }
  sort(s) { const [[k, d]] = Object.entries(s); this.docs.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * d); return this }
  limit(n) { this.docs = this.docs.slice(0, n); return this }
  async toArray() {
    const inc = this.proj && Object.keys(this.proj).filter((k) => this.proj[k])
    return this.docs.map((d) => {
      if (!inc || !inc.length) return structuredClone(d)
      const out = { _id: d._id }
      for (const k of inc) if (d[k] !== undefined) out[k] = structuredClone(d[k])
      return out
    })
  }
}

let seq = 0
export class FakeCollection {
  constructor(name, docs = []) { this.name = name; this.docs = docs; this.finds = []; this.writes = [] }
  find(filter = {}, opts = {}) {
    const log = { filter, projection: opts.projection }
    this.finds.push(log)
    return new Cursor(this.docs.filter((d) => matches(d, filter)), log)
  }
  async findOne(filter = {}) { return this.docs.find((d) => matches(d, filter)) ? structuredClone(this.docs.find((d) => matches(d, filter))) : null }
  async countDocuments(filter = {}) { return this.docs.filter((d) => matches(d, filter)).length }
  async insertOne(doc) { this.writes.push("insertOne"); const d = { _id: doc._id ?? `id${++seq}`, ...structuredClone(doc) }; this.docs.push(d); return { insertedId: d._id } }
  _apply(doc, update) {
    for (const [k, v] of Object.entries(update.$set ?? {})) setPath(doc, k, structuredClone(v))
    for (const [k, v] of Object.entries(update.$addToSet ?? {})) {
      const arr = (get(doc, k) ?? []); const vals = v.$each ?? [v]
      for (const x of vals) if (!arr.includes(x)) arr.push(x)
      setPath(doc, k, arr)
    }
  }
  async updateOne(filter, update) { this.writes.push("updateOne"); const d = this.docs.find((x) => matches(x, filter)); if (d) this._apply(d, update); return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 } }
  async updateMany(filter, update) { this.writes.push("updateMany"); const ds = this.docs.filter((x) => matches(x, filter)); ds.forEach((d) => this._apply(d, update)); return { matchedCount: ds.length, modifiedCount: ds.length } }
  async findOneAndUpdate(filter, update, opts = {}) {
    const d = this.docs.find((x) => matches(x, filter)); if (!d) return null
    const before = structuredClone(d); this._apply(d, update); return opts.returnDocument === "before" ? before : structuredClone(d)
  }
  async bulkWrite(ops) {
    this.writes.push("bulkWrite")
    for (const op of ops) {
      if (op.insertOne) this.docs.push({ _id: `id${++seq}`, ...structuredClone(op.insertOne.document) })
      else if (op.updateOne) { const d = this.docs.find((x) => matches(x, op.updateOne.filter)); if (d) this._apply(d, op.updateOne.update) }
    }
  }
}

export class FakeDb {
  constructor(seed = {}) { this.cols = {}; for (const [n, docs] of Object.entries(seed)) this.cols[n] = new FakeCollection(n, structuredClone(docs)) }
  collection(name) { return (this.cols[name] ??= new FakeCollection(name)) }
}
