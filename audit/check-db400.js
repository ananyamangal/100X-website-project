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
  // Try slug match first
  let p = await db.collection('products').findOne({ slug: /db400/i })
  if (!p) p = await db.collection('products').findOne({ name: /double.barrel|db400/i })
  if (!p) p = await db.collection('products').findOne({ name: /double barrel/i })
  if (!p) {
    // List all products to find it
    const all = await db.collection('products').find({}, { projection: { name:1, slug:1 } }).toArray()
    console.log('All products:')
    all.forEach(x => console.log(' ', x.slug, '|', x.name))
    await c.close(); return
  }
  console.log('\nDB400 product fields:')
  console.log('  _id:        ', String(p._id))
  console.log('  name:       ', p.name)
  console.log('  slug:       ', p.slug)
  console.log('  h1Title:    ', p.h1Title)
  console.log('  title:      ', p.title)
  console.log('  seoTitle:   ', p.seoTitle)
  console.log('  metaTitle:  ', p.metaTitle)
  console.log('  category:   ', p.category)
  await c.close()
})()
