/**
 * Run the dealer prospect sync directly against MongoDB.
 * Mirrors the server-side sync route exactly.
 */
import { MongoClient } from 'mongodb'

const MONGO_URI = 'mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project'

const COLL = 'dealer_prospects'

function normalizePhone(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2)
  if (digits.startsWith('0')  && digits.length === 11) return digits.slice(1)
  if (digits.length > 10) return digits.slice(-10)
  return digits.length >= 7 ? digits : ''
}

function calcScore(email, mobile, gst, city, contact_person) {
  return (email  ? 30 : 0) + (mobile ? 30 : 0) + (gst ? 20 : 0) + (city ? 10 : 0) + (contact_person ? 10 : 0)
}

function dedupKey(email, mobile, gst, name, city) {
  if (email)  return `email:${email}`
  if (mobile) return `phone:${mobile}`
  if (gst)    return `gst:${gst}`
  return `name:${name.toLowerCase()}::${city.toLowerCase()}`
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

function extractFromAnswers(answers) {
  let email = '', phone = '', name = ''
  for (const val of Object.values(answers)) {
    const s = String(val ?? '').trim()
    if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) email = s.toLowerCase()
    else if (!phone && /^\d{10}$/.test(s.replace(/\D/g, ''))) phone = s
    else if (!name && s.length >= 3 && s.length <= 60 && /^[a-zA-Z\s'.]+$/.test(s)) name = s
  }
  return { email, phone, name }
}

async function bulkUpsert(db, prospects, sourceName, now) {
  if (!prospects.length) {
    console.log(`  ${sourceName}: 0 records`)
    return { inserted: 0, updated: 0 }
  }
  let ins = 0, upd = 0
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
            ...(p.gem_gmv       !== undefined ? { gem_gmv:           p.gem_gmv           } : {}),
            ...(p.gem_contracts !== undefined ? { gem_contracts:      p.gem_contracts      } : {}),
            ...(p.is_100x_dealer  !== undefined ? { is_100x_dealer:  p.is_100x_dealer     } : {}),
            ...(p.competes_with_100x !== undefined ? { competes_with_100x: p.competes_with_100x } : {}),
          },
        },
        upsert: true,
      },
    }))
    const res = await db.collection(COLL).bulkWrite(ops, { ordered: false })
    ins += res.upsertedCount
    upd += res.modifiedCount
  }
  console.log(`  ${sourceName.padEnd(20)}: ${prospects.length} processed → ${ins} inserted, ${upd} updated`)
  return { inserted: ins, updated: upd }
}

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
const db = client.db('100xDB')
const now = new Date().toISOString()

console.log('\n=== Dealer Prospect Acquisition Sync ===\n')

let totalIns = 0, totalUpd = 0

// Source 1: fogging_sellers
{
  const sellers = await db.collection('fogging_sellers').find({}).toArray()
  const prospects = sellers.map(s => {
    const email  = String(s.seller_email  || '').toLowerCase().trim()
    const mobile = normalizePhone(String(s.seller_phone || ''))
    const gst    = String(s.seller_gst    || '').trim().toUpperCase()
    const name   = String(s.seller_display_name || s.seller_name_raw || '')
    const state  = String(s.seller_state  || '')
    const city   = extractCity(String(s.seller_address || ''))
    const score  = calcScore(email, mobile, gst, city, '')
    const dk     = dedupKey(email, mobile, gst, name, city)
    return {
      dealer_name: name, contact_person: '', mobile, email, city, state, gst,
      source: 'gem_seller', source_ref_id: String(s._id),
      dealer_score: score, needs_enrichment: !email || !mobile, dedup_key: dk,
      notes: `GeM GMV: ₹${Math.round((s.total_gmv || 0) / 100000)}L | Contracts: ${s.total_contracts || 0} | GST: ${gst}`,
      gem_gmv: s.total_gmv || 0, gem_contracts: s.total_contracts || 0,
      is_100x_dealer: s.is_100x_dealer || false,
      competes_with_100x: !s.is_100x_dealer,
    }
  })
  const r = await bulkUpsert(db, prospects, 'fogging_sellers', now)
  totalIns += r.inserted; totalUpd += r.updated
}

// Source 2: seller_profiles (fogging only)
{
  const profiles = await db.collection('seller_profiles').find({
    supplies_fogging_products: true,
    seller_slug: { $ne: '__meta__' },
    seller_name: { $exists: true, $ne: null },
  }).toArray()
  const prospects = profiles.map(s => {
    const gst   = String(s.seller_gstin || '').trim().toUpperCase()
    const name  = String(s.seller_name  || '')
    const state = String(s.seller_state || (s.seller_gstin_states || [])[0] || '')
    const city  = extractCity(String(s.seller_address || ''))
    const score = calcScore('', '', gst, city, '')
    const dk    = dedupKey('', '', gst, name, city)
    return {
      dealer_name: name, contact_person: '', mobile: '', email: '', city, state, gst,
      source: 'gem_seller', source_ref_id: String(s._id),
      dealer_score: score, needs_enrichment: true, dedup_key: dk,
      notes: `GST: ${gst} | Seller profile | Fogging supplier`,
      competes_with_100x: !s.is_100x_supplier,
    }
  })
  const r = await bulkUpsert(db, prospects, 'seller_profiles', now)
  totalIns += r.inserted; totalUpd += r.updated
}

