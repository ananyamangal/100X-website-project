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

// ── 6-month forecast horizon ──────────────────────────────────────────────────
function computeForecast6mo(purchaseMonths, avgContractValue, yearCount, baseConfidence) {
  const sources = purchaseMonths && purchaseMonths.length > 0 ? purchaseMonths : MARKET_PEAKS.slice(0, 3);
  const isMarket = !purchaseMonths || purchaseMonths.length === 0;
  const now = new Date();
  const curMonth = now.getUTCMonth() + 1;
  const curYear  = now.getUTCFullYear();
  const slots = [];

  for (let offset = 1; offset <= 14 && slots.length < 6; offset++) {
    const month = ((curMonth - 1 + offset) % 12) + 1;
    const year  = curYear + Math.floor((curMonth - 1 + offset) / 12);
    if (sources.includes(month)) {
      const predDate  = new Date(Date.UTC(year, month - 1, 1));
      const daysUntil = Math.round((predDate - now) / 86400000);
      let conf = isMarket ? 'low' : baseConfidence;
      if (!isMarket && slots.length >= 2 && yearCount < 3) conf = 'medium';
      if (!isMarket && slots.length >= 3 && yearCount < 4) conf = 'low';
      slots.push({ month, year, quarter: `${year}-${Q_MAP[month - 1]}`, days_until: daysUntil, confidence: conf, predicted_gmv: Math.round(avgContractValue || 0) });
    }
  }
  return slots;
}

// ── Derived classification fields ─────────────────────────────────────────────
function computeUrgency(forecastDaysUntil, daysSinceLast) {
  if (daysSinceLast > 548) return 'stale'; // >18 months inactive
  if (forecastDaysUntil == null) return 'distant';
  if (forecastDaysUntil <= 30)  return 'hot';
  if (forecastDaysUntil <= 90)  return 'warm';
  if (forecastDaysUntil <= 180) return 'upcoming';
  return 'distant';
}

function computeRecommendedAction(score, daysSinceLast, primaryIncumbent) {
  const inc = primaryIncumbent ? `${primaryIncumbent} customer. ` : '';
  if (score >= 80 && daysSinceLast <= 90)
    return { action_priority: 'immediate', recommended_action: `Active Tier A. ${inc}Reach out this week.` };
  if (score >= 80)
    return { action_priority: 'immediate', recommended_action: `Tier A score, stale (${daysSinceLast}d). Queue for reactivation.` };
  if (score >= 60 && daysSinceLast <= 180)
    return { action_priority: 'nurture', recommended_action: 'Warm Tier B. Add to outreach sequence.' };
  if (score >= 40)
    return { action_priority: 'watch', recommended_action: 'Tier C — set 90-day reminder.' };
  return { action_priority: 'monitor', recommended_action: 'Low priority. Monitor for GeM activity.' };
}

function isAnomalous(buyerCanonical, buyerDisplayName) {
  if (!buyerCanonical || buyerCanonical.trim() === '')
    return { is_anomalous: true, anomaly_reason: 'empty_canonical' };
  if (buyerCanonical === 'unknown')
    return { is_anomalous: true, anomaly_reason: 'catch_all' };
  if (buyerDisplayName?.startsWith(','))
    return { is_anomalous: true, anomaly_reason: 'truncated_name' };
  if (/[ऀ-ॿ]/.test(buyerDisplayName || ''))
    return { is_anomalous: true, anomaly_reason: 'masked_gem_buyer' };
  return { is_anomalous: false, anomaly_reason: null };
}

function computePeakMonths(monthCounts) {
  if (!monthCounts || !Object.keys(monthCounts).length) return [];
  return Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([m]) => parseInt(m));
}

function computePeakQuarter(peakMonths) {
  if (!peakMonths || !peakMonths.length) return null;
  const counts = {};
  for (const m of peakMonths) {
    const q = Q_MAP[m - 1];
    counts[q] = (counts[q] || 0) + 1;
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
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
    [{ rank: 1 },                                  { name: 'idx_rank', sparse: true              }],
    [{ primary_incumbent: 1, opportunity_tier: 1 },{ name: 'cidx_incumbent_tier'                 }],
    [{ urgency: 1, opportunity_tier: 1 },          { name: 'cidx_urgency_tier'                   }],
    [{ action_priority: 1, opportunity_score: -1 },{ name: 'cidx_action_score'                   }],
    [{ buyer_display_name: 1 },                    { name: 'idx_display_name'                    }],
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

  // Secondary aggregation: per-buyer OEM spend breakdown (for oem_spend + primary_incumbent)
  const oemSpendRaw = await fc.aggregate([
    { $group: {
      _id:           { buyer: '$buyer_canonical', oem: '$oem_canonical' },
      brand_name:    { $first: '$oem_short_brand' },
      is_100x:       { $first: '$is_100x' },
      gmv:           { $sum: '$contract_value_num' },
      contracts:     { $sum: 1 },
      last_contract: { $max: '$contract_date' },
    }},
  ], { allowDiskUse: true }).toArray();

  const oemSpendMap = new Map();
  for (const row of oemSpendRaw) {
    const buyer = row._id.buyer;
    if (!oemSpendMap.has(buyer)) oemSpendMap.set(buyer, []);
    oemSpendMap.get(buyer).push({
      oem_canonical: row._id.oem,
      brand_name:    row.brand_name,
      is_100x:       row.is_100x,
      gmv:           row.gmv,
      contracts:     row.contracts,
      last_contract: row.last_contract,
      share_pct:     0, // computed below
    });
  }
  for (const [, oems] of oemSpendMap) {
    const total = oems.reduce((a, o) => a + (o.gmv || 0), 0);
    oems.sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
    for (const o of oems) o.share_pct = total > 0 ? Math.round((o.gmv / total) * 1000) / 10 : 0;
  }
  console.log(`✓ OEM spend map built (${oemSpendMap.size} buyers)`);

  // Secondary aggregation: purchase month frequency per buyer (for peak_months)
  const monthFreqRaw = await fc.aggregate([
    { $match: { contract_month: { $ne: null } } },
    { $group: {
      _id:   { buyer: '$buyer_canonical', month: '$contract_month' },
      count: { $sum: 1 },
    }},
  ], { allowDiskUse: true }).toArray();

  const monthCountMap = new Map();
  for (const row of monthFreqRaw) {
    const buyer = row._id.buyer;
    if (!monthCountMap.has(buyer)) monthCountMap.set(buyer, {});
    monthCountMap.get(buyer)[String(row._id.month)] = row.count;
  }
  console.log(`✓ Month frequency map built`);

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
    const forecast      = computeForecast(b.purchase_months || [], b.last_purchase, b.year_count);
    const daysSinceLast = Math.round(b.days_since_last || 0);

    // New Phase 2 fields
    const oemSpend    = oemSpendMap.get(b.buyer_canonical) || [];
    const monthCounts = monthCountMap.get(b.buyer_canonical) || {};
    const peakMonths  = computePeakMonths(monthCounts);
    // Primary incumbent = highest-GMV OEM that is NOT 100X
    const primaryIncumbent = oemSpend.find(o => !o.is_100x)?.oem_canonical ?? null;
    const estimatedOpportunity = Math.round(
      Math.min(((b.total_gmv || 0) / Math.max(b.oem_count || 1, 1)) * 0.25, 5_000_000)
    );
    const forecast6mo = computeForecast6mo(
      b.purchase_months || [], Math.round(b.avg_contract_value || 0),
      b.year_count || 0, forecast.forecast_confidence,
    );
    const urgency = computeUrgency(forecast.forecast_days_until, daysSinceLast);
    const { action_priority, recommended_action } = b.purchased_100x
      ? { action_priority: 'retention', recommended_action: 'Existing 100X customer.' }
      : computeRecommendedAction(opportunity_score, daysSinceLast, primaryIncumbent);
    const anom = isAnomalous(b.buyer_canonical, b.buyer_display_name);

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
      oem_spend:          oemSpend,
      primary_incumbent:  primaryIncumbent,

      first_purchase:     b.first_purchase,
      last_purchase:      b.last_purchase,
      days_since_last:    daysSinceLast,
      active_years:       (b.active_years || []).sort(),
      year_count:         b.year_count,
      purchase_months:    (b.purchase_months || []).filter(Boolean).sort((a, c) => a - c),
      purchase_month_counts: monthCounts,
      peak_months:        peakMonths,
      peak_quarter:       computePeakQuarter(peakMonths),

      purchased_100x:     b.purchased_100x,
      purchased_neptune:  b.purchased_neptune,
      purchased_pulsfog:  b.purchased_pulsfog,
      purchased_sse:      b.purchased_sse,
      purchased_instafog: b.purchased_instafog,
      purchased_foggers:  b.purchased_foggers,

      opportunity_score,
      opportunity_tier,
      opportunity_reasons,
      estimated_opportunity: estimatedOpportunity,
      action_priority,
      recommended_action,

      ...forecast,
      forecast_6mo: forecast6mo,
      urgency,

      is_anomalous:  anom.is_anomalous,
      anomaly_reason: anom.anomaly_reason,
      rank:          null, // assigned after loop for non-100X buyers

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

  // Assign ranks to non-100X buyers (sorted by opportunity_score desc, total_gmv desc)
  const nonHundredX = ops
    .map(op => op.replaceOne.replacement)
    .filter(d => !d.purchased_100x)
    .sort((a, b) => (b.opportunity_score - a.opportunity_score) || (b.total_gmv - a.total_gmv));
  nonHundredX.forEach((d, i) => { d.rank = i + 1; });
  console.log(`✓ Ranks assigned to ${nonHundredX.length} non-100X buyers`);

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
