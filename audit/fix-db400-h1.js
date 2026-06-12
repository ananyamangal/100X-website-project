/**
 * One-shot: fix DB400 h1Title field in MongoDB.
 * Current value: 'double-barrel-thermal-fogging-machine-vehicle-mounted' (slug)
 * Correct value: 'Double Barrel Thermal Fogging Machine | Vehicle Mountable 100XDB400'
 *
 * Run: node audit/fix-db400-h1.js
 */
const fs = require('fs')
function loadEnv(p) {
  try {
    fs.readFileSync(p,'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0,eq).trim(), v = t.slice(eq+1).trim().replace(/^["']|["']$/g,'')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')
const { MongoClient, ObjectId } = require('mongodb')

const PRODUCT_ID   = '68e52538f84599d156f377e0'
const CORRECT_H1   = 'Double Barrel Thermal Fogging Machine | Vehicle Mountable 100XDB400'

;(async () => {
  const c  = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()

  // Confirm current state before writing
  const before = await db.collection('products').findOne({ _id: new ObjectId(PRODUCT_ID) })
  console.log('\nBEFORE:')
  console.log('  h1Title:', before?.h1Title)
  console.log('  name:   ', before?.name)

  if (before?.h1Title === CORRECT_H1) {
    console.log('\n✅ h1Title already correct — no update needed.')
    await c.close(); return
  }

  const result = await db.collection('products').updateOne(
    { _id: new ObjectId(PRODUCT_ID) },
    { $set: { h1Title: CORRECT_H1, updatedAt: new Date().toISOString() } }
  )

  console.log('\nAFTER:')
  const after = await db.collection('products').findOne({ _id: new ObjectId(PRODUCT_ID) })
  console.log('  h1Title:', after?.h1Title)
  console.log('  matched:', result.matchedCount, '| modified:', result.modifiedCount)

  if (result.modifiedCount === 1) {
    console.log('\n✅ DB400 h1Title updated successfully.')
    console.log('   Deploy + revalidate to see the change live.')
  } else {
    console.log('\n❌ Update did not modify any document.')
  }

  await c.close()
})()
