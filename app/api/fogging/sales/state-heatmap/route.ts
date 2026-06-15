// GET /api/fogging/sales/state-heatmap
// P4 — State-level opportunity heatmap
// Live aggregation (29 states, fast enough)
// Returns all states sorted by opportunity score (non_100x_gmv × recency)

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

function recencyFactor(days: number): number {
  if (days <  60) return 1.00;
  if (days < 120) return 0.90;
  if (days < 180) return 0.80;
  if (days < 365) return 0.60;
  if (days < 545) return 0.30;
  return 0.10;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const agg = await coll.aggregate([
      { $group: {
        _id:          '$buyer_state',
        total_gmv:    { $sum: '$contract_value_num' },
        gmv_100x:     { $sum: { $cond: ['$is_100x', '$contract_value_num', 0] } },
        contracts:    { $sum: 1 },
        cnt_100x:     { $sum: { $cond: ['$is_100x', 1, 0] } },
        buyers:       { $addToSet: '$buyer_canonical' },
        sellers:      { $addToSet: { $ifNull: ['$seller_gst', '$seller_name'] } },
        oem_list:     { $push: '$oem_canonical' },
        last_contract:{ $max: '$contract_date' },
      }},
    ], { allowDiskUse: true }).toArray();

    const now = Date.now();
    const states = agg.map(s => {
      // Top 3 OEMs by frequency
      const freq: Record<string, number> = {};
      for (const o of s.oem_list) freq[o] = (freq[o] || 0) + 1;
      const top_oems = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

      const non100x_gmv = (s.total_gmv || 0) - (s.gmv_100x || 0);
      const penetration_pct = s.total_gmv > 0
        ? Math.round(s.gmv_100x / s.total_gmv * 10000) / 100 : 0;
      const days = s.last_contract
        ? Math.floor((now - new Date(s.last_contract).getTime()) / 86400000) : 9999;
      const opp_score = Math.round(non100x_gmv * recencyFactor(days));

      return {
        state:          s._id || '(Unknown)',
        total_gmv:      s.total_gmv,
        gmv_100x:       s.gmv_100x,
        non100x_gmv,
        contracts:      s.contracts,
        cnt_100x:       s.cnt_100x,
        buyer_count:    s.buyers.length,
        seller_count:   s.sellers.length,
        penetration_pct,
        top_oems,
        last_contract:  s.last_contract,
        days_since_last: days,
        opp_score,
        zero_penetration: penetration_pct === 0,
      };
    });

    states.sort((a, b) => b.opp_score - a.opp_score);

    const summary = {
      total_states:    states.length,
      zero_pen_states: states.filter(s => s.zero_penetration).length,
      total_non100x_gmv: states.reduce((s, x) => s + x.non100x_gmv, 0),
    };

    return NextResponse.json(
      { data: states, summary },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=120' } },
    );
  } catch (e) {
    console.error('[sales/state-heatmap]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
