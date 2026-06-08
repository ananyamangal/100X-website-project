/**
 * FINAL SEO AUDIT — titles, descriptions, canonicals, schemas, H1s
 */
const { chromium } = require('playwright')
const BASE = 'https://www.100xcircle.com'

const ALL_PAGES = [
  { path: '/', label: 'Homepage', requiresH1: true },
  { path: '/products', label: 'Products', requiresH1: true },
  { path: '/about', label: 'About', requiresH1: true },
  { path: '/contact-us', label: 'Contact', requiresH1: true },
  { path: '/blog', label: 'Blog', requiresH1: true },
  { path: '/spare-parts', label: 'Spare Parts', requiresH1: true },
  { path: '/knowledge', label: 'Knowledge Hub', requiresH1: true },
  { path: '/compare', label: 'Compare', requiresH1: true },
  { path: '/videos', label: 'Videos', requiresH1: true },
  { path: '/deployments', label: 'Deployments', requiresH1: true },
  { path: '/case-studies', label: 'Case Studies', requiresH1: true },
  { path: '/factory', label: 'Factory', requiresH1: true },
  { path: '/vehicle-mounted-fogging-machine', label: 'Vehicle Mounted LP', requiresH1: true },
  { path: '/power-tiller', label: 'Power Tiller LP', requiresH1: true },
  { path: '/gem-approved-fogging-machine-oem', label: 'GeM OEM LP', requiresH1: true },
  { path: '/knowledge/how-thermal-fogging-works', label: 'K: How Fogging Works', requiresH1: true },
  { path: '/knowledge/dengue-prevention-thermal-fogging', label: 'K: Dengue', requiresH1: true },
  { path: '/knowledge/malaria-control-fogging-india', label: 'K: Malaria', requiresH1: true },
  { path: '/knowledge/agricultural-fogging-guide', label: 'K: Agriculture', requiresH1: true },
  { path: '/knowledge/thermal-fogging-chemicals-guide', label: 'K: Chemicals', requiresH1: true },
  { path: '/knowledge/fogging-machine-operators-guide', label: 'K: Operators', requiresH1: true },
  { path: '/knowledge/fogging-machine-maintenance-guide', label: 'K: Maintenance', requiresH1: true },
  { path: '/knowledge/fogging-machine-safety-guide', label: 'K: Safety', requiresH1: true },
  { path: '/knowledge/how-to-choose-fogging-machine', label: 'K: How to Choose', requiresH1: true },
  { path: '/knowledge/government-procurement-guide', label: 'K: GeM Guide', requiresH1: true },
  { path: '/compare/gem-fogging-machines-india', label: 'Compare: GeM', requiresH1: true },
  { path: '/compare/100x-circle-vs-korean-fogging-machines', label: 'Compare: vs Korean', requiresH1: true },
  { path: '/privacy-policy', label: 'Privacy Policy', requiresH1: true },
  { path: '/return-policy', label: 'Return Policy', requiresH1: true },
  { path: '/warranty-policy', label: 'Warranty Policy', requiresH1: true },
]

