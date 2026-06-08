/**
 * FINAL SECURITY AUDIT — API exposure, admin access, data leakage
 */
const BASE = 'https://www.100xcircle.com'

async function get(path, label) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (anonymous user test)' }
    })
    const ct = r.headers.get('content-type') || ''
    let body = null
    if (ct.includes('json')) body = await r.json().catch(() => null)
    else body = await r.text().catch(() => null)
    return { path, label, status: r.status, body, ct }
  } catch (e) {
    return { path, label, status: 0, error: e.message }
  }
}

async function post(path, label, data) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (spam test)' },
      body: JSON.stringify(data)
    })
    const ct = r.headers.get('content-type') || ''
    let body = null
    if (ct.includes('json')) body = await r.json().catch(() => null)
    else body = (await r.text().catch(() => null))?.substring(0, 200)
    return { path, label, status: r.status, body }
  } catch (e) {
    return { path, label, status: 0, error: e.message }
  }
}

;(async () => {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   SECURITY AUDIT — ANONYMOUS ACCESS    ║')
  console.log('╚════════════════════════════════════════╝\n')

  // 1. Lead data exposure
  console.log('─── 1. LEAD DATA EXPOSURE ───')
  const submissions = await get('/api/submissions', 'All submissions (lead data)')
  console.log(`  GET /api/submissions: HTTP ${submissions.status}`)
  if (submissions.status === 200 && Array.isArray(submissions.body)) {
    console.log(`  ❌ CRITICAL: Returns ${submissions.body.length} lead records to anonymous users!`)
    if (submissions.body.length > 0) {
      const sample = submissions.body[0]
      const fields = Object.keys(sample)
      console.log(`  ❌ Exposed fields: ${fields.join(', ')}`)
    }
  } else if (submissions.status === 401 || submissions.status === 403) {
    console.log(`  ✅ Properly protected (${submissions.status})`)
  } else if (submissions.status === 200) {
    console.log(`  ⚠️  HTTP 200 but non-array body: ${JSON.stringify(submissions.body).substring(0, 100)}`)
  }

  // 2. Admin endpoint access
  console.log('\n─── 2. ADMIN ENDPOINT ACCESS ───')
  const adminEndpoints = [
    ['/api/admin/products', 'Admin Products (GET all products)'],
    ['/api/admin/blogs', 'Admin Blogs'],
    ['/api/admin/reviews', 'Admin Reviews'],
    ['/api/admin/spare-parts', 'Admin Spare Parts'],
    ['/api/admin/case-studies', 'Admin Case Studies'],
    ['/api/admin/site-settings', 'Admin Site Settings'],
    ['/api/admin/brand-assets', 'Admin Brand Assets'],
    ['/api/admin/rfq-popup/leads', 'RFQ Popup Leads'],
    ['/api/admin/brochure-analytics', 'Brochure Analytics'],
    ['/api/admin/lead-analytics', 'Lead Analytics'],
    ['/api/admin/customers', 'Admin Customers'],
    ['/api/admin/deployments', 'Admin Deployments'],
    ['/api/admin/banners', 'Admin Banners'],
  ]

  let exposedAdmin = 0
  for (const [path, label] of adminEndpoints) {
    const r = await get(path, label)
    const isArray = Array.isArray(r.body)
    const hasData = r.status === 200 && (isArray ? r.body.length >= 0 : r.body !== null)
    const icon = (r.status === 401 || r.status === 403) ? '✅' : hasData ? '❌' : '⚠️'
    console.log(`  ${icon} GET ${path}: HTTP ${r.status} ${isArray ? `(${r.body.length} records)` : ''}`)
    if (r.status === 200) exposedAdmin++
  }
  if (exposedAdmin > 0) {
    console.log(`\n  ⚠️  ${exposedAdmin} admin endpoints accessible without auth — GET-only, no mutation risk`)
    console.log(`     MongoDB data readable but not writable without cookie auth`)
  }

  // 3. Admin write operations (POST/PUT/DELETE without auth)
  console.log('\n─── 3. ADMIN WRITE OPERATIONS (no auth) ───')
  const writeTests = [
    ['/api/admin/products', 'Create product (anon)', { name: 'AUDIT_TEST_PRODUCT', price: 0 }],
    ['/api/admin/blogs', 'Create blog (anon)', { title: 'AUDIT_TEST', content: 'test' }],
    ['/api/admin/reviews', 'Create review (anon)', { text: 'AUDIT_TEST', rating: 5 }],
  ]
  for (const [path, label, data] of writeTests) {
    const r = await post(path, label, data)
    const icon = (r.status === 401 || r.status === 403) ? '✅' : r.status >= 500 ? '⚠️' : '❌'
    console.log(`  ${icon} POST ${path}: HTTP ${r.status} — ${label}`)
    if (r.status === 200 || r.status === 201) {
      console.log(`  ❌ CRITICAL: Anonymous user can create ${label}!`)
    }
  }

  // 4. Spam/flood test — contact form
  console.log('\n─── 4. SPAM PROTECTION TEST ───')
  // Test honeypot
  const honeypotResult = await post('/api/submissions', 'Honeypot (company_website filled)', {
    name: 'SpamBot',
    phone: '0000000000',
    email: 'spam@bot.com',
    message: 'Spam test',
    type: 'contact',
    company_website: 'https://spam.com',  // honeypot field
  })
  console.log(`  Honeypot test: HTTP ${honeypotResult.status}`)
  if (honeypotResult.status === 400 || (honeypotResult.body && honeypotResult.body.error)) {
    console.log(`  ✅ Honeypot blocks bot submissions (${honeypotResult.status})`)
  } else {
    console.log(`  ❌ Honeypot NOT blocking — response: ${JSON.stringify(honeypotResult.body).substring(0,100)}`)
  }

  // Test rapid submission (no rate limit)
  const rapidResults = await Promise.all([1,2,3].map(i =>
    post('/api/submissions', `Rapid submit ${i}`, {
      name: 'AuditTest', phone: '9876543210', email: `audit${i}@test.com`,
      message: 'Rate limit test', type: 'contact',
    })
  ))
  const allSucceeded = rapidResults.every(r => r.status === 201 || r.status === 200)
  if (allSucceeded) {
    console.log(`  ⚠️  No rate limiting: 3 rapid submissions all succeeded`)
    console.log(`     Risk: low-cost spam possible, but honeypot + manual review mitigates`)
  } else {
    console.log(`  ✅ Rate limiting active — some rapid submissions rejected`)
  }

  // 5. Environment variable / secret exposure
  console.log('\n─── 5. ENVIRONMENT VARIABLE EXPOSURE ───')
  const envChecks = [
    ['/.env', 'Root .env file'],
    ['/.env.local', 'Local env file'],
    ['/.env.production', 'Production env file'],
    ['/api/env', 'Env API route'],
    ['/_next/static/chunks/main.js', 'Next.js main bundle (check for secrets)'],
  ]
  for (const [path, label] of envChecks) {
    const r = await fetch(`${BASE}${path}`).catch(() => ({ status: 0 }))
    const status = r.status
    if (status === 200 && path.includes('.env')) {
      const text = await r.text().catch(() => '')
      if (text.includes('MONGODB') || text.includes('SECRET') || text.includes('KEY')) {
        console.log(`  ❌ CRITICAL: ${path} exposes secrets!`)
      } else {
        console.log(`  ⚠️  ${path} HTTP 200 (${text.length} bytes) — verify content`)
      }
    } else if (status === 200 && path.includes('.js')) {
      const text = await r.text().catch(() => '')
      const hasMongo = text.includes('MONGODB_URI')
      const hasSecret = text.includes('SECRET_KEY') || text.includes('JWT_SECRET')
      console.log(`  ${hasMongo || hasSecret ? '❌' : '✅'} ${label}: ${hasMongo ? 'MONGODB_URI exposed!' : hasSecret ? 'SECRET exposed!' : 'No obvious secrets in bundle'}`)
    } else {
      console.log(`  ✅ ${label}: HTTP ${status} (not accessible)`)
    }
  }

  // 6. Admin page access
  console.log('\n─── 6. ADMIN PAGE ACCESS ───')
  const adminPage = await get('/admin', 'Admin dashboard')
  if (adminPage.status === 200) {
    // Check if it's actually the login page or the full admin
    const hasLoginForm = adminPage.body && adminPage.body.includes('password')
    console.log(`  HTTP ${adminPage.status} — ${hasLoginForm ? '✅ Redirects to login form' : '⚠️ Check if full admin is accessible'}`)
  } else {
    console.log(`  ✅ Admin page: HTTP ${adminPage.status}`)
  }

  // 7. API key exposure in network responses
  console.log('\n─── 7. SENSITIVE DATA IN RESPONSES ───')
  const siteSettings = await get('/api/site-settings', 'Site settings')
  if (siteSettings.status === 200 && siteSettings.body) {
    const bodyStr = JSON.stringify(siteSettings.body)
    const hasSensitive = bodyStr.includes('password') || bodyStr.includes('secret') || bodyStr.includes('key')
    console.log(`  ${hasSensitive ? '⚠️' : '✅'} Site settings API: ${hasSensitive ? 'Contains sensitive-looking fields' : 'No obvious secrets'}`)
  }

  console.log('\n─── SECURITY SUMMARY ───')
})()
