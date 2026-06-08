const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const failed = []
  const errors = []
  page.on('response', resp => { if (resp.status() >= 400) failed.push({ status: resp.status(), url: resp.url().substring(0, 150) }) })
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().substring(0, 200)) })
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(3000)
  console.log('Failed requests on /products:')
  failed.forEach(r => console.log(`  ${r.status}: ${r.url}`))
  console.log('\nConsole errors on /products:')
  errors.forEach(e => console.log(`  ${e}`))
  // Count product cards
  const cards = await page.$$('.group.bg-white.rounded-2xl, [href^="/products/"]')
  console.log(`\nProduct cards found: ${cards.length}`)
  // Check MadeInIndia badge images
  const badgeImgs = await page.$$eval('img[src*="MadeInIndia"]', imgs => imgs.length)
  console.log(`MadeInIndia badge imgs: ${badgeImgs}`)
  const heavyDutyImgs = await page.$$eval('img[src*="Heavy"]', imgs => imgs.map(i => ({src: i.src, complete: i.complete, naturalWidth: i.naturalWidth})))
  console.log(`Heavy Duty badge imgs: ${JSON.stringify(heavyDutyImgs.slice(0,3))}`)
  await browser.close()
})()