async function checkPage(browser, { path, label, requiresH1 }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const result = { path, label, issues: [], pass: [] }

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2500)

    // Title
    const title = await page.title()
    if (!title || title.length < 20) result.issues.push(`title too short: "${title}"`)
    else if (title.length > 70) result.issues.push(`title too long (${title.length} chars)`)
    else result.pass.push(`title: "${title.substring(0,55)}"`)

    // Meta description
    const desc = await page.$eval('meta[name=description]', el => el.content).catch(() => null)
    if (!desc) result.issues.push('missing meta description')
    else if (desc.length < 50) result.issues.push(`meta description too short (${desc.length} chars)`)
    else if (desc.length > 165) result.issues.push(`meta description too long (${desc.length} chars)`)
    else result.pass.push(`desc: ${desc.length} chars`)

    // Canonical
    const canonical = await page.$eval('link[rel=canonical]', el => el.href).catch(() => null)
    if (!canonical) result.issues.push('missing canonical')
    else result.pass.push(`canonical: ${canonical}`)

    // OG tags
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null)
    if (!ogTitle) result.issues.push('missing og:title')
    else result.pass.push('og:title OK')

    // H1 count
    const h1s = await page.$$eval('h1', els => els.map(e => e.textContent?.trim()).filter(Boolean))
    if (requiresH1 && h1s.length === 0) result.issues.push('NO H1 TAG')
    else if (h1s.length > 1) result.issues.push(`MULTIPLE H1s (${h1s.length}): ${h1s.join(' | ').substring(0,100)}`)
    else if (h1s.length === 1) result.pass.push(`h1: "${h1s[0].substring(0,50)}"`)

    // JSON-LD structured data
    const ldScripts = await page.$$eval('script[type="application/ld+json"]', scripts =>
      scripts.map(s => { try { return JSON.parse(s.textContent)['@type'] } catch { return null } }).filter(Boolean)
    )
    if (ldScripts.length === 0) result.issues.push('no JSON-LD structured data')
    else result.pass.push(`schema: ${ldScripts.join(', ')}`)

    // Placeholder content detection
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000))
    const placeholders = ['TODO', 'PLACEHOLDER', 'lorem ipsum', 'H1 Title', 'Enter description', 'Coming soon']
    const foundPlaceholders = placeholders.filter(p => bodyText.toLowerCase().includes(p.toLowerCase()))
    if (foundPlaceholders.length > 0) result.issues.push(`PLACEHOLDER CONTENT: ${foundPlaceholders.join(', ')}`)

  } catch (e) {
    result.issues.push(`LOAD_ERROR: ${e.message.substring(0, 80)}`)
  }

  await ctx.close()
  return result
}

;(async () => {
  const browser = await chromium.launch({ headless: true })

  console.log('\n╔════════════════════════════════════════╗')
  console.log('║         FULL SEO AUDIT                 ║')
  console.log('╚════════════════════════════════════════╝\n')

  const failed = []
  const passed = []

  for (const pageInfo of ALL_PAGES) {
    process.stdout.write(`  Checking: ${pageInfo.label}... `)
    const r = await checkPage(browser, pageInfo)
    if (r.issues.length === 0) {
      console.log(`✅`)
      passed.push(r)
    } else {
      console.log(`❌ ${r.issues.join(' | ')}`)
      failed.push(r)
    }
  }

  // Also check product pages from API
  console.log('\n  Checking product pages from API...')
  const prods = await fetch(`${BASE}/api/products`).then(r => r.json()).catch(() => [])
  let productH1Issues = 0
  for (const p of prods.slice(0, 5)) {
    const slug = p.slug || p.id || p._id
    if (!slug) continue
    const r = await checkPage(browser, { path: `/products/${slug}`, label: `Product: ${p.name?.substring(0,30)}`, requiresH1: true })
    if (r.issues.some(i => i.includes('H1') || i.includes('title') || i.includes('canonical'))) {
      console.log(`  ❌ /products/${slug}: ${r.issues.filter(i => i.includes('H1') || i.includes('title') || i.includes('canonical') || i.includes('PLACEHOLDER')).join(', ')}`)
      productH1Issues++
      failed.push(r)
    } else {
      passed.push(r)
    }
  }

  await browser.close()

  console.log('\n─── SEO AUDIT SUMMARY ───')
  console.log(`  Pages passed: ${passed.length}`)
  console.log(`  Pages with issues: ${failed.length}`)
  console.log('\n  Issues requiring fix:')
  failed.forEach(r => {
    if (r.issues.some(i => i.includes('H1') || i.includes('title') || i.includes('canonical') || i.includes('PLACEHOLDER'))) {
      console.log(`  ❌ ${r.label} (${r.path}): ${r.issues.join(' | ')}`)
    }
  })
  console.log('\n  Minor issues (length/OG):')
  failed.forEach(r => {
    if (!r.issues.some(i => i.includes('H1') || i.includes('title too short') || i.includes('canonical') || i.includes('PLACEHOLDER'))) {
      console.log(`  ⚠️  ${r.label}: ${r.issues.join(' | ')}`)
    }
  })
})()
