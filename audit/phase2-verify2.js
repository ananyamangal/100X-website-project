const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'
;(async () => {
  const browser = await chromium.launch({ headless: true })

  // 1. Homepage H1 check — wait properly for client render
  console.log('=== HOMEPAGE H1 ===')
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page1 = await ctx1.newPage()
  await page1.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page1.waitForTimeout(3000) // wait for client hydration
  const allH1s = await page1.$$eval('h1', els => els.map(e => e.textContent?.trim().substring(0, 80)))
  console.log(`H1 tags found: ${allH1s.length}`)
  allH1s.forEach(h => console.log(`  "${h}"`))
  // Check page source for H1
  const html = await page1.content()
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
  console.log(`H1 in HTML: ${h1Match ? h1Match[1].trim().substring(0,80) : 'NOT FOUND (may be in nested element)'}`)
  await ctx1.close()

  // 2. Check what resource is returning 400
  console.log('\n=== 400 ERROR SOURCE on /knowledge/fogging-machine-maintenance-guide ===')
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page2 = await ctx2.newPage()
  const all400s = []
  page2.on('response', resp => {
    if (resp.status() === 400) {
      all400s.push({ url: resp.url().substring(0, 150), headers: Object.entries(resp.headers()).slice(0, 3) })
    }
  })
  await page2.goto(`${BASE}/knowledge/fogging-machine-maintenance-guide`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page2.waitForTimeout(5000)
  console.log(`400 responses found: ${all400s.length}`)
  all400s.forEach(r => console.log(`  ${r.url}`))
  await ctx2.close()

  // 3. Check spare-parts H1 looks correct
  console.log('\n=== SPARE PARTS H1 ===')
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page3 = await ctx3.newPage()
  await page3.goto(`${BASE}/spare-parts`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page3.waitForTimeout(2000)
  const spareParts_h1 = await page3.$eval('h1', el => el.textContent?.trim()).catch(() => 'NO H1')
  console.log(`Spare parts H1: "${spareParts_h1}"`)
  await ctx3.close()

  // 4. Test knowledge hub navigation — click through to article
  console.log('\n=== KNOWLEDGE HUB NAVIGATION ===')
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page4 = await ctx4.newPage()
  await page4.goto(`${BASE}/knowledge`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page4.waitForTimeout(2000)
  const links = await page4.$$eval('a[href^="/knowledge/"]', els => els.map(e => e.getAttribute('href')).slice(0,3))
  console.log(`Knowledge hub links (first 3): ${links.join(', ')}`)
  // Click first article
  const firstLink = links[0]
  await page4.click(`a[href="${firstLink}"]`)
  await page4.waitForTimeout(2000)
  const articleUrl = page4.url()
  const articleH1 = await page4.$eval('h1', el => el.textContent?.trim().substring(0, 60)).catch(() => null)
  console.log(`Navigated to: ${articleUrl}`)
  console.log(`Article H1: "${articleH1}"`)
  // Back navigation
  await page4.goBack()
  await page4.waitForTimeout(1000)
  const backUrl = page4.url()
  console.log(`Back navigation to: ${backUrl} ${backUrl.endsWith('/knowledge') ? '✅' : '❌'}`)
  await ctx4.close()

  // 5. Test RFQ popup behavior
  console.log('\n=== RFQ POPUP ===')
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page5 = await ctx5.newPage()
  await page5.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page5.waitForTimeout(1000)
  // Open RFQ ribbon
  const ribbonBtn = await page5.$('button[aria-label*="RFQ"], button[data-gtm="rfq_ribbon_open"]')
  if (ribbonBtn) {
    await ribbonBtn.click()
    await page5.waitForTimeout(1000)
    const modal = await page5.$('[role=dialog]')
    console.log(modal ? '✅ RFQ ribbon opens modal' : '❌ RFQ ribbon modal not found')
    // Test ESC closes it
    await page5.keyboard.press('Escape')
    await page5.waitForTimeout(500)
    const modalAfterEsc = await page5.$('[role=dialog][aria-label="RFQ / Tender Inquiry"]')
    console.log(!modalAfterEsc ? '✅ ESC closes RFQ modal' : '❌ ESC did not close RFQ modal')
  } else {
    console.log('⚠️  RFQ ribbon button not found')
  }
  await ctx5.close()

  await browser.close()
})()
