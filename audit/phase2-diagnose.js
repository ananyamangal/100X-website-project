/**
 * Phase 2 — Targeted Diagnostics for identified issues
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

async function diagnose400Errors(browser) {
  console.log('\n=== DIAGNOSING 400 ERRORS ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const failed400 = []

  page.on('response', resp => {
    if (resp.status() === 400 || resp.status() === 404) {
      failed400.push({ url: resp.url(), status: resp.status() })
    }
  })

  await page.goto(`${BASE}/knowledge/fogging-machine-maintenance-guide`, {
    waitUntil: 'networkidle',
    timeout: 20000
  })
  await page.waitForTimeout(3000)

  console.log('  Failed requests on /knowledge/fogging-machine-maintenance-guide:')
  failed400.forEach(r => console.log(`    ${r.status}: ${r.url}`))

  await ctx.close()
}

async function diagnoseHorizontalScroll(browser) {
  console.log('\n=== DIAGNOSING HORIZONTAL SCROLL ===')
  const viewports = [
    { width: 320, height: 568, label: 'iPhone SE' },
    { width: 375, height: 812, label: 'iPhone 15' },
  ]

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: vp })
    const page = await ctx.newPage()

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)

    const overflowInfo = await page.evaluate(() => {
      const bodyWidth = document.body.scrollWidth
      const viewportWidth = window.innerWidth
      const overflow = bodyWidth - viewportWidth
      if (overflow <= 0) return null

      // Find which elements are causing overflow
      const offenders = []
      const all = document.querySelectorAll('*')
      for (const el of all) {
        const rect = el.getBoundingClientRect()
        if (rect.right > viewportWidth + 2) {
          offenders.push({
            tag: el.tagName,
            id: el.id || '',
            classes: el.className?.toString()?.split(' ')?.slice(0,3)?.join(' ') || '',
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          })
        }
      }
      return { overflow, offenders: offenders.slice(0, 5) }
    })

    console.log(`\n  ${vp.label} (${vp.width}px):`)
    if (!overflowInfo) {
      console.log('    ✅ No overflow')
    } else {
      console.log(`    ❌ ${overflowInfo.overflow}px overflow`)
      overflowInfo.offenders.forEach(o =>
        console.log(`      Offender: <${o.tag}> id="${o.id}" class="${o.classes}" right=${o.right}px`)
      )
    }

    // Also test /products page
    await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)
    const productsOverflow = await page.evaluate(() => {
      return document.body.scrollWidth - window.innerWidth
    })
    console.log(`  /products overflow: ${productsOverflow}px`)

    await ctx.close()
  }
}

async function diagnoseEmailValidation(browser) {
  console.log('\n=== DIAGNOSING EMAIL VALIDATION ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/contact-us`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  // Fill form with invalid email
  await page.fill('input[name=firstName]', 'TestUser')
  await page.fill('input[name=lastName]', 'Audit')
  await page.fill('input[name=phone]', '9876543210')
  await page.fill('input[name=email]', 'notanemail')
  await page.selectOption('select[name=subject]', { index: 1 }).catch(() => {})
  await page.fill('textarea[name=message]', 'This is a test message for audit purposes')

  // Submit
  await page.click('button[type=submit]')
  await page.waitForTimeout(1000)

  const errorText = await page.textContent('[role=alert]').catch(() => null)
  const redText = await page.$$eval('.text-red-600', els => els.map(e => e.textContent?.trim()))

  console.log(`  Error role=alert: "${errorText}"`)
  console.log(`  Red text elements: ${JSON.stringify(redText)}`)

  // Now try with a valid-ish but wrong email
  await page.fill('input[name=email]', 'test@')
  await page.click('button[type=submit]')
  await page.waitForTimeout(500)
  const errorText2 = await page.textContent('[role=alert]').catch(() => null)
  console.log(`  Error for "test@": "${errorText2}"`)

  await ctx.close()
}

async function diagnoseProductCTA(browser) {
  console.log('\n=== DIAGNOSING PRODUCT PAGE CTA ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const slugs = [
    'double-barrel-thermal-fogging-machine-vehicle-mounted',
    '100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-f377e0',
    'thermal-cold-fogging-machine-100xtfs50-90602f'
  ]

  for (const slug of slugs) {
    await page.goto(`${BASE}/products/${slug}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)

    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => 'NO H1')
    const status = page.url().includes('404') ? '404' : '200'

    // Look for any inquiry/contact buttons
    const allButtons = await page.$$eval('button, a[href*="whatsapp"], a[href*="contact"]', els =>
      els.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim()?.substring(0, 50),
        href: el.getAttribute('href')?.substring(0, 80),
      }))
    )
    const inquiryBtns = allButtons.filter(b =>
      b.text?.match(/inquir|quote|rfq|contact|whatsapp|call/i) ||
      b.href?.includes('whatsapp') || b.href?.includes('wa.me')
    )

    console.log(`\n  ${slug}:`)
    console.log(`    H1: ${h1}`)
    console.log(`    URL: ${page.url()}`)
    console.log(`    Inquiry buttons (${inquiryBtns.length}): ${JSON.stringify(inquiryBtns.slice(0,3))}`)
    console.log(`    All buttons (${allButtons.length}): ${allButtons.slice(0,5).map(b=>b.text).join(' | ')}`)
  }

  await ctx.close()
}

async function diagnoseLogo(browser) {
  console.log('\n=== DIAGNOSING BROKEN LOGO ===')

  // Test direct logo URL
  const resp = await fetch(`${BASE}/logo-main.png`)
  console.log(`  /logo-main.png: HTTP ${resp.status}`)
  if (resp.ok) {
    const ct = resp.headers.get('content-type')
    const size = resp.headers.get('content-length')
    console.log(`    Content-Type: ${ct}, Size: ${size || 'unknown'} bytes`)
  }

  // Test MadeInIndia.png
  const resp2 = await fetch(`${BASE}/Logos%20clipart%202/MadeInIndia.png`)
  console.log(`  /Logos clipart 2/MadeInIndia.png: HTTP ${resp2.status}`)

  // Test with Playwright — it might be that Playwright's image loading check is wrong
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 25000 })

  const logoStatus = await page.evaluate(() => {
    const logo = document.querySelector('img[src*="logo-main"]')
    if (!logo) return 'NOT_FOUND'
    return {
      complete: logo.complete,
      naturalWidth: logo.naturalWidth,
      naturalHeight: logo.naturalHeight,
      src: logo.src,
    }
  })
  console.log(`  Logo img element status: ${JSON.stringify(logoStatus)}`)

  await ctx.close()
}

async function diagnoseKnowledgeHubCount(browser) {
  console.log('\n=== VERIFYING KNOWLEDGE HUB ARTICLE COUNT ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(2000)

  const articles = await page.$$eval('a[href^="/knowledge/"]', links =>
    links.map(l => ({ href: l.getAttribute('href'), text: l.querySelector('h2')?.textContent?.trim() || l.textContent?.trim()?.substring(0,60) }))
  )

  console.log(`  Articles visible on /knowledge: ${articles.length}`)
  articles.forEach(a => console.log(`    ${a.href}: "${a.text}"`))

  await ctx.close()
}

async function diagnoseSitemapCoverage() {
  console.log('\n=== VERIFYING SITEMAP COVERAGE ===')
  const resp = await fetch(`${BASE}/sitemap.xml`)
  const xml = await resp.text()

  const urls = (xml.match(/<loc>(.*?)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, ''))
  console.log(`  Total URLs in sitemap: ${urls.length}`)

  // Check knowledge hub articles
  const knowledgeUrls = urls.filter(u => u.includes('/knowledge/'))
  console.log(`  Knowledge hub URLs in sitemap: ${knowledgeUrls.length}`)
  knowledgeUrls.forEach(u => console.log(`    ${u}`))

  // Check for missing important pages
  const mustHave = [
    '/knowledge/dengue-prevention-thermal-fogging',
    '/knowledge/malaria-control-fogging-india',
    '/knowledge/thermal-fogging-chemicals-guide',
    '/knowledge/fogging-machine-operators-guide',
    '/knowledge/fogging-machine-maintenance-guide',
    '/knowledge/fogging-machine-safety-guide',
    '/knowledge/how-to-choose-fogging-machine',
    '/knowledge/agricultural-fogging-guide',
  ]
  const missing = mustHave.filter(p => !urls.some(u => u.endsWith(p)))
  if (missing.length > 0) {
    console.log(`  MISSING FROM SITEMAP: ${missing.join(', ')}`)
  } else {
    console.log(`  ✅ All 8 new knowledge articles in sitemap`)
  }
}

async function diagnoseAPIKnowledge() {
  console.log('\n=== VERIFYING AI KNOWLEDGE API ===')
  const resp = await fetch(`${BASE}/api/ai/knowledge`)
  const data = await resp.json()
  console.log(`  HTTP: ${resp.status}`)
  console.log(`  Article count: ${data.count}`)
  console.log(`  Articles:`)
  data.data?.forEach(a => console.log(`    - ${a.title}`))
}

// Main
;(async () => {
  const browser = await chromium.launch({ headless: true })

  await diagnoseLogo(browser)
  await diagnose400Errors(browser)
  await diagnoseHorizontalScroll(browser)
  await diagnoseEmailValidation(browser)
  await diagnoseProductCTA(browser)
  await diagnoseKnowledgeHubCount(browser)
  await diagnoseSitemapCoverage()
  await diagnoseAPIKnowledge()

  await browser.close()
})()
