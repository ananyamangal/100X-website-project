// GET /api/fogging/oems
// OEM Market Share — reads fogging_oems (pre-aggregated)

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_oems';

export async function GET(req: NextRequest) {
  const p    = Object.fromEntries(req.nextUrl.searchParams);
  const sort: Record<string, 1 | -1> =
      p.sort === 'contracts' ? { total_contracts: -1 }
    : p.sort === 'buyers'    ? { buyer_count: -1 }
    : p.sort === 'states'    ? { state_count: -1 }
    : p.sort === 'price'     ? { median_unit_price: 1 }
    :                          { total_gmv: -1 };

  const filter: Filter<Document> = {};
  if (p.is_100x === 'true')  filter.is_100x = true;
  if (p.is_100x === 'false') filter.is_100x = false;
  if (p.min_contracts)       filter.total_contracts = { $gte: parseInt(p.min_contracts) };

  try {
    const client = await clientPromise;
    const oems   = await client.db(DB).collection(COLL).find(filter).sort(sort).toArray();

    return NextResponse.json({ data: oems, total: oems.length }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' }
    });
  } catch (e) {
    console.error('[fogging/oems]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
