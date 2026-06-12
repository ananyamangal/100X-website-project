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
const { MongoClient } = require('mongodb')
;(async () => {
  const c = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()
  // find any blog about price guide
  const posts = await db.collection('blogs').find({ slug: /price/ }).toArray()
  if (!posts.length) {
    // try title search
    const byTitle = await db.collection('blogs').find({ title: /price/i }).toArray()
    if (byTitle.length) {
      byTitle.forEach(p => console.log('title:', p.title, '| slug:', p.slug))
    } else {
      // check the slug format - the URL has a hash suffix
      // thermal-fogging-machine-price-guide-factors-influencing-your-investment-6e6d9d
      const all = await db.collection('blogs').find({}, { projection: { title:1, slug:1, seoTitle:1, metaDescription:1 } }).limit(30).toArray()
      all.forEach(p => console.log('  slug:', p.slug, '| title:', p.title))
    }
    await c.close(); return
  }
  posts.forEach(p => {
    console.log('title:', p.title)
    console.log('seoTitle:', p.seoTitle || '[not set]')
    console.log('metaDescription:', p.metaDescription || '[not set]')
    console.log('slug:', p.slug)
    console.log()
  })
  await c.close()
})()
