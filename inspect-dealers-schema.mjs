import { MongoClient } from 'mongodb'
import crypto from 'crypto'

const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
const db = client.db('100xDB')

// ── 1. Inspect actual crm_dealers schema ──────────────────────────────────────
const docs = await db.collection('crm_dealers').find({}).toArray()
console.log(`\n=== crm_dealers: ${docs.length} documents ===\n`)
for (const d of docs) {
  const { _id, ...fields } = d
  console.log(`--- ${_id} ---`)
  // Show every field name and value type/preview
  for (const [k, v] of Object.entries(fields)) {
    const preview = v === null ? 'null'
      : Array.isArray(v) ? `[Array(${v.length})]`
      : typeof v === 'object' ? `{${Object.keys(v).join(',')}}`
      : String(v).slice(0, 80)
    console.log(`  ${k.padEnd(20)} : ${preview}`)
  }
  console.log()
}

// ── 2. Real SHA-256 known-answer test ─────────────────────────────────────────
console.log('\n=== SHA-256 self-test ===')
function sha256(val) {
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex')
}

const tests = [
  'test@example.com',
  'TEST@EXAMPLE.COM',
  ' test@example.com',
  '+919876543210',
  'john',
]
for (const t of tests) {
  console.log(`sha256("${t}") = ${sha256(t)}`)
}
// Self-verifying: same lowercase input → same hash
const h1 = sha256('test@example.com')
const h2 = sha256('TEST@EXAMPLE.COM')
const h3 = sha256(' test@example.com')
console.log(`\nCase + trim consistency: ${h1 === h2 && h2 === h3 ? 'PASS ✅' : 'FAIL ❌'}`)
console.log(`  lower hash : ${h1}`)
console.log(`  upper hash : ${h2}`)
console.log(`  space hash : ${h3}`)
console.log(`  length     : ${h1.length} (expect 64)`)
console.log(`  is hex     : ${/^[0-9a-f]+$/.test(h1)}`)

await client.close()
