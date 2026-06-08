/**
 * Phase 2 Production Audit — Full Site Crawl & Verification
 * Tests: HTTP status, console errors, page load, metadata, navigation, mobile
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

const PAGES_TO_TEST = [
  // Core
  { path: '/', label: 'Homepage' },
  { path: '/products', label: 'Products Listing' },
  { path: '/about', label: 'About' },
  { path: '/contact-us', label: 'Contact Us' },
  { path: '/blog', label: 'Blog Index' },
  { path: '/spare-parts', label: 'Spare Parts' },
  { path: '/knowledge', label: 'Knowledge Hub' },
  { path: '/compare', label: 'Compare Hub' },
  { path: '/videos', label: 'Videos' },
  { path: '/deployments', label: 'Deployments' },
  { path: '/case-studies', label: 'Case Studies' },
  { path: '/factory', label: 'Factory' },
  { path: '/thank-you', label: 'Thank You' },
  // Knowledge articles
  { path: '/knowledge/how-thermal-fogging-works', label: 'Knowledge: How Fogging Works' },
  { path: '/knowledge/thermal-vs-ulv-fogging', label: 'Knowledge: Thermal vs ULV' },
  { path: '/knowledge/dengue-prevention-thermal-fogging', label: 'Knowledge: Dengue Prevention' },
  { path: '/knowledge/malaria-control-fogging-india', label: 'Knowledge: Malaria Control' },
  { path: '/knowledge/mosquito-control-india', label: 'Knowledge: Mosquito Control' },
  { path: '/knowledge/agricultural-fogging-guide', label: 'Knowledge: Agricultural Fogging' },
  { path: '/knowledge/how-to-choose-fogging-machine', label: 'Knowledge: How to Choose' },
  { path: '/knowledge/thermal-fogging-chemicals-guide', label: 'Knowledge: Chemicals Guide' },
  { path: '/knowledge/fogging-machine-operators-guide', label: 'Knowledge: Operators Guide' },
  { path: '/knowledge/fogging-machine-maintenance-guide', label: 'Knowledge: Maintenance' },
  { path: '/knowledge/fogging-machine-safety-guide', label: 'Knowledge: Safety Guide' },
  { path: '/knowledge/government-procurement-guide', label: 'Knowledge: GeM Procurement' },
  // Compare pages
  { path: '/compare/100x-circle-vs-korean-fogging-machines', label: 'Compare: vs Korean' },
  { path: '/compare/vehicle-mounted-vs-portable-thermal-fogger', label: 'Compare: Vehicle vs Portable' },
  { path: '/compare/fogging-machine-buyer-guide-india', label: 'Compare: Buyer Guide' },
  { path: '/compare/gem-fogging-machines-india', label: 'Compare: GeM' },
  { path: '/compare/best-thermal-fogging-machine-for-municipal-use', label: 'Compare: Municipal' },
  // Landing pages (SEO)
  { path: '/vehicle-mounted-fogging-machine', label: 'Landing: Vehicle Mounted' },
  { path: '/power-tiller', label: 'Landing: Power Tiller' },
  { path: '/gem-approved-fogging-machine-oem', label: 'Landing: GeM OEM' },
  // Policy pages
  { path: '/privacy-policy', label: 'Privacy Policy' },
  { path: '/terms-and-conditions', label: 'Terms' },
  { path: '/return-policy', label: 'Return Policy' },
  { path: '/warranty-policy', label: 'Warranty Policy' },
  { path: '/disclaimer', label: 'Disclaimer' },
  // AI pages
  { path: '/ai/about-100x', label: 'AI: About' },
  { path: '/ai/factory', label: 'AI: Factory' },
  { path: '/ai/certifications', label: 'AI: Certifications' },
]

const API_ENDPOINTS = [
  { path: '/api/products', label: 'Products API' },
  { path: '/api/spare-parts', label: 'Spare Parts API' },
  { path: '/api/brochure', label: 'Brochure API' },
  { path: '/api/rfq-popup/config', label: 'RFQ Popup Config API' },
  { path: '/api/video-popup', label: 'Video Popup API' },
  { path: '/api/ai/knowledge', label: 'AI Knowledge API' },
  { path: '/api/ai/company', label: 'AI Company API' },
  { path: '/sitemap.xml', label: 'Sitemap XML' },
  { path: '/robots.txt', label: 'Robots.txt' },
]

async function testPage(browser, { path, label }, viewport = null) {
  const ctx = await browser.newContext({
    viewport: viewport || { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  })
  const page = await ctx.newPage()
  const errors = []
  const failedReqs = []
  const consoleWarnings = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.type() === 'warning') consoleWarnings.push(msg.text())
  })
  page.on('requestfailed', req => {
    const url = req.url()
    // Ignore GTM/analytics failures (expected in test env)
    if (!url.includes('googletagmanager') && !url.includes('google-analytics') &&
        !url.includes('facebook') && !url.includes('doubleclick')) {
      failedReqs.push(url)
    }
  })

  const result = { path, label, status: null, errors: [], failedReqs: [], warnings: [], h1: null, title: null, canonical: null, issues: [] }

  try {
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    })
    result.status = response?.status()

    // Wait for main content
    await page.waitForTimeout(2000)

    // Check for 404/error page
    const bodyText = await page.textContent('body').catch(() => '')
    if (bodyText.includes('404') && bodyText.includes('not found')) {
      result.issues.push('SOFT_404: page renders but contains 404 text')
    }
    if (result.status === 404) {
      result.issues.push('HTTP_404')
    }
    if (result.status >= 500) {
      result.issues.push(`HTTP_${result.status}_SERVER_ERROR`)
    }

    // Get metadata
    result.title = await page.title()
    result.h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
    result.canonical = await page.$eval('link[rel=canonical]', el => el.getAttribute('href')).catch(() => null)
    result.ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => null)
    result.description = await page.$eval('meta[name=description]', el => el.getAttribute('content')).catch(() => null)

    // Check for empty page
    if (!result.h1 && !result.title) {
      result.issues.push('EMPTY_PAGE: no h1 or title found')
    }
    if (!result.title || result.title.length < 10) {
      result.issues.push('MISSING_TITLE')
    }
    if (!result.description) {
      result.issues.push('MISSING_META_DESCRIPTION')
    }
    if (!result.canonical) {
      result.issues.push('MISSING_CANONICAL')
    }

    // Check navbar is present
    const hasNavbar = await page.$('header, nav').catch(() => null)
    if (!hasNavbar) result.issues.push('NO_NAVBAR_FOUND')

    // Check footer
    const hasFooter = await page.$('footer').catch(() => null)
    if (!hasFooter) result.issues.push('NO_FOOTER_FOUND')

    // Check for broken images
    const brokenImgs = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src)
        .filter(src => src && !src.includes('data:'))
        .slice(0, 5)
    })
    if (brokenImgs.length > 0) {
      result.issues.push(`BROKEN_IMAGES: ${brokenImgs.join(', ')}`)
    }

    // Hydration errors
    if (errors.some(e => e.includes('Hydration') || e.includes('hydration'))) {
      result.issues.push('HYDRATION_ERROR')
    }

  } catch (e) {
    result.issues.push(`LOAD_ERROR: ${e.message}`)
    result.status = 0
  }

  result.errors = errors
  result.failedReqs = failedReqs
  result.warnings = consoleWarnings.slice(0, 3)

  await ctx.close()
  return result
}

async function testAPI(url, label) {
  try {
    const resp = await fetch(`${BASE}${url}`)
    const status = resp.status
    let body = null
    const ct = resp.headers.get('content-type') || ''
    if (ct.includes('json')) {
      body = await resp.json().catch(() => null)
    } else if (ct.includes('xml') || ct.includes('text')) {
      body = await resp.text().catch(() => '')
    }
    return { url, label, status, body: body ? JSON.stringify(body).slice(0, 200) : null }
  } catch (e) {
    return { url, label, status: 0, error: e.message }
  }
}

async function testNavigation(browser) {
  console.log('\n=== TESTING NAVIGATION ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(1500)

  // Test desktop nav links
  const navLinks = await page.$$eval('header nav a[href]', links =>
    links.map(l => ({ text: l.textContent?.trim(), href: l.getAttribute('href') }))
  )
  console.log(`  Desktop nav links found: ${navLinks.length}`)
  for (const link of navLinks) {
    if (link.href && link.href.startsWith('/') && !link.href.startsWith('//')) {
      const resp = await page.evaluate(async (url) => {
        const r = await fetch(url)
        return r.status
      }, `${BASE}${link.href}`).catch(() => 0)
      if (resp === 404) issues.push(`NAV_LINK_404: ${link.text} -> ${link.href}`)
    }
  }

  // Test mobile hamburger
  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  const hamburger = await page.$('button[aria-label*="navigation"], button[aria-controls="navbar-mobile-menu"]')
  if (hamburger) {
    await hamburger.click()
    await page.waitForTimeout(500)
    const mobileMenu = await page.$('#navbar-mobile-menu')
    const menuVisible = await mobileMenu?.isVisible()
    if (!menuVisible) issues.push('MOBILE_MENU_NOT_OPENING')
    else console.log('  ✅ Mobile hamburger menu opens correctly')

    // Close it
    await hamburger.click()
    await page.waitForTimeout(300)
    const menuAfterClose = await page.$('#navbar-mobile-menu')
    const stillVisible = await menuAfterClose?.isVisible()
    if (stillVisible) issues.push('MOBILE_MENU_NOT_CLOSING')
    else console.log('  ✅ Mobile hamburger menu closes correctly')
  } else {
    issues.push('HAMBURGER_BUTTON_NOT_FOUND')
  }

  await ctx.close()
  return issues
}

async function testContactForm(browser) {
  console.log('\n=== TESTING CONTACT FORM ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []

  await page.goto(`${BASE}/contact-us`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  // Check form elements exist
  const hasFirstName = await page.$('input[name=firstName]')
  const hasPhone = await page.$('input[name=phone]')
  const hasEmail = await page.$('input[name=email]')
  const hasSubject = await page.$('select[name=subject]')
  const hasMessage = await page.$('textarea[name=message]')
  const hasSubmit = await page.$('button[type=submit]')

  if (!hasFirstName) issues.push('CONTACT_FORM: firstName field missing')
  if (!hasPhone) issues.push('CONTACT_FORM: phone field missing')
  if (!hasEmail) issues.push('CONTACT_FORM: email field missing')
  if (!hasSubject) issues.push('CONTACT_FORM: subject dropdown missing')
  if (!hasMessage) issues.push('CONTACT_FORM: message field missing')
  if (!hasSubmit) issues.push('CONTACT_FORM: submit button missing')

  // Check product options loaded in select
  if (hasSubject) {
    await page.waitForTimeout(3000) // wait for products to load
    const optionCount = await page.$$eval('select[name=subject] option', opts => opts.length)
    if (optionCount < 3) issues.push(`CONTACT_FORM: product dropdown has only ${optionCount} options (expected 5+)`)
    else console.log(`  ✅ Product dropdown has ${optionCount} options`)
  }

  // Test form validation — empty submit
  if (hasSubmit) {
    await hasSubmit.click()
    await page.waitForTimeout(500)
    const errorMsg = await page.$('[role=alert], .text-red-600')
    if (!errorMsg) issues.push('CONTACT_FORM: no validation error shown on empty submit')
    else console.log('  ✅ Form validation fires on empty submit')
  }

  // Test invalid email validation
  await page.fill('input[name=firstName]', 'Test')
  await page.fill('input[name=phone]', '9876543210')
  await page.fill('input[name=email]', 'not-an-email')
  await page.fill('textarea[name=message]', 'Test message for audit')
  await hasSubmit.click()
  await page.waitForTimeout(500)
  const emailError = await page.textContent('[role=alert], .text-red-600').catch(() => null)
  if (!emailError || !emailError.includes('email')) {
    issues.push('CONTACT_FORM: email validation not catching invalid email')
  } else {
    console.log('  ✅ Email validation catches invalid input')
  }

  await ctx.close()
  return issues
}

async function testKnowledgeHub(browser) {
  console.log('\n=== TESTING KNOWLEDGE HUB ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []

  await page.goto(`${BASE}/knowledge`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  // Count article cards
  const articleCards = await page.$$('a[href^="/knowledge/"]')
  const articleCount = articleCards.length
  console.log(`  Knowledge hub article cards: ${articleCount}`)
  if (articleCount < 12) {
    issues.push(`KNOWLEDGE_HUB: only ${articleCount} articles shown (expected 12)`)
  } else {
    console.log(`  ✅ Knowledge hub shows ${articleCount} articles`)
  }

  // Click first article and verify it loads
  if (articleCards.length > 0) {
    const href = await articleCards[0].getAttribute('href')
    await articleCards[0].click()
    await page.waitForTimeout(2000)
    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
    if (!h1) issues.push(`KNOWLEDGE_ARTICLE: ${href} has no h1`)
    else console.log(`  ✅ Article loads: "${h1.substring(0, 50)}..."`)
  }

  await ctx.close()
  return issues
}

async function testMobileViewport(browser) {
  console.log('\n=== TESTING MOBILE VIEWPORTS ===')
  const viewports = [
    { width: 320, height: 568, label: 'iPhone SE' },
    { width: 375, height: 812, label: 'iPhone 15' },
    { width: 390, height: 844, label: 'iPhone 15 Pro' },
    { width: 768, height: 1024, label: 'iPad' },
  ]
  const issues = []

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: vp })
    const page = await ctx.newPage()

    const errors = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1500)

    // Check for horizontal scroll
    const hasHorzScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    if (hasHorzScroll) {
      const excess = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
      if (excess > 5) issues.push(`HORIZONTAL_SCROLL at ${vp.label}: ${excess}px overflow`)
    }

    // Check sticky mobile CTA bar (should exist on mobile, not iPad)
    if (vp.width <= 414) {
      const mobileBar = await page.$('[role=region][aria-label="Quick contact"]')
      if (!mobileBar) issues.push(`MOBILE_CTA_BAR missing at ${vp.label}`)
      else console.log(`  ✅ Mobile CTA bar present at ${vp.label}`)
    }

    // Check no content overflow clipping
    const hasOverflowIssues = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('h1, h2, p'))
      return els.some(el => {
        const rect = el.getBoundingClientRect()
        return rect.right > window.innerWidth + 10 || rect.left < -10
      })
    })
    if (hasOverflowIssues) issues.push(`CONTENT_OVERFLOW at ${vp.label}`)
    else console.log(`  ✅ No content overflow at ${vp.label}`)

    if (errors.length > 0) {
      const criticalErrors = errors.filter(e => !e.includes('analytics') && !e.includes('gtm'))
      if (criticalErrors.length > 0) {
        issues.push(`CONSOLE_ERRORS at ${vp.label}: ${criticalErrors[0].substring(0, 100)}`)
      }
    }

    await ctx.close()
  }
  return issues
}

async function testProductPages(browser) {
  console.log('\n=== TESTING PRODUCT PAGES ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []

  // Get products from API first
  const productsResp = await fetch(`${BASE}/api/products`).catch(() => null)
  let products = []
  if (productsResp?.ok) {
    const data = await productsResp.json().catch(() => [])
    products = Array.isArray(data) ? data.slice(0, 3) : [] // Test first 3
  }

  if (products.length === 0) {
    issues.push('PRODUCT_PAGES: could not fetch products from API')
  } else {
    console.log(`  Testing ${products.length} product pages...`)
    for (const p of products) {
      const slug = p.slug || p.id || p._id
      if (!slug) continue

      await page.goto(`${BASE}/products/${slug}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
      const hasGallery = await page.$('img[alt]')
      const hasInquiryBtn = await page.$('a[href*="whatsapp"], button:has-text("Inquire"), button:has-text("Quote")')

      if (!h1) issues.push(`PRODUCT_PAGE ${slug}: no h1`)
      if (!hasGallery) issues.push(`PRODUCT_PAGE ${slug}: no product image`)
      if (!hasInquiryBtn) issues.push(`PRODUCT_PAGE ${slug}: no inquiry CTA`)
      else console.log(`  ✅ Product page OK: ${h1?.substring(0,40)}`)
    }
  }

  await ctx.close()
  return issues
}

async function testSEOMetadata(browser) {
  console.log('\n=== TESTING SEO METADATA ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []

  const seoPages = [
    { path: '/', required: ['100x Circle', 'fogging'] },
    { path: '/products', required: ['Products', 'fogging'] },
    { path: '/knowledge/how-thermal-fogging-works', required: ['Thermal Fogging', '100X Circle'] },
    { path: '/knowledge/dengue-prevention-thermal-fogging', required: ['Dengue', 'Fogging'] },
    { path: '/knowledge/malaria-control-fogging-india', required: ['Malaria', 'India'] },
    { path: '/compare/gem-fogging-machines-india', required: ['GeM', 'fogging'] },
  ]

  for (const sp of seoPages) {
    await page.goto(`${BASE}${sp.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1000)

    const title = await page.title()
    const desc = await page.$eval('meta[name=description]', el => el.content).catch(() => '')
    const canonical = await page.$eval('link[rel=canonical]', el => el.href).catch(() => '')
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => '')
    const jsonLdEl = await page.$('script[type="application/ld+json"]')
    const hasJsonLd = !!jsonLdEl

    const missingKeywords = sp.required.filter(kw =>
      !title.toLowerCase().includes(kw.toLowerCase()) &&
      !desc.toLowerCase().includes(kw.toLowerCase())
    )

    if (!title || title.length < 20) issues.push(`SEO ${sp.path}: title too short (${title})`)
    if (!desc || desc.length < 50) issues.push(`SEO ${sp.path}: description too short (${desc?.length} chars)`)
    if (!canonical) issues.push(`SEO ${sp.path}: missing canonical tag`)
    if (!ogTitle) issues.push(`SEO ${sp.path}: missing og:title`)
    if (!hasJsonLd) issues.push(`SEO ${sp.path}: no JSON-LD structured data`)
    if (missingKeywords.length > 0) issues.push(`SEO ${sp.path}: keywords missing: ${missingKeywords.join(', ')}`)
    else console.log(`  ✅ SEO OK: ${sp.path} — "${title.substring(0,50)}"`)
  }

  await ctx.close()
  return issues
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const startTime = Date.now()
  const allIssues = []
  const crawlResults = []

  // PHASE A: Full page crawl
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  PHASE A: FULL PAGE CRAWL                ║')
  console.log('╚══════════════════════════════════════════╝')

  for (const pageInfo of PAGES_TO_TEST) {
    process.stdout.write(`  Testing: ${pageInfo.label}... `)
    const result = await testPage(browser, pageInfo)
    crawlResults.push(result)

    const statusIcon = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️'
    const issueStr = result.issues.length > 0 ? ` [${result.issues.join(', ')}]` : ''
    const errorStr = result.errors.length > 0 ? ` [CONSOLE_ERRORS: ${result.errors.length}]` : ''
    console.log(`${statusIcon} ${result.status}${issueStr}${errorStr}`)

    if (result.issues.length > 0) {
      result.issues.forEach(i => allIssues.push(`${pageInfo.label}: ${i}`))
    }
    if (result.errors.filter(e => !e.includes('analytics') && !e.includes('gtm')).length > 0) {
      allIssues.push(`${pageInfo.label}: CONSOLE_ERRORS: ${result.errors.filter(e => !e.includes('analytics') && !e.includes('gtm')).join(' | ').substring(0,150)}`)
    }
  }

  // PHASE A2: API endpoints
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  PHASE A2: API ENDPOINTS                 ║')
  console.log('╚══════════════════════════════════════════╝')

  for (const ep of API_ENDPOINTS) {
    const result = await testAPI(ep.path, ep.label)
    const icon = result.status === 200 ? '✅' : '❌'
    console.log(`  ${icon} ${ep.label}: HTTP ${result.status}`)
    if (result.status !== 200) allIssues.push(`API ${ep.label}: HTTP ${result.status}`)
    else if (result.body) {
      // Quick sanity: products API should return array
      if (ep.path === '/api/products' && !result.body.startsWith('[')) {
        allIssues.push(`API ${ep.label}: response is not an array`)
      }
      // Sitemap should have content
      if (ep.path === '/sitemap.xml' && !result.body.includes('100xcircle.com')) {
        allIssues.push(`SITEMAP: content looks invalid`)
      }
    }
  }

  // PHASE B: Navigation
  const navIssues = await testNavigation(browser)
  console.log(`  Navigation issues: ${navIssues.length === 0 ? 'NONE ✅' : navIssues.join(', ')}`)
  allIssues.push(...navIssues)

  // PHASE C: Contact form
  const formIssues = await testContactForm(browser)
  console.log(`  Contact form issues: ${formIssues.length === 0 ? 'NONE ✅' : formIssues.join(' | ')}`)
  allIssues.push(...formIssues)

  // PHASE D: Knowledge Hub
  const knowledgeIssues = await testKnowledgeHub(browser)
  console.log(`  Knowledge hub issues: ${knowledgeIssues.length === 0 ? 'NONE ✅' : knowledgeIssues.join(' | ')}`)
  allIssues.push(...knowledgeIssues)

  // PHASE E: Mobile
  const mobileIssues = await testMobileViewport(browser)
  console.log(`  Mobile issues: ${mobileIssues.length === 0 ? 'NONE ✅' : mobileIssues.join(' | ')}`)
  allIssues.push(...mobileIssues)

  // PHASE F: Product pages
  const productIssues = await testProductPages(browser)
  allIssues.push(...productIssues)

  // PHASE G: SEO
  const seoIssues = await testSEOMetadata(browser)
  allIssues.push(...seoIssues)

  await browser.close()

  // ─── REPORT ──────────────────────────────────────────────────────────────
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                    AUDIT SUMMARY REPORT                     ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`\n  Pages tested: ${PAGES_TO_TEST.length}`)
  console.log(`  API endpoints tested: ${API_ENDPOINTS.length}`)
  console.log(`  Duration: ${duration}s`)

  const critical = allIssues.filter(i => i.includes('404') || i.includes('500') || i.includes('LOAD_ERROR') || i.includes('EMPTY_PAGE') || i.includes('MISSING_TITLE'))
  const high = allIssues.filter(i => i.includes('CONSOLE_ERRORS') || i.includes('BROKEN_IMAGES') || i.includes('HYDRATION') || i.includes('MISSING_CANONICAL') || i.includes('MISSING_META'))
  const medium = allIssues.filter(i => !critical.includes(i) && !high.includes(i))

  console.log(`\n  CRITICAL (${critical.length}):`)
  critical.forEach(i => console.log(`    ❌ ${i}`))

  console.log(`\n  HIGH (${high.length}):`)
  high.forEach(i => console.log(`    ⚠️  ${i}`))

  console.log(`\n  MEDIUM/INFO (${medium.length}):`)
  medium.slice(0, 20).forEach(i => console.log(`    ℹ️  ${i}`))
  if (medium.length > 20) console.log(`    ... and ${medium.length - 20} more`)

  console.log(`\n  TOTAL ISSUES: ${allIssues.length}`)

  // HTTP status summary
  const statusCounts = {}
  crawlResults.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1 })
  console.log('\n  HTTP STATUS BREAKDOWN:')
  Object.entries(statusCounts).sort().forEach(([k,v]) => console.log(`    HTTP ${k}: ${v} pages`))

  // SEO metadata summary
  const pagesWithTitle = crawlResults.filter(r => r.title && r.title.length > 10).length
  const pagesWithCanonical = crawlResults.filter(r => r.canonical).length
  const pagesWithDesc = crawlResults.filter(r => r.description && r.description.length > 30).length
  console.log('\n  SEO COVERAGE:')
  console.log(`    Pages with title: ${pagesWithTitle}/${crawlResults.length}`)
  console.log(`    Pages with canonical: ${pagesWithCanonical}/${crawlResults.length}`)
  console.log(`    Pages with meta description: ${pagesWithDesc}/${crawlResults.length}`)

  // Output JSON for further processing
  require('fs').writeFileSync('audit/phase2-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    totalIssues: allIssues.length,
    critical: critical.length,
    high: high.length,
    pages: crawlResults.map(r => ({
      path: r.path, label: r.label, status: r.status,
      title: r.title, h1: r.h1, canonical: r.canonical,
      issues: r.issues, errors: r.errors.slice(0,3)
    })),
    allIssues,
  }, null, 2))

  console.log('\n  Full results saved to audit/phase2-results.json')
  process.exit(allIssues.filter(i => i.includes('404') || i.includes('500')).length > 0 ? 1 : 0)
})()
