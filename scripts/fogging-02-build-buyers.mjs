// fogging-02-build-buyers.mjs
// Phase 1A — Build fogging_buyers from fogging_contracts
// Run AFTER fogging-01-build-contracts.mjs
// Idempotent: replaces all docs on each run

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const DB = '100xDB';

const OEM_FLAGS = [
  'NEPTUNE', 'PULSFOG', 'SSE SAI SHREE ENTERPRISES',
  'INSTA FOG', 'FOGGERS', 'LUMINICA', 'INDOFOG', '100X CIRCLE',
];

// Opportunity score (0–100)
// Explanation array is built alongside for UI display
function computeOpportunity(b) {
  let score = 0;
  const reasons = [];

  if (!b.purchased_100x) {
    score += 40;
    reasons.push('Never purchased 100X (+40)');
  }
  if (b.purchased_neptune) {
    score += 20;
    reasons.push('Neptune buyer — direct price-bracket overlap (+20)');
  }
  if (b.purchased_instafog) {
    score += 10;
    reasons.push('INSTA FOG buyer — TFS50 competitor (+10)');
  }
  if (b.year_count >= 3) {
    score += 15;
    reasons.push('3+ year repeat buyer (+15)');
  } else if (b.year_count === 2) {
    score += 8;
    reasons.push('2-year repeat buyer (+8)');
  }
  if (b.days_since_last <= 30) {
    score += 10;
    reasons.push('Purchased within 30 days — active now (+10)');
  } else if (b.days_since_last <= 90) {
    score += 5;
    reasons.push('Purchased within 90 days (+5)');
  }
  if (b.total_gmv >= 10_000_000) {
    score += 5;
    reasons.push('Spend ≥ ₹1 Cr (+5)');
  }
  if (b.oem_count >= 3) {
    score += 5;
    reasons.push('Multi-OEM buyer (3+) — price-sensitive switcher (+5)');
  } else if (b.oem_count === 2) {
    score += 2;
    reasons.push('Multi-OEM buyer (2) (+2)');
  }

  const tier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  return { opportunity_score: Math.min(score, 100), opportunity_tier: tier, opportunity_reasons: reasons };
}

// Forecast: predict most likely next purchase month
// Uses historical purchase months; falls back to market peaks (Oct, Sep, Mar)
const MARKET_PEAKS = [10, 9, 3, 8, 11, 4]; // in order of historical frequency
const Q_MAP = ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'];

function computeForecast(purchaseMonths, lastPurchaseDate, yearCount) {
  const lastDate  = lastPurchaseDate ? new Date(lastPurchaseDate) : null;
  const lastMonth = lastDate ? lastDate.getUTCMonth() + 1 : null; // 1-indexed
  const months    = [...new Set(purchaseMonths)].sort((a, b) => a - b);

  let confidence = 'low';
  if (yearCount >= 3 && months.length >= 2) confidence = 'high';
  else if (yearCount >= 2)                  confidence = 'medium';

  // Find next occurrence of a historical month after last purchase
  let predictedMonth = null;
  if (lastMonth && months.length > 0) {
    for (let offset = 1; offset <= 12; offset++) {
      const candidate = ((lastMonth - 1 + offset) % 12) + 1;
      if (months.includes(candidate)) { predictedMonth = candidate; break; }
    }
  }
  // Fallback: first market peak not yet past this year
  if (!predictedMonth) {
    const now = new Date();
    const curMonth = now.getUTCMonth() + 1;
    for (const pk of MARKET_PEAKS) {
      if (pk > curMonth) { predictedMonth = pk; break; }
    }
    if (!predictedMonth) predictedMonth = MARKET_PEAKS[0]; // next year peak
    confidence = 'low';
  }

  const now      = new Date();
  const curMonth = now.getUTCMonth() + 1;
  const predYear = predictedMonth <= curMonth ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const predQ    = `${predYear}-${Q_MAP[predictedMonth - 1]}`;

  // Days until prediction
  const predDate = new Date(Date.UTC(predYear, predictedMonth - 1, 1));
  const daysUntil = Math.round((predDate - now) / 86400000);

  return {
    forecast_next_month:   predictedMonth,
    forecast_next_quarter: predQ,
    forecast_next_year:    predYear,
    forecast_confidence:   confidence,
    forecast_days_until:   daysUntil,
  };
}

async function ensureIndexes(fb) {
  const defs = [
    [{ buyer_canonical: 1 },                        { unique: true, name: 'uniq_buyer'        }],
    [{ buyer_state: 1 },                            { name: 'idx_state'          }],
    [{ org_type: 1 },                               { name: 'idx_org'            }],
    [{ opportunity_tier: 1 },                       { name: 'idx_tier'           }],
    [{ opportunity_score: -1 },                     { name: 'idx_score'          }],
    [{ purchased_100x: 1 },                         { name: 'idx_has_100x'       }],
    [{ purchased_neptune: 1 },                      { name: 'idx_has_neptune'    }],
    [{ total_gmv: -1 },                             { name: 'idx_gmv'            }],
    [{ days_since_last: 1 },                        { name: 'idx_recency'        }],
    [{ year_count: -1 },                            { name: 'idx_year_count'     }],
    [{ last_purchase: -1 },                         { name: 'idx_last_purchase'  }],
    [{ forecast_next_month: 1 },                    { name: 'idx_forecast_month' }],
    [{ forecast_next_quarter: 1 },                  { name: 'idx_forecast_q'     }],
    [{ purchased_100x: 1, opportunity_score: -1 }, { name: 'cidx_attack'        }],
    [{ purchased_neptune: 1, purchased_100x: 1 },  { name: 'cidx_neptune_100x'  }],
    [{ forecast_next_month: 1, purchased_100x: 1 },{ name: 'cidx_forecast_opp'  }],
  ];
  for (const [key, opts] of defs) {
    await fb.createIndex(key, opts).catch(() => {});
  }
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB);
  const fc = db.collection('fogging_contracts');
  const fb = db.collection('fogging_buyers');

  console.log('═'.repeat(64));
  console.log('  Phase 1A — fogging_buyers builder');
  console.log('═'.repeat(64));

  await ensureIndexes(fb);
  console.log('✓ Indexes ready');

  // Aggregate from fogging_contracts
  const pipeline = [
    // Base grouping
    { $group: {
      _id:                '$buyer_canonical',
      buyer_display_name: { $first: '$buyer_display_name' },
      buyer_state:        { $first: '$buyer_state' },
      org_type:           { $first: '$org_type' },
      ministry:           { $first: '$ministry' },
      total_contracts:    { $sum: 1 },
      total_gmv:          { $sum: '$contract_value_num' },
      total_units:        { $sum: '$quantity' },
      first_purchase:     { $min: '$contract_date' },
      last_purchase:      { $max: '$contract_date' },
      active_years:       { $addToSet: '$contract_year' },
      purchase_months:    { $addToSet: '$contract_month' },
      oems_purchased:     { $addToSet: '$oem_canonical' },
      supplier_gsTs:      { $addToSet: '$seller_gst' },
      unit_prices:        { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
      all_values:         { $push: '$contract_value_num' },
    }},
    // Derived fields
    { $addFields: {
      buyer_canonical: '$_id',
      year_count:      { $size: '$active_years' },
      oem_count:       { $size: '$oems_purchased' },
      supplier_count:  { $size: '$supplier_gsTs' },
      avg_contract_value: {
        $cond: [
          { $gt: ['$total_contracts', 0] },
          { $divide: ['$total_gmv', '$total_contracts'] },
          null,
        ]
      },
      purchased_100x:     { $in: ['100X CIRCLE', '$oems_purchased'] },
      purchased_neptune:  { $in: ['NEPTUNE',     '$oems_purchased'] },
      purchased_pulsfog:  { $in: ['PULSFOG',     '$oems_purchased'] },
      purchased_sse:      { $in: ['SSE SAI SHREE ENTERPRISES', '$oems_purchased'] },
      purchased_instafog: { $in: ['INSTA FOG',   '$oems_purchased'] },
      purchased_foggers:  { $in: ['FOGGERS',     '$oems_purchased'] },
      days_since_last: {
        $divide: [
          { $subtract: [new Date(), '$last_purchase'] },
          86400000,
        ]
      },
    }},
    { $project: { supplier_gsTs: 0 } },
  ];

  const buyers = await fc.aggregate(pipeline, { allowDiskUse: true }).toArray();
  console.log(`✓ Aggregated ${buyers.length} buyers`);

  // Post-aggregation: compute opportunity score, forecast, percentiles
  const ops = [];
  let tierCounts = { A: 0, B: 0, C: 0, D: 0 };

  for (const b of buyers) {
    // P50 unit price
    const prices = (b.unit_prices || []).filter(p => p > 0).sort((a, c) => a - c);
    const mid = Math.floor(prices.length / 2);
    const median_unit_price = prices.length
      ? (prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2))
      : null;

    const { opportunity_score, opportunity_tier, opportunity_reasons } = computeOpportunity(b);
    const forecast = computeForecast(b.purchase_months || [], b.last_purchase, b.year_count);

    tierCounts[opportunity_tier]++;

    const doc = {
      buyer_canonical:    b.buyer_canonical,
      buyer_display_name: b.buyer_display_name,
      buyer_state:        b.buyer_state,
      org_type:           b.org_type,
      ministry:           b.ministry,

      total_contracts:    b.total_contracts,
      total_gmv:          b.total_gmv,
      total_units:        b.total_units || null,
      avg_contract_value: Math.round(b.avg_contract_value || 0),
      median_unit_price,

      supplier_count:     b.supplier_count,
      oem_count:          b.oem_count,
      oems_purchased:     b.oems_purchased || [],

      first_purchase:     b.first_purchase,
      last_purchase:      b.last_purchase,
      days_since_last:    Math.round(b.days_since_last || 0),
      active_years:       (b.active_years || []).sort(),
      year_count:         b.year_count,
      purchase_months:    (b.purchase_months || []).filter(Boolean).sort((a, c) => a - c),

      purchased_100x:     b.purchased_100x,
      purchased_neptune:  b.purchased_neptune,
      purchased_pulsfog:  b.purchased_pulsfog,
      purchased_sse:      b.purchased_sse,
      purchased_instafog: b.purchased_instafog,
      purchased_foggers:  b.purchased_foggers,

      opportunity_score,
      opportunity_tier,
      opportunity_reasons,

      ...forecast,

      updated_at: new Date(),
    };

    ops.push({
      replaceOne: {
        filter: { buyer_canonical: b.buyer_canonical },
        replacement: doc,
        upsert: true,
      }
    });
  }

  await fb.bulkWrite(ops, { ordered: false });
  console.log(`✓ Written ${ops.length} buyer docs`);
  console.log(`  Tier breakdown: A=${tierCounts.A} B=${tierCounts.B} C=${tierCounts.C} D=${tierCounts.D}`);

  // Verification
  const notBought100x = await fb.countDocuments({ purchased_100x: false });
  const highConf      = await fb.countDocuments({ forecast_confidence: 'high' });
  const activeNow     = await fb.countDocuments({ days_since_last: { $lte: 90 } });
  console.log('\n  Verification:');
  console.log(`    total buyers:       ${ops.length}`);
  console.log(`    never bought 100X:  ${notBought100x}`);
  console.log(`    high-conf forecast: ${highConf}`);
  console.log(`    active ≤90 days:    ${activeNow}`);

  await client.close();
  console.log('\n✓ fogging_buyers ready\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
