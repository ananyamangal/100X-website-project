// GET /api/fogging/attack-accounts/export
// CSV export of attack accounts (non-100X buyers)
//
// Query params:
//   limit      max rows (default 100, max 264)
//   tier       A | B | C | A,B (filter)
//   state      buyer state name
//   incumbent  OEM canonical (filters purchased_neptune/sse/pulsfog etc.)
//   days_max   max days_since_last
//   min_gmv    minimum total_gmv

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document, Filter } from 'mongodb';

const DB   = '100xDB';
const COLL = 'fogging_buyers';

const INR_L = (n: unknown) =>
  n == null || typeof n !== 'number' ? '' : (n / 100_000).toFixed(1);

const INCUMBENT_FLAG_MAP: Record<string, string> = {
  'NEPTUNE':                 'purchased_neptune',
  'SSE SAI SHREE ENTERPRISES': 'purchased_sse',
  'PULSFOG':                 'purchased_pulsfog',
  'INSTA FOG':               'purchased_instafog',
  'FOGGERS':                 'purchased_foggers',
};

function buildMatch(p: Record<string, string>): Filter<Document> {
  const m: Filter<Document> = { purchased_100x: false };
  if (p.tier)    m.opportunity_tier  = { $in: p.tier.split(',') };
  if (p.state)   m.buyer_state       = p.state;
  if (p.days_max) m.days_since_last  = { $lte: parseInt(p.days_max) };
  if (p.min_gmv)  m.total_gmv        = { $gte: parseInt(p.min_gmv) };
  if (p.incumbent) {
    const flag = INCUMBENT_FLAG_MAP[p.incumbent.toUpperCase()];
    if (flag) m[flag] = true;
  }
  return m;
}

function escape(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Document[]): string {
  const headers = [
    'rank', 'buyer_name', 'state', 'org_type', 'ministry',
    'total_gmv_lakhs', 'total_contracts', 'days_since_last',
    'year_count', 'oem_count', 'primary_incumbent',
    'opportunity_score', 'attack_tier', 'estimated_opp_lakhs',
    'action_priority', 'recommended_action',
    'forecast_next_quarter', 'forecast_confidence',
    'purchased_neptune', 'purchased_pulsfog', 'purchased_sse',
    'purchased_instafog', 'purchased_foggers',
  ];

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      escape(r.rank ?? ''),
      escape(r.buyer_display_name),
      escape(r.buyer_state ?? ''),
      escape(r.org_type ?? ''),
      escape(r.ministry ?? ''),
      escape(INR_L(r.total_gmv)),
      escape(r.total_contracts),
      escape(typeof r.days_since_last === 'number' ? Math.round(r.days_since_last) : ''),
      escape(r.year_count),
      escape(r.oem_count),
      escape(
        r.primary_incumbent
        ?? (Array.isArray(r.oems_purchased) && r.oems_purchased.length ? r.oems_purchased[0] : '')
      ),
      escape(r.opportunity_score),
      escape(r.opportunity_tier),
      escape(INR_L(r.estimated_opportunity ?? null)),
      escape(r.action_priority ?? ''),
      escape(r.recommended_action ?? ''),
      escape(r.forecast_next_quarter ?? ''),
      escape(r.forecast_confidence ?? ''),
      escape(r.purchased_neptune  ? 'Y' : 'N'),
      escape(r.purchased_pulsfog  ? 'Y' : 'N'),
      escape(r.purchased_sse      ? 'Y' : 'N'),
      escape(r.purchased_instafog ? 'Y' : 'N'),
      escape(r.purchased_foggers  ? 'Y' : 'N'),
    ].join(','));
  }
  return lines.join('\r\n');
}

export async function GET(req: NextRequest) {
  const p     = Object.fromEntries(req.nextUrl.searchParams);
  const limit = Math.min(264, Math.max(1, parseInt(p.limit || '100')));

  try {
    const client = await clientPromise;
    const coll   = client.db(DB).collection(COLL);
    const match  = buildMatch(p);

    const docs = await coll
      .find(match)
      .sort({ rank: 1, opportunity_score: -1, total_gmv: -1 })
      .limit(limit)
      .toArray();

    const csv  = toCsv(docs);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attack-accounts-${date}-top${docs.length}.csv"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (e) {
    console.error('[attack-accounts/export]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
