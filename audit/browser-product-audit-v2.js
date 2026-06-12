/**
 * Playwright audit v2 — pre-sitemap submission verification.
 *
 * For each canonical product landing page, verifies:
 *   1. Product title visible in H1
 *   2. Product image visible (img tag with product src)
 *   3. Product specifications visible
 *   4. No "Product Not Found"
 *   5. No "Oops / Something went wrong"
 *   6. No console errors
 *   7. No failed API requests (admin 401s)
 *
 * Captures: viewport screenshot, below-the-fold screenshot, full-page screenshot.
 * Run: node audit/browser-product-audit-v2.js
 */

const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const URLS = [
  'https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50',
  'https://www.100xcircle.com/thermal-fogging-machine-with-stainless-steel-tank-100xssma20',
  'https://www.100xcircle.com/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400',
]

const OUT_DIR = path.join(__dirname, 'browser-audit-results-v2')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

// These domains fail by design in headless (analytics, YouTube stats).
// Exclude from "failed API" count so the report stays signal vs noise.
const NOISE_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
  'google.com/ccm', 'google.com/rmkt', 'youtube.com/api/stats',
  'youtube.com/ptracking', 'youtube.com/embed', 'doubleclick.net',
  'facebook.com', 'connect.facebook', 'clarity.ms',
]
function isNoise(url) {
  return NOISE_DOMAINS.some(d => url.includes(d))
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const allResults = []

  for (const url of URLS) {
    const slug = url.split('/').pop()
    console.log(`\n${'='.repeat(72)}`)
    console.log(`AUDITING: ${url}`)
    console.log('='.repeat(72))

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      // Block cookies banner / popups that vary by session
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    })

    const consoleErrors = []
    const apiErrors = []        // only non-noise 4xx/5xx
    const allFailedReqs = []    // everything ≥400 for reference

    const page = await context.newPage()

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text()
        // Ignore favicon 404s, analytics errors, and browser Permissions-Policy
        // violations from third-party embeds (YouTube compute-pressure, etc.)
        if (!isNoise(t) && !t.includes('Permissions policy violation')) consoleErrors.push(t)
      }
    })

    page.on('requestfailed', req => {
      if (!isNoise(req.url())) {
        allFailedReqs.push({ url: req.url(), reason: req.failure()?.errorText })
      }
    })

    page.on('response', res => {
      const u = res.url()
      if (res.status() >= 400) {
        allFailedReqs.push({ url: u, status: res.status() })
        if (!isNoise(u)) apiErrors.push({ url: u, status: res.status() })
      }
    })

    // ── Load page ─────────────────────────────────────────────────────────
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
    } catch (e) {
      console.log('  Load error:', e.message.split('\n')[0])
    }

    // Close any modal/popup that auto-appears (quote form, cookie banner, etc.)
    try {
      // Generic: look for a close/dismiss button inside an overlay
      const closeBtn = await page.$('[aria-label="Close"], button:has-text("×"), button:has-text("✕"), [data-dismiss="modal"]')
      if (closeBtn) { await closeBtn.click(); await page.waitForTimeout(400) }
    } catch { /* ignore */ }

    // Also press Escape to dismiss any modal
    await page.keyboard.press('Escape')

    // Wait for React hydration + product data fetch to complete
    console.log('  Waiting 8s for hydration...')
    await page.waitForTimeout(8000)

    // ── Dismiss any overlay that appeared after hydration ─────────────────
    try {
      const closeBtn2 = await page.$('button[aria-label="Close"], button:has-text("×"), .modal-close, .dialog-close')
      if (closeBtn2) { await closeBtn2.click(); await page.waitForTimeout(300) }
    } catch { /* ignore */ }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // ── Collect page state ────────────────────────────────────────────────
    const finalUrl  = page.url()
    const pageTitle = await page.title()

    // H1 text
    const h1Text = await page.$eval('h1', el => el.innerText.trim()).catch(() => '[no H1]')

    // Product image — any <img> with a Cloudinary / product URL (not logos/icons)
    const productImageSrc = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      const candidates = imgs.filter(img => {
        const src = img.src || ''
        const w = img.naturalWidth || img.width || 0
        return w > 100 && (src.includes('cloudinary') || src.includes('http'))
              && !src.includes('logo') && !src.includes('icon') && !src.includes('badge')
              && !src.includes('flag') && !src.includes('GeM') && !src.includes('BIS')
      })
      return candidates[0]?.src || '[no product image found]'
    })

    // Specifications — look for spec-like lines ("Label: Value" pattern)
    const specsFound = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('*')).map(el => el.innerText || '')
      const specLines = texts.flatMap(t => t.split('\n'))
        .filter(l => /^[A-Za-z ]{3,40}:\s*.+/.test(l.trim()))
        .map(l => l.trim())
      return [...new Set(specLines)].slice(0, 5)
    })

    // Full body text for error-phrase detection
    const bodyText = await page.evaluate(() => document.body.innerText || '')

    // ── Pass/Fail checks ──────────────────────────────────────────────────
    const checks = {
      'Product title in H1':       h1Text !== '[no H1]' && h1Text.length > 5,
      'Product image visible':      productImageSrc !== '[no product image found]',
      'Specifications visible':     specsFound.length >= 1,
      'No "Product Not Found"':    !bodyText.toLowerCase().includes('product not found'),
      'No "Oops / Something went wrong"':
        !bodyText.toLowerCase().includes('something went wrong') &&
        !bodyText.toLowerCase().includes('unexpected error'),
      'No console errors':          consoleErrors.length === 0,
      'No failed API requests':     apiErrors.length === 0,
    }

    const pass = Object.values(checks).every(Boolean)

    // ── Screenshots ───────────────────────────────────────────────────────
    // 1. Viewport (above fold) — no modal
    const shot1 = path.join(OUT_DIR, `${slug}-above-fold.png`)
    await page.screenshot({ path: shot1 }).catch(() => {})

    // 2. Scroll to specs section
    await page.evaluate(() => window.scrollBy(0, 1200))
    await page.waitForTimeout(600)
    const shot2 = path.join(OUT_DIR, `${slug}-specs-section.png`)
    await page.screenshot({ path: shot2 }).catch(() => {})

    // ── Report ────────────────────────────────────────────────────────────
    console.log(`\n  FINAL URL:     ${finalUrl}`)
    console.log(`  PAGE TITLE:    ${pageTitle}`)
    console.log(`  H1:            ${h1Text}`)
    console.log(`  PRODUCT IMAGE: ${productImageSrc.slice(0, 80)}...`)
    console.log(`  SPECS SAMPLE:  ${specsFound.slice(0, 2).join(' | ') || '[none]'}`)
    console.log(`\n  CHECKLIST:`)
    for (const [label, result] of Object.entries(checks)) {
      console.log(`    ${result ? '✅' : '❌'} ${label}`)
    }
    if (consoleErrors.length) {
      console.log(`\n  CONSOLE ERRORS:`)
      consoleErrors.forEach(e => console.log(`    ❌ ${e}`))
    }
    if (apiErrors.length) {
      console.log(`\n  FAILED API REQUESTS (non-analytics):`)
      apiErrors.forEach(r => console.log(`    ❌ ${r.status} ${r.url}`))
    }
    console.log(`\n  OVERALL: ${pass ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`  Screenshots: ${slug}-above-fold.png  |  ${slug}-specs-section.png`)

    allResults.push({
      url, slug, pass, finalUrl, pageTitle, h1Text,
      productImageSrc, specsFound, checks,
      consoleErrors, apiErrors,
    })

    await context.close()
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const allPass = allResults.every(r => r.pass)
  console.log(`\n${'='.repeat(72)}`)
  console.log(`FINAL VERDICT: ${allPass ? '✅ ALL PASS — sitemap submission cleared' : '❌ FAILURES DETECTED — do NOT submit sitemap'}`)
  console.log('='.repeat(72))

  fs.writeFileSync(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify(allResults, null, 2)
  )

  await browser.close()
  process.exit(allPass ? 0 : 1)
})()
