// GET /api/fogging/pricing
// Pricing intelligence — flat records or grouped aggregation
//
// group_by options:
//   quarter   → { quarter, count, gmv, price_avg, price_min, price_max, price_p50 }
//   month     → { month, ... }
//   state     → { state, ... }
//   oem       → { oem_canonical, ... }
//   model     → { model_normalized, ... }
//   flat      → raw price records (paginated)
//
// All queries hit fogging_contracts with has_unit_price:true

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

function buildPriceMatch(p: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = { has_unit_price: true };
  if (p.oem_canonical)    m.oem_canonical    = p.oem_canonical;
  if (p.model_normalized) m.model_normalized = p.model_normalized;
  if (p.buyer_state)      m.buyer_state      = p.buyer_state;
  if (p.buyer_canonical)  m.buyer_canonical  = p.buyer_canonical;
  if (p.org_type)         m.org_type         = p.org_type;
  if (p.year)             m.contract_year    = parseInt(p.year);
  if (p.quarter)          m.contract_quarter = p.quarter;
  if (p.buying_mode)      m.buying_mode      = p.buying_mode;

  if (p.date_from || p.date_to) {
    m.contract_date = {} as Record<string, Date>;
    if (p.date_from) (m.contract_date as Record<string, Date>).$gte = new Date(p.date_from);
    if (p.date_to)   (m.contract_date as Record<string, Date>).$lte = new Date(p.date_to);
  }
  if (p.price_min || p.price_max) {
    m.unit_price = {} as Record<string, number>;
    if (p.price_min) (m.unit_price as Record<string, number>).$gte = parseInt(p.price_min);
    if (p.price_max) (m.unit_price as Record<string, number>).$lte = parseInt(p.price_max);
  }
  return m;
}

function groupStage(groupBy: string) {
  const idField: Record<string, string> = {
    quarter: '$contract_quarter',
    month:   '$contract_month',
    state:   '$buyer_state',
    oem:     '$oem_canonical',
    model:   '$model_normalized',
  };
  const id = idField[groupBy];
  if (!id) return null;
  return {
    $group: {
      _id:       id,
      count:     { $sum: 1 },
      gmv:       { $sum: '$contract_value_num' },
      price_avg: { $avg: '$unit_price' },
      price_min: { $min: '$unit_price' },
      price_max: { $max: '$unit_price' },
      all_prices: { $push: '$unit_price' },
      // For state/oem/model groups, capture label
      label:     { $first: groupBy === 'state' ? '$buyer_state' : groupBy === 'oem' ? '$oem_short_brand' : '$model_raw' },
    }
  };
}

function p50FromArr(arr: number[]): number | null {
  if (!arr?.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export async function GET(req: NextRequest) {
  const p       = Object.fromEntries(req.nextUrl.searchParams);
  const groupBy = p.group_by || 'flat';

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);
    const match  = buildPriceMatch(p);

    // Flat mode: paginated list of price records
    if (groupBy === 'flat') {
      const page     = Math.max(1, parseInt(p.page || '1'));
      const pageSize = Math.min(1000, Math.max(1, parseInt(p.page_size || '100')));
      const skip     = (page - 1) * pageSize;

      const [docs, total, summary] = await Promise.all([
        coll.find(match, {
          projection: {
            gemc_no: 1, contract_date: 1, contract_quarter: 1,
            buyer_display_name: 1, buyer_state: 1, org_type: 1,
            oem_canonical: 1, oem_short_brand: 1,
            model_raw: 1, model_normalized: 1,
            contract_value_num: 1, quantity: 1, unit_price: 1,
            contract_status: 1, buying_mode: 1,
          }
        }).sort({ contract_date: -1 }).skip(skip).limit(pageSize).toArray(),
        coll.countDocuments(match),
        coll.aggregate([
          { $match: match },
          { $group: {
            _id: null,
            count:     { $sum: 1 },
            gmv:       { $sum: '$contract_value_num' },
            price_min: { $min: '$unit_price' },
            price_max: { $max: '$unit_price' },
            price_avg: { $avg: '$unit_price' },
            all_prices: { $push: '$unit_price' },
          }}
        ]).toArray(),
      ]);

      const s = summary[0] || {};
      const meta = {
        total_contracts: total,
        price_min:  s.price_min   ?? null,
        price_max:  s.price_max   ?? null,
        price_avg:  s.price_avg ? Math.round(s.price_avg) : null,
        price_p50:  p50FromArr(s.all_prices || []),
        total_gmv:  s.gmv         ?? 0,
      };

      return NextResponse.json({ data: docs, meta, total, page, page_size: pageSize });
    }

    // Grouped mode
    const gs = groupStage(groupBy);
    if (!gs) {
      return NextResponse.json({ error: `Invalid group_by: ${groupBy}` }, { status: 400 });
    }

    const sortKey = ['quarter', 'month'].includes(groupBy) ? '_id' : 'gmv';
    const sortDir = sortKey === 'gmv' ? -1 : 1;

    const pipeline = [
      { $match: match },
      gs,
      { $sort: { [sortKey]: sortDir } },
    ];

    const groups = await coll.aggregate(pipeline, { allowDiskUse: true }).toArray();

    // Compute P50 per group (MongoDB doesn't have $median without server-side percentile)
    const enriched = groups.map(g => ({
      group:      g._id,
      label:      g.label ?? g._id,
      count:      g.count,
      gmv:        g.gmv,
      price_avg:  g.price_avg ? Math.round(g.price_avg) : null,
      price_min:  g.price_min,
      price_max:  g.price_max,
      price_p50:  p50FromArr(g.all_prices || []),
    }));

    return NextResponse.json({ data: enriched, group_by: groupBy, total_groups: enriched.length });
  } catch (e) {
    console.error('[fogging/pricing]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
