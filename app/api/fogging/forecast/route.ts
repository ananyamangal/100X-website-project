// GET /api/fogging/forecast
// Procurement Forecasting — buyers predicted to purchase within N days
//
// Query params:
//   window        30 | 60 | 90 (days from today, default 30)
//   month         1–12 (specific month filter)
//   year          2026 | 2027
//   opportunity_only  true (default) — only buyers who haven't bought 100X
//   confidence    high | medium | low
//   buyer_state   filter by state
//   tier          A | B | C | D
//   sort          score_desc (default) | spend_desc | recency_asc

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

export async function GET(req: NextRequest) {
  const p      = Object.fromEntries(req.nextUrl.searchParams);
  const window = parseInt(p.window || '30');
  const now    = new Date();
  const cutoff = new Date(now.getTime() + window * 86400000);

  // Determine which months fall within the window
  const targetMonths: number[] = [];
  for (let d = new Date(now); d <= cutoff; d.setUTCDate(d.getUTCDate() + 1)) {
    const m = d.getUTCMonth() + 1;
    if (!targetMonths.includes(m)) targetMonths.push(m);
  }
  const targetYears = [now.getUTCFullYear(), now.getUTCFullYear() + 1];

  const filter: Filter<Document> = {};

  // Month/year filter: buyers predicted in the window
  if (p.month && p.year) {
    filter.forecast_next_month = parseInt(p.month);
    filter.forecast_next_year  = parseInt(p.year);
  } else {
    filter.forecast_next_month = { $in: targetMonths };
    filter.forecast_next_year  = { $in: targetYears };
  }

  // Optional filters
  if (p.confidence)  filter.forecast_confidence = p.confidence;
  if (p.buyer_state) filter.buyer_state          = p.buyer_state;
  if (p.tier)        filter.opportunity_tier     = p.tier;

  // Default: only show non-100X buyers (attack surface)
  if (p.opportunity_only !== 'false') filter.purchased_100x = false;

  const sort: Record<string, 1 | -1> =
      p.sort === 'spend_desc'  ? { total_gmv: -1 }
    : p.sort === 'recency_asc' ? { days_since_last: 1 }
    : p.sort === 'confidence'  ? { forecast_confidence: 1, opportunity_score: -1 }
    :                            { opportunity_score: -1, total_gmv: -1 };

  const page     = Math.max(1, parseInt(p.page || '1'));
  const pageSize = Math.min(500, parseInt(p.page_size || '100'));
  const skip     = (page - 1) * pageSize;

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const [docs, total, summary] = await Promise.all([
      coll.find(filter).sort(sort).skip(skip).limit(pageSize).project({
        buyer_canonical: 1, buyer_display_name: 1, buyer_state: 1, org_type: 1,
        total_contracts: 1, total_gmv: 1,
        last_purchase: 1, days_since_last: 1,
        oems_purchased: 1, oem_count: 1,
        purchased_100x: 1, purchased_neptune: 1, purchased_instafog: 1,
        opportunity_score: 1, opportunity_tier: 1, opportunity_reasons: 1,
        forecast_next_month: 1, forecast_next_quarter: 1, forecast_next_year: 1,
        forecast_confidence: 1, forecast_days_until: 1,
        purchase_months: 1, year_count: 1, active_years: 1,
      }).toArray(),
      coll.countDocuments(filter),
      coll.aggregate([
        { $match: filter },
        { $group: {
          _id:   null,
          total_potential_gmv:  { $sum: '$total_gmv' },
          high_confidence:      { $sum: { $cond: [{ $eq: ['$forecast_confidence', 'high'] }, 1, 0] } },
          tier_a:               { $sum: { $cond: [{ $eq: ['$opportunity_tier', 'A'] }, 1, 0] } },
        }}
      ]).toArray(),
    ]);

    const s = summary[0] || {};

    return NextResponse.json({
      data:  docs,
      total,
      page,
      page_size: pageSize,
      window_days:    window,
      target_months:  targetMonths,
      meta: {
        total_buyers:          total,
        total_potential_gmv:   s.total_potential_gmv || 0,
        high_confidence_count: s.high_confidence || 0,
        tier_a_count:          s.tier_a || 0,
      }
    });
  } catch (e) {
    console.error('[fogging/forecast]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
