// fogging-04-build-models.mjs
// Phase 1A — Build fogging_models from fogging_contracts
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
  return { min: s[0], max: s[n - 1], avg: Math.round(s.reduce((a, b) => a + b, 0) / n), p25: p(25), p50: p(50), p75: p(75) };
}

// Best display name: most frequent raw model string for this normalized key
function bestDisplayName(rawVariants) {
  const freq = {};
  for (const r of rawVariants) { if (r) freq[r] = (freq[r] || 0) + 1; }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

async function ensureIndexes(fm) {
  const defs = [
    [{ model_normalized: 1 },  { unique: true, name: 'uniq_model'    }],
    [{ oem_canonical: 1 },     { name: 'idx_oem'         }],
    [{ total_gmv: -1 },        { name: 'idx_gmv'         }],
    [{ total_contracts: -1 },  { name: 'idx_cnt'         }],
    [{ median_unit_price: 1 }, { name: 'idx_price'       }],
    [{ buyer_count: -1 },      { name: 'idx_buyers'      }],
    [{ oem_canonical: 1, total_gmv: -1 }, { name: 'cidx_oem_gmv' }],
  ];
  for (const [k, o] of defs) await fm.createIndex(k, o).catch(() => {});
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB);
  const fc = db.collection('fogging_contracts');
  const fm = db.collection('fogging_models');

  console.log('═'.repeat(64));
  console.log('  Phase 1A — fogging_models builder');
  console.log('═'.repeat(64));

  await ensureIndexes(fm);
  console.log('✓ Indexes ready');

  const pipeline = [
    { $group: {
      _id:             '$model_normalized',
      oem_canonical:   { $first: '$oem_canonical' },
      oem_short_brand: { $first: '$oem_short_brand' },
      raw_variants:    { $addToSet: '$model_raw' },
      total_contracts: { $sum: 1 },
      total_gmv:       { $sum: '$contract_value_num' },
      total_units:     { $sum: '$quantity' },
      first_seen:      { $min: '$contract_date' },
      last_seen:       { $max: '$contract_date' },
      buyers:          { $addToSet: '$buyer_canonical' },
      states:          { $addToSet: '$buyer_state' },
      unit_prices:     { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
    }},
    { $sort: { total_gmv: -1 } },
  ];

  const models = await fc.aggregate(pipeline, { allowDiskUse: true }).toArray();
  console.log(`✓ Aggregated ${models.length} model slugs`);

  // Quarterly breakdown per model
  const quarterAgg = await fc.aggregate([
    { $group: {
      _id: { model: '$model_normalized', q: '$contract_quarter' },
      cnt: { $sum: 1 },
      gmv: { $sum: '$contract_value_num' },
      prices: { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
    }},
    { $sort: { '_id.q': 1 } },
  ]).toArray();

  const qByModel = new Map();
  for (const r of quarterAgg) {
    const m = r._id.model;
    if (!qByModel.has(m)) qByModel.set(m, []);
    const pc = percentiles(r.prices || []);
    qByModel.get(m).push({ quarter: r._id.q, cnt: r.cnt, gmv: r.gmv, price_avg: pc.avg, price_p50: pc.p50 });
  }

  const ops = [];
  for (const model of models) {
    if (!model._id) continue; // skip null model_normalized
    const pc = percentiles(model.unit_prices || []);
    const doc = {
      model_normalized: model._id,
      model_display:    bestDisplayName(model.raw_variants),
      model_raw_variants: (model.raw_variants || []).filter(Boolean).sort(),
      oem_canonical:    model.oem_canonical,
      oem_short_brand:  model.oem_short_brand,

      total_contracts:  model.total_contracts,
      total_gmv:        model.total_gmv,
      total_units:      model.total_units || null,

      buyer_count:      model.buyers.length,
      state_count:      model.states.filter(Boolean).length,

      first_seen:       model.first_seen,
      last_seen:        model.last_seen,

      avg_unit_price:    pc.avg,
      median_unit_price: pc.p50,
      min_unit_price:    pc.min,
      max_unit_price:    pc.max,
      p25_unit_price:    pc.p25,
      p75_unit_price:    pc.p75,

      quarterly: qByModel.get(model._id) || [],

      updated_at: new Date(),
    };

    ops.push({
      replaceOne: { filter: { model_normalized: model._id }, replacement: doc, upsert: true }
    });
  }

  await fm.bulkWrite(ops, { ordered: false });
  console.log(`✓ Written ${ops.length} model docs`);

  const top = await fm.find({ model_display: { $ne: null } }).sort({ total_gmv: -1 }).limit(15).toArray();
  console.log('\n  Top 15 models by GMV:');
  top.forEach((m, i) => {
    console.log(`  ${String(i+1).padStart(2)}. [${m.oem_canonical.slice(0,12).padEnd(12)}] ${(m.model_display||m.model_normalized).slice(0,30).padEnd(30)} ₹${(m.total_gmv/1e5).toFixed(1)}L  ${m.total_contracts}c  P50:${m.median_unit_price ? '₹'+m.median_unit_price.toLocaleString() : '—'}`);
  });

  await client.close();
  console.log('\n✓ fogging_models ready\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
