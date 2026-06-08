/**
 * DATABASE CONTENT AUDIT + REVENUE JOURNEY TESTING
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

async function contentAudit() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║       DATABASE CONTENT AUDIT           ║')
  console.log('╚════════════════════════════════════════╝\n')

  // Products
  const products = await fetch(`${BASE}/api/products`).then(r => r.json()).catch(() => [])
  console.log(`─── PRODUCTS (${products.length} total) ───`)
  let prodIssues = 0
  for (const p of products) {
    const issues = []
    if (!p.name || p.name === 'H1 Title' || p.name === 'Product Name') issues.push('PLACEHOLDER_NAME: ' + p.name)
    if (!p.imageUrls?.length && !p.imageUrl) issues.push('NO_IMAGES')
    if (!p.description && !p.shortDescription) issues.push('NO_DESCRIPTION')
    if (!p.slug) issues.push('NO_SEO_SLUG')
    if (issues.length > 0) {
      console.log(`  ❌ "${p.name}" (${p._id}): ${issues.join(', ')}`)
      prodIssues++
    }
  }
  if (prodIssues === 0) console.log(`  ✅ All ${products.length} products have name, images, description`)
  else console.log(`  ⚠️  ${prodIssues}/${products.length} products have content issues`)

  // Spare Parts
  const parts = await fetch(`${BASE}/api/spare-parts`).then(r => r.json()).catch(() => [])
  console.log(`\n─── SPARE PARTS (${parts.length} total) ───`)
  let partsIssues = 0
  const partsWithExternalImgs = []
  for (const p of parts) {
    const issues = []
    if (!p.name) issues.push('NO_NAME')
    if (!p.images?.length) issues.push('NO_IMAGES')
    else {
      const extImgs = p.images.filter(img => img && !img.includes('cloudinary') && !img.includes('100xcircle') && img.startsWith('http'))
      if (extImgs.length > 0) partsWithExternalImgs.push({ name: p.name, imgs: extImgs })
    }
    if (issues.length > 0) { console.log(`  ❌ "${p.name}": ${issues.join(', ')}`); partsIssues++ }
  }
  if (partsIssues === 0) console.log(`  ✅ All ${parts.length} spare parts have required content`)
  if (partsWithExternalImgs.length > 0) {
    console.log(`  ⚠️  ${partsWithExternalImgs.length} parts have external (non-Cloudinary) image URLs:`)
    partsWithExternalImgs.slice(0, 5).forEach(p => console.log(`    "${p.name}": ${p.imgs[0].substring(0, 80)}`))
  }

  // Check case studies via API
  const cases = await fetch(`${BASE}/api/case-studies`).then(r => r.json()).catch(() => [])
  console.log(`\n─── CASE STUDIES (${cases.length} DB + hardcoded) ───`)
  if (cases.length === 0) console.log(`  ℹ️  No DB case studies (page uses hardcoded data — acceptable)`)
  else {
    for (const c of cases) {
      if (!c.title || !c.description) console.log(`  ❌ Case study missing title/desc: ${c._id}`)
    }
  }
}

async function revenueJourneys() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║       REVENUE JOURNEY TESTING          ║')
  console.log('╚════════════════════════════════════════╝\n')

  const browser = await chromium.launch({ headless: true })
  const results = []

  // JOURNEY 1: Visitor → Products → Product Detail → RFQ Ribbon
  console.log('─── JOURNEY 1: Visitor → Products → Product → RFQ ───')
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const steps = []

    await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)

    // Find first product card
    const productLink = await page.$('a[href^="/products/"]')
    if (productLink) {
      const href = await productLink.getAttribute('href')
      steps.push(`✅ Found product link: ${href}`)
      await productLink.click()
      await page.waitForTimeout(3000)

      const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
      steps.push(h1 ? `✅ Product page loaded: "${h1.substring(0,50)}"` : '❌ Product page: no H1')

      // Check RFQ ribbon exists
      const rfqBtn = await page.$('button[data-gtm="rfq_ribbon_open"], button[aria-label*="RFQ"]')
      steps.push(rfqBtn ? '✅ RFQ ribbon button present' : '❌ RFQ ribbon button MISSING')

      // Click RFQ ribbon
      if (rfqBtn) {
        await rfqBtn.click()
        await page.waitForTimeout(1000)
        const modal = await page.$('[role=dialog]')
        steps.push(modal ? '✅ RFQ modal opens' : '❌ RFQ modal did NOT open')

        if (modal) {
          // Check form fields in RFQ modal
          const hasProduct = await page.$('select, [data-slot="select"]')
          const hasName = await page.$('input[name=name], input[placeholder*="name"]')
          const hasPhone = await page.$('input[type=tel]')
          steps.push(hasName ? '✅ RFQ form has name field' : '❌ RFQ form: missing name')
          steps.push(hasPhone ? '✅ RFQ form has phone field' : '❌ RFQ form: missing phone')

          // Close
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          const afterEsc = await page.$('[role=dialog][aria-label="RFQ / Tender Inquiry"]')
          steps.push(!afterEsc ? '✅ ESC closes RFQ modal' : '❌ ESC did not close RFQ modal')
        }
      }

      // WhatsApp CTA
      const waLink = await page.$('a[href*="wa.me"]')
      steps.push(waLink ? '✅ WhatsApp CTA present' : '❌ WhatsApp CTA MISSING')

    } else {
      steps.push('❌ No product links found on /products')
    }

    steps.forEach(s => console.log(`  ${s}`))
    results.push({ journey: 'Visitor → Products → Product → RFQ', steps })
    await ctx.close()
  }

  // JOURNEY 2: Visitor → Knowledge Article → Contact CTA
  console.log('\n─── JOURNEY 2: Knowledge Article → Inquiry ───')
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const steps = []

    await page.goto(`${BASE}/knowledge/dengue-prevention-thermal-fogging`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)

    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
    steps.push(h1 ? `✅ Article loaded: "${h1.substring(0,50)}"` : '❌ Article: no H1')

    // Check for internal links to products/contact
    const ctaLinks = await page.$$eval('a[href*="/contact"], a[href*="/products"], a[href*="wa.me"]', links =>
      links.map(l => ({ text: l.textContent?.trim().substring(0, 40), href: l.getAttribute('href') })).slice(0, 5)
    )
    steps.push(ctaLinks.length > 0 ? `✅ ${ctaLinks.length} CTAs/links to conversion: ${ctaLinks.map(l => l.text).join(', ')}` : '❌ No CTAs to contact/products')

    // Check related resources section
    const relatedLinks = await page.$$('a[href^="/knowledge/"], a[href^="/compare/"]')
    steps.push(relatedLinks.length > 0 ? `✅ ${relatedLinks.length} related resource links` : '⚠️  No related resource links')

    // Navigate to contact via CTA
    const contactCta = await page.$('a[href*="/contact-us"]')
    if (contactCta) {
      await contactCta.click()
      await page.waitForTimeout(2000)
      const contactH1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
      steps.push(contactH1 ? `✅ Contact page reached: "${contactH1.substring(0,40)}"` : '❌ Contact page did not load')
    }

    steps.forEach(s => console.log(`  ${s}`))
    results.push({ journey: 'Knowledge Article → Inquiry', steps })
    await ctx.close()
  }

  // JOURNEY 3: Mobile user → Homepage → Product → WhatsApp
  console.log('\n─── JOURNEY 3: Mobile → Homepage → Product → WhatsApp ───')
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await ctx.newPage()
    const steps = []

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)

    // Check mobile CTA bar
    const mobileCta = await page.$('[role=region][aria-label="Quick contact"]')
    steps.push(mobileCta ? '✅ Mobile CTA bar present' : '❌ Mobile CTA bar MISSING')

    // Find WhatsApp in mobile bar
    const waBtn = await page.$('a[href*="wa.me"][data-gtm="cta_whatsapp"]')
    steps.push(waBtn ? '✅ WhatsApp button in mobile bar' : '❌ WhatsApp button MISSING from mobile bar')

    // Phone call button
    const callBtn = await page.$('a[href^="tel:"]')
    steps.push(callBtn ? '✅ Phone call button present' : '❌ Phone button MISSING')

    // Navigate to a product
    const prodLink = await page.$('a[href^="/products/"]')
    if (prodLink) {
      await prodLink.click()
      await page.waitForTimeout(3000)
      const pName = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
      steps.push(pName ? `✅ Product page: "${pName.substring(0,40)}"` : '❌ Product page: no H1')

      // WhatsApp CTA still visible?
      const waOnProduct = await page.$('a[href*="wa.me"]')
      steps.push(waOnProduct ? '✅ WhatsApp CTA on product page (mobile)' : '❌ WhatsApp CTA MISSING on product (mobile)')
    }

    steps.forEach(s => console.log(`  ${s}`))
    await ctx.close()
  }

  // JOURNEY 4: Brochure download
  console.log('\n─── JOURNEY 4: Brochure Download Flow ───')
  {
    const brochureApi = await fetch(`${BASE}/api/brochure`).then(r => r.json()).catch(() => null)
    if (!brochureApi?.hasBrochure) {
      console.log('  ⚠️  No brochure uploaded — download flow requires admin to upload brochure PDF')
    } else {
      console.log(`  ✅ Brochure available: ${brochureApi.filename || 'main-brochure.pdf'}`)
      const dlResp = await fetch(`${BASE}/api/brochure/download`)
      console.log(`  ${dlResp.status === 200 ? '✅' : '❌'} Download endpoint: HTTP ${dlResp.status}`)
      if (dlResp.ok) {
        const ct = dlResp.headers.get('content-type')
        console.log(`  ✅ Content-Type: ${ct}`)
      }
    }
  }

  // JOURNEY 5: Compare page → contact
  console.log('\n─── JOURNEY 5: Compare Guide → Contact ───')
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/compare/gem-fogging-machines-india`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)
    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
    const contactLinks = await page.$$eval('a[href*="contact"]', links => links.length)
    const waLinks = await page.$$eval('a[href*="wa.me"]', links => links.length)
    console.log(`  ${h1 ? '✅' : '❌'} Page loaded: "${h1?.substring(0,50)}"`)
    console.log(`  ${contactLinks > 0 ? '✅' : '❌'} Contact CTAs: ${contactLinks}`)
    console.log(`  ${waLinks > 0 ? '✅' : '❌'} WhatsApp CTAs: ${waLinks}`)
    await ctx.close()
  }

  await browser.close()
}

;(async () => {
  await contentAudit()
  await revenueJourneys()
})()
