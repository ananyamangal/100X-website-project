/**
 * Dealer Audience Verification Report
 * Pre-production validation for Customer Match Export Engine.
 *
 * Tests:
 *   1. Full quality metrics (totals, email, phone, both, neither, match rate)
 *   2. Phone normalization — 100-record spot-check
 *   3. SHA-256 hashing — correctness + format
 *   4. CSV export format — header, column count, hash length, no plain-text PII
 *   5. Google Ads schema — live API call with 5 sample records
 *
 * Returns PASS / FAIL at the end.
 */

import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const envLines = readFileSync(resolve(__dirname, '.env.local'), 'utf-8').split('\n')
  for (const line of envLines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
} catch { /* rely on system env if .env.local absent */ }

const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'
const ADS_API   = 'https://googleads.googleapis.com/v24'
const OAUTH_URL = 'https://oauth2.googleapis.com/token'
const DOC_ID    = 'google-oauth-singleton'
const SETTINGS_DOC_ID = 'ads-settings'

// ── Core logic (mirrors customer-match-engine.ts exactly) ─────────────────────

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')
}

function normalizePhone(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10)                              return `+91${digits}`
  if (digits.startsWith('91') && digits.length === 12)  return `+${digits}`
  if (digits.startsWith('0')  && digits.length === 11)  return `+91${digits.slice(1)}`
  if (digits.length >= 11)                               return `+${digits}`
  return ''
}

function buildDealerRecord(d) {
  const nameParts = String(d.name || '').trim().split(/\s+/)
  const email     = String(d.email || '').toLowerCase().trim()
  const phone     = normalizePhone(String(d.phone || ''))
  return {
    recordId:     String(d._id),
    firstName:    nameParts[0] || '',
    lastName:     nameParts.slice(1).join(' '),
    email,
    phone,
    company:      String(d.company || ''),
    city:         String(d.city || ''),
    state:        String(d.state || ''),
    country:      'IN',
    postalCode:   String(d.pincode || ''),
    source:       'crm_dealers',
    missingEmail: !email,
    missingPhone: !phone,
    _raw: { name: d.name, email: d.email, phone: d.phone },
  }
}

function computeQualityScore(records) {
  const withEmail    = records.filter(r => r.email).length
  const withPhone    = records.filter(r => r.phone).length
  const withBoth     = records.filter(r => r.email && r.phone).length
  const missingEmail = records.filter(r => !r.email).length
  const missingPhone = records.filter(r => !r.phone).length
  const missingBoth  = records.filter(r => !r.email && !r.phone).length
  const emailMatch   = withEmail * 0.50
  const phoneMatch   = withPhone * 0.35
  const unionMatch   = emailMatch + phoneMatch - (withBoth * 0.40)
  const estimatedMatchRate = records.length > 0
    ? Math.min(95, Math.max(0, Math.round((unionMatch / records.length) * 100)))
    : 0
  return { totalRecords: records.length, withEmail, withPhone, withBoth, missingEmail, missingPhone, missingBoth, estimatedMatchRate }
}

function generateCSV(records) {
  const header    = 'Email,Phone,First Name,Last Name,Country,Zip'
  const matchable = records.filter(r => r.email || r.phone)
  const rows = matchable.map(r => {
    const email  = r.email     ? sha256(r.email)                   : ''
    const phone  = r.phone     ? sha256(r.phone)                   : ''
    const first  = r.firstName ? sha256(r.firstName.toLowerCase()) : ''
    const last   = r.lastName  ? sha256(r.lastName.toLowerCase())  : ''
    return [email, phone, first, last, r.country || 'IN', r.postalCode || ''].join(',')
  })
  return [header, ...rows].join('\r\n')
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sep(label) { console.log(`\n${'═'.repeat(60)}\n  ${label}\n${'═'.repeat(60)}`) }
function pass(msg)  { console.log(`  ✅  ${msg}`) }
function fail(msg)  { console.log(`  ❌  ${msg}`) }
function info(msg)  { console.log(`  ℹ   ${msg}`) }
function warn(msg)  { console.log(`  ⚠   ${msg}`) }

// ── Google OAuth (read token from MongoDB, refresh if expired) ─────────────────

async function getAccessToken(db) {
  const doc = await db.collection('google_oauth_tokens').findOne({ _docId: DOC_ID })
  if (!doc?.refreshToken) return null

  const expiresAt = new Date(doc.expiresAt).getTime()
  if (Date.now() < expiresAt - 5 * 60 * 1000) return doc.accessToken  // still valid

  // refresh
  const clientId     = (process.env.GOOGLE_OAUTH_CLIENT_ID     || '').trim()
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) return null

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: doc.refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
    }).toString(),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

