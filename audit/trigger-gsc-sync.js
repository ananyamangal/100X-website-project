/**
 * Trigger a fresh GSC sync by calling the cron endpoint.
 * The cron endpoint is protected — we call it with Vercel's internal cron header.
 * Requires CRON_SECRET env var (set in Vercel env, may not be local).
 * Fallback: call the admin sync endpoint if a session token is available.
 *
 * Run: node audit/trigger-gsc-sync.js
 */

const fs = require('fs')
function loadEnv(p) {
  try {
    fs.readFileSync(p,'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0,eq).trim(), v = t.slice(eq+1).trim().replace(/^["']|["']$/g,'')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')

const BASE_URL     = 'https://www.100xcircle.com'
const CRON_SECRET  = process.env.CRON_SECRET
const SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN  // optional — if set, use admin endpoint

;(async () => {
  console.log('\n' + '='.repeat(72))
  console.log('GSC SYNC TRIGGER')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(72))

  // ── Attempt 1: cron endpoint with CRON_SECRET ─────────────────────────────
  if (CRON_SECRET) {
    console.log('\n[1] Trying cron endpoint with CRON_SECRET...')
    const r = await fetch(`${BASE_URL}/api/admin/growth/cron/gsc-sync`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    const body = await r.text().catch(() => '')
    console.log(`    HTTP ${r.status}`)
    console.log(`    ${body.slice(0, 500)}`)
    if (r.ok) { console.log('\n✅ Sync triggered via cron endpoint.'); return }
  } else {
    console.log('\n[1] CRON_SECRET not set — skipping cron endpoint.')
  }

  // ── Attempt 2: admin sync endpoint via session token ──────────────────────
  if (SESSION_TOKEN) {
    console.log('\n[2] Trying admin sync endpoint with SESSION_TOKEN...')
    const r = await fetch(`${BASE_URL}/api/admin/gsc/sync`, {
      method: 'POST',
      headers: { Cookie: `session=${SESSION_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const body = await r.text().catch(() => '')
    console.log(`    HTTP ${r.status}`)
    console.log(`    ${body.slice(0, 500)}`)
    if (r.ok) { console.log('\n✅ Sync triggered via admin endpoint.'); return }
  } else {
    console.log('\n[2] ADMIN_SESSION_TOKEN not set — skipping admin endpoint.')
  }

  // ── Attempt 3: unauthenticated (will get 401, but confirms route is live) ─
  console.log('\n[3] Probing sync route availability (unauthenticated)...')
  const r = await fetch(`${BASE_URL}/api/admin/gsc/sync`, { method: 'POST' })
  console.log(`    HTTP ${r.status} — ${r.status === 401 ? 'route exists, auth required' : r.statusText}`)

  console.log('\n─────────────────────────────────────────────────────────────')
  console.log('RESULT: Cannot trigger sync from local script.')
  console.log('')
  console.log('The sync endpoint requires an authenticated admin session cookie.')
  console.log('The cron endpoint requires the CRON_SECRET env var (Vercel-only).')
  console.log('')
  console.log('TO RUN SYNC NOW — choose one:')
  console.log('')
  console.log('  Option A (admin panel):')
  console.log('    100xcircle.com/admin → Growth OS → SEO → Search Console → "Sync Now"')
  console.log('')
  console.log('  Option B (Vercel cron trigger — one-click):')
  console.log('    Vercel Dashboard → 100xcircle → Settings → Crons')
  console.log('    Click "Run" next to /api/admin/growth/cron/gsc-sync')
  console.log('')
  console.log('NOTE: Sync will still fail (no-op) if OAuth is revoked.')
  console.log('Reconnect OAuth first: admin → Growth OS → SEO → Search Console → Connect Google Account')
  console.log('')
})()
