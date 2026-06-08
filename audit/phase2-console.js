/**
 * Capture ALL network requests on a page to find what's 400ing
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const requests = []
  page.on('response', resp => {
    const status = resp.status()
    if (status >= 400) {
      requests.push({ status, url: resp.url().substring(0, 120) })
    }
  })

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text().substring(0, 200) })
    }
  })

  await page.goto(`${BASE}/privacy-policy`, { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(3000)

  console.log('\nFailed requests on /privacy-policy:')
  requests.forEach(r => console.log(`  ${r.status}: ${r.url}`))

  console.log('\nConsole messages:')
  consoleErrors.forEach(e => console.log(`  [${e.type}] ${e.text}`))

  // Also check homepage
  const requests2 = []
  const consoleErrors2 = []
  page.on('response', resp => {
    const status = resp.status()
    if (status >= 400) requests2.push({ status, url: resp.url().substring(0, 120) })
  })
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors2.push(msg.text().substring(0, 200))
  })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 25000 })
  await page.waitForTimeout(3000)

  console.log('\nFailed requests on /:')
  requests2.forEach(r => console.log(`  ${r.status}: ${r.url}`))
  console.log('\nConsole errors on /:')
  consoleErrors2.forEach(e => console.log(`  ${e}`))

  await browser.close()
})()
