// GET /api/fogging/sellers
// Seller list with filters and pagination — reads fogging_sellers (pre-aggregated)
//
// Query params:
//   sort         = gmv (default) | contracts | buyers | states | recent
//   state        = seller_state (registered state)
//   is_100x      = true | false
//   multi_oem    = true  (sellers carrying >1 OEM brand)
//   has_gst      = true | false
//   oem          = oem_canonical (sellers who represent this OEM)
//   min_gmv      = minimum total_gmv
//   min_buyers   = minimum buyers_served
//   active_days  = only sellers with last_contract within N days
//   q            = text search on seller_display_name
//   page         = 1-indexed (default 1)
//   page_size    = (default 50, max 200)

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_sellers';

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams);

  const sort: Record<string, 1 | -1> =
      p.sort === 'contracts' ? { total_contracts: -1 }
    : p.sort === 'buyers'    ? { buyers_served: -1 }
    : p.sort === 'states'    ? { states_served: -1 }
    : p.sort === 'recent'    ? { last_contract_date: -1 }
    :                          { total_gmv: -1 };

  const filter: Filter<Document> = {};
  if (p.state)             filter.seller_state = p.state;
  if (p.is_100x === 'true')  filter.is_100x_dealer = true;
  if (p.is_100x === 'false') filter.is_100x_dealer = false;
  if (p.has_gst === 'true')  filter.has_gst = true;
  if (p.has_gst === 'false') filter.has_gst = false;
  if (p.multi_oem === 'true') filter.oem_count = { $gt: 1 };
  if (p.oem) filter['oems_represented.oem_canonical'] = p.oem;
  if (p.min_gmv)    filter.total_gmv       = { $gte: parseFloat(p.min_gmv) };
  if (p.min_buyers) filter.buyers_served   = { $gte: parseInt(p.min_buyers) };
  if (p.active_days) {
    const since = new Date(Date.now() - parseInt(p.active_days) * 86400000);
    filter.last_contract_date = { $gte: since };
  }
  if (p.q) filter.seller_display_name = { $regex: p.q, $options: 'i' };

  const page     = Math.max(1, parseInt(p.page || '1'));
  const pageSize = Math.min(200, Math.max(1, parseInt(p.page_size || '50')));
  const skip     = (page - 1) * pageSize;

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const [data, total] = await Promise.all([
      coll.find(filter, {
        projection: {
          seller_slug: 1, seller_gst: 1, seller_display_name: 1, seller_canonical: 1,
          seller_state: 1, seller_state_code: 1, has_gst: 1,
          is_100x_dealer: 1, is_reseller: 1, is_oem_seller: 1, is_manufacturer: 1,
          selling_as: 1, seller_msme: 1,
          total_gmv: 1, total_contracts: 1, average_contract_value: 1,
          buyers_served: 1, states_served: 1, oem_count: 1, model_count: 1,
          first_contract_date: 1, last_contract_date: 1, days_since_last: 1,
          top_buyer: 1, top_buyer_display: 1, top_oem: 1, top_model: 1,
          avg_unit_price: 1, median_unit_price: 1,
          oems_represented: 1,
        }
      }).sort(sort).skip(skip).limit(pageSize).toArray(),
      coll.countDocuments(filter),
    ]);

    return NextResponse.json(
      { data, total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) },
      { headers: { 'Cache-Control': 'public, s-maxage=900' } }
    );
  } catch (e) {
    console.error('[fogging/sellers]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
