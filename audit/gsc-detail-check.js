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
  const syncDate = '2026-06-12'

  // Slug-based /products page
  const slugPage = await db.collection('gsc_page_rows').findOne({
    syncDate, period: 'current',
    page: /thermal-cold-fogging-machine-100xtfs50/
  })
  console.log('\nSlug /products page:')
  console.log(' ', slugPage?.page)
  console.log('  impr:', slugPage?.impressions, ' clks:', slugPage?.clicks, ' pos:', Number(slugPage?.position).toFixed(1))

  // Admin page
  const adminPage = await db.collection('gsc_page_rows').findOne({
    syncDate, period: 'current',
    page: 'https://www.100xcircle.com/admin'
  })
  console.log('\nAdmin page:')
  if (adminPage) console.log('  impr:', adminPage.impressions, ' pos:', Number(adminPage.position).toFixed(1))
  else console.log('  (not found)')

  // Price guide blog
  const priceGuide = await db.collection('gsc_page_rows').findOne({
    syncDate, period: 'current',
    page: /price-guide/
  })
  console.log('\nPrice guide blog:')
  if (priceGuide) console.log(' ', priceGuide.page, '\n  impr:', priceGuide.impressions, ' clks:', priceGuide.clicks, ' pos:', Number(priceGuide.position).toFixed(1))

  // Weird optimize queries
  const weirdQ = await db.collection('gsc_query_rows').find({
    syncDate, period: 'current',
    query: /optimize/i
  }).toArray()
  console.log('\n"Optimize" queries:')
  weirdQ.forEach(r => console.log(' ', String(r.query).slice(0,60), '| impr:', r.impressions, '| pos:', Number(r.position).toFixed(1)))

  // Fogging machine price guide queries
  const priceQ = await db.collection('gsc_query_rows').find({
    syncDate, period: 'current',
    query: /price/i
  }).sort({ impressions: -1 }).limit(10).toArray()
  console.log('\nPrice-related queries:')
  priceQ.forEach(r => console.log(' ', String(r.query).slice(0,50).padEnd(50), 'impr:', r.impressions, ' pos:', Number(r.position).toFixed(1), ' clks:', r.clicks))

  await c.close()
})()
