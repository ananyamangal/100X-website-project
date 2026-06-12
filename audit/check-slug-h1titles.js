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
  const all = await c.db().collection('products').find({}, { projection: { name:1, slug:1, h1Title:1 } }).toArray()
  console.log('\nAll products — h1Title audit:')
  console.log('  Status       h1Title value                                   name')
  console.log('  ' + '-'.repeat(90))
  let issues = 0
  for (const p of all) {
    const h1 = p.h1Title || ''
    const isSlug = h1.length > 0 && !h1.includes(' ')
    const status = !h1 ? '⚠️ empty  ' : isSlug ? '❌ SLUG   ' : '✅ OK     '
    if (isSlug) issues++
    console.log(`  ${status} ${String(h1).slice(0,50).padEnd(52)} ${p.name}`)
  }
  console.log(`\n  ${issues} products with slug-like h1Title (code guard will now fall back to name).`)
  await c.close()
})()
