// GET /api/fogging/sales/expansion
// P1 — Buyers with existing 100X history who still spend heavily on competitors
// Returns ALL such buyers (small set ~10), sorted by non_100x_gmv desc
// Fields: all needed for Expansion Board table

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

export async function GET(_req: NextRequest) {
  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const docs = await coll
      .find(
        { has_100x: true, non_100x_gmv: { $gt: 0 } },
        {
          projection: {
            buyer_canonical: 1, buyer_display_name: 1, buyer_state: 1, org_type: 1,
            total_gmv: 1, _100x_spend: 1, non_100x_gmv: 1, _100x_share_pct: 1,
            contract_count: 1, total_contracts: 1,
            primary_incumbent: 1, oem_spend: 1,
            incumbent_seller_gst: 1, incumbent_seller_name: 1,
            last_contract_date: 1, days_since_last: 1,
            opportunity_score: 1, opportunity_tier: 1,
            dept_category: 1,
          },
        },
      )
      .sort({ non_100x_gmv: -1 })
      .toArray();

    // Augment with computed fields for display
    const data = docs.map(d => ({
      ...d,
      contract_count: d.total_contracts ?? d.contract_count ?? 0,
    }));

    return NextResponse.json(
      { data, total: data.length },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (e) {
    console.error('[sales/expansion]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
