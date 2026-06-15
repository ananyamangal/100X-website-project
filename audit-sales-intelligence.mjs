// audit-sales-intelligence.mjs
// Phase 4A — Revenue Opportunity Audit
// 7 Dimensions: Buyers · Sellers · Models · OEM Displacement · States · Departments · 100X Expansion
// READ-ONLY. No DB writes.
// Usage: node audit-sales-intelligence.mjs

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const l of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

// ── Format helpers ──────────────────────────────────────────────────────────────
const L   = n => n == null ? '—' : '₹' + (n / 1e5).toFixed(1) + 'L';
const Lf  = (n, w=10) => L(n).padStart(w);
const Cr  = n => n == null ? '—' : '₹' + (n / 1e7).toFixed(3) + 'Cr';
const pct = n => n == null ? '—' : n.toFixed(1) + '%';
const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
const rp  = (s, n) => String(s ?? '').padStart(n).slice(-n);
const sep = (ch = '─', n = 80) => ch.repeat(n);

function daysAgo(d) {
  if (!d) return 9999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function recencyFactor(days) {
  if (days <  60) return 1.00;
  if (days < 120) return 0.90;
  if (days < 180) return 0.80;
  if (days < 270) return 0.65;
  if (days < 365) return 0.50;
  if (days < 545) return 0.30;
  if (days < 730) return 0.15;
  return 0.05;
}

function frequencyFactor(contractCount) {
  if (contractCount >= 10) return 1.20;
  if (contractCount >= 5)  return 1.10;
  if (contractCount >= 3)  return 1.00;
  if (contractCount >= 2)  return 0.85;
  return 0.70;
}

// Department keyword classifier
const DEPT_PATTERNS = [
  { key: 'Municipality / Civic Body',  kw: ['municipal','nagar','nigam','corporation','civic','mcd','bbmp','bmc','kmc','pmc','amc','corporation'] },
  { key: 'Health / Medical',           kw: ['health','medical','hospital','ayush','nhm','sanitation','hygiene','public health','dispensary'] },
  { key: 'Urban Development / Housing',kw: ['urban','smart city','housing','development authority','slum','town planning','town & country','town and country','township'] },
  { key: 'Panchayat / Rural Body',     kw: ['panchayat','gram sabha','block develop','zila','zilla','taluk','taluka','janpad','kshetra','vikas pradhikaran'] },
  { key: 'Railways / Metro',           kw: ['railway','rail','metro','konkan','north central','south central','southern railway','eastern railway','western railway'] },
  { key: 'Police / Defence / Paramilitary', kw: ['police','crpf','bsf','cisf','rpf','military','defence','army','navy','air force','constabulary','security force','ndrf','sdrf'] },
  { key: 'Disaster / Fire / Emergency',kw: ['disaster','fire','civil defence','emergency','ndrf','sdrf','rescue','state disaster'] },
  { key: 'Agriculture / Horticulture', kw: ['agriculture','agri','krishi','horticulture','farm','fisheries','animal husbandry','veterinary','kisan','matsya'] },
  { key: 'Education',                  kw: ['education','school','college','university','vidyalaya','kendriya','navodaya','shikshamandal'] },
  { key: 'Forest / Environment',       kw: ['forest','wildlife','environment','ecology','van','aranya','biodiversity'] },
  { key: 'Water / Irrigation',         kw: ['water','irrigation','jal','canal','dam','reservoir','sewerage','drainage'] },
  { key: 'PWD / Infrastructure',       kw: ['public work','pwd','road','highway','bridge','infrastructure','construction'] },
];

function classifyDept(name, orgType, ministry) {
  const hay = [name, orgType, ministry].join(' ').toLowerCase();
  for (const { key, kw } of DEPT_PATTERNS) {
    if (kw.some(k => hay.includes(k))) return key;
  }
  return 'Other Government';
}

// ── Main ────────────────────────────────────────────────────────────────────────
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db        = client.db('100xDB');
const buyersColl    = db.collection('fogging_buyers');
const contractsColl = db.collection('fogging_contracts');
const oemsColl      = db.collection('fogging_oems');
const modelsColl    = db.collection('fogging_models');
const sellersColl   = db.collection('fogging_sellers');

console.log('\n' + '═'.repeat(80));
console.log('  PHASE 4A — SALES INTELLIGENCE AUDIT  |  100X Circle  |  2026-06-15');
console.log('  Data: 1,418 contracts · ₹75.08Cr GMV · 274 buyers · 679 sellers · 34 OEMs');
console.log('═'.repeat(80));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART A — BUYER ATTACK ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n' + '═'.repeat(80));
console.log('  A. BUYER ATTACK ANALYSIS  — Top Revenue Opportunities for 100X Circle');
console.log('═'.repeat(80));

// Load all buyers with their oem_spend breakdown
const allBuyers = await buyersColl.find({}).toArray();

// Load incumbent seller per buyer (top seller by GMV per buyer)
const incSellerAgg = await contractsColl.aggregate([
  { $group: {
    _id: { buyer: '$buyer_canonical', seller_gst: '$seller_gst', seller_name: '$seller_name' },
    gmv: { $sum: '$contract_value_num' },
    contracts: { $sum: 1 },
  }},
  { $sort: { '_id.buyer': 1, gmv: -1 } },
  { $group: {
    _id: '$_id.buyer',
    inc_seller_gst:  { $first: '$_id.seller_gst' },
    inc_seller_name: { $first: '$_id.seller_name' },
    inc_seller_gmv:  { $first: '$gmv' },
    inc_seller_cnt:  { $first: '$contracts' },
  }},
], { allowDiskUse: true }).toArray();
const incSellerMap = new Map(incSellerAgg.map(r => [r._id, r]));

// Score each buyer
const scoredBuyers = allBuyers.map(b => {
  const osp = Array.isArray(b.oem_spend) ? b.oem_spend : [];

  const _100xSpend   = osp.filter(o => o.is_100x).reduce((s, o) => s + (o.gmv || 0), 0);
  const _100xContracts = osp.filter(o => o.is_100x).reduce((s, o) => s + (o.contracts || 0), 0);
  const non100xGmv   = (b.total_gmv || 0) - _100xSpend;
  const has100x      = _100xSpend > 0;

  // Last contract date = max across all oem_spend entries
  const lastContractDates = osp.map(o => o.last_contract).filter(Boolean);
  const lastContract = lastContractDates.length
    ? new Date(Math.max(...lastContractDates.map(d => new Date(d).getTime())))
    : null;
  const days = daysAgo(lastContract);

  // Incumbent OEM = non-100X with highest GMV share
  const nonIncumbents = osp.filter(o => !o.is_100x).sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
  const incumbentOem  = nonIncumbents[0];
  const _100xShare    = b.total_gmv > 0 ? (_100xSpend / b.total_gmv) * 100 : 0;
  const incumbentConcentration = incumbentOem && b.total_gmv > 0
    ? ((incumbentOem.gmv || 0) / b.total_gmv) * 100 : 0;

  // Opportunity score: non-100X GMV × recency × frequency × 100X-affinity bonus
  const rf   = recencyFactor(days);
  const ff   = frequencyFactor(b.contract_count || 0);
  const bonus = has100x ? 1.25 : 1.0; // existing relationship bonus
  const oppScore = non100xGmv * rf * ff * bonus;

  const incSeller = incSellerMap.get(b.buyer_canonical);

  return {
    buyer_canonical:         b.buyer_canonical,
    buyer_display_name:      b.buyer_display_name,
    buyer_state:             b.buyer_state,
    org_type:                b.org_type,
    ministry:                b.ministry,
    total_gmv:               b.total_gmv || 0,
    contract_count:          b.contract_count || 0,
    _100x_spend:             _100xSpend,
    _100x_contracts:         _100xContracts,
    _100x_share:             _100xShare,
    non100x_gmv:             non100xGmv,
    has_100x:                has100x,
    incumbent_oem:           incumbentOem?.brand_name || incumbentOem?.oem_canonical || '—',
    incumbent_oem_share:     incumbentConcentration,
    incumbent_seller_name:   incSeller?.inc_seller_name || '—',
    incumbent_seller_gst:    incSeller?.inc_seller_gst  || null,
    incumbent_seller_gmv:    incSeller?.inc_seller_gmv  || 0,
    last_contract:           lastContract,
    days_since_last:         days,
    recency_factor:          rf,
    oem_count:               new Set(osp.map(o => o.oem_canonical)).size,
    urgency:                 b.urgency || 'medium',
    action_priority:         b.action_priority || 3,
    opportunity_score:       oppScore,
    tier:                    b.rank <= 14 ? 'A' : b.rank <= 50 ? 'B' : 'C',
  };
});

// Sort by opportunity_score
scoredBuyers.sort((a, b) => b.opportunity_score - a.opportunity_score);

const top50Buyers = scoredBuyers.slice(0, 50);

console.log(`\n  ${top50Buyers.length} attack accounts — ranked by estimated revenue opportunity\n`);
console.log(`  ${'#'.padEnd(3)} ${'Buyer'.padEnd(40)} ${'St'.padEnd(4)} ${'Tier'} ${'Total GMV'.padStart(11)} ${'100X%'.padStart(6)} ${'Opp Score'.padStart(11)} ${'Incumbent OEM'.padEnd(18)} ${'Days'}`);
console.log('  ' + sep('─', 118));

for (const [i, b] of top50Buyers.entries()) {
  const name     = pad(b.buyer_display_name, 40);
  const state    = pad((b.buyer_state || '?').slice(0, 3), 4);
  const tier     = b.tier;
  const gmv      = Lf(b.total_gmv, 11);
  const share    = b._100x_share < 0.1 ? ' 0.0%' : pct(b._100x_share).padStart(6);
  const opp      = Lf(b.opportunity_score, 11);
  const incOem   = pad(b.incumbent_oem.slice(0, 17), 18);
  const days     = rp(b.days_since_last === 9999 ? '—' : b.days_since_last + 'd', 5);
  console.log(`  ${rp(i + 1, 3)}. ${name} ${state} ${tier}    ${gmv} ${share} ${opp} ${incOem} ${days}`);
}

// Summary breakdown
const noHist = scoredBuyers.filter(b => !b.has_100x);
const withHist = scoredBuyers.filter(b => b.has_100x);
const totalOpp = scoredBuyers.slice(0, 100).reduce((s, b) => s + b.opportunity_score, 0);
const top10Opp = scoredBuyers.slice(0, 10).reduce((s, b) => s + b.opportunity_score, 0);

console.log('\n  ' + sep('─', 60));
console.log(`  Total addressable opportunity (top 100 buyers): ${Cr(totalOpp)}`);
console.log(`  Top 10 buyers alone:                           ${Cr(top10Opp)}`);
console.log(`  Buyers with ZERO 100X history:     ${noHist.length} / ${scoredBuyers.length}`);
console.log(`  Buyers with existing 100X history: ${withHist.length} / ${scoredBuyers.length}`);

// Top incumbent OEMs in attack targets (top 50)
const incOemCount = {};
for (const b of top50Buyers) {
  const k = b.incumbent_oem;
  incOemCount[k] = (incOemCount[k] || 0) + 1;
}
const topIncOems = Object.entries(incOemCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('\n  Top incumbent OEMs in attack accounts:');
for (const [oem, cnt] of topIncOems) {
  console.log(`    ${pad(oem, 28)} — ${cnt} buyers`);
}

// Urgency breakdown
const urgencyBuckets = { high: 0, medium: 0, low: 0 };
for (const b of top50Buyers) urgencyBuckets[b.urgency] = (urgencyBuckets[b.urgency] || 0) + 1;
console.log(`\n  Urgency in top 50: High=${urgencyBuckets.high}  Medium=${urgencyBuckets.medium}  Low=${urgencyBuckets.low}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART B — SELLER / DEALER RECRUITMENT ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  B. SELLER RELATIONSHIP & RECRUITMENT ANALYSIS');
console.log('═'.repeat(80));

const allSellers = await sellersColl.find({}).toArray();

// Enrich sellers with OEM canonical sets
for (const s of allSellers) {
  const oems = (s.oems_represented || []).map(o => o.oem_canonical || '');
  s._oem_set = new Set(oems);
  s._carries_neptune  = oems.some(o => o.includes('NEPTUNE'));
  s._carries_instafog = oems.some(o => o.includes('INSTA') || o.includes('INSTAFOG'));
  s._carries_sse      = oems.some(o => o.includes('SSE'));
  s._carries_pulsfog  = oems.some(o => o.includes('PULSFOG') || o.includes('PULS'));
  s._carries_spacespray = oems.some(o => o.includes('SPACESPRAY') || o.includes('SPACE SPRAY'));
  s._carries_100x     = s.is_100x_dealer === true;
}

// B1: Current 100X dealer network
const dealers100x = allSellers.filter(s => s._carries_100x).sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  B1. CURRENT 100X DEALER NETWORK (${dealers100x.length} dealers)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Dealer'.padEnd(42)} ${'State'.padEnd(20)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(6)} ${'Buyers'.padStart(7)} ${'OEMs'.padStart(5)}`);
console.log('  ' + sep('─', 100));
for (const [i, s] of dealers100x.entries()) {
  console.log(`  ${rp(i+1,3)}. ${pad(s.seller_display_name,42)} ${pad(s.seller_state||'?',20)} ${Lf(s.total_gmv,10)} ${rp(s.total_contracts,6)} ${rp(s.buyers_served,7)} ${rp(s.oem_count,5)}`);
}

// B2: Neptune sellers NOT carrying 100X — recruitment targets
const neptuneNotCovering100x = allSellers
  .filter(s => s._carries_neptune && !s._carries_100x)
  .sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  B2. NEPTUNE SELLERS — NOT CARRYING 100X (${neptuneNotCovering100x.length} sellers)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Seller'.padEnd(42)} ${'State'.padEnd(20)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(6)} ${'Buyers'.padStart(7)} ${'GST'}`);
console.log('  ' + sep('─', 105));
for (const [i, s] of neptuneNotCovering100x.slice(0, 25).entries()) {
  const gst = s.seller_gst || 'No GST';
  console.log(`  ${rp(i+1,3)}. ${pad(s.seller_display_name,42)} ${pad(s.seller_state||'?',20)} ${Lf(s.total_gmv,10)} ${rp(s.total_contracts,6)} ${rp(s.buyers_served,7)} ${gst}`);
}

// B3: Insta Fog sellers NOT carrying 100X
const instafogNotCovering100x = allSellers
  .filter(s => s._carries_instafog && !s._carries_100x)
  .sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  B3. INSTA FOG SELLERS — NOT CARRYING 100X (${instafogNotCovering100x.length} sellers)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Seller'.padEnd(42)} ${'State'.padEnd(20)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(6)} ${'Buyers'.padStart(7)}`);
console.log('  ' + sep('─', 98));
for (const [i, s] of instafogNotCovering100x.slice(0, 20).entries()) {
  console.log(`  ${rp(i+1,3)}. ${pad(s.seller_display_name,42)} ${pad(s.seller_state||'?',20)} ${Lf(s.total_gmv,10)} ${rp(s.total_contracts,6)} ${rp(s.buyers_served,7)}`);
}

// B4: SSE SAI SHREE sellers NOT carrying 100X
const sseNotCovering100x = allSellers
  .filter(s => s._carries_sse && !s._carries_100x)
  .sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  B4. SSE SAI SHREE SELLERS — NOT CARRYING 100X (${sseNotCovering100x.length} sellers)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Seller'.padEnd(42)} ${'State'.padEnd(20)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(6)} ${'Buyers'.padStart(7)}`);
console.log('  ' + sep('─', 98));
for (const [i, s] of sseNotCovering100x.slice(0, 20).entries()) {
  console.log(`  ${rp(i+1,3)}. ${pad(s.seller_display_name,42)} ${pad(s.seller_state||'?',20)} ${Lf(s.total_gmv,10)} ${rp(s.total_contracts,6)} ${rp(s.buyers_served,7)}`);
}

// B5: Multi-OEM sellers (best partnership targets — already proven distributors)
const multiOemTargets = allSellers
  .filter(s => !s._carries_100x && s.oem_count >= 2)
  .sort((a, b) => (b.buyers_served - a.buyers_served) || (b.total_gmv - a.total_gmv));
console.log(`\n  B5. MULTI-OEM SELLERS NOT CARRYING 100X — Best Partnership Targets (${multiOemTargets.length} total)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Seller'.padEnd(42)} ${'State'.padEnd(18)} ${'GMV'.padStart(10)} ${'Buyers'.padStart(7)} ${'OEMs'.padStart(5)} ${'Brands'}`);
console.log('  ' + sep('─', 110));
for (const [i, s] of multiOemTargets.slice(0, 25).entries()) {
  const brands = (s.oems_represented || []).map(o => o.brand_name || o.oem_canonical).slice(0,4).join(', ');
  console.log(`  ${rp(i+1,3)}. ${pad(s.seller_display_name,42)} ${pad(s.seller_state||'?',18)} ${Lf(s.total_gmv,10)} ${rp(s.buyers_served,7)} ${rp(s.oem_count,5)} ${brands}`);
}

// B6: Summary
const nepOrSseOrInsta = allSellers.filter(s =>
  (s._carries_neptune || s._carries_instafog || s._carries_sse) && !s._carries_100x
);
const highValueTargets = nepOrSseOrInsta.filter(s => s.buyers_served >= 5);
console.log('\n  ' + sep('─', 60));
console.log(`  Total recruitment targets (top-3 OEM carriers, no 100X): ${nepOrSseOrInsta.length}`);
console.log(`  High-value targets (≥5 buyers served):                   ${highValueTargets.length}`);
console.log(`  Multi-OEM distributors not carrying 100X:                ${multiOemTargets.length}`);
const totalTargetGmv = nepOrSseOrInsta.reduce((s, x) => s + (x.total_gmv || 0), 0);
console.log(`  Total GMV flowing through recruitment targets:           ${Cr(totalTargetGmv)}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART C — MODEL / PRODUCT OPPORTUNITY ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  C. MODEL / PRODUCT OPPORTUNITY ANALYSIS');
console.log('═'.repeat(80));

const allModels = await modelsColl.find({}).sort({ total_gmv: -1 }).toArray();

// Enrich each model with 100X status — look at is_100x from contracts
// Since fogging_models may not have is_100x directly, aggregate from contracts
const modelIs100x = await contractsColl.aggregate([
  { $group: {
    _id: '$model_normalized',
    is_100x: { $max: { $cond: ['$is_100x', 1, 0] } },
    buyers: { $addToSet: '$buyer_canonical' },
    unit_prices: { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
  }}
], { allowDiskUse: true }).toArray();
const model100xMap = new Map(modelIs100x.map(r => [r._id, r]));

const enrichedModels = allModels.map(m => {
  const mx  = model100xMap.get(m.model_normalized) || {};
  const ups = mx.unit_prices || [];
  ups.sort((a, b) => a - b);
  const n   = ups.length;
  const p50 = n ? ups[Math.floor(n * 0.5)] : null;
  const pMin = n ? ups[0] : null;
  const pMax = n ? ups[n - 1] : null;
  const variance = (pMin && pMax && pMin > 0) ? ((pMax - pMin) / pMin) * 100 : 0;
  return {
    ...m,
    is_100x:     mx.is_100x === 1,
    buyer_reach: (mx.buyers || []).length,
    p50_price:   p50,
    p_min:       pMin,
    p_max:       pMax,
    price_variance_pct: variance,
    priced_contracts: n,
  };
});

// C1: Top competitor models (not 100X, by GMV)
const competitorModels = enrichedModels.filter(m => !m.is_100x).sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  C1. TOP COMPETITOR MODELS — 100X Has No Direct Competing Product\n`);
console.log(`  ${'#'.padEnd(3)} ${'Model'.padEnd(38)} ${'OEM'.padEnd(20)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(5)} ${'Buyers'.padStart(7)} ${'P50 Price'.padStart(10)}`);
console.log('  ' + sep('─', 100));
for (const [i, m] of competitorModels.slice(0, 30).entries()) {
  const model = pad(m.model_display || m.model_normalized, 38);
  const oem   = pad(m.oem_canonical, 20);
  const gmv   = Lf(m.total_gmv, 10);
  const p50   = m.p50_price ? ('₹' + m.p50_price.toLocaleString('en-IN')).padStart(10) : '       —';
  console.log(`  ${rp(i+1,3)}. ${model} ${oem} ${gmv} ${rp(m.contract_count,5)} ${rp(m.buyer_reach,7)} ${p50}`);
}

// C2: 100X models currently in market
const _100xModels = enrichedModels.filter(m => m.is_100x).sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  C2. 100X MODELS CURRENTLY IN MARKET (${_100xModels.length} models)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Model'.padEnd(40)} ${'GMV'.padStart(10)} ${'Cnts'.padStart(5)} ${'Buyers'.padStart(7)} ${'P50 Price'.padStart(10)}`);
console.log('  ' + sep('─', 80));
for (const [i, m] of _100xModels.slice(0, 15).entries()) {
  const p50 = m.p50_price ? ('₹' + m.p50_price.toLocaleString('en-IN')).padStart(10) : '       —';
  console.log(`  ${rp(i+1,3)}. ${pad(m.model_display||m.model_normalized,40)} ${Lf(m.total_gmv,10)} ${rp(m.contract_count,5)} ${rp(m.buyer_reach,7)} ${p50}`);
}

// C3: High price-variance models (opportunity for 100X price positioning)
const highVariance = enrichedModels
  .filter(m => !m.is_100x && m.priced_contracts >= 3 && m.price_variance_pct > 50)
  .sort((a, b) => b.price_variance_pct - a.price_variance_pct);
console.log(`\n  C3. HIGH PRICE-VARIANCE MODELS — Strategic Price Entry Points (>${50}% spread)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Model'.padEnd(38)} ${'OEM'.padEnd(20)} ${'Min'.padStart(9)} ${'Max'.padStart(9)} ${'Spread'.padStart(8)} ${'GMV'.padStart(10)}`);
console.log('  ' + sep('─', 102));
for (const [i, m] of highVariance.slice(0, 20).entries()) {
  const minP  = m.p_min ? ('₹' + Math.round(m.p_min).toLocaleString('en-IN')).padStart(9) : '        —';
  const maxP  = m.p_max ? ('₹' + Math.round(m.p_max).toLocaleString('en-IN')).padStart(9) : '        —';
  const spread = pct(m.price_variance_pct).padStart(8);
  console.log(`  ${rp(i+1,3)}. ${pad(m.model_display||m.model_normalized,38)} ${pad(m.oem_canonical,20)} ${minP} ${maxP} ${spread} ${Lf(m.total_gmv,10)}`);
}

// Summary
const gapGmv = competitorModels.reduce((s, m) => s + m.total_gmv, 0);
const _100xGmv = _100xModels.reduce((s, m) => s + m.total_gmv, 0);
console.log('\n  ' + sep('─', 60));
console.log(`  Competitor model GMV (100X has no competing product): ${Cr(gapGmv)}`);
console.log(`  100X model GMV (already competing):                   ${Cr(_100xGmv)}`);
console.log(`  Market coverage by 100X:                              ${pct(_100xGmv / (_100xGmv + gapGmv) * 100)}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART D — OEM DISPLACEMENT OPPORTUNITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  D. OEM DISPLACEMENT OPPORTUNITIES');
console.log('═'.repeat(80));

const allOems = await oemsColl.find({}).sort({ total_gmv: -1 }).toArray();

// For each OEM, use pre-computed scoredBuyers to find buyers with/without 100X crossover
const buyerHas100xSet = new Set(scoredBuyers.filter(b => b.has_100x).map(b => b.buyer_canonical));

const oemDisplacement = allOems.filter(o => !o.is_100x).map(o => {
  // Buyers who bought this OEM
  const osp = scoredBuyers.filter(b =>
    (b.buyer_canonical) && b.incumbent_oem.includes(o.oem_short_brand || o.oem_canonical.slice(0, 8))
  );
  // Better: look at buyer oem_spend arrays
  const buyersForOem = allBuyers.filter(b =>
    (b.oem_spend || []).some(s => s.oem_canonical === o.oem_canonical)
  );
  const pureOemBuyers = buyersForOem.filter(b => !buyerHas100xSet.has(b.buyer_canonical));
  const pureOemGmv = buyersForOem
    .filter(b => !buyerHas100xSet.has(b.buyer_canonical))
    .reduce((s, b) => s + ((b.oem_spend||[]).find(sp => sp.oem_canonical === o.oem_canonical)?.gmv || 0), 0);
  const overlapBuyers = buyersForOem.filter(b => buyerHas100xSet.has(b.buyer_canonical));

  return {
    oem_canonical:      o.oem_canonical,
    oem_short:          o.oem_short_brand,
    is_100x:            o.is_100x,
    total_gmv:          o.total_gmv,
    market_share_pct:   o.market_share_gmv,
    buyer_count:        o.buyer_count,
    contract_count:     o.contract_count,
    total_buyers_for_oem:  buyersForOem.length,
    pure_oem_buyers:    pureOemBuyers.length,    // 0 crossover with 100X
    overlap_buyers:     overlapBuyers.length,    // already buying 100X too
    pure_oem_gmv:       pureOemGmv,              // GMV at-risk / displaceable
    displacement_score: pureOemGmv * (1 - (overlapBuyers.length / Math.max(1, buyersForOem.length))),
  };
}).sort((a, b) => b.displacement_score - a.displacement_score);

console.log('\n  OEM displacement opportunity = GMV held by buyers with ZERO 100X history\n');
console.log(`  ${'#'.padEnd(3)} ${'OEM'.padEnd(26)} ${'Mkt Share'.padStart(10)} ${'Total GMV'.padStart(10)} ${'Buyers'.padStart(7)} ${'Pure OEM'.padStart(9)} ${'Overlap'.padStart(8)} ${'Displace GMV'.padStart(13)}`);
console.log('  ' + sep('─', 102));
for (const [i, o] of oemDisplacement.entries()) {
  console.log(`  ${rp(i+1,3)}. ${pad(o.oem_canonical,26)} ${pct(o.market_share_pct).padStart(10)} ${Lf(o.total_gmv,10)} ${rp(o.buyer_count,7)} ${rp(o.pure_oem_buyers,9)} ${rp(o.overlap_buyers,8)} ${Lf(o.pure_oem_gmv,13)}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART E — STATE OPPORTUNITY ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  E. STATE OPPORTUNITY ANALYSIS');
console.log('═'.repeat(80));

const stateAgg = await contractsColl.aggregate([
  { $group: {
    _id: '$buyer_state',
    total_gmv:   { $sum: '$contract_value_num' },
    contracts:   { $sum: 1 },
    buyers:      { $addToSet: '$buyer_canonical' },
    sellers:     { $addToSet: { $cond: ['$seller_gst', '$seller_gst', '$seller_name'] } },
    gmv_100x:    { $sum: { $cond: ['$is_100x', '$contract_value_num', 0] } },
    cnt_100x:    { $sum: { $cond: ['$is_100x', 1, 0] } },
    // OEM mix — top 5 OEMs per state via push (we'll count client-side)
    oem_list:    { $push: '$oem_canonical' },
    last_contract: { $max: '$contract_date' },
  }},
], { allowDiskUse: true }).toArray();

// Compute state-level 100X penetration and scores
const stateData = stateAgg.map(s => {
  // OEM frequency map
  const oemFreq = {};
  for (const o of s.oem_list) oemFreq[o] = (oemFreq[o] || 0) + 1;
  const topOems = Object.entries(oemFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const non100xGmv     = s.total_gmv - s.gmv_100x;
  const penetration100x = s.total_gmv > 0 ? (s.gmv_100x / s.total_gmv) * 100 : 0;
  const days = daysAgo(s.last_contract);
  const rf   = recencyFactor(days);
  const oppScore = non100xGmv * rf;

  return {
    state:           s._id || '(Unknown)',
    total_gmv:       s.total_gmv,
    contracts:       s.contracts,
    buyers:          s.buyers.length,
    sellers:         s.sellers.length,
    gmv_100x:        s.gmv_100x,
    cnt_100x:        s.cnt_100x,
    non100x_gmv:     non100xGmv,
    penetration_pct: penetration100x,
    top_oems:        topOems,
    last_contract:   s.last_contract,
    days_since:      days,
    opp_score:       oppScore,
  };
}).sort((a, b) => b.opp_score - a.opp_score);

console.log('\n  States ranked by revenue opportunity (non-100X GMV × recency)\n');
console.log(`  ${'#'.padEnd(3)} ${'State'.padEnd(24)} ${'Total GMV'.padStart(10)} ${'100X GMV'.padStart(10)} ${'Pen%'.padStart(6)} ${'Buyers'.padStart(7)} ${'Sellers'.padStart(8)} ${'Opp Score'.padStart(10)} ${'Top OEMs'}`);
console.log('  ' + sep('─', 115));
for (const [i, s] of stateData.entries()) {
  const topOemsStr = s.top_oems.slice(0,2).join(', ');
  console.log(`  ${rp(i+1,3)}. ${pad(s.state,24)} ${Lf(s.total_gmv,10)} ${Lf(s.gmv_100x,10)} ${pct(s.penetration_pct).padStart(6)} ${rp(s.buyers,7)} ${rp(s.sellers,8)} ${Lf(s.opp_score,10)} ${topOemsStr}`);
}

const totalStateOpp = stateData.reduce((s, x) => s + x.non100x_gmv, 0);
const zeroStates    = stateData.filter(s => s.gmv_100x === 0);
console.log('\n  ' + sep('─', 60));
console.log(`  States where 100X has ZERO presence:  ${zeroStates.length} states → ${Cr(zeroStates.reduce((s,x) => s+x.total_gmv,0))} GMV`);
console.log(`  Total non-100X state GMV:              ${Cr(totalStateOpp)}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART F — DEPARTMENT / MINISTRY OPPORTUNITY ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  F. DEPARTMENT / MINISTRY OPPORTUNITY ANALYSIS');
console.log('═'.repeat(80));

// Classify every buyer
const deptMap = {};
for (const b of allBuyers) {
  const dept = classifyDept(b.buyer_display_name, b.org_type, b.ministry);
  if (!deptMap[dept]) deptMap[dept] = { buyers: 0, total_gmv: 0, gmv_100x: 0, contracts: 0, buyer_list: [] };
  deptMap[dept].buyers++;
  deptMap[dept].total_gmv    += b.total_gmv || 0;
  deptMap[dept].contracts    += b.contract_count || 0;
  deptMap[dept].buyer_list.push({ name: b.buyer_display_name, gmv: b.total_gmv });

  // 100X GMV from oem_spend
  const gmv100x = (b.oem_spend || []).filter(o => o.is_100x).reduce((s, o) => s + (o.gmv || 0), 0);
  deptMap[dept].gmv_100x += gmv100x;
}

const deptList = Object.entries(deptMap).map(([dept, d]) => ({
  dept,
  buyers:        d.buyers,
  total_gmv:     d.total_gmv,
  gmv_100x:      d.gmv_100x,
  non100x_gmv:   d.total_gmv - d.gmv_100x,
  contracts:     d.contracts,
  pen_pct:       d.total_gmv > 0 ? (d.gmv_100x / d.total_gmv) * 100 : 0,
  top_buyers:    d.buyer_list.sort((a, b) => b.gmv - a.gmv).slice(0, 3).map(b => b.name.slice(0, 30)),
})).sort((a, b) => b.total_gmv - a.total_gmv);

console.log('\n  Department / Ministry segment analysis\n');
console.log(`  ${'Department'.padEnd(34)} ${'Buyers'.padStart(7)} ${'Cnts'.padStart(6)} ${'Total GMV'.padStart(10)} ${'100X GMV'.padStart(10)} ${'100X Pen%'.padStart(10)}`);
console.log('  ' + sep('─', 82));
for (const d of deptList) {
  console.log(`  ${pad(d.dept,34)} ${rp(d.buyers,7)} ${rp(d.contracts,6)} ${Lf(d.total_gmv,10)} ${Lf(d.gmv_100x,10)} ${pct(d.pen_pct).padStart(10)}`);
}

// Top buyers per dept (for targeting)
console.log('\n  Top buyers by department:\n');
for (const d of deptList.slice(0, 8)) {
  console.log(`  ${pad(d.dept, 34)} — ${d.top_buyers.join(' | ')}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART G — 100X EXPANSION OPPORTUNITIES (Buyers already on 100X — grow share)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  G. 100X EXPANSION OPPORTUNITIES — Share of Wallet Growth');
console.log('═'.repeat(80));

// Buyers who have bought 100X but also buy competitors
const expansionBuyers = scoredBuyers
  .filter(b => b.has_100x && b.non100x_gmv > 0)
  .sort((a, b) => b.non100x_gmv - a.non100x_gmv);

console.log(`\n  ${expansionBuyers.length} buyers already in 100X orbit but spending on competitors\n`);
console.log(`  ${'#'.padEnd(3)} ${'Buyer'.padEnd(40)} ${'St'.padEnd(4)} ${'100X GMV'.padStart(10)} ${'100X%'.padStart(7)} ${'Non-100X GMV'.padStart(13)} ${'Incumbent OEM'.padEnd(20)} ${'Days'}`);
console.log('  ' + sep('─', 110));
for (const [i, b] of expansionBuyers.slice(0, 30).entries()) {
  const days = rp(b.days_since_last === 9999 ? '—' : b.days_since_last + 'd', 5);
  console.log(`  ${rp(i+1,3)}. ${pad(b.buyer_display_name,40)} ${pad((b.buyer_state||'?').slice(0,3),4)} ${Lf(b._100x_spend,10)} ${pct(b._100x_share).padStart(7)} ${Lf(b.non100x_gmv,13)} ${pad(b.incumbent_oem.slice(0,19),20)} ${days}`);
}

// Buyers who are 100% 100X (retention watchlist)
const pure100x = scoredBuyers.filter(b => b.has_100x && b.non100x_gmv === 0)
  .sort((a, b) => b.total_gmv - a.total_gmv);
console.log(`\n  100X-ONLY BUYERS — Retention Watchlist (${pure100x.length} buyers, full 100X loyalty)\n`);
console.log(`  ${'#'.padEnd(3)} ${'Buyer'.padEnd(40)} ${'State'.padEnd(22)} ${'Total GMV'.padStart(10)} ${'Cnts'.padStart(6)} ${'Days'}`);
console.log('  ' + sep('─', 90));
for (const [i, b] of pure100x.slice(0, 15).entries()) {
  const days = rp(b.days_since_last === 9999 ? '—' : b.days_since_last + 'd', 5);
  console.log(`  ${rp(i+1,3)}. ${pad(b.buyer_display_name,40)} ${pad(b.buyer_state||'?',22)} ${Lf(b.total_gmv,10)} ${rp(b.contract_count,6)} ${days}`);
}

const totalExpansionOpp = expansionBuyers.reduce((s, b) => s + b.non100x_gmv, 0);
console.log('\n  ' + sep('─', 60));
console.log(`  Total expansion GMV leaking to competitors: ${Cr(totalExpansionOpp)}`);
console.log(`  100%-loyal buyers (retention risk):         ${pure100x.length}`);
console.log(`  100%-loyal GMV to protect:                  ${Cr(pure100x.reduce((s,b)=>s+b.total_gmv,0))}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PART H — PROPOSED SALES COMMAND CENTER ARCHITECTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n\n' + '═'.repeat(80));
console.log('  H. PROPOSED SALES COMMAND CENTER — DATA-DRIVEN ARCHITECTURE');
console.log('═'.repeat(80));

// Compute key numbers for the recommendation
const tier_A_opp = scoredBuyers.filter(b => b.tier === 'A').reduce((s,b) => s+b.opportunity_score,0);
const tier_A_pure = scoredBuyers.filter(b => b.tier === 'A' && !b.has_100x);
const top10States = stateData.slice(0, 10);
const topRecruitTargets = allSellers.filter(s =>
  !s._carries_100x && (s._carries_neptune || s._carries_instafog || s._carries_sse) && s.buyers_served >= 5
).sort((a, b) => b.buyers_served - a.buyers_served);
const totalCompetitorModelGmv = competitorModels.reduce((s, m) => s + m.total_gmv, 0);

console.log(`
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  KEY NUMBERS DISCOVERED                                                 │
  ├─────────────────────────────────────────────────────────────────────────┤
  │  Total addressable GMV (excl. 100X existing):       ${Cr(tier_A_opp + totalExpansionOpp).padEnd(13)}          │
  │  Tier A buyers with ZERO 100X history:              ${rp(tier_A_pure.length, 2)} buyers                   │
  │  High-value dealer recruitment targets:             ${rp(highValueTargets.length, 2)} dealers                  │
  │  States with 0% 100X penetration:                  ${rp(zeroStates.length, 2)} states                    │
  │  Competitor model GMV 100X can't contest yet:       ${Cr(totalCompetitorModelGmv).padEnd(13)}          │
  │  Expansion GMV leaking from existing 100X buyers:   ${Cr(totalExpansionOpp).padEnd(13)}          │
  └─────────────────────────────────────────────────────────────────────────┘

  PROPOSED SALES COMMAND CENTER SECTIONS
  ────────────────────────────────────────────────────────────────────────────

  SECTION 1 — ATTACK ACCOUNTS BOARD
  Purpose:  Prioritized list of all 274 buyers with opportunity score, tier,
            incumbent OEM, incumbent dealer, recency, and recommended action.
  Filter:   Tier / State / OEM / Has100X / Urgency / Days-since-last
  Action:   Click buyer → Buyer 360. Export CSV. Mark "contacted" (new field).
  Key data: opportunity_score, tier, incumbent_oem, incumbent_seller, urgency,
            days_since_last, non100x_gmv, _100x_share
  Source:   fogging_buyers (pre-scored) + contract agg for incumbent seller

  SECTION 2 — DEALER NETWORK MAP
  Purpose:  Show current 12 dealers + 679 total sellers on a state heatmap.
            Highlight recruitment targets (Neptune/Insta/SSE carriers, no 100X).
  Filter:   State / OEM / is_100x / multi_oem / buyers_served threshold
  Action:   Click seller → Seller 360. "Recruit" button. Filtered export.
  Key data: is_100x_dealer, oems_represented, buyers_served, seller_state, gmv
  Source:   fogging_sellers

  SECTION 3 — STATE OPPORTUNITY HEATMAP
  Purpose:  India state map with 100X penetration colour scale.
            Bar chart: total GMV vs 100X GMV per state.
  Rank:     States by opportunity score (non100x_gmv × recency_factor)
  Top 5:    ${top10States.slice(0,5).map(s => s.state.slice(0,12)).join(' · ')}
  Source:   fogging_contracts aggregate by buyer_state

  SECTION 4 — PRODUCT / MODEL GAP BOARD
  Purpose:  Show which competitor models dominate segments where 100X has
            no competing product. Enable product roadmap decisions.
  Columns:  Model, OEM, GMV, Buyers, P50 Price, Price Variance, 100X Gap
  Filter:   OEM / is_100x / price range / buyer count
  Source:   fogging_models + fogging_contracts unit_price agg

  SECTION 5 — OEM DISPLACEMENT TRACKER
  Purpose:  Rank competitors by displaceability (pure-OEM buyer GMV).
            Show for each OEM: how many buyers have ZERO crossover with 100X.
  Visual:   Funnel: Total OEM buyers → Overlap buyers → Pure OEM (uncontested)
  Source:   fogging_buyers oem_spend + fogging_oems

  SECTION 6 — DEPARTMENT INTELLIGENCE
  Purpose:  GMV by department type (Municipality, Health, Railways, etc.).
            Show 100X penetration per segment.
  Top dept: ${deptList.slice(0,4).map(d => d.dept.slice(0,18)).join(' · ')}
  Source:   fogging_buyers classified by org_type/ministry/name keywords

  SECTION 7 — 100X EXPANSION BOARD (Share of Wallet)
  Purpose:  Buyers already buying 100X but still spending on competitors.
            Rank by non-100X leakage GMV. Highest upsell probability.
  Action:   Click → Buyer 360 → see which OEM/model they're buying elsewhere.
  Source:   fogging_buyers oem_spend filtered to has_100x=true + non100x_gmv>0

  ────────────────────────────────────────────────────────────────────────────

  REQUIRED COLLECTIONS (all exist, no new collections needed)
  ────────────────────────────────────────────────────────────────────────────
  fogging_buyers    — add: opportunity_score, incumbent_seller_gst fields
  fogging_sellers   — ready as-is
  fogging_oems      — ready as-is
  fogging_models    — ready as-is
  fogging_contracts — ready as-is (state/dept agg computed live)

  REQUIRED NEW API ROUTES
  ────────────────────────────────────────────────────────────────────────────
  GET /api/fogging/sales/attack-accounts
      Params: tier, state, oem, has_100x, urgency, sort, page
      Returns: scored + ranked buyer list with opportunity_score, incumbent fields

  GET /api/fogging/sales/state-heatmap
      Returns: all states with total_gmv, gmv_100x, penetration_pct, opp_score

  GET /api/fogging/sales/model-gaps
      Returns: competitor models with pricing stats, 100X gap flag

  GET /api/fogging/sales/oem-displacement
      Returns: OEMs ranked by pure_oem_gmv (buyers with no 100X crossover)

  GET /api/fogging/sales/departments
      Returns: department segments with GMV, 100X penetration, top buyers

  GET /api/fogging/sales/expansion
      Returns: buyers with existing 100X + non100x_gmv > 0, sorted by leakage

  GET /api/fogging/sales/dealer-targets
      Params: oem, state, min_buyers, has_100x
      Returns: sellers filtered as recruitment targets

  RECOMMENDED BUILD ORDER (data-driven)
  ────────────────────────────────────────────────────────────────────────────
  Priority 1 — Attack Accounts Board (highest ROI, directly actionable)
  Priority 2 — Dealer Network Map + Recruitment targets (12→50 dealers goal)
  Priority 3 — State Opportunity Heatmap (geographic expansion strategy)
  Priority 4 — 100X Expansion Board (protect + grow existing accounts)
  Priority 5 — Product Gap Board (longer-range, informs product roadmap)
  Priority 6 — OEM Displacement Tracker (strategic, slower cycle)
  Priority 7 — Department Intelligence (niche targeting, seasonal patterns)

  ────────────────────────────────────────────────────────────────────────────
  WHAT SHOULD ACTUALLY BE BUILT FIRST
  ────────────────────────────────────────────────────────────────────────────
  The data shows ${tier_A_pure.length} Tier A buyers with ZERO 100X history spending heavily on
  Neptune/SSE. The top 10 alone represent ${Cr(top10Opp)} in scorable opportunity.
  Meanwhile ${highValueTargets.length} high-value dealers (≥5 buyers each) carry competitors
  but not 100X — they already know how to sell in this market.

  Build Attack Accounts Board + Dealer Recruitment side-by-side:
  one board tells you WHO to sell to, the other tells you WHO can sell for you.

  The state heatmap then answers WHERE to focus dealer recruitment effort —
  states like ${top10States.slice(0,3).map(s=>s.state).join(', ')} have the highest non-100X GMV
  and enough existing sellers to recruit from.

`);

await client.close();
console.log('═'.repeat(80));
console.log('  Audit complete.');
console.log('═'.repeat(80) + '\n');
