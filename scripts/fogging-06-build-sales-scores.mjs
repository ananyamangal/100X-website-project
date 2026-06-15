// fogging-06-build-sales-scores.mjs
// Phase 4B — Pre-compute Sales Command Center scores
// Enriches (additive patch — no existing fields touched):
//   fogging_buyers  → _100x_spend, non_100x_gmv, incumbent_seller_*, dept_category
//   fogging_sellers → carries_* flags, seller_opportunity_score
//   fogging_models  → is_100x, p50/min/max price, price_variance_pct, model_opportunity_score
// Run AFTER fogging-05-build-sellers.mjs
// Idempotent: safe to re-run

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const DB = '100xDB';

// ── Department classifier ────────────────────────────────────────────────────
const DEPT_PATTERNS = [
  { key: 'Municipality / Civic Body',       kw: ['municipal','nagar','nigam','corporation','civic','mcd','bbmp','bmc','kmc','pmc','amc'] },
  { key: 'Health / Medical',                kw: ['health','medical','hospital','ayush','nhm','sanitation','public health','dispensary'] },
  { key: 'Urban Development / Housing',     kw: ['urban','smart city','housing','development authority','slum','town planning','town and country'] },
  { key: 'Panchayat / Rural Body',          kw: ['panchayat','gram sabha','block develop','zila','zilla','taluk','taluka','janpad','kshetra'] },
  { key: 'Railways / Metro',                kw: ['railway','rail','metro','konkan'] },
  { key: 'Police / Defence / Paramilitary', kw: ['police','crpf','bsf','cisf','rpf','military','defence','army','navy','air force','constabulary','ndrf','sdrf'] },
  { key: 'Disaster / Fire / Emergency',     kw: ['disaster','fire','civil defence','emergency','rescue','state disaster'] },
  { key: 'Agriculture / Horticulture',      kw: ['agriculture','agri','krishi','horticulture','fisheries','animal husbandry','veterinary'] },
  { key: 'Education',                       kw: ['education','school','college','university','vidyalaya','kendriya','navodaya'] },
  { key: 'Forest / Environment',            kw: ['forest','wildlife','environment','ecology','van'] },
  { key: 'Water / Irrigation',              kw: ['water','irrigation','jal','canal','reservoir','sewerage','drainage'] },
  { key: 'PWD / Infrastructure',            kw: ['public work','pwd','road','highway','bridge','infrastructure'] },
];

function classifyDept(name, orgType, ministry) {
  const hay = [name, orgType, ministry].join(' ').toLowerCase();
  for (const { key, kw } of DEPT_PATTERNS) {
    if (kw.some(k => hay.includes(k))) return key;
  }
  return 'Other Government';
}

// ── Pricing percentiles ──────────────────────────────────────────────────────
function priceStats(prices) {
  const arr = (prices || []).filter(n => typeof n === 'number' && n > 0);
  if (!arr.length) return { p50: null, p_min: null, p_max: null, price_variance_pct: 0, priced_count: 0 };
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const idx = 0.5 * (n - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  const p50 = Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo));
  const pMin = s[0];
  const pMax = s[n - 1];
  const variance = pMin > 0 ? Math.round((pMax - pMin) / pMin * 100) : 0;
  return { p50, p_min: pMin, p_max: pMax, price_variance_pct: variance, priced_count: n };
}

