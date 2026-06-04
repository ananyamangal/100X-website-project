// Direct MongoDB seeder — run with: node scripts/seed-blogs.js
// Inserts 5 growth-strategy blog posts. Idempotent (skips existing slugs).

const { MongoClient } = require('mongodb')
const fs = require('fs')

const uri = fs.readFileSync('.env.local', 'utf8').match(/MONGODB_URI=(.+)/)[1].trim()
const client = new MongoClient(uri)

const now = new Date()

const posts = [
  {
    slug: 'how-to-earn-income-gem-fogging-machine-reseller',
    title: 'How to Earn Income as a GeM Fogging Machine Reseller in India',
    excerpt: "GeM fogging machine tenders run year-round across India's 750+ municipalities. This guide explains how dealers and resellers earn consistent income by becoming authorized OEM resellers on Government e-Marketplace.",
    category: 'Dealer Guide',
    author: '100X Circle',
    order: 101,
    isPublished: true,
    topImage: '',
    inlineImages: [],
    publishedAt: now.toISOString(),
    createdAt: now,
    updatedAt: now,
    content: '<h2>The GeM Fogging Machine Market</h2><p>India has over 4,000 urban local bodies with a statutory obligation to control mosquitoes. Most procure fogging machines annually on GeM. The opportunity for dealers is substantial — but requires OEM authorization first.</p><h2>Why OEM Authorization Is Required</h2><p>GeM divides sellers into OEMs and Authorized Resellers. Without authorization, you cannot list or sell a brand on GeM. Government buyers require OEM authorization as mandatory bid documentation.</p><h2>Why 100X Circle</h2><ul><li>MSME registered — 25% procurement preference</li><li>IS 14855 (Part 1) compliant — documentation provided</li><li>ISO 9001:2015 certified</li><li>3-5x lower price than Korean/German imports</li><li>GeM-listed MSME OEM</li></ul><h2>How to Start</h2><ol><li>Register on GeM at gem.gov.in</li><li>Contact 100X Circle: WhatsApp +91-7827229116 or 100xcircle@gmail.com</li><li>Receive OEM authorization code and pair the catalog</li><li>Monitor bids at bidplus.gem.gov.in</li><li>Submit bids using 100X Circle documentation</li></ol><p>Read more: <a href="/gem-oem-authorization">GeM OEM Authorization for Dealers</a> | <a href="/knowledge/gem-reseller-guide">Complete GeM Reseller Guide</a></p>',
  },
  {
    slug: 'is-14855-government-fogging-machine-tenders-india',
    title: 'IS 14855 Explained: The BIS Standard That Decides Government Fogging Machine Tenders',
    excerpt: 'Government tenders for fogging machines increasingly specify IS 14855 (Part 1) as a mandatory requirement. This guide explains what IS 14855 means, why it matters for tender compliance, and what documentation you need.',
    category: 'Government Procurement',
    author: '100X Circle',
    order: 102,
    isPublished: true,
    topImage: '',
    inlineImages: [],
    publishedAt: now.toISOString(),
    createdAt: now,
    updatedAt: now,
    content: '<h2>What Is IS 14855?</h2><p>IS 14855 (Part 1) is the Bureau of Indian Standards specification for portable power-operated thermal fogging machines. It defines construction, safety, and performance requirements — and has become the default quality benchmark in government fogging machine tenders.</p><h2>Why IS 14855 Appears in Government Tenders</h2><ol><li>GeM product category is titled "Fogging Machine (V2) as per IS 14855 (Part 1)" — machines must conform.</li><li>IS 14855 is an Indian standard that gives procurement preference to Indian manufacturers.</li><li>IS 14855 includes operator safety requirements important to municipal bodies.</li></ol><h2>IS 14855 vs ISI Mark</h2><p>IS 14855 compliance means the product is manufactured to the specification. ISI mark means BIS has tested and certified it. Some tenders require ISI mark; others accept compliance documentation.</p><h2>Documentation Required</h2><ul><li>IS 14855 (Part 1) compliance certificate or declaration</li><li>ISO 9001:2015 certificate</li><li>Technical specification sheet</li><li>OEM authorization letter (if bidding as a dealer)</li></ul><p>100X Circle provides all documentation to authorized dealers. Contact +91-7827229116 or 100xcircle@gmail.com</p><p>Read more: <a href="/is-14855-fogging-machine">IS 14855 Fogging Machines</a> | <a href="/gem-tender-support">Tender Documentation Support</a></p>',
  },
  {
    slug: 'india-municipal-fogging-procurement-calendar',
    title: 'India Municipal Fogging Procurement Calendar: When Government Bodies Buy Fogging Machines',
    excerpt: "Municipal corporations, Nagar Panchayats, and health departments buy fogging machines on a predictable annual cycle tied to India's mosquito season. This calendar shows when to be active, when to prospect, and when to bid.",
    category: 'Municipal Procurement',
    author: '100X Circle',
    order: 103,
    isPublished: true,
    topImage: '',
    inlineImages: [],
    publishedAt: now.toISOString(),
    createdAt: now,
    updatedAt: now,
    content: '<h2>Why Timing Matters</h2><p>Government procurement in India is budget-driven and cyclical. Understanding the procurement calendar is the key to winning more government fogging machine business.</p><h2>Procurement Calendar</h2><h3>January-February: Budget Planning</h3><p>Municipal health departments write annual budgets. Meet procurement officers now — before tenders are written.</p><h3>March-April: Tender Release Season</h3><p>New financial year starts April 1. Monitor bidplus.gem.gov.in daily for new fogging machine tenders.</p><h3>May-June: Pre-Monsoon Peak</h3><p>Most active procurement period. Municipalities want machines before dengue season begins.</p><h3>July-August: Monsoon Emergency Orders</h3><p>Active mosquito season. Breakdowns happen. Emergency replacement orders spike. Respond same-day.</p><h3>September-October: Post-Monsoon Peak</h3><p>Dengue and malaria peak. State health departments issue additional procurement for outbreak districts.</p><h3>November-December: Agricultural Procurement</h3><p>Farmers and cooperatives buy foggers for crop protection.</p><h2>Highest Volume States</h2><ul><li>Uttar Pradesh, Bihar: May-June and September-October</li><li>Maharashtra: April-May before heavy rains</li><li>Northeast India: Two peaks annually</li></ul><p>Read more: <a href="/knowledge/gem-reseller-guide">GeM Reseller Guide</a> | <a href="/municipal-fogging-programme">Municipal Fogging Programme</a></p>',
  },
  {
    slug: 'msme-procurement-preference-gem-fogging-machine-dealers',
    title: 'MSME Procurement Preference on GeM: How Indian Dealers Win More Government Fogging Machine Bids',
    excerpt: "India's Public Procurement Policy for MSMEs gives government buyers a mandate to prefer MSME sellers. Dealers authorized by MSME OEMs like 100X Circle can win bids even without being the absolute lowest price.",
    category: 'Government Procurement',
    author: '100X Circle',
    order: 104,
    isPublished: true,
    topImage: '',
    inlineImages: [],
    publishedAt: now.toISOString(),
    createdAt: now,
    updatedAt: now,
    content: '<h2>What Is MSME Procurement Preference?</h2><p>The Government of India mandates that central government entities procure at least 25% of annual purchases from MSME-registered sellers. On GeM, this means procurement preference is applied in favour of MSME sellers over non-MSME competitors.</p><h2>How Purchase Price Preference Works</h2><p>Government buyers can award contracts to MSME sellers even if their price is higher than non-MSME sellers — up to a defined preference margin. MSME sellers win more bids than pure price competition would suggest.</p><h2>Benefits for Dealers Authorized by 100X Circle</h2><ol><li>Government buyers procuring from you count toward their 25% MSME mandate.</li><li>Your bid from an MSME-authorized product line is treated more favourably.</li><li>In MSME-reserved categories, being MSME-authorized is the entry requirement.</li></ol><h2>Make in India + MSME = Double Advantage</h2><p>100X Circle is a genuine Indian manufacturer (Gurugram factory). Foreign-manufactured machines do not qualify for Make in India preference. Dealers selling Indian MSME OEM products have a structural advantage in government tenders.</p><p>Read more: <a href="/gem-oem-authorization">GeM OEM Authorization</a> | <a href="/gem-tender-support">Tender Documentation</a> | <a href="/become-a-dealer">Dealer Program</a></p>',
  },
  {
    slug: 'pest-control-operator-fogging-machine-dealer-revenue',
    title: 'From Pest Control Operator to Equipment Dealer: How PCOs Multiply Revenue with Fogging Machine Sales',
    excerpt: 'Pest control operators have a hidden advantage in the fogging machine market — they already have relationships with the buyers. This guide explains how PCOs can add equipment dealership revenue to their service business.',
    category: 'Dealer Guide',
    author: '100X Circle',
    order: 105,
    isPublished: true,
    topImage: '',
    inlineImages: [],
    publishedAt: now.toISOString(),
    createdAt: now,
    updatedAt: now,
    content: '<h2>The Untapped Revenue Stream Most PCOs Ignore</h2><p>If you run a pest control business, you have direct relationships with municipal health officers, housing society managers, and institutional buyers who also procure fogging machines. When a municipality needs to buy machines, they ask their current service contractor first.</p><h2>Two Revenue Streams, One Relationship</h2><ul><li>Service revenue: fogging contracts continue</li><li>Equipment revenue: when clients buy their own machines, you supply them — then win the maintenance contract too</li></ul><h2>The GeM Opportunity</h2><p>PCOs who get OEM authorization from 100X Circle can bid on government fogging machine tenders. PCOs with existing municipal relationships have a meaningful advantage over new entrants.</p><h2>Fleet Expansion Economics</h2><p>5-year annualised cost: Indian fogger (Rs. 40,000) = Rs. 17,000/year total. Korean import (Rs. 1,50,000) = Rs. 48,000/year. The Indian machine costs one-third as much to operate.</p><h2>How to Start</h2><ol><li>WhatsApp +91-7827229116 or email 100xcircle@gmail.com</li><li>Share GST number and operating states</li><li>Register on GeM if not already</li><li>Receive authorization and documentation package</li></ol><p>Read more: <a href="/become-a-dealer">Dealer Program</a> | <a href="/knowledge/fogging-machine-for-pest-control-business">PCO Equipment Guide</a> | <a href="/gem-oem-authorization">GeM OEM Authorization</a></p>',
  },
]

async function main() {
  await client.connect()
  const col = client.db().collection('blogs')
  let inserted = 0
  let skipped = 0

  for (const post of posts) {
    const existing = await col.findOne({ slug: post.slug })
    if (existing) {
      console.log('SKIP (exists):', post.slug)
      skipped++
      continue
    }
    await col.insertOne(post)
    console.log('INSERTED:', post.slug)
    inserted++
  }

  const total = await col.countDocuments()
  console.log('\nResult: inserted=' + inserted + ' skipped=' + skipped + ' total_in_db=' + total)
  await client.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })
