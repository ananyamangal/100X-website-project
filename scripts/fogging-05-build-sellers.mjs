// fogging-05-build-sellers.mjs
// Phase 3A — Build fogging_sellers from fogging_contracts + gem_contracts enrichment
// Idempotent: full replace on each run
// Run AFTER fogging-01-build-contracts.mjs

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const l of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const DB = '100xDB';

const STATE_MAP = {
  '01':'J&K','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand',
  '06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar',
  '11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam',
  '19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh',
  '23':'Madhya Pradesh','24':'Gujarat','25':'Daman & Diu','26':'Dadra & NH',
  '27':'Maharashtra','28':'Andhra Pradesh (Old)','29':'Karnataka','30':'Goa',
  '31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry',
  '35':'A&N Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh',
  '96':'Foreign','97':'Other Territory','99':'Centre Jurisdiction',
};

function decodeGstState(gst) {
  return (gst && gst.length >= 2) ? (STATE_MAP[gst.slice(0, 2)] || null) : null;
}

function toCanonical(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80);
}

function percentiles(arr) {
  if (!arr || !arr.length) return { min: null, max: null, avg: null, p50: null };
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const idx = 0.5 * (n - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return {
    min: s[0],
    max: s[n - 1],
    avg: Math.round(s.reduce((a, b) => a + b, 0) / n),
    p50: Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo)),
  };
}

async function ensureIndexes(coll) {
  const defs = [
    [{ seller_slug: 1 },                       { unique: true,  name: 'uniq_slug'        }],
    [{ seller_gst: 1 },                        { sparse: true,  name: 'idx_gst'          }],
    [{ seller_canonical: 1 },                  {                name: 'idx_canonical'     }],
    [{ total_gmv: -1 },                        {                name: 'idx_gmv'           }],
    [{ total_contracts: -1 },                  {                name: 'idx_cnt'           }],
    [{ seller_state: 1, total_gmv: -1 },       {                name: 'cidx_state_gmv'   }],
    [{ is_100x_dealer: 1, total_gmv: -1 },     {                name: 'cidx_100x_gmv'    }],
    [{ oem_count: -1, total_gmv: -1 },         {                name: 'cidx_oem_gmv'     }],
    [{ last_contract_date: -1 },               {                name: 'idx_last'         }],
    [{ has_gst: 1 },                           {                name: 'idx_hasgst'       }],
  ];
  for (const [k, o] of defs) await coll.createIndex(k, o).catch(() => {});
}

