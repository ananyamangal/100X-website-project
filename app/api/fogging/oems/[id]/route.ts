// GET /api/fogging/oems/[id]
// Single OEM detail: profile + live state/buyer breakdowns + quarterly trend
// [id] = oem_canonical (URL-encoded)

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const oemCanonical = decodeURIComponent(params.id);
  const p            = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const client = await clientPromise;
    const db     = client.db(DB);

    // OEM profile from pre-aggregated collection
    const profile = await db.collection('fogging_oems').findOne({ oem_canonical: oemCanonical });
    if (!profile) return NextResponse.json({ error: 'OEM not found' }, { status: 404 });

    // Live breakdown (re-aggregated on demand for drill-down accuracy)
    const contractFilter: Record<string, unknown> = { oem_canonical: oemCanonical };
    if (p.buyer_state) contractFilter.buyer_state = p.buyer_state;
    if (p.year)        contractFilter.contract_year = parseInt(p.year);
    if (p.quarter)     contractFilter.contract_quarter = p.quarter;

    const [stateBreakdown, buyerBreakdown, modelBreakdown, quarterlyTrend, recentContracts] = await Promise.all([
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: { _id: '$buyer_state', cnt: { $sum: 1 }, gmv: { $sum: '$contract_value_num' } } },
        { $sort: { gmv: -1 } },
        { $limit: 20 },
      ]).toArray(),

      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:  '$buyer_canonical',
          name: { $first: '$buyer_display_name' },
          cnt:  { $sum: 1 },
          gmv:  { $sum: '$contract_value_num' },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 20 },
      ]).toArray(),

      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:   '$model_normalized',
          model: { $first: '$model_raw' },
          cnt:   { $sum: 1 },
          gmv:   { $sum: '$contract_value_num' },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 15 },
      ]).toArray(),

      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id: '$contract_quarter',
          cnt:         { $sum: 1 },
          gmv:         { $sum: '$contract_value_num' },
          buyer_count: { $addToSet: '$buyer_canonical' },
          price_avg:   { $avg: '$unit_price' },
        }},
        { $addFields: { buyer_count: { $size: '$buyer_count' } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      db.collection('fogging_contracts')
        .find(contractFilter)
        .sort({ contract_date: -1 })
        .limit(10)
        .project({ gemc_no: 1, contract_date: 1, buyer_display_name: 1, buyer_state: 1, model_raw: 1, contract_value_num: 1, quantity: 1, unit_price: 1, contract_status: 1 })
        .toArray(),
    ]);

    return NextResponse.json({
      profile,
      state_breakdown:   stateBreakdown,
      buyer_breakdown:   buyerBreakdown,
      model_breakdown:   modelBreakdown,
      quarterly_trend:   quarterlyTrend,
      recent_contracts:  recentContracts,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' }
    });
  } catch (e) {
    console.error('[fogging/oems/[id]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
