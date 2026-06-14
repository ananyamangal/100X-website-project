import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

function buildMatch(p: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = {};
  if (p.oem_canonical)   m.oem_canonical   = p.oem_canonical;
  if (p.oem_short_brand) m.oem_short_brand = new RegExp(p.oem_short_brand, 'i');
  if (p.buyer_canonical) m.buyer_canonical = p.buyer_canonical;
  if (p.buyer_state)     m.buyer_state     = p.buyer_state;
  if (p.org_type)        m.org_type        = p.org_type;
  if (p.year)            m.contract_year   = parseInt(p.year);
  if (p.quarter)         m.contract_quarter = p.quarter;
  if (p.month)           m.contract_month  = parseInt(p.month);
  if (p.buying_mode)     m.buying_mode     = p.buying_mode;
  if (p.contract_status) m.contract_status = p.contract_status;
  if (p.model_normalized) m.model_normalized = p.model_normalized;
  if (p.is_100x === 'true')  m.is_100x = true;
  if (p.is_100x === 'false') m.is_100x = false;
  if (p.has_unit_price === 'true')  m.has_unit_price = true;
  if (p.has_unit_price === 'false') m.has_unit_price = false;
  if (p.ministry) m.ministry = new RegExp(p.ministry, 'i');
  if (p.seller_gst) m.seller_gst = p.seller_gst;

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

    const [docs, total] = await Promise.all([
      coll.find(match).sort(sort).skip(skip).limit(pageSize).toArray(),
      coll.countDocuments(match),
    ]);

    return NextResponse.json({ data: docs, total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) });
  } catch (e) {
    console.error('[fogging/contracts]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