async function getAdsConfig(db) {
  const settingsDoc = await db.collection('ads_settings').findOne({ _docId: SETTINGS_DOC_ID })
  return {
    customerId:      settingsDoc?.customerId     || null,
    loginCustomerId: settingsDoc?.loginCustomerId || null,
    developerToken:  (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim(),
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

const findings = []
let   verdict  = 'PASS'

function record(pass_, label, detail) {
  findings.push({ pass: pass_, label, detail })
  if (!pass_) verdict = 'FAIL'
}

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })

try {
  await client.connect()
  const db = client.db('100xDB')

  // ── 1. PULL ALL DEALER RECORDS ─────────────────────────────────────────────
  sep('1. FULL QUALITY METRICS — crm_dealers')

  const raw = await db.collection('crm_dealers').find({}).toArray()
  const records = raw.map(buildDealerRecord)

  // Deduplicate by email (mirrors engine dedup)
  const seen = new Set()
  const deduped = records.filter(r => {
    const key = r.email || `${r.company}::crm_dealers::${r.recordId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const qs = computeQualityScore(deduped)

  const pct = (n) => deduped.length > 0 ? ` (${Math.round(n / deduped.length * 100)}%)` : ''

  console.log(`\n  Total raw records (crm_dealers)   : ${raw.length}`)
  console.log(`  After deduplication               : ${deduped.length}`)
  console.log(`  Records with email                : ${qs.withEmail}${pct(qs.withEmail)}`)
  console.log(`  Records with phone                : ${qs.withPhone}${pct(qs.withPhone)}`)
  console.log(`  Records with both                 : ${qs.withBoth}${pct(qs.withBoth)}`)
  console.log(`  Records with neither              : ${qs.missingBoth}${pct(qs.missingBoth)}`)
  console.log(`  Missing email only                : ${qs.missingEmail}${pct(qs.missingEmail)}`)
  console.log(`  Missing phone only                : ${qs.missingPhone}${pct(qs.missingPhone)}`)
  console.log(`  Estimated Google Match Rate       : ~${qs.estimatedMatchRate}%`)
  console.log(`  Matchable (email OR phone)        : ${deduped.filter(r => r.email || r.phone).length}`)
  console.log(`  Google minimum (≥1,000 records)   : ${deduped.length >= 1000 ? 'MET' : 'NOT MET — upload will be accepted but may have reduced performance'}`)

  record(deduped.length > 0, 'Records exist', `${deduped.length} dealer records found`)
  record(qs.withEmail > 0 || qs.withPhone > 0,
    'Audience is matchable',
    `${deduped.filter(r => r.email || r.phone).length} records have email or phone`)


  // ── 2. PHONE NORMALIZATION — first 100 records ─────────────────────────────
  sep('2. PHONE NORMALIZATION VALIDATION — first 100 records')

  const sample100 = deduped.slice(0, 100)

  // Edge-case patterns we expect to handle
  const edgeCases = [
    { raw: '9876543210',        expected: '+919876543210', label: '10-digit bare'      },
    { raw: '09876543210',       expected: '+919876543210', label: '0-prefix 11-digit'  },
    { raw: '919876543210',      expected: '+919876543210', label: '91-prefix no +'     },
    { raw: '+919876543210',     expected: '+919876543210', label: 'Full E.164'          },
    { raw: '98765 43210',       expected: '+919876543210', label: '10-digit with space' },
    { raw: '9876-543-210',      expected: '+919876543210', label: '10-digit with dashes'},
    { raw: '1234',              expected: '',              label: 'Too short (skip)'    },
    { raw: '',                  expected: '',              label: 'Empty string'        },
    { raw: null,                expected: '',              label: 'Null'               },
  ]

  console.log('\n  Edge-case coverage:')
  let edgeFails = 0
  for (const c of edgeCases) {
    const got  = normalizePhone(c.raw)
    const ok   = got === c.expected
    if (!ok) edgeFails++
    const sym  = ok ? '✅' : '❌'
    console.log(`  ${sym} ${c.label.padEnd(22)} raw="${String(c.raw).padEnd(14)}" → "${got}"  expected="${c.expected}"`)
  }
  record(edgeFails === 0, 'Phone edge cases', `${edgeFails} failed`)

  // Sample 100 normalized values
  const phoneSample = sample100.filter(r => r._raw.phone)
  const phoneValid  = phoneSample.filter(r => r.phone && r.phone.startsWith('+'))
  const phoneBlank  = phoneSample.filter(r => !r.phone)
  const phoneInvalid = phoneSample.filter(r => r.phone && !r.phone.startsWith('+'))

  console.log(`\n  Sample-100 phone normalization:`)
  console.log(`    Records with raw phone data   : ${phoneSample.length}`)
  console.log(`    Normalized to valid E.164 (+) : ${phoneValid.length}`)
  console.log(`    Rejected (too short/no digits): ${phoneBlank.length}`)
  console.log(`    Malformed output (unexpected) : ${phoneInvalid.length}`)

  if (phoneSample.length > 0) {
    console.log('\n  First 5 normalized phones:')
    for (const r of phoneSample.slice(0, 5)) {
      const sym = r.phone.startsWith('+') ? '✅' : (r.phone ? '⚠' : '—')
      console.log(`    ${sym} raw="${String(r._raw.phone).padEnd(16)}" → normalized="${r.phone}"`)
    }
  }

  record(phoneInvalid.length === 0, 'No malformed phone output', `${phoneInvalid.length} records with non-E.164 phone output`)


  // ── 3. SHA-256 HASHING VALIDATION ─────────────────────────────────────────
  sep('3. SHA-256 HASHING VALIDATION')

  // Known-answer tests — verified against Node.js crypto output 2026-06-17
  // sha256("test@example.com") = 973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b
  const hashCases = [
    { input: 'test@example.com',  expected: '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b' },
    { input: 'TEST@EXAMPLE.COM',  expected: '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b' }, // must equal lowercase
    { input: ' test@example.com', expected: '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b' }, // must equal after trim
    { input: '+919876543210',      expected: 'f3a47ce5ce3d4ca8ad15225a245b2759022f79489f5c62719b8c9490f7aab90e' }, // verified
    { input: 'john',              expected: '96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a' }, // verified
  ]

  console.log('\n  Known-answer tests:')
  let hashFails = 0
  for (const c of hashCases) {
    const got = sha256(c.input)
    const ok  = got === c.expected
    if (!ok) hashFails++
    const sym = ok ? '✅' : '❌'
    console.log(`  ${sym} sha256("${c.input.slice(0,30)}") = ${got.slice(0,20)}…  (${ok ? 'correct' : 'WRONG, expected ' + c.expected.slice(0,20) + '…'})`)
  }
  record(hashFails === 0, 'SHA-256 known-answer tests', `${hashFails} failed`)

  // Verify properties of hashes from real records
  const recordsWithEmail = deduped.filter(r => r.email)
  const sampleForHash    = recordsWithEmail.slice(0, 10)
  console.log('\n  Hash property checks on 10 real emails:')
  let hashPropFails = 0
  for (const r of sampleForHash) {
    const h = sha256(r.email)
    const lengthOk = h.length === 64
    const hexOk    = /^[0-9a-f]+$/.test(h)
    const noPii    = !h.includes('@') && !h.includes('.')  // hash doesn't contain email chars
    const allOk    = lengthOk && hexOk && noPii
    if (!allOk) hashPropFails++
    const sym = allOk ? '✅' : '❌'
    const email = r.email.replace(/(.{2}).*(@.*)/, '$1***$2')
    console.log(`  ${sym} ${email.padEnd(25)} → ${h.slice(0,16)}… len=${h.length} hex=${hexOk}`)
  }
  record(hashPropFails === 0, 'Hash format properties (64-char hex)', `${hashPropFails} records failed format check`)

  // Verify lowercase+trim consistency (raw email with mixed case should hash same)
  if (sampleForHash.length > 0) {
    const r    = sampleForHash[0]
    const h1   = sha256(r.email)                 // already lowercased by engine
    const h2   = sha256(r.email.toUpperCase())   // sha256 normalizes via .toLowerCase()
    const consistent = h1 === h2
    if (!consistent) hashFails++
    console.log(`\n  Case-normalization: sha256(lower) === sha256(upper)? ${consistent ? '✅ YES' : '❌ NO'}`)
    record(consistent, 'Case normalization consistent', 'sha256(email) same regardless of input case')
  }


  // ── 4. CSV FORMAT VALIDATION ───────────────────────────────────────────────
  sep('4. CSV EXPORT FORMAT VALIDATION — first 100 records')

  const csv100 = generateCSV(sample100)
  const csvLines = csv100.split('\r\n')
  const header   = csvLines[0]
  const dataRows = csvLines.slice(1)

  console.log(`\n  CSV stats:`)
  console.log(`    Total lines (incl header)     : ${csvLines.length}`)
  console.log(`    Data rows                     : ${dataRows.length}`)
  console.log(`    Matchable in sample-100       : ${sample100.filter(r => r.email || r.phone).length}`)

  // Header check
  const expectedHeader = 'Email,Phone,First Name,Last Name,Country,Zip'
  const headerOk = header === expectedHeader
  console.log(`\n  Header row: ${headerOk ? '✅' : '❌'} "${header}"`)
  record(headerOk, 'CSV header exact match', `Expected: "${expectedHeader}"`)

  // Column count
  let colFails = 0
  for (const row of dataRows.slice(0, 20)) {
    const cols = row.split(',')
    if (cols.length !== 6) { colFails++; console.log(`  ❌ Wrong column count (${cols.length}): ${row.slice(0,80)}`) }
  }
  console.log(`  Column count (6 per row): ${colFails === 0 ? '✅ PASS' : `❌ ${colFails} rows wrong`}`)
  record(colFails === 0, 'CSV column count = 6', `${colFails} rows with wrong column count`)

  // Hash length validation (64 chars or empty)
  let badHashCount = 0
  for (const row of dataRows.slice(0, 50)) {
    const [email, phone, first, last] = row.split(',')
    for (const [field, val] of [['Email', email], ['Phone', phone], ['First', first], ['Last', last]]) {
      if (val && val.length !== 64) {
        badHashCount++
        console.log(`  ❌ ${field} hash wrong length (${val.length}): ${val.slice(0,30)}`)
      }
      if (val && !/^[0-9a-f]+$/.test(val)) {
        badHashCount++
        console.log(`  ❌ ${field} not hex: ${val.slice(0,30)}`)
      }
    }
  }
  console.log(`  Hash format (64-char hex or empty): ${badHashCount === 0 ? '✅ PASS' : `❌ ${badHashCount} bad hash values`}`)
  record(badHashCount === 0, 'CSV hashes are 64-char hex or empty', `${badHashCount} bad values`)

  // PII check — make sure no raw email/phone appears in CSV
  let piiLeaks = 0
  const emailSet = new Set(sample100.filter(r => r.email).map(r => r.email))
  const phoneSet = new Set(sample100.filter(r => r.phone).map(r => r.phone))
  const csvBody  = dataRows.join('\n')
  for (const email of emailSet) { if (csvBody.includes(email)) { piiLeaks++; warn(`Raw email found in CSV: ${email.slice(0,15)}…`) } }
  for (const phone of phoneSet) { if (csvBody.includes(phone)) { piiLeaks++; warn(`Raw phone found in CSV: ${phone}`) } }
  console.log(`  PII leak check (no raw data in CSV): ${piiLeaks === 0 ? '✅ PASS' : `❌ ${piiLeaks} raw values found`}`)
  record(piiLeaks === 0, 'No plain-text PII in CSV', `${piiLeaks} PII leaks detected`)

  // Country code in every row
  let badCountry = 0
  for (const row of dataRows) {
    const cols = row.split(',')
    if (cols[4] !== 'IN') badCountry++
  }
  console.log(`  Country code = "IN" in all rows: ${badCountry === 0 ? '✅ PASS' : `❌ ${badCountry} wrong`}`)
  record(badCountry === 0, 'Country code = "IN"', `${badCountry} rows with wrong country code`)

  // Show first 3 rows
  console.log('\n  First 3 data rows (Email col truncated to 20 chars for readability):')
  for (const row of dataRows.slice(0, 3)) {
    const cols = row.split(',')
    const short = [cols[0].slice(0,20)+'…', cols[1] ? cols[1].slice(0,16)+'…' : '', cols[2] ? cols[2].slice(0,16)+'…' : '', cols[3], cols[4], cols[5]]
    console.log(`    [${short.join(' | ')}]`)
  }


  // ── 5. GOOGLE ADS SCHEMA VALIDATION ───────────────────────────────────────
  sep('5. GOOGLE ADS SCHEMA VALIDATION — live API test (5 sample records)')

  const accessToken = await getAccessToken(db)
  const adsConfig   = await getAdsConfig(db)

  if (!accessToken) {
    warn('No Google OAuth access token found in MongoDB (google_oauth_tokens)')
    warn('Connect Google account in Growth OS → SEO → Search Console Setup first')
    record(false, 'Google Ads OAuth token available', 'NOT CONNECTED — schema test skipped')
  } else if (!adsConfig.customerId) {
    warn('Google Ads customer ID not configured (ads_settings collection empty)')
    warn('Connect a Google Ads account in Growth OS → Ads → Setup first')
    record(false, 'Google Ads customer ID configured', 'NOT CONFIGURED — schema test skipped')
  } else if (!adsConfig.developerToken) {
    warn('GOOGLE_ADS_DEVELOPER_TOKEN env var not set')
    warn('Set it in Vercel environment variables and re-run')
    record(false, 'Google Ads developer token configured', 'MISSING ENV VAR — schema test skipped')
  } else {
    const { customerId, loginCustomerId, developerToken } = adsConfig
    const headers = {
      Authorization:    `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type':   'application/json',
      ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
    }

    // Step A: Create User List
    console.log(`\n  Customer ID     : ${customerId}`)
    console.log(`  Login cust. ID  : ${loginCustomerId || '(none)'}`)
    console.log(`  Developer token : ${developerToken.slice(0,6)}…`)

    const listName = `[VERIFICATION TEST] 100X Customer Match ${new Date().toISOString().slice(0,10)}`
    const createListPayload = {
      operations: [{
        create: {
          name: listName,
          description: 'Automated verification test — safe to delete',
          membershipStatus: 'OPEN',
          membershipLifeSpan: 30,
          crmBasedUserList: {
            uploadKeyType: 'CONTACT_INFO',
            dataSourceType: 'FIRST_PARTY',
          },
        },
      }],
    }

    console.log(`\n  A) Creating test User List: "${listName}"`)
    let userListResourceName = null
    let listSchemaOk = false

    try {
      const createRes = await fetch(`${ADS_API}/customers/${customerId}/userLists:mutate`, {
        method:  'POST',
        headers,
        body:    JSON.stringify(createListPayload),
      })
      const createBody = await createRes.json()

      if (createRes.ok && createBody.results?.[0]?.resourceName) {
        userListResourceName = createBody.results[0].resourceName
        listSchemaOk = true
        pass(`User List created: ${userListResourceName}`)
        record(true, 'Google Ads UserList schema accepted', userListResourceName)
      } else {
        const errStr = JSON.stringify(createBody).slice(0, 400)
        fail(`User List creation failed (HTTP ${createRes.status}): ${errStr}`)
        record(false, 'Google Ads UserList schema accepted', `HTTP ${createRes.status}: ${errStr}`)
      }
    } catch (e) {
      fail(`User List API call threw: ${e.message}`)
      record(false, 'Google Ads UserList schema accepted', `Exception: ${e.message}`)
    }

    // Step B: Create OfflineUserDataJob
    if (userListResourceName) {
      console.log(`\n  B) Creating OfflineUserDataJob for Customer Match`)
      const createJobPayload = {
        job: {
          type: 'CUSTOMER_MATCH_USER_LIST',
          customerMatchUserListMetadata: { userList: userListResourceName },
        },
      }

      let jobResourceName = null
      let jobSchemaOk = false

      try {
        const jobRes  = await fetch(`${ADS_API}/customers/${customerId}/offlineUserDataJobs:create`, {
          method: 'POST',
          headers,
          body:   JSON.stringify(createJobPayload),
        })
        const jobBody = await jobRes.json()

        if (jobRes.ok && jobBody.resourceName) {
          jobResourceName = jobBody.resourceName
          jobSchemaOk = true
          pass(`OfflineUserDataJob created: ${jobResourceName}`)
          record(true, 'Google Ads OfflineUserDataJob schema accepted', jobResourceName)
        } else {
          const errStr = JSON.stringify(jobBody).slice(0, 400)
          fail(`Job creation failed (HTTP ${jobRes.status}): ${errStr}`)
          record(false, 'Google Ads OfflineUserDataJob schema accepted', `HTTP ${jobRes.status}: ${errStr}`)
        }
      } catch (e) {
        fail(`Job API call threw: ${e.message}`)
        record(false, 'Google Ads OfflineUserDataJob schema accepted', `Exception: ${e.message}`)
      }

      // Step C: Add 5 sample members
      if (jobResourceName) {
        console.log(`\n  C) Adding 5 sample hashed members to verify member schema`)

        const sampleMembers = deduped.filter(r => r.email || r.phone).slice(0, 5)
        const operations    = sampleMembers.map(r => {
          const userIdentifiers = []
          if (r.email) userIdentifiers.push({ hashedEmail: sha256(r.email) })
          if (r.phone) userIdentifiers.push({ hashedPhoneNumber: sha256(r.phone) })
          if (r.firstName || r.lastName) {
            const addressInfo = { countryCode: 'IN' }
            if (r.firstName) addressInfo.hashedFirstName = sha256(r.firstName.toLowerCase())
            if (r.lastName)  addressInfo.hashedLastName  = sha256(r.lastName.toLowerCase())
            userIdentifiers.push({ addressInfo })
          }
          return { create: { userIdentifiers } }
        })

        console.log(`    Sending ${operations.length} records:`)
        for (const [i, op] of operations.entries()) {
          const idTypes = op.create.userIdentifiers.map(u => Object.keys(u)[0]).join(', ')
          console.log(`    [${i+1}] identifier types: ${idTypes}`)
        }

        try {
          const addRes  = await fetch(`${ADS_API}/${jobResourceName}:addOperations`, {
            method: 'POST',
            headers,
            body:   JSON.stringify({ operations }),
          })
          const addBody = await addRes.json()

          if (addRes.ok) {
            pass(`addOperations accepted (HTTP ${addRes.status})`)
            if (addBody.status) info(`Job status: ${addBody.status}`)
            record(true, 'Google Ads member schema accepted (addOperations)', `${operations.length} records accepted`)

            // Step D: Run the job (makes it active; small job, harmless)
            console.log(`\n  D) Running job (makes list active in Google Ads)`)
            try {
              const runRes  = await fetch(`${ADS_API}/${jobResourceName}:run`, {
                method: 'POST',
                headers,
                body:   JSON.stringify({}),
              })
              const runBody = await runRes.json()
              if (runRes.ok) {
                pass(`Job queued for processing (HTTP ${runRes.status})`)
                info(`Response: ${JSON.stringify(runBody).slice(0, 120)}`)
                record(true, 'Google Ads job run accepted', 'Async processing started')
              } else {
                warn(`Job run returned HTTP ${runRes.status}: ${JSON.stringify(runBody).slice(0, 200)}`)
                record(false, 'Google Ads job run accepted', `HTTP ${runRes.status}`)
              }
            } catch (e) {
              warn(`Job run threw: ${e.message}`)
              record(false, 'Google Ads job run accepted', `Exception: ${e.message}`)
            }
          } else {
            const errStr = JSON.stringify(addBody).slice(0, 400)
            fail(`addOperations failed (HTTP ${addRes.status}): ${errStr}`)
            record(false, 'Google Ads member schema accepted (addOperations)', `HTTP ${addRes.status}: ${errStr}`)
          }
        } catch (e) {
          fail(`addOperations threw: ${e.message}`)
          record(false, 'Google Ads member schema accepted (addOperations)', `Exception: ${e.message}`)
        }
      }

      // Clean up: try to remove the test user list
      if (userListResourceName) {
        console.log('\n  E) Cleanup: removing test User List')
        try {
          const removeRes = await fetch(`${ADS_API}/customers/${customerId}/userLists:mutate`, {
            method: 'POST',
            headers,
            body:   JSON.stringify({ operations: [{ remove: userListResourceName }] }),
          })
          if (removeRes.ok) {
            pass('Test User List removed (cleanup complete)')
          } else {
            const b = await removeRes.text()
            warn(`Cleanup failed (HTTP ${removeRes.status}) — test list "${listName}" left in Google Ads: ${b.slice(0,150)}`)
          }
        } catch (e) {
          warn(`Cleanup threw: ${e.message} — test list may remain in Google Ads`)
        }
      }
    }
  }


  // ── FINAL REPORT ───────────────────────────────────────────────────────────
  sep('FINAL REPORT')

  const passes = findings.filter(f =>  f.pass)
  const fails  = findings.filter(f => !f.pass)

  console.log('\n  Check                                              Result')
  console.log('  ' + '─'.repeat(66))
  for (const f of findings) {
    const sym  = f.pass ? '✅ PASS' : '❌ FAIL'
    const label = f.label.padEnd(50)
    console.log(`  ${sym}  ${label}  ${f.detail}`)
  }

  console.log(`\n  ${'─'.repeat(66)}`)
  console.log(`  Passed: ${passes.length} / ${findings.length}`)
  console.log(`  Failed: ${fails.length} / ${findings.length}`)
  console.log()
  console.log(`  ┌──────────────────────────────────┐`)
  console.log(`  │  OVERALL VERDICT:  ${verdict.padEnd(12)}  │`)
  console.log(`  └──────────────────────────────────┘`)

  if (fails.length > 0) {
    console.log('\n  Failures to resolve before production upload:')
    for (const f of fails) {
      console.log(`    • ${f.label}: ${f.detail}`)
    }
  }

} finally {
  await client.close()
}