// Source 3: submissions (dealer applications)
{
  const subs = await db.collection('submissions').find({
    $or: [{ dealerInquiry: true }, { dealerScore: { $gte: 7 } }],
    _test: { $ne: true },
  }).toArray()
  const prospects = subs.map(s => {
    const email  = String(s.email || '').toLowerCase().trim()
    const mobile = normalizePhone(String(s.phone || ''))
    const name   = String(s.name  || '')
    const score  = calcScore(email, mobile, '', '', name)
    const dk     = dedupKey(email, mobile, '', name, '')
    return {
      dealer_name: String(s.organization || s.company || ''), contact_person: name,
      mobile, email, city: '', state: String(s.state || ''), gst: '',
      source: 'website_lead', source_ref_id: String(s._id),
      dealer_score: score, needs_enrichment: !email || !mobile, dedup_key: dk,
      notes: `Dealer inquiry | score=${s.dealerScore} | ${s.leadType || ''}`,
    }
  })
  const r = await bulkUpsert(db, prospects, 'submissions', now)
  totalIns += r.inserted; totalUpd += r.updated
}

// Source 4: brochure_leads
{
  const leads = await db.collection('brochure_leads').find({}).toArray()
  const prospects = leads.map(l => {
    const email  = String(l.email || '').toLowerCase().trim()
    const mobile = normalizePhone(String(l.phone || ''))
    const name   = String(l.name  || '')
    const state  = String(l.state || '')
    const score  = calcScore(email, mobile, '', '', name)
    const dk     = dedupKey(email, mobile, '', name, '')
    return {
      dealer_name: String(l.organization || l.company || ''), contact_person: name,
      mobile, email, city: '', state, gst: '',
      source: 'website_lead', source_ref_id: String(l._id),
      dealer_score: score, needs_enrichment: !email || !mobile, dedup_key: dk,
      notes: `Brochure: ${l.brochureType || ''} | ${l.productName || ''}`,
    }
  })
  const r = await bulkUpsert(db, prospects, 'brochure_leads', now)
  totalIns += r.inserted; totalUpd += r.updated
}

// Source 5: rfq_popup_leads (non-test)
{
  const rfqs = await db.collection('rfq_popup_leads').find({ _test: { $ne: true } }).toArray()
  const prospects = rfqs.map(r => {
    const answers = r.answers || {}
    const { email, phone, name } = extractFromAnswers(answers)
    const mobile = normalizePhone(phone)
    if (!email && !mobile) return null
    const score = calcScore(email, mobile, '', '', name)
    const dk    = dedupKey(email, mobile, '', name, '')
    return {
      dealer_name: '', contact_person: name, mobile, email, city: '', state: '', gst: '',
      source: 'rfq', source_ref_id: String(r._id),
      dealer_score: score, needs_enrichment: !email || !mobile, dedup_key: dk,
      notes: `RFQ | ${r.pagePath || ''}`,
    }
  }).filter(Boolean)
  const r = await bulkUpsert(db, prospects, 'rfq_popup_leads', now)
  totalIns += r.inserted; totalUpd += r.updated
}

// ── Final stats ───────────────────────────────────────────────────────────────
console.log(`\n  Total inserted: ${totalIns}`)
console.log(`  Total updated:  ${totalUpd}`)

const total = await db.collection(COLL).countDocuments()
const withEmail  = await db.collection(COLL).countDocuments({ email:  { $exists: true, $ne: '' } })
const withPhone  = await db.collection(COLL).countDocuments({ mobile: { $exists: true, $ne: '' } })
const withBoth   = await db.collection(COLL).countDocuments({ email: { $ne: '' }, mobile: { $ne: '' } })
const withGst    = await db.collection(COLL).countDocuments({ gst:   { $exists: true, $ne: '' } })
const is100x     = await db.collection(COLL).countDocuments({ is_100x_dealer: true })

const emailMatch = withEmail * 0.50
const phoneMatch = withPhone * 0.35
const unionMatch = emailMatch + phoneMatch - (withBoth * 0.40)
const matchRate  = total > 0 ? Math.min(95, Math.round((unionMatch / total) * 100)) : 0

console.log(`\n=== dealer_prospects collection stats ===`)
console.log(`  Total records:          ${total}`)
console.log(`  With email:             ${withEmail} (${Math.round(withEmail/total*100)}%)`)
console.log(`  With phone:             ${withPhone} (${Math.round(withPhone/total*100)}%)`)
console.log(`  With both:              ${withBoth}  (${Math.round(withBoth/total*100)}%)`)
console.log(`  With GST:               ${withGst}   (${Math.round(withGst/total*100)}%)`)
console.log(`  Is 100X dealer already: ${is100x}`)
console.log(`  Est. Customer Match Rate: ~${matchRate}%`)

// State breakdown
const byState = await db.collection(COLL).aggregate([
  { $match: { status: { $ne: 'rejected' } } },
  { $group: { _id: '$state', count: { $sum: 1 },
    withEmail: { $sum: { $cond: [{ $and: [{ $ne: ['$email', null] }, { $ne: ['$email', ''] }] }, 1, 0] } },
    withPhone: { $sum: { $cond: [{ $and: [{ $ne: ['$mobile', null] }, { $ne: ['$mobile', ''] }] }, 1, 0] } },
  }},
  { $sort: { count: -1 } },
  { $limit: 10 },
]).toArray()

console.log('\n  Top states:')
for (const s of byState) {
  const rate = Math.round(((s.withEmail * 0.5 + s.withPhone * 0.35) / s.count) * 100)
  console.log(`    ${String(s._id || 'Unknown').padEnd(25)} ${String(s.count).padStart(4)} records | email=${s.withEmail} phone=${s.withPhone} | ~${rate}% match`)
}

await client.close()
console.log('\nDone.')
