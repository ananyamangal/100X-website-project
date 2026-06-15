import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_organizations';

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams);
  const page      = Math.max(1, parseInt(p.page      || '1'));
  const page_size = Math.min(200, parseInt(p.page_size || '50'));

  const match: Record<string, unknown> = {};
  if (p.state)       match.organization_state = p.state;
  if (p.dept_cat)    match.dept_category       = p.dept_cat;
  if (p.org_type)    match.organization_type   = p.org_type;
  if (p.status)      match.organization_status = p.status;
  if (p.incumbent_oem) match.incumbent_oem     = p.incumbent_oem;
  if (p.is_100x === 'true')  match.is_100x_buyer = true;
  if (p.is_100x === 'false') match.is_100x_buyer = false;

  if (p.q) {
    const re = new RegExp(p.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [
      { organization_name:      re },
      { organization_canonical: re },
      { buyer_display_names:    re },
    ];
  }

  const sort: Record<string, 1|-1> = {};
  switch (p.sort) {
    case 'gmv_asc':       sort.total_gmv       =  1; break;
    case 'contracts_desc':sort.total_contracts  = -1; break;
    case 'contracts_asc': sort.total_contracts  =  1; break;
    case 'name_asc':      sort.organization_name =  1; break;
    default:              sort.total_gmv        = -1;
  }

  const client = await clientPromise;
  const db     = client.db(DB);
  const col    = db.collection(COLL);

  const [total, rows, summary] = await Promise.all([
    col.countDocuments(match),
    col.find(match, {
      projection: {
        organization_canonical: 1, organization_name: 1, organization_state: 1,
        dept_category: 1, organization_type: 1, organization_status: 1,
        total_gmv: 1, total_contracts: 1, oem_count: 1, seller_count: 1,
        incumbent_oem: 1, incumbent_oem_brand: 1, incumbent_oem_gmv: 1,
        incumbent_seller: 1, is_100x_buyer: 1,
        year_count: 1, first_contract: 1, last_contract: 1,
        dominant_mount_type: 1, dominant_starting_type: 1,
        buyer_count_merged: 1,
      }
    }).sort(sort).skip((page - 1) * page_size).limit(page_size).toArray(),
    col.aggregate([
      { $match: match },
      { $group: {
        _id:            null,
        total_gmv:      { $sum: '$total_gmv' },
        total_contracts:{ $sum: '$total_contracts' },
        org_count:      { $sum: 1 },
        verified:       { $sum: { $cond: [{ $eq: ['$organization_status', 'verified'] }, 1, 0] } },
        merged:         { $sum: { $cond: [{ $eq: ['$organization_status', 'merged'] },   1, 0] } },
        unresolved:     { $sum: { $cond: [{ $eq: ['$organization_status', 'unresolved'] }, 1, 0] } },
      }}
    ]).toArray(),
  ]);

  return NextResponse.json({
    data:    rows,
    total,
    pages:   Math.ceil(total / page_size),
    summary: summary[0] || null,
  });
}
