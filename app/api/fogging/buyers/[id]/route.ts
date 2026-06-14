// GET /api/fogging/buyers/[id]
// Full buyer profile + contract history
// [id] = buyer_canonical (URL-encoded)

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const buyerCanonical = decodeURIComponent(params.id);

  try {
    const client = await clientPromise;
    const db     = client.db(DB);

    const [profile, contracts] = await Promise.all([
      db.collection('fogging_buyers').findOne({ buyer_canonical: buyerCanonical }),
      db.collection('fogging_contracts')
        .find({ buyer_canonical: buyerCanonical })
        .sort({ contract_date: -1 })
        .project({
          gemc_no: 1, contract_date: 1, contract_quarter: 1,
          oem_canonical: 1, oem_short_brand: 1,
          model_raw: 1, model_normalized: 1,
          contract_value_num: 1, quantity: 1, unit_price: 1,
          contract_status: 1, buying_mode: 1,
          seller_name: 1, seller_gst: 1,
        })
        .toArray(),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    // Derive OEM timeline from contracts
    const oemTimeline: Record<string, { first: Date | null; last: Date | null; count: number; gmv: number }> = {};
    for (const c of contracts) {
      const oem = c.oem_canonical as string;
      if (!oem) continue;
      if (!oemTimeline[oem]) oemTimeline[oem] = { first: null, last: null, count: 0, gmv: 0 };
      const t   = oemTimeline[oem];
      t.count  += 1;
      t.gmv    += (c.contract_value_num as number) || 0;
      const cd  = c.contract_date ? new Date(c.contract_date as string) : null;
      if (cd) {
        if (!t.first || cd < t.first) t.first = cd;
        if (!t.last  || cd > t.last)  t.last  = cd;
      }
    }

    const oemHistory = Object.entries(oemTimeline)
      .map(([oem, v]) => ({ oem_canonical: oem, ...v }))
      .sort((a, b) => (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0));

    return NextResponse.json({
      profile,
      contracts,
      oem_history: oemHistory,
    });
  } catch (e) {
    console.error('[fogging/buyers/[id]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
