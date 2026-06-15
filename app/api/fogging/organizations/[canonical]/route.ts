import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  _req: NextRequest,
  { params }: { params: { canonical: string } }
) {
  const canonical = decodeURIComponent(params.canonical);
  const client    = await clientPromise;
  const db        = client.db(DB);

  const [org, contracts] = await Promise.all([
    db.collection('fogging_organizations').findOne(
      { organization_canonical: canonical },
      { projection: { _id: 0 } }
    ),
    db.collection('fogging_contracts').find(
      { buyer_canonical: { $in: [] } }, // will be populated below
      { projection: { _id: 0, gemc_no: 1, contract_date: 1, buyer_display_name: 1, buyer_canonical: 1, buyer_state: 1, oem_canonical: 1, oem_short_brand: 1, model_raw: 1, model_normalized: 1, contract_value_num: 1, quantity: 1, unit_price: 1, has_unit_price: 1, seller_name: 1, seller_gst: 1, is_100x: 1, spec_mount_type: 1, spec_starting_type: 1 } }
    ).toArray(),
  ]);

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Re-query contracts using buyer_canonicals from org
  const buyerCanonicals: string[] = org.buyer_canonicals || [];
  const contractRows = await db.collection('fogging_contracts').find(
    { buyer_canonical: { $in: buyerCanonicals } },
    {
      projection: {
        _id: 0, gemc_no: 1, contract_date: 1, buyer_display_name: 1, buyer_canonical: 1,
        oem_canonical: 1, oem_short_brand: 1, model_raw: 1, model_normalized: 1,
        contract_value_num: 1, quantity: 1, unit_price: 1, has_unit_price: 1,
        seller_name: 1, seller_gst: 1, is_100x: 1,
        spec_mount_type: 1, spec_starting_type: 1,
        buyer_state: 1,
      }
    }
  ).sort({ contract_date: -1 }).toArray();

  // Quarterly timeline
  const qMap = new Map<string, { gmv: number; contracts: number }>();
  for (const c of contractRows) {
    if (!c.contract_date) continue;
    const d = new Date(c.contract_date);
    const q = `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`;
    if (!qMap.has(q)) qMap.set(q, { gmv: 0, contracts: 0 });
    const slot = qMap.get(q)!;
    slot.gmv       += c.contract_value_num || 0;
    slot.contracts++;
  }
  const timeline = [...qMap.entries()].map(([q, v]) => ({ quarter: q, ...v })).sort((a,b) => a.quarter.localeCompare(b.quarter));

  // Spec breakdown
  const specs: Record<string, Record<string, number>> = { mount_type: {}, starting_type: {} };
  for (const c of contractRows) {
    if (c.spec_mount_type)    specs.mount_type[c.spec_mount_type]       = (specs.mount_type[c.spec_mount_type]       || 0) + 1;
    if (c.spec_starting_type) specs.starting_type[c.spec_starting_type] = (specs.starting_type[c.spec_starting_type] || 0) + 1;
  }

  return NextResponse.json({
    org,
    contracts:    contractRows.slice(0, 500),
    timeline,
    specs,
  });
}
