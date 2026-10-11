// Shared in-memory MongoDB for CRM tests. Single-node replica set (transactions work).
// Usage:
//   const m = await startMemoryMongo()           // { ok, db, client, skip, stop() }
//   test("x", { skip: m.skip }, async () => {...})
//   after(() => m.stop())
// If the mongod binary cannot be started/downloaded, ok=false and `skip` holds a reason string
// (tests must pass it as the skip option; never fake a pass).
import { MongoClient } from "mongodb"

let counter = 0

/**
 * A freshly started single-node replica set on Windows occasionally resets the first connection
 * (MongoNetworkError ECONNRESET), which failed a whole test file in before() with no test run.
 * Retry transient network errors a few times; anything else is thrown at once.
 */
export async function connectWithRetry(connect, { attempts = 4, delayMs = 250 } = {}) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      const client = await connect()
      await client.db("admin").command({ ping: 1 })
      return client
    } catch (err) {
      last = err
      const transient = err && (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError" || err.code === "ECONNRESET" || err.cause?.code === "ECONNRESET")
      if (!transient || i === attempts) throw err
      await new Promise(r => setTimeout(r, delayMs * i))
    }
  }
  throw last
}

export async function startMemoryMongo({ dbName } = {}) {
  let rs
  try {
    const { MongoMemoryReplSet } = await import("mongodb-memory-server-core")
    rs = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
      binary: { version: process.env.CRM_TEST_MONGOD_VERSION || "7.0.24" },
    })
  } catch (err) {
    return { ok: false, skip: `memory mongod unavailable: ${err && err.message ? err.message : err}`, stop: async () => {} }
  }
  let client
  try {
    client = await connectWithRetry(() => MongoClient.connect(rs.getUri(), { directConnection: false }))
  } catch (err) {
    await rs.stop().catch(() => {})
    throw err
  }
  client.on("error", () => {})
  const db = client.db(dbName || `crm_test_${process.pid}_${++counter}`)
  return {
    ok: true,
    skip: false,
    db,
    client,
    stop: async () => {
      await client.close().catch(() => {})
      await rs.stop().catch(() => {})
    },
  }
}
