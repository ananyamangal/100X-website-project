/**
 * Data hygiene audit — identify and mark test/QA submissions.
 * Run: node audit-test-leads.mjs
 *
 * Pass --dry-run to inspect only (no writes).
 * Pass --mark    to add _test:true to matches (no deletions ever).
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'

const DRY_RUN = !process.argv.includes('--mark')

// ── Test detection patterns ────────────────────────────────────────────────────

const TEST_NAMES = [
  /playwright/i,
  /precommit/i,
  /^test\s/i,        // "Test Lead", "Test User", etc.
  /\btest lead\b/i,
  /\bqa\s+test\b/i,
  /^automated\b/i,
  /verification test/i,
]

const TEST_ORG = [
  /playwright/i,
  /precommit\s*corp/i,
  /test\s*(corp|org|company|municipal)/i,
]

const TEST_MSG = [
  /do not process/i,
  /automated verification/i,
  /precommit test/i,
  /playwright/i,
  /please ignore/i,
  /test.*do not/i,
  /\btest submission\b/i,
]

const TEST_PHONES = new Set([
  '9000000001',
  '9000000002',
])

const TEST_PHONE_PREFIX = /^9000000/

const TEST_PAGE = /^\/(test-|verify-|staging-|_test|acceptance)/

// ── Classifier ────────────────────────────────────────────────────────────────

function isTestSubmission(doc) {
  const name  = String(doc.name  || doc.answers?.name  || '')
  const org   = String(doc.organization || doc.answers?.organization || '')
  const msg   = String(doc.message || doc.requirement || doc.answers?.description || '')
  const phone = String(doc.phone || doc.answers?.phone || '').replace(/\D/g, '')
  const page  = String(doc.form_page_path || doc.pagePath || '')

  const reasons = []

  if (TEST_NAMES.some(r => r.test(name)))        reasons.push(`name: "${name}"`)
  if (TEST_ORG.some(r => r.test(org)))           reasons.push(`org: "${org}"`)
  if (TEST_MSG.some(r => r.test(msg)))           reasons.push(`msg: "${msg.slice(0, 60)}"`)
  if (TEST_PHONES.has(phone))                    reasons.push(`phone: ${phone}`)
  if (phone && TEST_PHONE_PREFIX.test(phone))    reasons.push(`phone-prefix: ${phone}`)
  if (page && TEST_PAGE.test(page))              reasons.push(`page: "${page}"`)
  if (doc._test === true)                        reasons.push('already marked _test:true')

  return reasons
}

// ── Main ───────────────────────────────────────────────────────────────────────

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })

try {
  await client.connect()
  console.log('Connected to MongoDB.\n')
  const db = client.db('100xDB')

  for (const collName of ['submissions', 'rfq_popup_leads']) {
    const coll = db.collection(collName)

    const total      = await coll.countDocuments({})
    const alreadyMkd = await coll.countDocuments({ _test: true })
    const prodCount  = total - alreadyMkd

    console.log(`═══════════════════════════════════════════════════`)
    console.log(`Collection : ${collName}`)
    console.log(`Total docs : ${total}`)
    console.log(`Already _test:true : ${alreadyMkd}`)
    console.log(`Production (clean) : ${prodCount}`)
    console.log(`═══════════════════════════════════════════════════\n`)

    // Fetch all docs for classification (admin endpoint, small collection)
    const docs = await coll.find({ _test: { $ne: true } })
      .project({
        _id: 1, name: 1, organization: 1, message: 1, requirement: 1,
        phone: 1, form_page_path: 1, pagePath: 1, createdAt: 1,
        answers: 1, type: 1,
      })
      .toArray()

    const testDocs = docs.map(d => ({ doc: d, reasons: isTestSubmission(d) }))
                         .filter(x => x.reasons.length > 0)

    console.log(`Test submissions found: ${testDocs.length}`)
    if (testDocs.length > 0) {
      console.log('\nDetails:')
      for (const { doc, reasons } of testDocs) {
        const ts = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-IN') : 'unknown'
        console.log(`  [${ts}] _id:${doc._id}`)
        for (const r of reasons) console.log(`         → ${r}`)
      }
    }

    // Page paths in production submissions
    const pagePaths = docs
      .filter(d => !isTestSubmission(d).length)
      .map(d => d.form_page_path || d.pagePath || '')
      .filter(Boolean)
    const pathCounts = {}
    for (const p of pagePaths) pathCounts[p] = (pathCounts[p] || 0) + 1
    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)

    console.log('\nTop production landing pages (after excluding test):')
    for (const [p, n] of topPaths) console.log(`  ${n.toString().padStart(3)}  ${p}`)

    if (DRY_RUN) {
      console.log(`\n[DRY RUN] Would mark ${testDocs.length} docs with _test:true in ${collName}`)
      console.log('Re-run with --mark to apply.\n')
    } else if (testDocs.length > 0) {
      const ids = testDocs.map(x => x.doc._id)
      const res = await coll.updateMany(
        { _id: { $in: ids } },
        { $set: { _test: true, _testMarkedAt: new Date().toISOString() } },
      )
      console.log(`\n✅ Marked ${res.modifiedCount} documents as _test:true in ${collName}\n`)
    } else {
      console.log('\nNothing to mark.\n')
    }
  }

  // Also check analytics_events for test pages
  const evColl  = db.collection('analytics_events')
  const evTotal = await evColl.countDocuments({})
  const evTest  = await evColl.countDocuments({ page: { $regex: TEST_PAGE } })
  console.log(`\nanalytics_events: ${evTotal} total, ${evTest} from test pages`)
  if (evTest > 0 && !DRY_RUN) {
    const res = await evColl.updateMany(
      { page: { $regex: TEST_PAGE } },
      { $set: { _test: true } },
    )
    console.log(`✅ Marked ${res.modifiedCount} analytics_events as _test:true`)
  }

  // Summary
  const subTotal   = await db.collection('submissions').countDocuments({})
  const subProd    = await db.collection('submissions').countDocuments({ _test: { $ne: true } })
  const subTest    = subTotal - subProd
  const popTotal   = await db.collection('rfq_popup_leads').countDocuments({})
  const popProd    = await db.collection('rfq_popup_leads').countDocuments({ _test: { $ne: true } })
  const popTest    = popTotal - popProd

  console.log('\n═══════════════════ SUMMARY ═══════════════════════')
  console.log(`submissions:`)
  console.log(`  Before filter : ${subTotal}`)
  console.log(`  Test/QA leads : ${subTest}`)
  console.log(`  Production    : ${subProd}`)
  console.log(`rfq_popup_leads:`)
  console.log(`  Before filter : ${popTotal}`)
  console.log(`  Test/QA leads : ${popTest}`)
  console.log(`  Production    : ${popProd}`)
  console.log(`Total leads before: ${subTotal + popTotal}`)
  console.log(`Total leads after : ${subProd + popProd}`)
  console.log(`Removed from view : ${subTest + popTest}`)
  if (DRY_RUN) {
    console.log('\n[DRY RUN — no changes written. Re-run with --mark to apply]\n')
  }

} finally {
  await client.close()
}
