// GET /api/fogging/sales/attack-accounts
// P2 — Non-100X buyers ranked by opportunity_score
// Params: state, oem (primary_incumbent), dept, min_gmv, max_days, tier, page, page_size

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Filter, Document } from 'mongodb';
import { enrichWithOrg } from '@/lib/fogging-org-lookup';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

function buildFilter(p: Record<string, string>): Filter<Document> {
  const f: Filter<Document> = {};
  if (p.state)    f.buyer_state      = p.state;
  if (p.tier)     f.opportunity_tier = { $in: p.tier.split(',') };
  if (p.org_type) f.org_type         = p.org_type;
  if (p.min_gmv)  f.total_gmv        = { $gte: Number(p.min_gmv) };
  if (p.max_days && !isNaN(Number(p.max_days)))
                  f.days_since_last  = { $lte: Number(p.max_days) };
  // OEM filter: match primary_incumbent or any oem_spend entry
  if (p.oem) {
    const oemUpper = p.oem.toUpperCase();
    if (oemUpper === 'NEPTUNE')                 f.purchased_neptune  = true;
    else if (oemUpper.includes('SSE'))          f.purchased_sse      = true;
    else if (oemUpper.includes('PULSFOG'))      f.purchased_pulsfog  = true;
    else if (oemUpper.includes('INSTA'))        f.purchased_instafog = true;
    else if (oemUpper.includes('FOGGERS'))      f.purchased_foggers  = true;
    else f.primary_incumbent = { $regex: p.oem, $options: 'i' };
  }
  // Exclude buyers with ONLY 100X history
  if (p.exclude_pure_100x === 'true') f.purchased_100x = false;
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
    const [docs, total] = await Promise.all([
      coll
        .find(filter, {
          projection: {
            buyer_canonical: 1, buyer_display_name: 1, buyer_state: 1,
            org_type: 1, ministry: 1, dept_category: 1,
            total_gmv: 1, total_contracts: 1, contract_count: 1,
            _100x_spend: 1, non_100x_gmv: 1, _100x_share_pct: 1,
            has_100x: 1, purchased_100x: 1,
            primary_incumbent: 1,
            incumbent_seller_gst: 1, incumbent_seller_name: 1,
            last_contract_date: 1, days_since_last: 1,
            opportunity_score: 1, opportunity_tier: 1,
            oem_count: 1, year_count: 1,
            purchased_neptune: 1, purchased_sse: 1, purchased_pulsfog: 1,
            purchased_instafog: 1, purchased_foggers: 1,
          },
        })
        .sort({ opportunity_score: -1, total_gmv: -1 })
        .skip(skip)
        .limit(size)
        .toArray(),
      coll.countDocuments(filter),
    ]);

    const ranked = docs.map((d, i) => ({
      ...d,
      rank: skip + i + 1,
      contract_count: d.total_contracts ?? d.contract_count ?? 0,
    }));
    const enriched = await enrichWithOrg(client.db(DB), ranked);

    // Collapse duplicate departments that belong to the same organization
    const TIER_RANK: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const orgMap = new Map<string, Record<string, unknown>>();
    for (const row of enriched) {
      const key = (row.organization_canonical as string) ?? (row.buyer_canonical as string);
      const existing = orgMap.get(key);
      if (!existing) {
        orgMap.set(key, { ...row });
      } else {
        const e = existing;
        e.total_gmv     = ((e.total_gmv     as number) || 0) + ((row.total_gmv     as number) || 0);
        e.non_100x_gmv  = ((e.non_100x_gmv  as number) || 0) + ((row.non_100x_gmv  as number) || 0);
        e._100x_spend   = ((e._100x_spend   as number) || 0) + ((row._100x_spend   as number) || 0);
        e.contract_count= ((e.contract_count as number) || 0) + ((row.contract_count as number) || 0);
        if ((row.opportunity_score as number) > (e.opportunity_score as number)) {
          e.opportunity_score = row.opportunity_score;
        }
        const etr = TIER_RANK[e.opportunity_tier as string] ?? 3;
        const rtr = TIER_RANK[row.opportunity_tier as string] ?? 3;
        if (rtr < etr) e.opportunity_tier = row.opportunity_tier;
        if ((row.days_since_last as number) < (e.days_since_last as number)) {
          e.days_since_last      = row.days_since_last;
          e.last_contract_date   = row.last_contract_date;
          e.incumbent_seller_gst = row.incumbent_seller_gst;
          e.incumbent_seller_name= row.incumbent_seller_name;
        }
      }
    }
    const deduped = [...orgMap.values()].sort(
      (a, b) => (b.opportunity_score as number) - (a.opportunity_score as number)
    );
    const data = deduped.map((r, i) => ({ ...r, rank: skip + i + 1 }));

    return NextResponse.json(
      { data, total, page, page_size: size, pages: Math.ceil(total / size) },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (e) {
    console.error('[sales/attack-accounts]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
