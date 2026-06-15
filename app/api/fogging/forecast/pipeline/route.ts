// GET /api/fogging/forecast/pipeline?quarters=2&tiers=A,B&exclude_100x=true
//
// Returns a multi-quarter procurement pipeline.
// Groups non-100X buyers by their forecast_next_quarter (already stored in fogging_buyers).
// Used by the Forecasts tab pipeline/calendar section.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

const Q_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function getNextNQuarters(n: number): string[] {
  const now      = new Date();
  const curMonth = now.getUTCMonth() + 1;
  const curYear  = now.getUTCFullYear();
  const curQ     = Q_ORDER[Math.floor((curMonth - 1) / 3)];
  const quarters: string[] = [];

  let y = curYear;
  let qi = Q_ORDER.indexOf(curQ);

  for (let i = 0; i < n; i++) {
    quarters.push(`${y}-${Q_ORDER[qi]}`);
    qi++;
    if (qi >= Q_ORDER.length) { qi = 0; y++; }
  }
  return quarters;
}

export async function GET(req: NextRequest) {
  const p      = Object.fromEntries(req.nextUrl.searchParams);
  const nQ     = Math.min(4, Math.max(1, parseInt(p.quarters || '2')));
  const tiers  = p.tiers ? p.tiers.split(',') : ['A', 'B', 'C'];
  const quarters = getNextNQuarters(nQ + 1); // fetch one extra in case current quarter is nearly over

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const filter: Record<string, unknown> = {
      opportunity_tier:      { $in: tiers },
      forecast_next_quarter: { $in: quarters },
    };
    if (p.exclude_100x !== 'false') filter.purchased_100x = false;
    if (p.state) filter.buyer_state = p.state;

    const buyers = await coll.find(filter, {
      projection: {
        buyer_canonical:       1, buyer_display_name: 1, buyer_state: 1,
        org_type:              1, total_gmv: 1, total_contracts: 1,
        days_since_last:       1, avg_contract_value: 1,
        opportunity_score:     1, opportunity_tier:   1,
        forecast_next_month:   1, forecast_next_quarter: 1, forecast_next_year: 1,
        forecast_confidence:   1, forecast_days_until:   1,
        purchased_100x:        1, purchased_neptune:     1,
        primary_incumbent:     1, estimated_opportunity: 1,
        urgency:               1,
      }
    }).sort({ opportunity_score: -1, total_gmv: -1 }).toArray();

    // Group by quarter
    const grouped = new Map<string, typeof buyers>();
    for (const q of quarters) grouped.set(q, []);
    for (const b of buyers) {
      const q = b.forecast_next_quarter as string;
      if (grouped.has(q)) grouped.get(q)!.push(b);
    }

    const result = quarters.slice(0, nQ).map(q => {
      const qBuyers = grouped.get(q) ?? [];
      const tierCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
      let totalPredictedGmv = 0;
      let highConf = 0;

      for (const b of qBuyers) {
        const t = b.opportunity_tier as string;
        if (t in tierCounts) tierCounts[t]++;
        totalPredictedGmv += (b.avg_contract_value as number) || 0;
        if (b.forecast_confidence === 'high') highConf++;
      }

      return {
        quarter: q,
        buyers:  qBuyers,
        summary: {
          total:               qBuyers.length,
          tier_A:              tierCounts.A,
          tier_B:              tierCounts.B,
          tier_C:              tierCounts.C,
          high_confidence:     highConf,
          total_predicted_gmv: totalPredictedGmv,
        },
      };
    });

    return NextResponse.json({ quarters: result, n_quarters: nQ });
  } catch (e) {
    console.error('[fogging/forecast/pipeline]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
