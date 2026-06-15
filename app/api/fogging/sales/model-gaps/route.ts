// GET /api/fogging/sales/model-gaps
// P5 — Model gap analysis: competitor models vs 100X portfolio
// Params: oem, gap_only (true = show only non-100X), min_gmv, min_buyers, page, page_size

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Filter, Document } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_models';

function buildFilter(p: Record<string, string>): Filter<Document> {
  const f: Filter<Document> = {};
  if (p.oem)       f.oem_canonical = { $regex: p.oem, $options: 'i' };
  if (p.min_gmv)   f.total_gmv     = { $gte: Number(p.min_gmv) };
  if (p.min_buyers)f.buyer_count   = { $gte: Number(p.min_buyers) };
  if (p.gap_only === 'true') f.is_100x = false;
  if (p.is_100x === 'true')  f.is_100x = true;
  if (p.is_100x === 'false') f.is_100x = false;
  return f;
}

export async function GET(req: NextRequest) {
  const p    = Object.fromEntries(req.nextUrl.searchParams);
  const page = Math.max(1, parseInt(p.page || '1'));
  const size = Math.min(200, Math.max(1, parseInt(p.page_size || '50')));
  const skip = (page - 1) * size;

  try {
    const client  = await clientPromise;
    const coll    = client.db(DB).collection(COLL);
    const filter  = buildFilter(p);

    const sortKey = p.sort || 'gmv';
    const sort: Record<string, 1 | -1> = sortKey === 'opp'
      ? { model_opportunity_score: -1 }
      : { total_gmv: -1 };

    const [docs, total] = await Promise.all([
      coll
        .find(filter, {
          projection: {
            model_normalized: 1, model_display: 1, model_raw: 1, oem_canonical: 1,
            total_gmv: 1, contract_count: 1, buyer_count: 1, state_count: 1,
            is_100x: 1, gap_status: 1,
            p50_price: 1, p_min: 1, p_max: 1,
            price_variance_pct: 1, priced_count: 1,
            model_opportunity_score: 1,
            first_seen: 1, last_seen: 1,
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(size)
        .toArray(),
      coll.countDocuments(filter),
    ]);

    const data = docs.map((d, i) => ({ ...d, rank: skip + i + 1 }));

    // Summary counts
    const [gapCount, compCount] = await Promise.all([
      coll.countDocuments({ is_100x: false }),
      coll.countDocuments({ is_100x: true }),
    ]);

    return NextResponse.json(
      {
        data, total, page, page_size: size, pages: Math.ceil(total / size),
        summary: { gap_models: gapCount, competing_models: compCount },
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=120' } },
    );
  } catch (e) {
    console.error('[sales/model-gaps]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
