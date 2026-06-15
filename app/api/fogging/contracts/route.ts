import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

function buildMatch(p: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = {};
  if (p.oem_canonical)    m.oem_canonical    = p.oem_canonical;
  if (p.oem_short_brand)  m.oem_short_brand  = new RegExp(p.oem_short_brand, 'i');
  if (p.buyer_canonical)  m.buyer_canonical  = p.buyer_canonical;
  if (p.buyer_state)      m.buyer_state      = p.buyer_state;
  if (p.org_type)         m.org_type         = p.org_type;
  if (p.year)             m.contract_year    = parseInt(p.year);
  if (p.quarter)          m.contract_quarter = p.quarter;
  if (p.month)            m.contract_month   = parseInt(p.month);
  if (p.buying_mode)      m.buying_mode      = p.buying_mode;
  if (p.contract_status)  m.contract_status  = p.contract_status;
  if (p.model_normalized) m.model_normalized = p.model_normalized;
  if (p.seller_gst)       m.seller_gst       = p.seller_gst;
  if (p.seller_name)      m.seller_name      = new RegExp(p.seller_name, 'i');
  if (p.ministry)         m.ministry         = new RegExp(p.ministry, 'i');
  if (p.is_100x === 'true')          m.is_100x        = true;
  if (p.is_100x === 'false')         m.is_100x        = false;
  if (p.has_unit_price === 'true')   m.has_unit_price = true;
  if (p.has_unit_price === 'false')  m.has_unit_price = false;

  // Full-text search across key display fields
  if (p.q) {
    const re = new RegExp(p.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    m.$or = [
      { gemc_no:            re },
      { buyer_display_name: re },
      { model_raw:          re },
      { seller_name:        re },
      { oem_short_brand:    re },
    ];
  }

  if (p.date_from || p.date_to) {
    m.contract_date = {};
    if (p.date_from) (m.contract_date as Record<string, Date>).$gte = new Date(p.date_from);
    if (p.date_to)   (m.contract_date as Record<string, Date>).$lte = new Date(p.date_to);
  }
  if (p.value_min || p.value_max) {
    m.contract_value_num = {};
    if (p.value_min) (m.contract_value_num as Record<string, number>).$gte = parseInt(p.value_min);
    if (p.value_max) (m.contract_value_num as Record<string, number>).$lte = parseInt(p.value_max);
  }
  if (p.price_min || p.price_max) {
    m.unit_price = {};
    if (p.price_min) (m.unit_price as Record<string, number>).$gte = parseInt(p.price_min);
    if (p.price_max) (m.unit_price as Record<string, number>).$lte = parseInt(p.price_max);
  }
  return m;
}

function sortSpec(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'date_asc':    return { contract_date: 1 };
    case 'value_desc':  return { contract_value_num: -1 };
    case 'value_asc':   return { contract_value_num: 1 };
    case 'buyer_asc':   return { buyer_display_name: 1 };
    case 'oem_asc':     return { oem_canonical: 1 };
    case 'price_asc':   return { unit_price: 1 };
    case 'price_desc':  return { unit_price: -1 };
    default:            return { contract_date: -1 };
  }
}

function escapeCsv(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const p        = Object.fromEntries(req.nextUrl.searchParams);
  const page     = Math.max(1, parseInt(p.page || '1'));
  const pageSize = Math.min(500, Math.max(1, parseInt(p.page_size || '50')));
  const skip     = (page - 1) * pageSize;

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);
    const match  = buildMatch(p);
    const sort   = sortSpec(p.sort);

    // CSV export — return all matching rows up to 5,000 as a download
    if (p.export === 'csv') {
      const rows = await coll.find(match).sort(sort).limit(5000).toArray();
      const headers = ['GEMC#','Date','Buyer','State','Org','Ministry','OEM','Model (raw)','Value (₹)','Qty','Unit ₹','Seller','GST','Mode','Status'];
      const csvRows = rows.map(d => [
        d.gemc_no,
        d.contract_date ? new Date(d.contract_date).toISOString().slice(0,10) : '',
        d.buyer_display_name,
        d.buyer_state ?? '',
        d.org_type ?? '',
        d.ministry ?? '',
        d.oem_short_brand ?? d.oem_canonical,
        d.model_raw ?? '',
        d.contract_value_num ?? '',
        d.quantity ?? '',
        d.unit_price ?? '',
        d.seller_name ?? '',
        d.seller_gst ?? '',
        d.buying_mode ?? '',
        d.contract_status ?? '',
      ].map(escapeCsv).join(','));
      const csv = [headers.map(escapeCsv).join(','), ...csvRows].join('\r\n');
      const filename = `fogging-contracts${p.oem_canonical ? `-${p.oem_canonical}` : p.buyer_canonical ? `-${p.buyer_canonical}` : ''}.csv`;
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const [docs, total, summaryArr] = await Promise.all([
      coll.find(match).sort(sort).skip(skip).limit(pageSize).toArray(),
      coll.countDocuments(match),
      coll.aggregate([
        { $match: match },
        { $group: {
          _id:            null,
          total_gmv:      { $sum: '$contract_value_num' },
          priced_count:   { $sum: { $cond: ['$has_unit_price', 1, 0] } },
          avg_unit_price: { $avg: '$unit_price' },
          min_unit_price: { $min: '$unit_price' },
          max_unit_price: { $max: '$unit_price' },
          total_qty:      { $sum: '$quantity' },
        }},
      ]).toArray(),
    ]);

    const s = summaryArr[0] ?? {};

    return NextResponse.json({
      data:  docs,
      total,
      page,
      page_size: pageSize,
      pages: Math.ceil(total / pageSize),
      summary: {
        total_gmv:      s.total_gmv      ?? 0,
        priced_count:   s.priced_count   ?? 0,
        avg_unit_price: s.avg_unit_price ?? null,
        min_unit_price: s.min_unit_price ?? null,
        max_unit_price: s.max_unit_price ?? null,
        total_qty:      s.total_qty      ?? 0,
      },
    });
  } catch (e) {
    console.error('[fogging/contracts]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
