// GET /api/fogging/buyers
// Buyer Attack Surface — queries fogging_buyers (pre-aggregated)
// Default: sorted by opportunity_score DESC

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

function buildMatch(p: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = {};
  if (p.buyer_state)  m.buyer_state = p.buyer_state;
  if (p.org_type)     m.org_type    = p.org_type;
  if (p.ministry)     m.ministry    = new RegExp(p.ministry, 'i');

  // Boolean OEM flags
  if (p.purchased_100x === 'true')   m.purchased_100x   = true;
  if (p.purchased_100x === 'false')  m.purchased_100x   = false;
  if (p.purchased_neptune === 'true') m.purchased_neptune = true;
  if (p.purchased_pulsfog === 'true') m.purchased_pulsfog = true;
  if (p.purchased_sse === 'true')     m.purchased_sse     = true;
  if (p.purchased_instafog === 'true') m.purchased_instafog = true;

  // Opportunity tier
  if (p.opportunity_tier)     m.opportunity_tier = p.opportunity_tier;
  if (p.opportunity_tier_in)  m.opportunity_tier = { $in: p.opportunity_tier_in.split(',') };

  // Numeric ranges
  if (p.spend_min || p.spend_max) {
    m.total_gmv = {};
    if (p.spend_min) (m.total_gmv as Record<string, number>).$gte = parseInt(p.spend_min);
    if (p.spend_max) (m.total_gmv as Record<string, number>).$lte = parseInt(p.spend_max);
  }
  if (p.year_count_min) m.year_count = { $gte: parseInt(p.year_count_min) };
  if (p.days_since_max) m.days_since_last = { $lte: parseInt(p.days_since_max) };

  // Multi-OEM
  if (p.is_switcher === 'true')  m.oem_count = { $gte: 2 };
  if (p.is_switcher === 'false') m.oem_count = 1;

  return m;
}

function sortSpec(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'spend_desc':    return { total_gmv: -1 };
    case 'spend_asc':     return { total_gmv: 1 };
    case 'recency_asc':   return { days_since_last: 1 };
    case 'recency_desc':  return { days_since_last: -1 };
    case 'contracts_desc':return { total_contracts: -1 };
    case 'name_asc':      return { buyer_display_name: 1 };
    default:              return { opportunity_score: -1, total_gmv: -1 };
  }
}

export async function GET(req: NextRequest) {
  const p        = Object.fromEntries(req.nextUrl.searchParams);
  const page     = Math.max(1, parseInt(p.page || '1'));
  const pageSize = Math.min(500, Math.max(1, parseInt(p.page_size || '100')));
  const skip     = (page - 1) * pageSize;

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);
    const match  = buildMatch(p);
    const sort   = sortSpec(p.sort);

    const [docs, total, tierAgg] = await Promise.all([
      coll.find(match).sort(sort).skip(skip).limit(pageSize).toArray(),
      coll.countDocuments(match),
      coll.aggregate([
        { $match: match },
        { $group: {
          _id:    '$opportunity_tier',
          count:  { $sum: 1 },
          gmv:    { $sum: '$total_gmv' },
        }}
      ]).toArray(),
    ]);

    const tiers = { A: 0, B: 0, C: 0, D: 0, gmv: 0 } as Record<string, number>;
    for (const t of tierAgg) {
      if (t._id) tiers[t._id as string] = t.count;
      tiers.gmv = (tiers.gmv || 0) + (t.gmv || 0);
    }

    return NextResponse.json({
      data:   docs,
      total,
      page,
      page_size: pageSize,
      meta: {
        tiers,
        total_potential_gmv: tiers.gmv,
      }
    });
  } catch (e) {
    console.error('[fogging/buyers]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
