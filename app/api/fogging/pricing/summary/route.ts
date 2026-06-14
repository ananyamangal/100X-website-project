// GET /api/fogging/pricing/summary
// Returns fogging_oems pricing stats + top models per OEM
// Used by: Pricing Intelligence dashboard overview table
// Reads from fogging_oems (pre-aggregated) — very fast

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(req: NextRequest) {
  const p    = Object.fromEntries(req.nextUrl.searchParams);
  const sort: Record<string, 1 | -1> =
      p.sort === 'contracts' ? { total_contracts: -1 }
    : p.sort === 'price'     ? { median_unit_price: 1 }
    : p.sort === 'buyers'    ? { buyer_count: -1 }
    :                          { total_gmv: -1 };

  try {
    const client = await clientPromise;
    const db     = client.db(DB);

    // OEM pricing summary from fogging_oems
    const oemFilter = p.oem_canonical ? { oem_canonical: p.oem_canonical } : {};
    const oems = await db.collection('fogging_oems')
      .find(oemFilter, {
        projection: {
          oem_canonical: 1, brand_name: 1, is_100x: 1,
          total_contracts: 1, total_gmv: 1,
          buyer_count: 1, state_count: 1,
          avg_unit_price: 1, median_unit_price: 1, min_unit_price: 1, max_unit_price: 1,
          p25_unit_price: 1, p75_unit_price: 1,
          market_share_gmv: 1,
          last_seen: 1,
          quarterly: 1,
        }
      })
      .sort(sort)
      .toArray();

    // Top models per OEM from fogging_models
    const topModels = await db.collection('fogging_models')
      .find({ median_unit_price: { $ne: null } }, {
        projection: {
          model_normalized: 1, model_display: 1, oem_canonical: 1,
          total_contracts: 1, total_gmv: 1,
          avg_unit_price: 1, median_unit_price: 1, min_unit_price: 1, max_unit_price: 1,
          buyer_count: 1,
        }
      })
      .sort({ total_gmv: -1 })
      .limit(100)
      .toArray();

    const modelsByOem = new Map<string, typeof topModels>();
    for (const m of topModels) {
      if (!modelsByOem.has(m.oem_canonical)) modelsByOem.set(m.oem_canonical, []);
      modelsByOem.get(m.oem_canonical)!.push(m);
    }

    const result = oems.map(o => ({
      ...o,
      top_models: (modelsByOem.get(o.oem_canonical) || []).slice(0, 5),
    }));

    return NextResponse.json({
      data:   result,
      total:  result.length,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' }
    });
  } catch (e) {
    console.error('[fogging/pricing/summary]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
