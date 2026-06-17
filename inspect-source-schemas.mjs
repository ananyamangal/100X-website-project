/**
 * Inspect source collection schemas for the Dealer Prospect Acquisition Engine.
 * Shows exact field names and sample values from each source.
 */
import { MongoClient } from 'mongodb'
const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'
const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })

function showFields(label, docs) {
  console.log(`\n=== ${label} (${docs.length} sample docs) ===`)
  if (!docs.length) { console.log('  (empty)'); return }
  // Collect all field names across docs
  const allKeys = new Set()
  for (const d of docs) Object.keys(d).forEach(k => allKeys.add(k))
  allKeys.delete('_id')
  console.log(`  Fields: [${[...allKeys].join(', ')}]`)
  // Show first doc
  const { _id, ...first } = docs[0]
  for (const [k, v] of Object.entries(first)) {
    const preview = v === null ? 'null'
      : Array.isArray(v) ? `[Array(${v.length})]`
      : typeof v === 'object' && v !== null ? `{keys: ${Object.keys(v).slice(0,5).join(',')}}`
      : String(v).slice(0, 80)
    console.log(`  ${k.padEnd(25)} : ${preview}`)
  }
}

await client.connect()
const db = client.db('100xDB')

// 1. brochure_leads
const brochure = await db.collection('brochure_leads').find({}).limit(3).toArray()
showFields('brochure_leads', brochure)
console.log('  Count:', await db.collection('brochure_leads').countDocuments())

// 2. submissions (contact/rfq types)
const subs = await db.collection('submissions').find({ type: { $in: ['contact', 'rfq'] } }).limit(3).toArray()
showFields('submissions', subs)
console.log('  Count (contact/rfq):', await db.collection('submissions').countDocuments({ type: { $in: ['contact', 'rfq'] } }))

// 3. rfq_popup_leads
const rfq = await db.collection('rfq_popup_leads').find({}).limit(3).toArray()
showFields('rfq_popup_leads', rfq)
console.log('  Count:', await db.collection('rfq_popup_leads').countDocuments())

// 4. fogging_contracts — check seller fields
const fc_100x = await db.collection('fogging_contracts').find({ is_100x: true }).limit(2).toArray()
showFields('fogging_contracts (is_100x=true)', fc_100x)
const fc_comp = await db.collection('fogging_contracts').find({ is_100x: { $ne: true } }).limit(2).toArray()
showFields('fogging_contracts (is_100x=false / competitors)', fc_comp)
console.log('  Count (is_100x=true):', await db.collection('fogging_contracts').countDocuments({ is_100x: true }))
console.log('  Count (competitor):', await db.collection('fogging_contracts').countDocuments({ is_100x: { $ne: true } }))

// 5. Check if there are any dealer-flagged submissions
const dealer_subs = await db.collection('submissions').find({ dealerInquiry: true }).limit(3).toArray()
console.log(`\n=== submissions (dealerInquiry: true): ${dealer_subs.length} records ===`)
const dealer_count = await db.collection('submissions').countDocuments({ dealerInquiry: true })
console.log('  Count:', dealer_count)

// 6. List all collections
const colls = await db.listCollections().toArray()
console.log('\n=== All collections ===')
for (const c of colls.sort((a,b) => a.name < b.name ? -1 : 1)) {
  const count = await db.collection(c.name).countDocuments()
  console.log(`  ${c.name.padEnd(40)} ${count} docs`)
}

await client.close()
