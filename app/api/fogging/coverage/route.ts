// GET /api/fogging/coverage
// Harvest Coverage Registry — date range, count, GMV, last harvest, next window

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET() {
  try {
    const client = await clientPromise;
    const contracts = client.db(DB).collection('fogging_contracts');
    const gemContracts = client.db(DB).collection('gem_contracts');

    const [stats, harvestStats] = await Promise.all([
      contracts.aggregate([
        { $group: {
          _id: null,
          total_contracts: { $sum: 1 },
          total_gmv:       { $sum: '$contract_value_num' },
          coverage_start:  { $min: '$contract_date' },
          coverage_end:    { $max: '$contract_date' },
          buyer_count:     { $addToSet: '$buyer_canonical' },
          oem_count:       { $addToSet: '$oem_canonical' },
          state_count:     { $addToSet: '$buyer_state' },
        }},
      ]).toArray(),
      gemContracts.aggregate([
        { $group: {
          _id:          null,
          last_harvest: { $max: '$harvested_at' },
          total_scraped: { $sum: { $cond: [{ $eq: ['$detail_scraped', true] }, 1, 0] } },
          total_raw:    { $sum: 1 },
        }},
      ]).toArray(),
    ]);

    const s  = stats[0]        ?? {};
    const hs = harvestStats[0] ?? {};

    const lastHarvest: Date | null = hs.last_harvest ? new Date(hs.last_harvest) : null;
    const now = new Date();

    // Next harvest window: 7 days after last harvest (rolling weekly)
    const nextHarvestDate = lastHarvest
      ? new Date(lastHarvest.getTime() + 7 * 86400_000)
      : null;
    const daysUntilNext = nextHarvestDate
      ? Math.max(0, Math.ceil((nextHarvestDate.getTime() - now.getTime()) / 86400_000))
      : null;

    return NextResponse.json({
      coverage_start:  s.coverage_start  ?? null,
      coverage_end:    s.coverage_end    ?? null,
      total_contracts: s.total_contracts ?? 0,
      total_gmv:       s.total_gmv       ?? 0,
      buyer_count:     (s.buyer_count    ?? []).length,
      oem_count:       (s.oem_count      ?? []).length,
      state_count:     (s.state_count    ?? []).length,
      last_harvest:    hs.last_harvest   ?? null,
      total_scraped:   hs.total_scraped  ?? 0,
      total_raw:       hs.total_raw      ?? 0,
      next_harvest_window: nextHarvestDate ? nextHarvestDate.toISOString() : null,
      days_until_next: daysUntilNext,
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=300' },
    });
  } catch (e) {
    console.error('[fogging/coverage]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
