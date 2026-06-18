/**
 * run-audience-dealer-sync.mjs
 * Directly rebuilds:
 *   1. Government Buyers customer match audience (from gem_contracts contacts)
 *   2. Dealer prospects — Source 6 reseller classification (from gem_contracts selling_as)
 */
import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
for (const l of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db  = client.db()
const now = new Date().toISOString()

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10)                              return `+91${digits}`
  if (digits.startsWith('91') && digits.length === 12)  return `+${digits}`
  if (digits.startsWith('0')  && digits.length === 11)  return `+91${digits.slice(1)}`
  if (digits.length >= 11)                               return `+${digits}`
  return ''
}

function normalizePhoneDealer(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10)                              return digits
  if (digits.startsWith('91') && digits.length === 12)  return digits.slice(2)
  if (digits.startsWith('0')  && digits.length === 11)  return digits.slice(1)
  if (digits.length > 10)                               return digits.slice(-10)
  return digits.length >= 7 ? digits : ''
}

function extractCity(addr) {
  if (!addr) return ''
  const parts = addr.split(',').map(p => p.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    if (/^[A-Z\s]+-\d{3,}$/.test(p)) continue
    if (p.length < 3 || /^\d+$/.test(p)) continue
    return p
  }
  return ''
}

function calcScore(email, mobile, gst, city, person) {
  return (email  ? 30 : 0) + (mobile ? 30 : 0) + (gst ? 20 : 0) + (city ? 10 : 0) + (person ? 10 : 0)
}

function dedupKey(email, mobile, gst, name, city) {
  if (email)  return `email:${email}`
  if (mobile) return `phone:${mobile}`
  if (gst)    return `gst:${gst}`
  return `name:${name.toLowerCase()}::${city.toLowerCase()}`
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. GOVERNMENT BUYERS — rebuild from gem_contracts contacts
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(64))
console.log('  Government Buyers Audience Rebuild')
console.log('═'.repeat(64))

const raw = await db.collection('gem_contracts').find({
  $or: [
    { buyer_email:   { $exists: true, $nin: [null, ''] } },
    { buyer_contact: { $exists: true, $nin: [null, ''] } },
  ],
}).project({
  buyer_name: 1, buyer_email: 1, buyer_contact: 1,
  buyer_designation: 1, buyer_state: 1,
  buyer_dept: 1, buyer_ministry: 1,
}).limit(20000).toArray()

console.log(`\n  Contracts with buyer contact data: ${raw.length}`)

const seenEmail = new Set()
const seenPhone = new Set()
const orgs      = new Set()
let contactsExtracted = 0
const records = []

for (const c of raw) {
  const email = String(c.buyer_email   || '').toLowerCase().trim()
  const phone = normalizePhone(String(c.buyer_contact || ''))
  if (!email && !phone) continue

  contactsExtracted++
  const org = String(c.buyer_name || c.buyer_dept || c.buyer_ministry || '')
  if (org) orgs.add(org)

  if (email && seenEmail.has(email)) continue
  if (!email && phone && seenPhone.has(phone)) continue
  if (email) seenEmail.add(email)
  if (phone) seenPhone.add(phone)

  const parts = String(c.buyer_designation || '').split(/\s+/).filter(Boolean)
  records.push({
    email,
    phone,
    company: org,
    state:   String(c.buyer_state || ''),
    firstName: parts[0] || '',
    lastName:  parts.slice(1).join(' '),
    source:  'gem_contracts',
    missingEmail: !email,
    missingPhone: !phone,
  })
}

const withEmail    = records.filter(r => r.email).length
const withPhone    = records.filter(r => r.phone).length
const withBoth     = records.filter(r => r.email && r.phone).length
const missingBoth  = records.filter(r => !r.email && !r.phone).length
const emailMatch   = withEmail * 0.50
const phoneMatch   = withPhone * 0.35
const unionMatch   = emailMatch + phoneMatch - (withBoth * 0.40)
const matchRate    = records.length > 0
  ? Math.min(95, Math.max(0, Math.round((unionMatch / records.length) * 100))) : 0

