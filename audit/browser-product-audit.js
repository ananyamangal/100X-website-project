/**
 * Playwright audit: open each canonical product landing page in a real browser,
 * wait for hydration, capture title / H1 / visible text / console errors /
 * failed network requests, and save screenshots.
 *
 * Run: node audit/browser-product-audit.js
 */

const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const URLS = [
  'https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50',
  'https://www.100xcircle.com/thermal-fogging-machine-with-stainless-steel-tank-100xssma20',
  'https://www.100xcircle.com/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400',
]

const OUT_DIR = path.join(__dirname, 'browser-audit-results')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const url of URLS) {
    const slug = url.split('/').pop()
    console.log(`\n${'='.repeat(70)}`)
    console.log(`AUDITING: ${url}`)
    console.log('='.repeat(70))

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const consoleErrors = []
    const failedRequests = []

    const page = await context.newPage()

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), failure: req.failure()?.errorText })
    })

    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push({ url: res.url(), status: res.status() })
      }
    })

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (e) {
      console.log('  Initial load error:', e.message)
    }

    // Wait 10 seconds for full hydration and any client-side data fetching
    console.log('  Waiting 10s for hydration...')
    await page.waitForTimeout(10000)

    const finalUrl  = page.url()
    const pageTitle = await page.title()
    const h1        = await page.$eval('h1', el => el.innerText.trim()).catch(() => '[no H1 found]')

    // Capture all visible text (body), trimmed and deduplicated
    const bodyText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const texts = []
      let node
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim()
        if (t.length > 3) texts.push(t)
      }
      return [...new Set(texts)].join('\n')
    })

    // Check for error phrases in the rendered DOM
    const errorPhrases = ['Product Not Found', 'product not found', 'Not Found', 'unavailable',
                          'does not exist', 'empty', 'No product', 'Error']
    const foundErrors = errorPhrases.filter(phrase =>
      bodyText.toLowerCase().includes(phrase.toLowerCase())
    )

    // Screenshot
    const screenshotPath = path.join(OUT_DIR, `${slug}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`  Screenshot saved: ${screenshotPath}`)

    // Also capture full-page
    const screenshotFullPath = path.join(OUT_DIR, `${slug}-full.png`)
    await page.screenshot({ path: screenshotFullPath, fullPage: true })

    // Print results
    console.log(`\n  FINAL URL:    ${finalUrl}`)
    console.log(`  PAGE TITLE:   ${pageTitle}`)
    console.log(`  H1:           ${h1}`)
    console.log(`\n  ERROR PHRASES IN RENDERED DOM:`)
    if (foundErrors.length) {
      foundErrors.forEach(e => console.log(`    ⚠️  "${e}"`))
    } else {
      console.log('    ✓ None detected')
    }
    console.log(`\n  CONSOLE ERRORS (${consoleErrors.length}):`)
    consoleErrors.slice(0, 10).forEach(e => console.log(`    ❌ ${e}`))
    console.log(`\n  FAILED NETWORK REQUESTS (${failedRequests.length}):`)
    failedRequests.slice(0, 15).forEach(r => console.log(`    ❌ ${r.status || 'FAIL'} ${r.url}`))
    console.log(`\n  VISIBLE BODY TEXT (first 800 chars):`)
    console.log(bodyText.slice(0, 800))

    results.push({
      url, finalUrl, pageTitle, h1, foundErrors,
      consoleErrors: consoleErrors.slice(0, 20),
      failedRequests: failedRequests.slice(0, 20),
      bodyTextSnippet: bodyText.slice(0, 1200),
      screenshot: screenshotPath,
    })

    await context.close()
  }

  // Write JSON summary
  const summaryPath = path.join(OUT_DIR, 'summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2))
  console.log(`\n${'='.repeat(70)}`)
  console.log(`Summary written to: ${summaryPath}`)

  await browser.close()
})()
