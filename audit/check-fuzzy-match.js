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

  // What does getProductBySlug do? It uses normalizeSlugLike + tokenSig.
  // Let's simulate: strip non-alphanumeric, tokenize, find products whose
  // token signature overlaps.
  function normalizeSlug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'')
  }
  function tokenSig(s) {
    return normalizeSlug(s).split('-').filter(t => t.length > 2).sort().join('|')
  }

  const slugsToCheck = ['handheld-fogging-crowds', 'optimize-handheld-fogging-crowds', 'optimize-handheld-fogging']

  const products = await db.collection('products').find({}, { projection: { name:1, slug:1, isPublished:1 } }).toArray()

  console.log('\nFuzzy match simulation:')
  for (const testSlug of slugsToCheck) {
    const testSig = tokenSig(testSlug)
    const testTokens = new Set(testSig.split('|'))
    console.log(`\n  Input: "${testSlug}" → tokens: ${testSig}`)

    const matches = []
    for (const p of products) {
      const productSig = tokenSig(String(p.name || ''))
      const productTokens = new Set(productSig.split('|'))
      // Check overlap
      const overlap = [...testTokens].filter(t => productTokens.has(t))
      if (overlap.length >= 1) {
        matches.push({ name: p.name, slug: p.slug, overlap: overlap.join(','), isPublished: p.isPublished })
      }
    }
    if (matches.length) {
      matches.forEach(m => console.log(`    MATCH: "${m.name}" (slug:${m.slug}, published:${m.isPublished}, overlap:${m.overlap})`))
    } else {
      console.log(`    No product match`)
    }
  }

  await c.close()
})()
