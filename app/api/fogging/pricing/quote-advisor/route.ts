// GET /api/fogging/pricing/quote-advisor
// Quote Advisor — given buyer context, return pricing intelligence and recommended band
//
// Inputs (all optional; more = tighter recommendation):
//   buyer_state     → filter comparable contracts to buyer's state
//   org_type        → filter to same org type (State Local Bodies, Central Govt…)
//   oem_canonical   → competitor OEM to benchmark against
//   model_normalized → specific model to price-match
//   quantity        → number of units (used for quantity-discount hint)
//
// Returns:
//   market_min, market_max, market_p50
//   band_low (P25), band_mid (P50), band_high (P75)
//   100x_history: 100X's own historical prices for similar products
//   competitor_data: per-competitor pricing summary
//   recommendation: text guidance string

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

function p(arr: number[], q: number): number | null {
  if (!arr.length) return null;
  const s   = [...arr].sort((a, b) => a - b);
  const idx = (q / 100) * (s.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo));
}

function buildMatch(params: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = { has_unit_price: true };
  // Tier 1: exact model
  if (params.model_normalized) m.model_normalized = params.model_normalized;
  // Tier 2: state
  if (params.buyer_state) m.buyer_state = params.buyer_state;
  // Tier 3: org type
  if (params.org_type) m.org_type = params.org_type;
  return m;
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const qty    = params.quantity ? parseInt(params.quantity) : null;

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    // Build progressively relaxed match filters
    const matchStrict = buildMatch(params);
    const matchRelaxed: Filter<Document> = { has_unit_price: true };
    if (params.buyer_state) matchRelaxed.buyer_state = params.buyer_state;

    // Run two queries: one strict (model+state+org), one market-wide
    const [strictDocs, marketDocs, oemDocs] = await Promise.all([
      coll.find(matchStrict, { projection: { unit_price: 1, oem_canonical: 1, oem_short_brand: 1, contract_date: 1 } })
        .sort({ contract_date: -1 }).limit(200).toArray(),
      coll.find(matchRelaxed, { projection: { unit_price: 1, oem_canonical: 1 } })
        .limit(500).toArray(),
      // 100X own history
      coll.find({ ...matchRelaxed, is_100x: true }, { projection: { unit_price: 1, model_raw: 1, contract_date: 1 } })
        .sort({ contract_date: -1 }).limit(50).toArray(),
    ]);

    const strictPrices = strictDocs.map(d => d.unit_price as number).filter(Boolean);
    const marketPrices = marketDocs.map(d => d.unit_price as number).filter(Boolean);
    const own100xPrices = oemDocs.map(d => d.unit_price as number).filter(Boolean);

    // Per-competitor breakdown
    const byOem = new Map<string, { brand: string; prices: number[] }>();
    for (const d of strictDocs) {
      if (!d.oem_canonical) continue;
      if (!byOem.has(d.oem_canonical)) byOem.set(d.oem_canonical, { brand: d.oem_short_brand, prices: [] });
      byOem.get(d.oem_canonical)!.prices.push(d.unit_price as number);
    }
    const competitorData = [...byOem.entries()].map(([oem, { brand, prices }]) => ({
      oem_canonical: oem,
      brand,
      contract_count: prices.length,
      price_min: Math.min(...prices),
      price_max: Math.max(...prices),
      price_p50: p(prices, 50),
    })).sort((a, b) => (b.contract_count) - (a.contract_count));

    // Determine which price pool to use (strict if enough data, else market)
    const usePrices = strictPrices.length >= 5 ? strictPrices : marketPrices;
    const source    = strictPrices.length >= 5 ? 'model_state_match' : 'state_match';

    const band = {
      low:  p(usePrices, 25),
      mid:  p(usePrices, 50),
      high: p(usePrices, 75),
    };

    // Recommendation text
    const rec: string[] = [];
    if (band.mid) {
      rec.push(`Market median (${source}): ₹${band.mid.toLocaleString()}/unit`);
    }
    if (qty && band.mid) {
      const totalMid = Math.round(band.mid * qty);
      rec.push(`For ${qty} units at median: ₹${totalMid.toLocaleString()}`);
    }
    if (own100xPrices.length > 0 && band.mid) {
      const ownP50 = p(own100xPrices, 50) || 0;
      const diff   = ownP50 - band.mid;
      if (Math.abs(diff) > 500) {
        rec.push(`100X historical P50: ₹${ownP50.toLocaleString()} (${diff > 0 ? '+' : ''}${diff.toLocaleString()} vs market)`);
      }
    }
    if (band.low && band.high) {
      rec.push(`Quote band: ₹${band.low.toLocaleString()} – ₹${band.high.toLocaleString()} (P25–P75)`);
    }

    return NextResponse.json({
      source,
      data_points: usePrices.length,
      market: {
        min: p(usePrices, 0),
        p25: band.low,
        p50: band.mid,
        p75: band.high,
        max: p(usePrices, 100),
        avg: usePrices.length ? Math.round(usePrices.reduce((a, b) => a + b, 0) / usePrices.length) : null,
      },
      quote_band: {
        low:  band.low,
        mid:  band.mid,
        high: band.high,
        label: band.mid ? `₹${band.low?.toLocaleString()} – ₹${band.high?.toLocaleString()}` : 'Insufficient data',
      },
      own_100x: {
        contract_count: oemDocs.length,
        prices: own100xPrices,
        p50:    p(own100xPrices, 50),
        min:    own100xPrices.length ? Math.min(...own100xPrices) : null,
        max:    own100xPrices.length ? Math.max(...own100xPrices) : null,
      },
      competitor_data: competitorData,
      recommendation: rec.join(' · '),
      filters_applied: {
        buyer_state:     params.buyer_state   || null,
        org_type:        params.org_type      || null,
        model_normalized:params.model_normalized || null,
        quantity:        qty,
      },
    });
  } catch (e) {
    console.error('[fogging/pricing/quote-advisor]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