const qualityScore = {
  totalRecords: records.length,
  withEmail, withPhone, withBoth,
  missingEmail: records.length - withEmail,
  missingPhone: records.length - withPhone,
  missingBoth,
  estimatedMatchRate: matchRate,
  matchBasis: withEmail >= withPhone ? 'Email-based' : 'Phone-based',
  organizationsCount: orgs.size,
  contactsExtracted,
  contractsScanned:   raw.length,
}

await db.collection('customer_match_audiences').updateOne(
  { audienceId: 'cm_government_buyers' },
  {
    $set: {
      audienceId:   'cm_government_buyers',
      audienceType: 'government_buyers',
      displayName:  'Government Buyers',
      qualityScore,
      lastBuiltAt:  now,
      updatedAt:    now,
    },
    $setOnInsert: { uploadStatus: 'not_uploaded', createdAt: now },
  },
  { upsert: true }
)

await db.collection('growth_os_logs').insertOne({
  ts: now, agent: 'customer-match-engine', action: 'audience_built',
  audienceType: 'government_buyers', ...qualityScore, level: 'success', module: 'ads',
})

console.log('\n  ✓ Audience rebuilt')
console.log(`    Contracts scanned   : ${raw.length}`)
console.log(`    Contacts extracted  : ${contactsExtracted}`)
console.log(`    Unique emails       : ${withEmail}`)
console.log(`    Unique phones       : ${withPhone}`)
console.log(`    Both email + phone  : ${withBoth}`)
console.log(`    Distinct orgs       : ${orgs.size}`)
console.log(`    Total records saved : ${records.length}`)
console.log(`    Est. match rate     : ${matchRate}%`)

// ══════════════════════════════════════════════════════════════════════════════
// 2. DEALER PROSPECTS — Source 6: gem_contracts reseller classification
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(64))
console.log('  Dealer Prospect Engine — Reseller Classification')
console.log('═'.repeat(64))

const RESELLER_RE = /\bReseller\b/i
const OEM_ONLY_RE = /^OEM(\s+Item)?$/i

const gemResellers = await db.collection('gem_contracts').aggregate([
  { $match: { selling_as: { $exists: true, $nin: [null, ''] } } },
  {
    $group: {
      _id: {
        $ifNull: [
          '$seller_gst',
          { $concat: ['noGst::', { $ifNull: ['$seller_name_canonical', { $ifNull: ['$seller_name', 'unknown'] }] }] },
        ],
      },
      seller_name:    { $first: '$seller_name' },
      seller_email:   { $first: '$seller_email' },
      seller_phone:   { $first: '$seller_phone' },
      seller_state:   { $first: '$seller_state' },
      seller_address: { $first: '$seller_address' },
      oem_name:       { $first: '$oem_name' },
      selling_as:     { $first: '$selling_as' },
      contracts_won:  { $sum: 1 },
      total_value:    { $sum: '$contract_value_pdf' },
      first_seen:     { $min: '$contract_date' },
      last_seen:      { $max: '$contract_date' },
    },
  },
], { allowDiskUse: true }).toArray()

console.log(`\n  Distinct sellers with selling_as data: ${gemResellers.length}`)

let oemSkipped    = 0
let resellerFound = 0
const stateCount  = {}
const prospects   = []

