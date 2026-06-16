// GET /api/fogging/sellers/[slug]
// Seller 360 — full profile + live breakdowns
// [slug] = seller_slug (GSTIN for GST sellers, nogstn__name for no-GST sellers)
//
// Query params:
//   buyer_state   = filter live breakdowns to a buyer state
//   year          = filter to contract year
//   quarter       = filter to contract_quarter (e.g. "2025-Q3")

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { enrichWithOrg } from '@/lib/fogging-org-lookup';

const DB = '100xDB';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug);
  const p    = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const client = await clientPromise;
    const db     = client.db(DB);

    const profile = await db.collection('fogging_sellers').findOne({ seller_slug: slug });
    if (!profile) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

    // Build live contract filter using GST (primary) or name (fallback)
    const contractFilter: Record<string, unknown> = profile.has_gst
      ? { seller_gst: profile.seller_gst }
      : { seller_name: profile.seller_display_name };

    if (p.buyer_state) contractFilter.buyer_state = p.buyer_state;
    if (p.year)        contractFilter.contract_year    = parseInt(p.year);
    if (p.quarter)     contractFilter.contract_quarter = p.quarter;

    const [stateBreakdown, buyerBreakdown, modelBreakdown, oemBreakdown, quarterlyTrend, recentContracts] = await Promise.all([
      // State breakdown (where are their buyers?)
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: { _id: '$buyer_state', cnt: { $sum: 1 }, gmv: { $sum: '$contract_value_num' } } },
        { $sort: { gmv: -1 } },
        { $limit: 25 },
      ]).toArray(),

      // Buyer breakdown
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:                '$buyer_canonical',
          buyer_display_name: { $first: '$buyer_display_name' },
          buyer_state:        { $first: '$buyer_state' },
          org_type:           { $first: '$org_type' },
          ministry:           { $first: '$ministry' },
          cnt:                { $sum: 1 },
          gmv:                { $sum: '$contract_value_num' },
          last_purchase:      { $max: '$contract_date' },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 25 },
      ]).toArray(),

      // Model breakdown
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:         '$model_normalized',
          model_raw:   { $first: '$model_raw' },
          oem:         { $first: '$oem_canonical' },
          oem_brand:   { $first: '$oem_short_brand' },
          cnt:         { $sum: 1 },
          gmv:         { $sum: '$contract_value_num' },
          avg_price:   { $avg: '$unit_price' },
          prices:      { $push: { $cond: ['$has_unit_price', '$unit_price', '$$REMOVE'] } },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 20 },
      ]).toArray(),

      // OEM breakdown (live)
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:       '$oem_canonical',
          brand:     { $first: '$oem_short_brand' },
          cnt:       { $sum: 1 },
          gmv:       { $sum: '$contract_value_num' },
          is_100x:   { $first: '$is_100x' },
          models:    { $addToSet: '$model_normalized' },
          buyers:    { $addToSet: '$buyer_canonical' },
        }},
        { $addFields: {
          model_count: { $size: '$models' },
          buyer_count: { $size: '$buyers' },
        }},
        { $project: { models: 0, buyers: 0 } },
        { $sort: { gmv: -1 } },
      ]).toArray(),

      // Quarterly trend
      db.collection('fogging_contracts').aggregate([
        { $match: contractFilter },
        { $group: {
          _id:         '$contract_quarter',
          cnt:         { $sum: 1 },
          gmv:         { $sum: '$contract_value_num' },
          buyer_count: { $addToSet: '$buyer_canonical' },
          oem_count:   { $addToSet: '$oem_canonical' },
        }},
        { $addFields: {
          buyer_count: { $size: '$buyer_count' },
          oem_count:   { $size: '$oem_count' },
        }},
        { $sort: { _id: 1 } },
      ]).toArray(),

      // Recent contracts
      db.collection('fogging_contracts')
        .find(contractFilter)
        .sort({ contract_date: -1 })
        .limit(15)
        .project({
          gemc_no: 1, contract_date: 1, contract_quarter: 1,
          buyer_display_name: 1, buyer_state: 1, org_type: 1,
          oem_canonical: 1, oem_short_brand: 1,
          model_raw: 1, model_normalized: 1,
          contract_value_num: 1, quantity: 1, unit_price: 1,
          contract_status: 1, has_unit_price: 1,
        })
        .toArray(),
    ]);

    const [enrichedBuyers, enrichedRecent] = await Promise.all([
      enrichWithOrg(
        db,
        buyerBreakdown.map(b => ({ ...b, buyer_canonical: (b as unknown as { _id: string })._id })) as Record<string, unknown>[]
      ),
      enrichWithOrg(db, recentContracts as Record<string, unknown>[]),
    ]);

    return NextResponse.json({
      profile,
      state_breakdown:  stateBreakdown,
      buyer_breakdown:  enrichedBuyers,
      model_breakdown:  modelBreakdown,
      oem_breakdown:    oemBreakdown,
      quarterly_trend:  quarterlyTrend,
      recent_contracts: enrichedRecent,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' }
    });
  } catch (e) {
    console.error('[fogging/sellers/[slug]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