async function twoPassAgg(fc, groupKey, matchFilter, extraFields = {}) {
  return fc.aggregate([
    { $match: matchFilter },
    { $group: {
      _id:                 groupKey,
      seller_name_sample:  { $first: '$seller_name' },
      total_gmv:           { $sum: '$contract_value_num' },
      total_contracts:     { $sum: 1 },
      first_contract_date: { $min: '$contract_date' },
      last_contract_date:  { $max: '$contract_date' },
      buyers:              { $addToSet: '$buyer_canonical' },
      buyer_display_names: { $addToSet: '$buyer_display_name' },
      buyer_states:        { $addToSet: '$buyer_state' },
      org_types:           { $addToSet: '$org_type' },
      oems:                { $addToSet: '$oem_canonical' },
      models:              { $addToSet: '$model_normalized' },
      gemc_nos:            { $push: '$gemc_no' },
      unit_prices:         { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
      is_100x_flag:        { $max: { $cond: ['$is_100x', 1, 0] } },
      ...extraFields,
    }},
    { $sort: { total_gmv: -1 } },
  ], { allowDiskUse: true }).toArray();
}

async function subAgg(fc, sellerKeyExpr, groupExtra, matchFilter = {}) {
  return fc.aggregate([
    { $match: matchFilter },
    { $addFields: { _sk: sellerKeyExpr } },
    { $group: { _id: { sk: '$_sk', ...groupExtra._groupId }, ...groupExtra._fields } },
    { $sort: { total_gmv: -1 } },
  ], { allowDiskUse: true }).toArray();
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db   = client.db(DB);
  const fc   = db.collection('fogging_contracts');
  const gc   = db.collection('gem_contracts');
  const coll = db.collection('fogging_sellers');

  console.log('═'.repeat(64));
  console.log('  Phase 3A — fogging_sellers builder');
  console.log('═'.repeat(64));

  await ensureIndexes(coll);
  console.log('✓ Indexes ready');

  // ── Pass 1: sellers with GSTIN ─────────────────────────────────────────────
  const HAS_GST  = { $and: [{ seller_gst: { $ne: null } }, { seller_gst: { $nin: ['', null] } }] };
  const NO_GST   = { $or:  [{ seller_gst: null }, { seller_gst: '' }] };

  const gstSellers  = await twoPassAgg(fc, '$seller_gst',  HAS_GST,  { gst_val: { $first: '$seller_gst'  } });
  const noGstSellers= await twoPassAgg(fc, '$seller_name', NO_GST,   {});
  console.log(`✓ Pass 1: ${gstSellers.length} GST sellers | Pass 2: ${noGstSellers.length} no-GST sellers`);

  // ── Enrich from gem_contracts ───────────────────────────────────────────────
  const allGsts = gstSellers.map(s => s._id).filter(Boolean);
  const gemDocs = await gc.aggregate([
    { $match: { seller_gst: { $in: allGsts } } },
    { $group: {
      _id:                    '$seller_gst',
      seller_canonical:       { $first: '$seller_name_canonical' },
      seller_name_raw:        { $first: '$seller_name_raw' },
      seller_address:         { $first: '$seller_address' },
      seller_email:           { $first: '$seller_email' },
      seller_phone:           { $first: '$seller_phone' },
      seller_pincode:         { $first: '$seller_pincode' },
      seller_state:           { $first: '$seller_state' },
      seller_gem_id:          { $first: '$seller_gem_id' },
      seller_msme:            { $first: '$seller_msme' },
      seller_msme_number:     { $first: '$seller_msme_number' },
      seller_gender:          { $first: '$seller_gender_category' },
      is_reseller:            { $first: '$reseller_indicator' },
      is_oem_seller:          { $first: '$oem_indicator' },
      is_manufacturer:        { $first: '$manufacturer_indicator' },
      selling_as:             { $first: '$selling_as' },
    }},
  ], { allowDiskUse: true }).toArray();
  const enrichMap = new Map(gemDocs.map(g => [g._id, g]));
  console.log(`✓ gem_contracts enrichment: ${gemDocs.length} / ${allGsts.length} matched`);

  // ── Per-seller OEM breakdown (both passes combined via seller_slug key) ─────
  const oemAggGst = await fc.aggregate([
    { $match: HAS_GST },
    { $group: {
      _id:        { sk: '$seller_gst', oem: '$oem_canonical' },
      brand_name: { $first: '$oem_short_brand' },
      gmv:        { $sum: '$contract_value_num' },
      contracts:  { $sum: 1 },
      is_100x:    { $first: '$is_100x' },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const oemAggNoGst = await fc.aggregate([
    { $match: NO_GST },
    { $group: {
      _id:        { sk: '$seller_name', oem: '$oem_canonical' },
      brand_name: { $first: '$oem_short_brand' },
      gmv:        { $sum: '$contract_value_num' },
      contracts:  { $sum: 1 },
      is_100x:    { $first: '$is_100x' },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const oemBreakMap = new Map();
  for (const r of [...oemAggGst, ...oemAggNoGst]) {
    const sk = r._id.sk;
    if (!oemBreakMap.has(sk)) oemBreakMap.set(sk, []);
    oemBreakMap.get(sk).push({
      oem_canonical: r._id.oem,
      brand_name:    r.brand_name,
      gmv:           r.gmv,
      contracts:     r.contracts,
      is_100x:       r.is_100x || false,
    });
  }

  // ── Per-seller buyer breakdown (top 15 per seller) ─────────────────────────
  const buyerAggGst = await fc.aggregate([
    { $match: HAS_GST },
    { $group: {
      _id:                { sk: '$seller_gst', buyer: '$buyer_canonical' },
      buyer_display_name: { $first: '$buyer_display_name' },
      buyer_state:        { $first: '$buyer_state' },
      gmv:                { $sum: '$contract_value_num' },
      contracts:          { $sum: 1 },
      last_purchase:      { $max: '$contract_date' },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const buyerAggNoGst = await fc.aggregate([
    { $match: NO_GST },
    { $group: {
      _id:                { sk: '$seller_name', buyer: '$buyer_canonical' },
      buyer_display_name: { $first: '$buyer_display_name' },
      buyer_state:        { $first: '$buyer_state' },
      gmv:                { $sum: '$contract_value_num' },
      contracts:          { $sum: 1 },
      last_purchase:      { $max: '$contract_date' },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const buyerBreakMap = new Map();
  for (const r of [...buyerAggGst, ...buyerAggNoGst]) {
    const sk = r._id.sk;
    if (!buyerBreakMap.has(sk)) buyerBreakMap.set(sk, []);
    if (buyerBreakMap.get(sk).length < 15)
      buyerBreakMap.get(sk).push({
        buyer_canonical:    r._id.buyer,
        buyer_display_name: r.buyer_display_name,
        buyer_state:        r.buyer_state,
        gmv:                r.gmv,
        contracts:          r.contracts,
        last_purchase:      r.last_purchase,
      });
  }

  // ── Per-seller model breakdown (top 15 per seller) ─────────────────────────
  const modelAggGst = await fc.aggregate([
    { $match: HAS_GST },
    { $group: {
      _id:         { sk: '$seller_gst', model: '$model_normalized' },
      model_raw:   { $first: '$model_raw' },
      oem:         { $first: '$oem_canonical' },
      gmv:         { $sum: '$contract_value_num' },
      contracts:   { $sum: 1 },
      unit_prices: { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const modelAggNoGst = await fc.aggregate([
    { $match: NO_GST },
    { $group: {
      _id:         { sk: '$seller_name', model: '$model_normalized' },
      model_raw:   { $first: '$model_raw' },
      oem:         { $first: '$oem_canonical' },
      gmv:         { $sum: '$contract_value_num' },
      contracts:   { $sum: 1 },
      unit_prices: { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
    }},
    { $sort: { gmv: -1 } },
  ], { allowDiskUse: true }).toArray();

  const modelBreakMap = new Map();
  for (const r of [...modelAggGst, ...modelAggNoGst]) {
    const sk = r._id.sk;
    if (!modelBreakMap.has(sk)) modelBreakMap.set(sk, []);
    if (modelBreakMap.get(sk).length < 15) {
      const pc = percentiles(r.unit_prices || []);
      modelBreakMap.get(sk).push({
        model_normalized:  r._id.model,
        model_raw:         r.model_raw,
        oem_canonical:     r.oem,
        gmv:               r.gmv,
        contracts:         r.contracts,
        avg_unit_price:    pc.avg,
        median_unit_price: pc.p50,
      });
    }
  }

  // ── Yearly GMV ─────────────────────────────────────────────────────────────
  const yearAggGst = await fc.aggregate([
    { $match: HAS_GST },
    { $group: { _id: { sk: '$seller_gst', year: '$contract_year' }, gmv: { $sum: '$contract_value_num' }, contracts: { $sum: 1 } } },
    { $sort: { '_id.year': 1 } },
  ], { allowDiskUse: true }).toArray();

  const yearAggNoGst = await fc.aggregate([
    { $match: NO_GST },
    { $group: { _id: { sk: '$seller_name', year: '$contract_year' }, gmv: { $sum: '$contract_value_num' }, contracts: { $sum: 1 } } },
    { $sort: { '_id.year': 1 } },
  ], { allowDiskUse: true }).toArray();

  const yearMap = new Map();
  for (const r of [...yearAggGst, ...yearAggNoGst]) {
    const sk = r._id.sk;
    if (!yearMap.has(sk)) yearMap.set(sk, []);
    yearMap.get(sk).push({ year: r._id.year, gmv: r.gmv, contracts: r.contracts });
  }
  console.log(`✓ OEM / buyer / model / yearly breakdowns ready`);

  // ── Build seller docs ───────────────────────────────────────────────────────
  const ops = [];
  const now = Date.now();

  function buildDoc(row, aggregateKey, hasGst) {
    const sk      = aggregateKey; // seller_gst or seller_name
    const enrich  = hasGst ? (enrichMap.get(sk) || {}) : {};
    const sellerSlug = hasGst ? sk : 'nogstn__' + toSlug(sk);
    const displayName = row.seller_name_sample || sk || '';
    const canonicalName = toCanonical(enrich.seller_canonical || displayName);
    const sellerState   = enrich.seller_state || decodeGstState(hasGst ? sk : null);
    const pc = percentiles(row.unit_prices || []);
    const oemBreak   = oemBreakMap.get(sk) || [];
    const buyerBreak = buyerBreakMap.get(sk) || [];
    const modelBreak = modelBreakMap.get(sk) || [];
    const is100x     = (row.is_100x_flag === 1) || oemBreak.some(o => o.is_100x);

    return {
      seller_slug:           sellerSlug,
      seller_gst:            hasGst ? sk : null,
      seller_canonical:      canonicalName,
      seller_display_name:   displayName,
      seller_name_raw:       enrich.seller_name_raw || displayName,
      seller_state:          sellerState,
      seller_state_code:     hasGst ? sk.slice(0, 2) : null,
      seller_address:        enrich.seller_address  || null,
      seller_email:          enrich.seller_email    || null,
      seller_phone:          enrich.seller_phone    || null,
      seller_pincode:        enrich.seller_pincode  || null,
      seller_gem_id:         enrich.seller_gem_id   || null,
      seller_msme:           enrich.seller_msme     || null,
      seller_msme_number:    enrich.seller_msme_number || null,
      seller_gender:         enrich.seller_gender   || null,
      is_reseller:           enrich.is_reseller     ?? null,
      is_oem_seller:         enrich.is_oem_seller   ?? null,
      is_manufacturer:       enrich.is_manufacturer ?? null,
      selling_as:            enrich.selling_as      || null,
      has_gst:               hasGst,
      is_100x_dealer:        is100x,
      is_anomalous:          !hasGst && (row.total_contracts > 5 || (oemBreak.length > 2)),

      total_gmv:             row.total_gmv,
      total_contracts:       row.total_contracts,
      average_contract_value: Math.round((row.total_gmv || 0) / Math.max(row.total_contracts, 1)),
      first_contract_date:   row.first_contract_date,
      last_contract_date:    row.last_contract_date,
      days_since_last:       Math.round((now - new Date(row.last_contract_date).getTime()) / 86400000),

      buyers_served:         (row.buyers || []).filter(Boolean).length,
      states_served:         (row.buyer_states || []).filter(Boolean).length,
      oem_count:             (row.oems || []).filter(Boolean).length,
      model_count:           (row.models || []).filter(Boolean).length,
      departments_served:    (row.org_types || []).filter(Boolean).length,
      buyer_states:          (row.buyer_states || []).filter(Boolean).sort(),

      oems_represented:      oemBreak,
      top_buyers:            buyerBreak,
      models_sold:           modelBreak,
      yearly_gmv:            yearMap.get(sk) || [],

      top_buyer:             buyerBreak[0]?.buyer_canonical || null,
      top_buyer_display:     buyerBreak[0]?.buyer_display_name || null,
      top_oem:               oemBreak[0]?.oem_canonical || null,
      top_model:             modelBreak[0]?.model_normalized || null,
      top_model_raw:         modelBreak[0]?.model_raw || null,

      avg_unit_price:        pc.avg,
      median_unit_price:     pc.p50,
      min_unit_price:        pc.min,
      max_unit_price:        pc.max,
      priced_contract_count: (row.unit_prices || []).length,

      contract_ids:          row.gemc_nos || [],
      updated_at:            new Date(),
    };
  }

  for (const s of gstSellers) {
    const doc = buildDoc(s, s._id, true);
    ops.push({ replaceOne: { filter: { seller_slug: doc.seller_slug }, replacement: doc, upsert: true } });
  }
  for (const s of noGstSellers) {
    const doc = buildDoc(s, s._id, false);
    ops.push({ replaceOne: { filter: { seller_slug: doc.seller_slug }, replacement: doc, upsert: true } });
  }
  console.log(`✓ Built ${ops.length} seller docs (${gstSellers.length} GST + ${noGstSellers.length} no-GST)`);

  if (ops.length) await coll.bulkWrite(ops, { ordered: false });
  console.log(`✓ Written to fogging_sellers`);

  // ── Verification ────────────────────────────────────────────────────────────
  const [count, gmvAgg, noGstCount, dupCheck] = await Promise.all([
    coll.countDocuments(),
    coll.aggregate([{ $group: { _id: null, gmv: { $sum: '$total_gmv' }, contracts: { $sum: '$total_contracts' } } }]).toArray(),
    coll.countDocuments({ has_gst: false }),
    coll.aggregate([{ $group: { _id: '$seller_slug', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]).toArray(),
  ]);

  const totalGmv   = gmvAgg[0]?.gmv || 0;
  const totalConts = gmvAgg[0]?.contracts || 0;

  console.log('\n  Verification:');
  console.log(`    sellers:        ${count}  (${noGstCount} without GST)`);
  console.log(`    Σ GMV:          ₹${(totalGmv/1e7).toFixed(4)} Cr  ${Math.abs(totalGmv - 750816138) < 500000 ? '✓' : '✗'}`);
  console.log(`    Σ contracts:    ${totalConts}  ${totalConts === 1418 ? '✓' : '✗ expected 1418'}`);
  console.log(`    duplicate slugs:${dupCheck[0]?.n || 0}  ${!dupCheck.length ? '✓' : '✗'}`);

  const top10 = await coll.find({}).sort({ total_gmv: -1 }).limit(10).toArray();
  console.log('\n  Top 10 sellers by GMV:');
  top10.forEach((s, i) => {
    const tag = s.is_100x_dealer ? ' [100X]' : '';
    console.log(`  ${String(i+1).padStart(2)}. ${(s.seller_display_name||'').slice(0,42).padEnd(44)} ₹${(s.total_gmv/1e5).toFixed(1)}L  ${s.total_contracts}c  ${s.oem_count}OEM  ${s.buyers_served}b${tag}`);
  });

  await client.close();
  console.log('\n✓ fogging_sellers ready\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