for (const c of gemResellers) {
  const sellingAs = String(c.selling_as || '')

  if (RESELLER_RE.test(sellingAs)) {
    resellerFound++
    const email  = String(c.seller_email  || '').toLowerCase().trim()
    const mobile = normalizePhoneDealer(String(c.seller_phone || ''))
    const rawGst = String(c._id || '')
    const gst    = rawGst.startsWith('noGst::') ? '' : rawGst.trim().toUpperCase()
    const name   = String(c.seller_name   || '')
    const state  = String(c.seller_state  || '')
    const city   = extractCity(String(c.seller_address || ''))
    const score  = calcScore(email, mobile, gst, city, '')
    const dk     = dedupKey(email, mobile, gst, name, city)

    if (state) stateCount[state] = (stateCount[state] || 0) + 1

    prospects.push({
      dealer_name:      name,
      contact_person:   '',
      mobile,
      email,
      city,
      state,
      gst,
      source:           'gem_contract_reseller',
      source_ref_id:    rawGst,
      dealer_score:     score,
      status:           'new',
      needs_enrichment: !email || !mobile,
      dedup_key:        dk,
      notes:            `GeM Reseller | Selling As: ${sellingAs} | OEM: ${c.oem_name || '?'} | Contracts: ${c.contracts_won}`,
      gem_gmv:          Number(c.total_value)   || 0,
      gem_contracts:    Number(c.contracts_won) || 0,
      seller_type:      'dealer',
      oem_brand:        String(c.oem_name || ''),
      first_seen:       c.first_seen ? String(c.first_seen) : null,
      last_seen:        c.last_seen  ? String(c.last_seen)  : null,
      is_100x_dealer:   false,
      competes_with_100x: true,
      updated_at:       now,
    })
  } else if (OEM_ONLY_RE.test(sellingAs)) {
    oemSkipped++
  }
}

// Bulk upsert reseller dealer prospects
let totalInserted = 0
let totalUpdated  = 0

if (prospects.length) {
  for (let i = 0; i < prospects.length; i += 500) {
    const batch = prospects.slice(i, i + 500)
    const ops = batch.map(p => ({
      updateOne: {
        filter: { dedup_key: p.dedup_key },
        update: {
          $setOnInsert: {
            dedup_key:     p.dedup_key,
            source:        p.source,
            source_ref_id: p.source_ref_id,
            status:        'new',
            created_at:    now,
          },
          $set: {
            dealer_name:      p.dealer_name,
            contact_person:   p.contact_person,
            mobile:           p.mobile,
            email:            p.email,
            city:             p.city,
            state:            p.state,
            gst:              p.gst,
            dealer_score:     p.dealer_score,
            needs_enrichment: p.needs_enrichment,
            notes:            p.notes,
            updated_at:       now,
            gem_gmv:          p.gem_gmv,
            gem_contracts:    p.gem_contracts,
            seller_type:      p.seller_type,
            oem_brand:        p.oem_brand,
            first_seen:       p.first_seen,
            last_seen:        p.last_seen,
            is_100x_dealer:   p.is_100x_dealer,
            competes_with_100x: p.competes_with_100x,
          },
        },
        upsert: true,
      },
    }))
    const res = await db.collection('dealer_prospects').bulkWrite(ops, { ordered: false })
    totalInserted += res.upsertedCount
    totalUpdated  += res.modifiedCount
  }
}

// Top states
const topStates = Object.entries(stateCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)

await db.collection('growth_os_logs').insertOne({
  ts: now, agent: 'dealer-prospect-engine', action: 'reseller_sync',
  oemSkipped, resellerFound, totalInserted, totalUpdated,
  topStatesByReseller: topStates.map(([state, count]) => ({ state, count })),
  level: 'success', module: 'dealers',
})

console.log('\n  ✓ Dealer reseller sync complete')
console.log(`    Sellers with selling_as : ${gemResellers.length}`)
console.log(`    OEM sellers skipped     : ${oemSkipped}`)
console.log(`    Reseller sellers found  : ${resellerFound}`)
console.log(`    Prospects inserted (new): ${totalInserted}`)
console.log(`    Prospects updated       : ${totalUpdated}`)

if (topStates.length) {
  console.log('\n  Top states by reseller count:')
  for (const [state, count] of topStates) {
    console.log(`    ${String(state).padEnd(25)} ${count}`)
  }
}

// ── Total dealer_prospects count ─────────────────────────────────────────────
const totalProspects = await db.collection('dealer_prospects').countDocuments()
console.log(`\n  Total dealer_prospects in DB : ${totalProspects}`)

await client.close()
console.log('\n' + '═'.repeat(64))
console.log('  Done.')
console.log('═'.repeat(64))
