// GET /api/fogging/sales/dealer-targets
// P3 — Sellers ranked as dealer recruitment targets
// Params: state, oem_carried (neptune|sse|instafog|pulsfog|any_competitor),
//         is_100x (true|false|all), min_buyers, sort (opp|gmv|buyers), page, page_size

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Filter, Document } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_sellers';

function buildFilter(p: Record<string, string>): Filter<Document> {
  const f: Filter<Document> = {};
  if (p.state)       f.seller_state  = p.state;
  if (p.min_buyers)  f.buyers_served = { $gte: Number(p.min_buyers) };

  switch (p.is_100x) {
    case 'true':  f.is_100x_dealer = true;  break;
    case 'false': f.is_100x_dealer = false; break;
    // default: all
  }

  switch (p.oem_carried?.toLowerCase()) {
    case 'neptune':         f.carries_neptune   = true; break;
    case 'sse':             f.carries_sse       = true; break;
    case 'instafog':        f.carries_instafog  = true; break;
    case 'pulsfog':         f.carries_pulsfog   = true; break;
    case 'any_competitor':
      f.$or = [
        { carries_neptune:  true },
        { carries_sse:      true },
        { carries_instafog: true },
        { carries_pulsfog:  true },
      ];
      break;
  }

  // Text search on seller name
  if (p.q) f.seller_display_name = { $regex: p.q, $options: 'i' };

  return f;
}

function buildSort(sortKey: string): Record<string, 1 | -1> {
  switch (sortKey) {
    case 'gmv':    return { total_gmv: -1 };
    case 'buyers': return { buyers_served: -1 };
    default:       return { seller_opportunity_score: -1, buyers_served: -1 };
  }
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
    const sort    = buildSort(p.sort || 'opp');

    const [docs, total] = await Promise.all([
      coll
        .find(filter, {
          projection: {
            seller_slug: 1, seller_gst: 1, seller_display_name: 1,
            seller_state: 1, has_gst: 1, is_100x_dealer: 1, selling_as: 1,
            total_gmv: 1, total_contracts: 1, buyers_served: 1, oem_count: 1,
            oems_represented: { $slice: 5 },
            days_since_last: 1, last_contract_date: 1,
            carries_neptune: 1, carries_sse: 1, carries_instafog: 1,
            carries_pulsfog: 1, carries_spacespray: 1, carries_foggers: 1,
            competitor_oem_count: 1, seller_opportunity_score: 1,
            seller_email: 1, seller_phone: 1, seller_state_code: 1,
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(size)
        .toArray(),
      coll.countDocuments(filter),
    ]);

    const data = docs.map((d, i) => ({ ...d, rank: skip + i + 1 }));

    return NextResponse.json(
      { data, total, page, page_size: size, pages: Math.ceil(total / size) },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (e) {
    console.error('[sales/dealer-targets]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