// ── Recency factor (for opportunity scoring) ─────────────────────────────────
function recency(days) {
  if (!days || days >= 9000) return 0.05;
  if (days <  60) return 1.00;
  if (days < 120) return 0.90;
  if (days < 180) return 0.80;
  if (days < 365) return 0.60;
  if (days < 545) return 0.30;
  return 0.10;
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB);

  const buyersColl    = db.collection('fogging_buyers');
  const contractsColl = db.collection('fogging_contracts');
  const sellersColl   = db.collection('fogging_sellers');
  const modelsColl    = db.collection('fogging_models');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. BUYER ENRICHMENT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[1/3] Enriching fogging_buyers ...');

  // Aggregate: top seller (by GMV) per buyer across all contracts
  console.log('  → Computing incumbent sellers from fogging_contracts ...');
  const incSellerAgg = await contractsColl.aggregate([
    { $group: {
      _id:  { buyer: '$buyer_canonical', gst: '$seller_gst', name: '$seller_name' },
      gmv:  { $sum: '$contract_value_num' },
    }},
    { $sort: { '_id.buyer': 1, gmv: -1 } },
    { $group: {
      _id:              '$_id.buyer',
      incumbent_seller_gst:  { $first: '$_id.gst' },
      incumbent_seller_name: { $first: '$_id.name' },
      incumbent_seller_gmv:  { $first: '$gmv' },
    }},
  ], { allowDiskUse: true }).toArray();
  const incMap = new Map(incSellerAgg.map(r => [r._id, r]));
  console.log(`  → ${incMap.size} buyer → incumbent-seller mappings`);

  const allBuyers = await buyersColl.find({}).toArray();
  console.log(`  → Patching ${allBuyers.length} buyers ...`);

  const buyerOps = allBuyers.map(b => {
    const osp = Array.isArray(b.oem_spend) ? b.oem_spend : [];

    // 100X spend from oem_spend entries marked is_100x
    const _100x_spend = osp
      .filter(o => o.is_100x)
      .reduce((s, o) => s + (o.gmv || 0), 0);
    const non_100x_gmv     = Math.max(0, (b.total_gmv || 0) - _100x_spend);
    const _100x_share_pct  = b.total_gmv > 0
      ? Math.round(_100x_spend / b.total_gmv * 10000) / 100 : 0;
    const has_100x          = _100x_spend > 0;

    // Last contract date (max of all oem_spend.last_contract)
    const dates = osp.map(o => o.last_contract).filter(Boolean);
    const last_contract_date = dates.length
      ? new Date(Math.max(...dates.map(d => new Date(d).getTime()))) : null;

    // Department category
    const dept_category = classifyDept(
      b.buyer_display_name || '',
      b.org_type || '',
      b.ministry || '',
    );

    // Incumbent seller
    const inc = incMap.get(b.buyer_canonical) || {};

    return {
      updateOne: {
        filter: { buyer_canonical: b.buyer_canonical },
        update: { $set: {
          _100x_spend,
          non_100x_gmv,
          _100x_share_pct,
          has_100x,
          last_contract_date,
          dept_category,
          incumbent_seller_gst:  inc.incumbent_seller_gst  || null,
          incumbent_seller_name: inc.incumbent_seller_name || null,
          incumbent_seller_gmv:  inc.incumbent_seller_gmv  || 0,
        }},
      },
    };
  });

  const buyerRes = await buyersColl.bulkWrite(buyerOps, { ordered: false });
  console.log(`  ✓ Buyers patched: ${buyerRes.modifiedCount}/${allBuyers.length}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SELLER ENRICHMENT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[2/3] Enriching fogging_sellers ...');

  const allSellers = await sellersColl.find({}).toArray();
  console.log(`  → Patching ${allSellers.length} sellers ...`);

  const sellerOps = allSellers.map(s => {
    const oems = (s.oems_represented || []).map(o => (o.oem_canonical || '').toUpperCase());

    const carries_neptune   = oems.some(o => o.includes('NEPTUNE'));
    const carries_sse       = oems.some(o => o.includes('SSE'));
    const carries_instafog  = oems.some(o => o.includes('INSTA') || o.includes('INSTAFOG'));
    const carries_pulsfog   = oems.some(o => o.includes('PULSFOG') || o.includes('PULS'));
    const carries_spacespray = oems.some(o => o.includes('SPACESPRAY') || o.includes('SPACE SPRAY'));
    const carries_foggers   = oems.some(o => o === 'FOGGERS');

    // competitor count for scoring
    const competitor_oem_count = [carries_neptune, carries_sse, carries_instafog, carries_pulsfog].filter(Boolean).length;

    // Opportunity score for non-100X sellers = buyers_served weight + GMV weight + competitor bonus
    // For 100X dealers: score = their expansion potential (GMV + buyers)
    const rf = recency(s.days_since_last || 9999);
    const seller_opportunity_score = s.is_100x_dealer
      ? Math.round(s.total_gmv * 0.5 * rf)
      : Math.round(s.total_gmv * (1 + (s.buyers_served || 0) / 20) * (1 + competitor_oem_count * 0.5) * rf);

    return {
      updateOne: {
        filter: { seller_slug: s.seller_slug },
        update: { $set: {
          carries_neptune,
          carries_sse,
          carries_instafog,
          carries_pulsfog,
          carries_spacespray,
          carries_foggers,
          competitor_oem_count,
          seller_opportunity_score,
        }},
      },
    };
  });

  const sellerRes = await sellersColl.bulkWrite(sellerOps, { ordered: false });
  console.log(`  ✓ Sellers patched: ${sellerRes.modifiedCount}/${allSellers.length}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MODEL ENRICHMENT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n[3/3] Enriching fogging_models ...');

  // Aggregate pricing + is_100x from contracts
  console.log('  → Aggregating model pricing from fogging_contracts ...');
  const modelContractAgg = await contractsColl.aggregate([
    { $group: {
      _id:         '$model_normalized',
      is_100x_max: { $max: { $cond: ['$is_100x', 1, 0] } },
      unit_prices: { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
      last_contract: { $max: '$contract_date' },
    }},
  ], { allowDiskUse: true }).toArray();

  const modelContractMap = new Map(modelContractAgg.map(r => [r._id, r]));

  const allModels = await modelsColl.find({}).toArray();
  console.log(`  → Patching ${allModels.length} models ...`);

  const modelOps = allModels.map(m => {
    const mc = modelContractMap.get(m.model_normalized) || {};
    const is_100x = (mc.is_100x_max || 0) === 1;
    const stats   = priceStats(mc.unit_prices || []);

    // Days since last contract
    const days = mc.last_contract
      ? Math.floor((Date.now() - new Date(mc.last_contract).getTime()) / 86400000) : 9999;
    const rf = recency(days);

    // Opportunity score: high for non-100X models with many buyers and recent activity
    const model_opportunity_score = is_100x
      ? 0
      : Math.round((m.total_gmv || 0) * (m.buyer_count || 1) * rf / 10000);

    return {
      updateOne: {
        filter: { model_normalized: m.model_normalized },
        update: { $set: {
          is_100x,
          p50_price:           stats.p50,
          p_min:               stats.p_min,
          p_max:               stats.p_max,
          price_variance_pct:  stats.price_variance_pct,
          priced_count:        stats.priced_count,
          model_opportunity_score,
          gap_status: is_100x ? 'competing' : 'gap',
        }},
      },
    };
  });

  const modelRes = await modelsColl.bulkWrite(modelOps, { ordered: false });
  console.log(`  ✓ Models patched: ${modelRes.modifiedCount}/${allModels.length}`);

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFY
  // ══════════════════════════════════════════════════════════════════════════
  const sampleBuyer = await buyersColl.findOne({ has_100x: true });
  const sampleSeller = await sellersColl.findOne({ carries_neptune: true });
  const sampleModel  = await modelsColl.findOne({ is_100x: false, model_opportunity_score: { $gt: 0 } }, { sort: { model_opportunity_score: -1 } });

  console.log('\n══ Verification ══════════════════════════════════════════════');
  if (sampleBuyer) {
    console.log(`✓ Buyer has_100x sample: ${sampleBuyer.buyer_display_name?.slice(0,40)}`);
    console.log(`  _100x_spend=${sampleBuyer._100x_spend}  non_100x_gmv=${sampleBuyer.non_100x_gmv}  dept=${sampleBuyer.dept_category}`);
    console.log(`  incumbent_seller=${sampleBuyer.incumbent_seller_name?.slice(0,30)}`);
  }
  if (sampleSeller) {
    console.log(`✓ Neptune seller sample: ${sampleSeller.seller_display_name?.slice(0,40)}`);
    console.log(`  carries_neptune=${sampleSeller.carries_neptune}  score=${sampleSeller.seller_opportunity_score}`);
  }
  if (sampleModel) {
    console.log(`✓ Competitor model sample: ${sampleModel.model_display || sampleModel.model_normalized}`);
    console.log(`  is_100x=${sampleModel.is_100x}  p50=${sampleModel.p50_price}  opp_score=${sampleModel.model_opportunity_score}`);
  }

  // Counts
  const buyersWith100x = await buyersColl.countDocuments({ has_100x: true });
  const sellersWithFlags = await sellersColl.countDocuments({ carries_neptune: true });
  const gapModels = await modelsColl.countDocuments({ is_100x: false });
  const _100xModels = await modelsColl.countDocuments({ is_100x: true });

  console.log(`\n  Buyers with 100X history:      ${buyersWith100x}`);
  console.log(`  Sellers carrying Neptune:       ${sellersWithFlags}`);
  console.log(`  Competitor (gap) models:        ${gapModels}`);
  console.log(`  100X competing models:          ${_100xModels}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  await client.close();
  console.log('Done. fogging-06 complete.\n');
}

run().catch(e => { console.error(e); process.exit(1); });
