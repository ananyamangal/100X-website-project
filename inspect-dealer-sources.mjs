import { MongoClient } from 'mongodb'
const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'
const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })

function showFields(label, docs) {
  console.log(`\n${'═'.repeat(60)}\n${label} (${docs.length} sample docs)\n${'═'.repeat(60)}`)
  if (!docs.length) { console.log('  (empty)'); return }
  const allKeys = new Set()
  for (const d of docs) Object.keys(d).forEach(k => allKeys.add(k))
  allKeys.delete('_id')
  for (const d of docs.slice(0, 2)) {
    console.log('\n  --- doc ---')
    for (const k of allKeys) {
      const v = d[k]
      const preview = v === null || v === undefined ? 'null'
        : Array.isArray(v) ? `[Array(${v.length})] ${JSON.stringify(v.slice(0,2))}`
        : typeof v === 'object' ? `{${Object.keys(v).join(',')}}`
        : String(v).slice(0, 100)
      console.log(`    ${k.padEnd(30)} : ${preview}`)
    }
  }
}

await client.connect()
const db = client.db('100xDB')

// fogging_sellers
const fs = await db.collection('fogging_sellers').find({}).limit(3).toArray()
showFields('fogging_sellers', fs)

// gem_dealers
const gd = await db.collection('gem_dealers').find({}).limit(3).toArray()
showFields('gem_dealers', gd)

// seller_profiles
const sp = await db.collection('seller_profiles').find({}).limit(3).toArray()
showFields('seller_profiles', sp)

// submissions with dealerScore > 0
const dsubs = await db.collection('submissions')
  .find({ dealerScore: { $gt: 3 } })
  .sort({ dealerScore: -1 })
  .limit(5)
  .toArray()
showFields('submissions (dealerScore > 3)', dsubs)

// Check how many gem_dealers have contact info
const gdWithEmail = await db.collection('gem_dealers').countDocuments({ email: { $exists: true, $ne: '' } })
const gdWithPhone = await db.collection('gem_dealers').countDocuments({ phone: { $exists: true, $ne: '' } })
const gdWithGst   = await db.collection('gem_dealers').countDocuments({ gstin: { $exists: true, $ne: '' } })
console.log(`\ngem_dealers coverage: email=${gdWithEmail} phone=${gdWithPhone} gstin=${gdWithGst} / total 1437`)

// Same for seller_profiles
const spWithEmail = await db.collection('seller_profiles').countDocuments({ email: { $exists: true, $ne: '' } })
const spWithPhone = await db.collection('seller_profiles').countDocuments({ phone: { $exists: true, $ne: '' } })
const spWithGst   = await db.collection('seller_profiles').countDocuments({ gstin: { $exists: true, $ne: '' } })
console.log(`seller_profiles coverage: email=${spWithEmail} phone=${spWithPhone} gstin=${spWithGst} / total 4062`)

// Check fogging_sellers
const fsWithGst = await db.collection('fogging_sellers').countDocuments({ seller_gst: { $exists: true, $ne: '' } })
const fsWithName = await db.collection('fogging_sellers').countDocuments({ seller_name: { $exists: true, $ne: '' } })
console.log(`fogging_sellers coverage: seller_name=${fsWithName} seller_gst=${fsWithGst} / total 679`)

// State breakdown of gem_dealers
const gdByState = await db.collection('gem_dealers').aggregate([
  { $group: { _id: '$state', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]).toArray()
console.log('\ngem_dealers by state (top 10):')
for (const s of gdByState) console.log(`  ${String(s._id || 'null').padEnd(25)} ${s.count}`)

await client.close()
