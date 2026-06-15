// GET /api/fogging/forecast/calendar?month=9&year=2026&exclude_100x=true&tier=A,B
//
// Returns all buyers predicted to purchase in a given calendar month.
// Uses pre-computed forecast_6mo[] when available (post fogging-02 rebuild),
// falls back to computing the 6-month horizon dynamically from purchase_months.

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

const MARKET_PEAKS = [10, 9, 3, 8, 11, 4];
const Q_MAP = ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'];

interface ForecastSlot { month: number; year: number; confidence: string; predicted_gmv: number }

function computeNextOccurrences(
  purchaseMonths: number[],
  avgContractValue: number,
  baseConfidence: string,
  fromDate: Date,
  limit = 6,
): ForecastSlot[] {
  const curMonth = fromDate.getUTCMonth() + 1;
  const curYear  = fromDate.getUTCFullYear();
  const sources  = purchaseMonths.length > 0 ? purchaseMonths : MARKET_PEAKS.slice(0, 3);
  const isMarket = purchaseMonths.length === 0;
  const slots: ForecastSlot[] = [];

  for (let offset = 1; offset <= 14 && slots.length < limit; offset++) {
    const month = ((curMonth - 1 + offset) % 12) + 1;
    const year  = curYear + Math.floor((curMonth - 1 + offset) / 12);
    if (sources.includes(month)) {
      slots.push({
        month,
        year,
        confidence:    isMarket ? 'low' : baseConfidence,
        predicted_gmv: Math.round(avgContractValue || 0),
      });
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const p   = Object.fromEntries(req.nextUrl.searchParams);
  const now = new Date();

  // Default: next calendar month
  const defaultMonth = now.getUTCMonth() === 11 ? 1 : now.getUTCMonth() + 2;
  const defaultYear  = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

  const targetMonth = p.month ? parseInt(p.month) : defaultMonth;
  const targetYear  = p.year  ? parseInt(p.year)  : defaultYear;

  if (targetMonth < 1 || targetMonth > 12 || isNaN(targetMonth)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);

    const filter: Record<string, unknown> = {};
    if (p.exclude_100x !== 'false') filter.purchased_100x = false;
    if (p.tier) filter.opportunity_tier = { $in: p.tier.split(',') };

    const buyers = await coll.find(filter, {
      projection: {
        buyer_canonical:    1, buyer_display_name: 1, buyer_state: 1,
        org_type:           1, total_gmv: 1, total_contracts: 1,
        days_since_last:    1, avg_contract_value: 1,
        purchase_months:    1, forecast_confidence: 1,
        opportunity_score:  1, opportunity_tier: 1,
        purchased_100x:     1, purchased_neptune: 1,
        primary_incumbent:  1,
        forecast_6mo:       1,  // used when available (post rebuild)
      }
    }).toArray();

    const matched: Array<Record<string, unknown>> = [];

    for (const b of buyers) {
      // Use pre-computed slots if available
      const stored6mo = b.forecast_6mo as ForecastSlot[] | null | undefined;
      const slots: ForecastSlot[] = stored6mo?.length
        ? stored6mo
        : computeNextOccurrences(
            (b.purchase_months as number[]) ?? [],
            b.avg_contract_value as number ?? 0,
            b.forecast_confidence as string ?? 'low',
            now,
          );

      const hit = slots.find(s => s.month === targetMonth && s.year === targetYear);
      if (hit) {
        matched.push({ ...b, _predicted: hit });
      }
    }

    // Sort: Tier A first, then by opportunity_score desc
    const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    matched.sort((a, b) => {
      const ta = tierOrder[a.opportunity_tier as string] ?? 4;
      const tb = tierOrder[b.opportunity_tier as string] ?? 4;
      if (ta !== tb) return ta - tb;
      return (b.opportunity_score as number) - (a.opportunity_score as number);
    });

    // Summary
    const tierCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
    let totalPredictedGmv = 0;
    let highConfCount = 0;

    for (const m of matched) {
      const t = m.opportunity_tier as string;
      if (t in tierCounts) tierCounts[t]++;
      totalPredictedGmv += (m._predicted as ForecastSlot).predicted_gmv;
      if ((m._predicted as ForecastSlot).confidence === 'high') highConfCount++;
    }

    return NextResponse.json({
      month:   targetMonth,
      year:    targetYear,
      quarter: `${targetYear}-${Q_MAP[targetMonth - 1]}`,
      buyers:  matched,
      summary: {
        total:               matched.length,
        tier_A:              tierCounts.A,
        tier_B:              tierCounts.B,
        tier_C:              tierCounts.C,
        high_confidence:     highConfCount,
        total_predicted_gmv: totalPredictedGmv,
      },
    });
  } catch (e) {
    console.error('[fogging/forecast/calendar]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
