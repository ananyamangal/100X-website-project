import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const stateName = decodeURIComponent(params.name);
  const client    = await clientPromise;
  const db        = client.db(DB);

  const [orgs, oems, summary] = await Promise.all([
    db.collection('fogging_organizations').find(
      { organization_state: stateName },
      {
        projection: {
          organization_canonical: 1, organization_name: 1, dept_category: 1,
          organization_type: 1, organization_status: 1,
          total_gmv: 1, total_contracts: 1, oem_count: 1,
          incumbent_oem: 1, incumbent_oem_brand: 1, is_100x_buyer: 1,
          first_contract: 1, last_contract: 1,
        }
      }
    ).sort({ total_gmv: -1 }).toArray(),

    db.collection('fogging_contracts').aggregate([
      { $match: { buyer_state: stateName } },
      { $group: {
        _id:       '$oem_canonical',
        brand:     { $first: '$oem_short_brand' },
        is_100x:   { $first: '$is_100x' },
        gmv:       { $sum: '$contract_value_num' },
        contracts: { $sum: 1 },
        buyers:    { $addToSet: '$buyer_canonical' },
      }},
      { $sort: { gmv: -1 } },
    ]).toArray(),

    db.collection('fogging_contracts').aggregate([
      { $match: { buyer_state: stateName } },
      { $group: {
        _id:             null,
        total_gmv:       { $sum: '$contract_value_num' },
        total_contracts: { $sum: 1 },
        total_units:     { $sum: '$quantity' },
        oems:            { $addToSet: '$oem_canonical' },
        sellers:         { $addToSet: '$seller_gst' },
        models:          { $addToSet: '$model_normalized' },
        buyers:          { $addToSet: '$buyer_canonical' },
        min_date:        { $min: '$contract_date' },
        max_date:        { $max: '$contract_date' },
      }}
    ]).toArray(),
  ]);

  // Quarterly timeline for state
  const qtRows = await db.collection('fogging_contracts').aggregate([
    { $match: { buyer_state: stateName } },
    { $group: {
      _id: '$contract_quarter',
      gmv: { $sum: '$contract_value_num' },
      contracts: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]).toArray();

  const timeline = qtRows.map(r => ({ quarter: r._id, gmv: r.gmv, contracts: r.contracts }));

  // Department category breakdown
  const deptRows = await db.collection('fogging_organizations').aggregate([
    { $match: { organization_state: stateName } },
    { $group: {
      _id:       '$dept_category',
      gmv:       { $sum: '$total_gmv' },
      contracts: { $sum: '$total_contracts' },
      orgs:      { $sum: 1 },
    }},
    { $sort: { gmv: -1 } },
  ]).toArray();

  const s = summary[0] || {};

  return NextResponse.json({
    state: stateName,
    summary: {
      total_gmv:       s.total_gmv || 0,
      total_contracts: s.total_contracts || 0,
      total_units:     s.total_units || 0,
      org_count:       orgs.length,
      oem_count:       (s.oems || []).filter(Boolean).length,
      seller_count:    (s.sellers || []).filter(Boolean).length,
      model_count:     (s.models || []).filter(Boolean).length,
      buyer_count:     (s.buyers || []).length,
      first_contract:  s.min_date || null,
      last_contract:   s.max_date || null,
    },
    organizations: orgs,
    oem_breakdown: oems.map(o => ({
      oem_canonical: o._id, brand_name: o.brand, is_100x: o.is_100x,
      gmv: o.gmv, contracts: o.contracts, buyer_count: (o.buyers || []).length,
    })),
    dept_breakdown: deptRows.map(r => ({ dept_category: r._id, gmv: r.gmv, contracts: r.contracts, org_count: r.orgs })),
    timeline,
  });
}
