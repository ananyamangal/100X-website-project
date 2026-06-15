// GET /api/fogging/search?q=<query>
// Universal search across buyers, sellers, OEMs, models, contracts (by GEMC)
// Returns up to 5 hits per entity type, all with their navigation slug/href

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';
const LIMIT = 5;

function re(q: string) {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  try {
    const client = await clientPromise;
    const db     = client.db(DB);
    const pattern = re(q);

    const [buyers, sellers, oems, models, contracts] = await Promise.all([
      // Buyers: search display name, org_type, ministry, state
      db.collection('fogging_buyers').find({
        $or: [
          { buyer_display_name: pattern },
          { ministry:           pattern },
          { buyer_state:        pattern },
          { buyer_canonical:    pattern },
        ],
      }, {
        projection: {
          buyer_canonical: 1, buyer_display_name: 1,
          buyer_state: 1, org_type: 1, ministry: 1,
          total_gmv: 1, opportunity_tier: 1,
        },
      }).sort({ opportunity_score: -1 }).limit(LIMIT).toArray(),

      // Sellers: search display name, GST, canonical, state
      db.collection('fogging_sellers').find({
        $or: [
          { seller_display_name: pattern },
          { seller_gst:          pattern },
          { seller_canonical:    pattern },
          { seller_state:        pattern },
        ],
      }, {
        projection: {
          seller_slug: 1, seller_display_name: 1,
          seller_gst: 1, seller_state: 1,
          total_gmv: 1, is_100x_dealer: 1,
        },
      }).sort({ total_gmv: -1 }).limit(LIMIT).toArray(),

      // OEMs: search brand name and canonical
      db.collection('fogging_oems').find({
        $or: [
          { brand_name:    pattern },
          { oem_canonical: pattern },
        ],
      }, {
        projection: {
          oem_canonical: 1, brand_name: 1,
          total_gmv: 1, is_100x: 1, market_share_gmv: 1,
        },
      }).sort({ total_gmv: -1 }).limit(LIMIT).toArray(),

      // Models: search display and normalized
      db.collection('fogging_models').find({
        $or: [
          { model_display:    pattern },
          { model_normalized: pattern },
          { model_raw:        pattern },
          { oem_canonical:    pattern },
        ],
      }, {
        projection: {
          model_normalized: 1, model_display: 1,
          oem_canonical: 1, total_gmv: 1, is_100x: 1,
        },
      }).sort({ total_gmv: -1 }).limit(LIMIT).toArray(),

      // Contracts: search by GEMC# (exact prefix) or buyer name
      db.collection('fogging_contracts').find({
        $or: [
          { gemc_no:            pattern },
          { buyer_display_name: pattern },
          { seller_name:        pattern },
          { model_raw:          pattern },
        ],
      }, {
        projection: {
          gemc_no: 1, contract_date: 1,
          buyer_display_name: 1, buyer_canonical: 1,
          oem_short_brand: 1, oem_canonical: 1,
          contract_value_num: 1, is_100x: 1,
        },
      }).sort({ contract_date: -1 }).limit(LIMIT).toArray(),
    ]);

    const INR = (v: number | null | undefined) => {
      if (v == null) return null;
      if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
      if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
      return `₹${Math.round(v).toLocaleString()}`;
    };

    const results = {
      buyers: buyers.map(b => ({
        type:    'buyer' as const,
        id:      b.buyer_canonical,
        label:   b.buyer_display_name,
        sub:     [b.buyer_state, b.org_type, b.ministry].filter(Boolean).join(' · '),
        gmv:     INR(b.total_gmv),
        badge:   b.opportunity_tier,
        href:    `/admin/growth/fogging/buyer/${encodeURIComponent(b.buyer_canonical)}`,
      })),
      sellers: sellers.map(s => ({
        type:    'seller' as const,
        id:      s.seller_slug ?? s.seller_gst,
        label:   s.seller_display_name,
        sub:     [s.seller_gst, s.seller_state].filter(Boolean).join(' · '),
        gmv:     INR(s.total_gmv),
        badge:   s.is_100x_dealer ? '100X' : null,
        href:    `/admin/growth/fogging/sellers/${encodeURIComponent(s.seller_slug ?? s.seller_gst)}`,
      })),
      oems: oems.map(o => ({
        type:    'oem' as const,
        id:      o.oem_canonical,
        label:   o.brand_name,
        sub:     o.market_share_gmv != null ? `${o.market_share_gmv.toFixed(1)}% share` : null,
        gmv:     INR(o.total_gmv),
        badge:   o.is_100x ? '100X' : null,
        href:    `/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`,
      })),
      models: models.map(m => ({
        type:    'model' as const,
        id:      m.model_normalized,
        label:   m.model_display ?? m.model_normalized,
        sub:     m.oem_canonical,
        gmv:     INR(m.total_gmv),
        badge:   m.is_100x ? '100X' : 'Gap',
        href:    `/admin/growth/fogging/model/${encodeURIComponent(m.model_normalized)}`,
      })),
      contracts: contracts.map(c => ({
        type:    'contract' as const,
        id:      c.gemc_no,
        label:   c.gemc_no,
        sub:     [c.buyer_display_name, c.oem_short_brand ?? c.oem_canonical].filter(Boolean).join(' · '),
        gmv:     INR(c.contract_value_num),
        badge:   c.is_100x ? '100X' : null,
        href:    `/admin/growth/fogging/contracts/${encodeURIComponent(c.gemc_no)}`,
      })),
    };

    const total =
      results.buyers.length + results.sellers.length +
      results.oems.length + results.models.length + results.contracts.length;

    return NextResponse.json({ results, total, query: q }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[fogging/search]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
