/**
 * Removes stale growth_os_opportunities created from bot/programmatic GSC queries.
 * Run: node audit/cleanup-junk-opportunities.js
 */
const fs = require('fs')
function loadEnv(p) {
  try { fs.readFileSync(p,'utf8').split('\n').forEach(l=>{const t=l.trim();if(!t||t.startsWith('#'))return;const eq=t.indexOf('=');if(eq<0)return;const k=t.slice(0,eq).trim(),v=t.slice(eq+1).trim().replace(/^["']|["']$/g,'');if(k&&!process.env[k])process.env[k]=v;}) } catch {}
}
loadEnv('.env.local'); loadEnv('.env')
const { MongoClient } = require('mongodb')
;(async () => {
  const c = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()

  // Junk patterns: quoted searches, competitor brand, slug-like queries
  const JUNK_PATTERNS = [
    /optimize.{0,5}handheld/i,
    /handheld.{0,20}fogg.{0,20}crowd/i,
    /aerosoldiy/i,
    /handheld fogging/i,
  ]

  function isJunk(q) {
    const s = String(q || '')
    if (s.includes('"') || s.includes("'")) return true
    return JUNK_PATTERNS.some(p => p.test(s))
  }

  // Find all opportunities with junk gscQuery
  const all = await db.collection('growth_os_opportunities').find({}).toArray()
  const toDelete = all.filter(o => isJunk(o.gscQuery))

  console.log(`\nFound ${all.length} total opportunities`)
  console.log(`Found ${toDelete.length} junk opportunities to delete:`)
  toDelete.forEach(o => console.log(`  _id: ${o._id}  title: ${String(o.title).slice(0,80)}`))

  if (toDelete.length > 0) {
    const ids = toDelete.map(o => o._id)
    const result = await db.collection('growth_os_opportunities').deleteMany({ _id: { $in: ids } })
    console.log(`\nDeleted ${result.deletedCount} opportunity records.`)
  }

  // Also delete the draft (even if rejected — it's just noise)
  const draftResult = await db.collection('growth_os_drafts').deleteMany({
    $or: [
      { content: /optimize handheld/i },
      { content: /optimize-handheld/i },
      { targetIntent: /optimize handheld/i },
    ]
  })
  console.log(`Deleted ${draftResult.deletedCount} draft record(s).`)

  await c.close()
  console.log('Done.\n')
})()
