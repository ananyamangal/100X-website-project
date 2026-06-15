import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

export async function GET(
  _req: NextRequest,
  { params }: { params: { gemc_no: string } },
) {
  const gemcNo = decodeURIComponent(params.gemc_no);
  try {
    const client = await clientPromise;
    const db     = client.db(DB);

    const [contract, gemSrc] = await Promise.all([
      db.collection('fogging_contracts').findOne({ gemc_no: gemcNo }),
      db.collection('gem_contracts').findOne({ gemc_no: gemcNo }, {
        projection: {
          gemc_no: 1, product_name: 1, buying_mode: 1, contract_status: 1,
          seller_name_canonical: 1, seller_gst: 1, seller_msme_category: 1,
          dept_name: 1, ministry: 1, quantity: 1, unit_rate: 1,
          contract_value_num: 1, contract_date_dt: 1,
        },
      }),
    ]);

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({
      contract,
      gem_src: gemSrc,
      gem_url: `https://gem.gov.in/orders/contract/${gemcNo}`,
    });
  } catch (e) {
    console.error('[fogging/contracts/[gemc_no]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
