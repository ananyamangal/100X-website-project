// fogging-03-build-oems.mjs
// Phase 1A — Build fogging_oems from fogging_contracts
// Idempotent: full replace on each run

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

function pct(n, d) { return d > 0 ? +((n / d) * 100).toFixed(2) : 0; }

function percentiles(arr) {
  if (!arr.length) return { min: null, max: null, avg: null, p25: null, p50: null, p75: null };
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const p = (q) => {
    const idx = (q / 100) * (n - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    return Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo));
  };
  return {
    min: s[0],
    max: s[n - 1],
    avg: Math.round(s.reduce((a, b) => a + b, 0) / n),
    p25: p(25),
    p50: p(50),
    p75: p(75),
  };
}

async function ensureIndexes(fo) {
  const defs = [
    [{ oem_canonical: 1 },      { unique: true, name: 'uniq_oem'  }],
    [{ total_gmv: -1 },         { name: 'idx_gmv'     }],
    [{ total_contracts: -1 },   { name: 'idx_cnt'     }],
    [{ market_share_gmv: -1 },  { name: 'idx_share'   }],
    [{ buyer_count: -1 },       { name: 'idx_buyers'  }],
    [{ state_count: -1 },       { name: 'idx_states'  }],
  ];
  for (const [k, o] of defs) await fo.createIndex(k, o).catch(() => {});
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB);
  const fc = db.collection('fogging_contracts');
  const fo = db.collection('fogging_oems');

  console.log('═'.repeat(64));
  console.log('  Phase 1A — fogging_oems builder');
  console.log('═'.repeat(64));

  await ensureIndexes(fo);
  console.log('✓ Indexes ready');

  // Total market metrics for share calculation
  const [marketAgg] = await fc.aggregate([
    { $group: { _id: null, total_gmv: { $sum: '$contract_value_num' }, total_contracts: { $sum: 1 } } }
  ]).toArray();
  const MARKET_GMV       = marketAgg?.total_gmv || 1;
  const MARKET_CONTRACTS = marketAgg?.total_contracts || 1;
  console.log(`✓ Market totals: ₹${(MARKET_GMV/1e7).toFixed(2)} Cr across ${MARKET_CONTRACTS} contracts`);

  // Per-OEM aggregation
  const pipeline = [
    { $group: {
      _id:              '$oem_canonical',
      oem_short_brand:  { $first: '$oem_short_brand' },
      is_100x:          { $first: '$is_100x' },
      total_contracts:  { $sum: 1 },
      total_gmv:        { $sum: '$contract_value_num' },
      total_units:      { $sum: '$quantity' },
      first_seen:       { $min: '$contract_date' },
      last_seen:        { $max: '$contract_date' },
      buyers:           { $addToSet: '$buyer_canonical' },
      states:           { $addToSet: '$buyer_state' },
      sellers:          { $addToSet: '$seller_gst' },
      models:           { $addToSet: '$model_normalized' },
      unit_prices:      { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
    }},
    { $sort: { total_gmv: -1 } },
  ];

  const oems = await fc.aggregate(pipeline, { allowDiskUse: true }).toArray();
  console.log(`✓ Aggregated ${oems.length} OEMs`);

  // Per-OEM state breakdown (separate pass for top_states)
  const stateBreakdown = await fc.aggregate([
    { $group: {
      _id: { oem: '$oem_canonical', state: '$buyer_state' },
      cnt: { $sum: 1 },
      gmv: { $sum: '$contract_value_num' },
    }},
    { $sort: { gmv: -1 } },
  ]).toArray();

  const stateByOem = new Map();
  for (const r of stateBreakdown) {
    const oem = r._id.oem;
    if (!stateByOem.has(oem)) stateByOem.set(oem, []);
    stateByOem.get(oem).push({ state: r._id.state, cnt: r.cnt, gmv: r.gmv });
  }

  // Per-OEM buyer breakdown
  const buyerBreakdown = await fc.aggregate([
    { $group: {
      _id: { oem: '$oem_canonical', buyer: '$buyer_canonical' },
      cnt: { $sum: 1 },
      gmv: { $sum: '$contract_value_num' },
      name: { $first: '$buyer_display_name' },
    }},
    { $sort: { gmv: -1 } },
  ]).toArray();

  const buyerByOem = new Map();
  for (const r of buyerBreakdown) {
    const oem = r._id.oem;
    if (!buyerByOem.has(oem)) buyerByOem.set(oem, []);
    buyerByOem.get(oem).push({ buyer: r._id.buyer, name: r.name, cnt: r.cnt, gmv: r.gmv });
  }

  // Per-OEM quarterly breakdown
  const quarterBreakdown = await fc.aggregate([
    { $group: {
      _id: { oem: '$oem_canonical', q: '$contract_quarter' },
      cnt: { $sum: 1 },
      gmv: { $sum: '$contract_value_num' },
    }},
    { $sort: { '_id.q': 1 } },
  ]).toArray();

  const quarterByOem = new Map();
  for (const r of quarterBreakdown) {
    const oem = r._id.oem;
    if (!quarterByOem.has(oem)) quarterByOem.set(oem, []);
    quarterByOem.get(oem).push({ quarter: r._id.q, cnt: r.cnt, gmv: r.gmv });
  }

  // Build final docs
  const ops = [];
  for (const oem of oems) {
    const pc = percentiles(oem.unit_prices || []);

    const doc = {
      oem_canonical:        oem._id,
      brand_name:           oem.oem_short_brand,
      is_100x:              oem.is_100x,

      total_contracts:      oem.total_contracts,
      total_gmv:            oem.total_gmv,
      total_units:          oem.total_units || null,

      buyer_count:          oem.buyers.length,
      state_count:          oem.states.filter(Boolean).length,
      seller_count:         oem.sellers.filter(Boolean).length,
      model_count:          oem.models.filter(Boolean).length,

      first_seen:           oem.first_seen,
      last_seen:            oem.last_seen,

      market_share_gmv:       pct(oem.total_gmv, MARKET_GMV),
      market_share_contracts: pct(oem.total_contracts, MARKET_CONTRACTS),

      avg_unit_price:    pc.avg,
      median_unit_price: pc.p50,
      min_unit_price:    pc.min,
      max_unit_price:    pc.max,
      p25_unit_price:    pc.p25,
      p75_unit_price:    pc.p75,

      top_buyers: (buyerByOem.get(oem._id) || []).slice(0, 10),
      top_states: (stateByOem.get(oem._id) || []).slice(0, 10),
      quarterly:  quarterByOem.get(oem._id) || [],

      updated_at: new Date(),
    };

    ops.push({
      replaceOne: {
        filter: { oem_canonical: oem._id },
        replacement: doc,
        upsert: true,
      }
    });
  }

  await fo.bulkWrite(ops, { ordered: false });
  console.log(`✓ Written ${ops.length} OEM docs`);

  // Print league table
  const top = await fo.find({}).sort({ total_gmv: -1 }).limit(10).toArray();
  console.log('\n  OEM League Table (top 10 by GMV):');
  console.log('  ' + '─'.repeat(70));
  top.forEach((o, i) => {
    const gmvCr = (o.total_gmv / 1e7).toFixed(2);
    console.log(`  ${String(i+1).padStart(2)}. ${o.oem_canonical.padEnd(35)} ₹${gmvCr.padStart(7)} Cr  ${o.market_share_gmv.toFixed(1).padStart(5)}%  ${o.total_contracts} contracts`);
  });

  await client.close();
  console.log('\n✓ fogging_oems ready\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
