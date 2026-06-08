/**
 * Phase 2 — Final verification after fixes
 * Waits for Vercel deploy, then re-checks all critical paths
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

const CRITICAL_PAGES = [
  { path: '/', label: 'Homepage' },
  { path: '/products', label: 'Products Listing' },
  { path: '/knowledge', label: 'Knowledge Hub' },
  { path: '/contact-us', label: 'Contact Us' },
  { path: '/spare-parts', label: 'Spare Parts' },
  { path: '/knowledge/dengue-prevention-thermal-fogging', label: 'Dengue Knowledge Article' },
  { path: '/knowledge/malaria-control-fogging-india', label: 'Malaria Knowledge Article' },
  { path: '/knowledge/thermal-fogging-chemicals-guide', label: 'Chemicals Knowledge Article' },
  { path: '/knowledge/fogging-machine-operators-guide', label: 'Operators Knowledge Article' },
  { path: '/knowledge/fogging-machine-maintenance-guide', label: 'Maintenance Knowledge Article' },
  { path: '/knowledge/fogging-machine-safety-guide', label: 'Safety Knowledge Article' },
  { path: '/knowledge/how-to-choose-fogging-machine', label: 'How to Choose Knowledge Article' },
  { path: '/knowledge/agricultural-fogging-guide', label: 'Agricultural Knowledge Article' },
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  let totalIssues = 0

  console.log('\n═══════════════════════════════════════════')
  console.log('  FINAL VERIFICATION SWEEP')
  console.log('═══════════════════════════════════════════\n')

  for (const pg of CRITICAL_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const failed404 = []
    page.on('response', resp => {
      if (resp.status() === 404 && !resp.url().includes('analytics') && !resp.url().includes('gtm')) {
        failed404.push(resp.url().replace(BASE, '').substring(0, 60))
      }
    })
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 100))
    })

    try {
      const resp = await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 20000 })
      await page.waitForTimeout(1500)

      const status = resp?.status() || 0
      const h1 = await page.$eval('h1', el => el.textContent?.trim().substring(0, 60)).catch(() => null)
      const realErrors = consoleErrors.filter(e => !e.includes('analytics') && !e.includes('tagmanager'))
      const real404s = failed404.filter(u => !u.includes('analytics') && !u.includes('gtm'))

      const issues = []
      if (status !== 200) issues.push(`HTTP_${status}`)
      if (!h1) issues.push('NO_H1')
      if (real404s.length > 0) issues.push(`404: ${real404s.join(' | ')}`)
      if (realErrors.length > 0) issues.push(`CONSOLE: ${realErrors.slice(0,2).join(' | ')}`)

      const icon = issues.length === 0 ? '✅' : '❌'
      console.log(`${icon} ${pg.label} (${status})`)
      if (h1) console.log(`     H1: "${h1}"`)
      if (issues.length > 0) {
        issues.forEach(i => console.log(`     ⚠️  ${i}`))
        totalIssues += issues.length
      }
    } catch (e) {
      console.log(`❌ ${pg.label}: LOAD ERROR — ${e.message}`)
      totalIssues++
    }

    await ctx.close()
  }

  // Test knowledge hub article count
  console.log('\n─── Knowledge Hub Article Count ───')
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page2 = await ctx2.newPage()
  await page2.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle', timeout: 15000 })
  const articleLinks = await page2.$$eval('a[href^="/knowledge/"]', links => links.length)
  const articleTitles = await page2.$$eval('a[href^="/knowledge/"] h2', els => els.map(e => e.textContent?.trim()))
  console.log(`✅ Article cards on /knowledge: ${articleLinks}`)
  articleTitles.forEach(t => console.log(`   • ${t}`))
  await ctx2.close()

  // Test mobile CTA on homepage
  console.log('\n─── Mobile CTA Bar ───')
  const ctxM = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const pageM = await ctxM.newPage()
  await pageM.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await pageM.waitForTimeout(1500)
  const mobileBar = await pageM.$('[role=region][aria-label="Quick contact"]')
  console.log(mobileBar ? '✅ Mobile CTA bar present on mobile' : '❌ Mobile CTA bar MISSING on mobile')
  await ctxM.close()

  // Test contact form — check product dropdown loads
  console.log('\n─── Contact Form ───')
  const ctxC = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageC = await ctxC.newPage()
  await pageC.goto(`${BASE}/contact-us`, { waitUntil: 'networkidle', timeout: 15000 })
  await pageC.waitForTimeout(3000)
  const opts = await pageC.$$eval('select[name=subject] option', o => o.length)
  const hasForm = await pageC.$('form#contact-inquiry-form')
  console.log(hasForm ? '✅ Contact form present' : '❌ Contact form MISSING')
  console.log(opts >= 5 ? `✅ Product dropdown has ${opts} options` : `❌ Product dropdown only ${opts} options`)
  await ctxC.close()

  // Final result
  console.log('\n═══════════════════════════════════════════')
  console.log(`  TOTAL REMAINING ISSUES: ${totalIssues}`)
  console.log('═══════════════════════════════════════════')

  await browser.close()
  process.exit(totalIssues > 0 ? 1 : 0)
})()
