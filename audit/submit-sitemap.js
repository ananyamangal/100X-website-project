/**
 * One-shot GSC sitemap submission script.
 * Reads stored OAuth token from MongoDB, refreshes if needed (requires
 * GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET to be set in env or
 * falls back to direct use if the stored access token is still valid),
 * then PUTs the sitemap to the GSC Sitemaps API.
 *
 * Run: node audit/submit-sitemap.js
 */

// Load .env and .env.local manually (no dotenv dependency)
const fs = require('fs')
function loadEnv(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = val
    }
  } catch { /* file may not exist */ }
}
loadEnv('.env.local')
loadEnv('.env')

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const SITE_URL    = 'https://www.100xcircle.com/'
const SITEMAP_URL = 'https://www.100xcircle.com/sitemap.xml'

;(async () => {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1) }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  // Get stored OAuth tokens
  const doc = await db.collection('google_oauth_tokens').findOne({ _docId: 'google-oauth-singleton' })
  if (!doc?.refreshToken) {
    console.error('No Google OAuth tokens in MongoDB. Connect a Google account first.')
    await client.close()
    process.exit(1)
  }

  let accessToken = doc.accessToken
  const expiresAt = new Date(doc.expiresAt).getTime()
  const nowMs = Date.now()

  // Try to refresh if expired and credentials are available
  if (nowMs >= expiresAt - 5 * 60 * 1000) {
    const clientId     = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim()
    const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()
    if (clientId && clientSecret) {
      console.log('Access token near-expiry — refreshing...')
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: doc.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
      })
      if (!refreshRes.ok) {
        const e = await refreshRes.text()
        console.error('Token refresh failed:', e)
        // Try with existing token anyway
      } else {
        const refreshed = await refreshRes.json()
        accessToken = refreshed.access_token
        const newExpiry = new Date(nowMs + refreshed.expires_in * 1000).toISOString()
        await db.collection('google_oauth_tokens').updateOne(
          { _docId: 'google-oauth-singleton' },
          { $set: { accessToken, expiresAt: newExpiry, updatedAt: new Date().toISOString() } }
        )
        console.log('Token refreshed successfully.')
      }
    } else {
      console.log('No OAuth client credentials in local env — attempting with stored access token.')
    }
  } else {
    console.log(`Access token valid until ${new Date(expiresAt).toISOString()}.`)
  }

  await client.close()

  // Submit sitemap via GSC Sitemaps API
  const encodedSite    = encodeURIComponent(SITE_URL)
  const encodedSitemap = encodeURIComponent(SITEMAP_URL)
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`

  console.log(`\nSubmitting sitemap...`)
  console.log(`  Site:    ${SITE_URL}`)
  console.log(`  Sitemap: ${SITEMAP_URL}`)
  console.log(`  API:     ${apiUrl}`)

  const timestamp = new Date().toISOString()
  const submitRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': '0',
    },
  })

  console.log(`\nTimestamp: ${timestamp}`)
  console.log(`HTTP status: ${submitRes.status} ${submitRes.statusText}`)

  let responseBody = ''
  try { responseBody = await submitRes.text() } catch { /* empty body */ }

  if (submitRes.status === 200 || submitRes.status === 204) {
    console.log('\n✅ SITEMAP SUBMITTED SUCCESSFULLY')
    console.log(`   GSC property: ${SITE_URL}`)
    console.log(`   Sitemap URL:  ${SITEMAP_URL}`)
    console.log(`   Response:     HTTP ${submitRes.status}${responseBody ? ' — ' + responseBody.slice(0, 200) : ' (no body — success)'}`)
  } else {
    console.log(`\n❌ SUBMISSION FAILED`)
    console.log(`   Status: ${submitRes.status}`)
    console.log(`   Body:   ${responseBody.slice(0, 500)}`)
    process.exit(1)
  }
})()
