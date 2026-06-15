import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  req: NextRequest,
  { params }: { params: { normalized: string } },
) {
  const normalized = decodeURIComponent(params.normalized);
  const p          = Object.fromEntries(req.nextUrl.searchParams);

  try {
    const client = await clientPromise;
    const db     = client.db(DB);
    const fc     = db.collection('fogging_contracts');

    const contractFilter: Record<string, unknown> = { model_normalized: normalized };
    if (p.buyer_state) contractFilter.buyer_state = p.buyer_state;
    if (p.year)        contractFilter.contract_year = parseInt(p.year);
    if (p.oem_canonical) contractFilter.oem_canonical = p.oem_canonical;

    const [profile, buyerBreakdown, oemBreakdown, stateBreakdown, quarterlyTrend] = await Promise.all([
      db.collection('fogging_models').findOne({ model_normalized: normalized }),

      fc.aggregate([
        { $match: { model_normalized: normalized } },
        { $group: {
          _id:                '$buyer_canonical',
          buyer_display_name: { $first: '$buyer_display_name' },
          buyer_state:        { $first: '$buyer_state' },
          contract_count:     { $sum: 1 },
          total_gmv:          { $sum: '$contract_value_num' },
          total_qty:          { $sum: '$quantity' },
          min_price:          { $min: '$unit_price' },
          max_price:          { $max: '$unit_price' },
          avg_price:          { $avg: '$unit_price' },
          last_purchase:      { $max: '$contract_date' },
          sellers:            { $addToSet: '$seller_name' },
        }},
        { $sort: { total_gmv: -1 } },
      ]).toArray(),

      fc.aggregate([
        { $match: { model_normalized: normalized } },
        { $group: {
          _id:            '$oem_canonical',
          oem_short_brand: { $first: '$oem_short_brand' },
          is_100x:        { $first: '$is_100x' },
          contract_count: { $sum: 1 },
          total_gmv:      { $sum: '$contract_value_num' },
          min_price:      { $min: '$unit_price' },
          max_price:      { $max: '$unit_price' },
          avg_price:      { $avg: '$unit_price' },
        }},
        { $sort: { total_gmv: -1 } },
      ]).toArray(),

      fc.aggregate([
        { $match: { model_normalized: normalized } },
        { $group: {
          _id:            '$buyer_state',
          contract_count: { $sum: 1 },
          total_gmv:      { $sum: '$contract_value_num' },
          total_qty:      { $sum: '$quantity' },
        }},
        { $sort: { total_gmv: -1 } },
        { $limit: 15 },
      ]).toArray(),

      fc.aggregate([
        { $match: { model_normalized: normalized } },
        { $group: {
          _id:            { year: '$contract_year', quarter: '$contract_quarter' },
          contract_count: { $sum: 1 },
          total_gmv:      { $sum: '$contract_value_num' },
          total_qty:      { $sum: '$quantity' },
          avg_price:      { $avg: '$unit_price' },
        }},
        { $sort: { '_id.year': 1, '_id.quarter': 1 } },
      ]).toArray(),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      buyer_breakdown:    buyerBreakdown,
      oem_breakdown:      oemBreakdown,
      state_breakdown:    stateBreakdown,
      quarterly_trend:    quarterlyTrend,
    });
  } catch (e) {
    console.error('[fogging/models/[normalized]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
