// GET /api/fogging/buyers/search?q=...&include_100x=false
// Autocomplete search on buyer display name — used by Buyer Profiles tab
// Returns up to 10 matching buyers sorted by opportunity_score desc

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withCdnCache } from "@/lib/cache/cdn"

const DB   = '100xDB';
const COLL = 'fogging_buyers';

async function GET_handler(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams);
  const q = (p.q || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const filter: Record<string, unknown> = {
      buyer_display_name: { $regex: q, $options: 'i' },
    };
    if (p.include_100x === 'false') filter.purchased_100x = false;
    if (p.tier)  filter.opportunity_tier = p.tier;
    if (p.state) filter.buyer_state = p.state;

    const docs = await coll
      .find(filter, {
        projection: {
          buyer_canonical:    1,
          buyer_display_name: 1,
          buyer_state:        1,
          org_type:           1,
          opportunity_tier:   1,
          opportunity_score:  1,
          purchased_100x:     1,
          total_gmv:          1,
          total_contracts:    1,
          days_since_last:    1,
        }
      })
      .sort({ opportunity_score: -1, total_gmv: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({ data: docs });
  } catch (e) {
    console.error('[fogging/buyers/search]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Public, anonymous, URL-keyed data refreshed by daily imports: let the CDN serve it (lib/cache/cdn.ts).
export const GET = withCdnCache(GET_handler)
