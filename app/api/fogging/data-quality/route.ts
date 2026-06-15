// GET /api/fogging/data-quality
// Returns counts of missing/anomalous fields in fogging_contracts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('100xDB');
  const c = db.collection('fogging_contracts');

  const [
    total,
    missingGst,
    missingQty,
    missingState,
    missingBuyerCanonical,
    anomalousBuyers,
    noUnitPrice,
    withUnitPrice,
    missingMinistry,
  ] = await Promise.all([
    c.countDocuments(),
    c.countDocuments({ seller_gst: { $in: [null, ''] } }),
    c.countDocuments({ quantity: { $in: [null, 0] } }),
    c.countDocuments({ buyer_state: { $in: [null, ''] } }),
    c.countDocuments({ buyer_canonical: { $in: [null, ''] } }),
    db.collection('fogging_buyers').countDocuments({ is_anomalous: true }),
    c.countDocuments({ has_unit_price: { $ne: true } }),
    c.countDocuments({ has_unit_price: true }),
    c.countDocuments({ ministry: { $in: [null, ''] } }),
  ]);

  // Sample missing-GST contracts
  const missingGstSample = await c.find(
    { seller_gst: { $in: [null, ''] } },
    { projection: { gemc_no: 1, seller_name: 1, oem_canonical: 1, buyer_display_name: 1, contract_value_num: 1 } }
  ).limit(20).toArray();

  // Sample missing state contracts
  const missingStateSample = await c.find(
    { buyer_state: { $in: [null, ''] } },
    { projection: { gemc_no: 1, buyer_display_name: 1, oem_canonical: 1, contract_value_num: 1 } }
  ).limit(20).toArray();

  // Sample missing buyer_canonical
  const missingBuyerSample = await c.find(
    { buyer_canonical: { $in: [null, ''] } },
    { projection: { gemc_no: 1, buyer_display_name: 1, oem_canonical: 1, contract_value_num: 1 } }
  ).limit(10).toArray();

  // Anomalous buyers
  const anomalousBuyerDocs = await db.collection('fogging_buyers').find(
    { is_anomalous: true },
    { projection: { buyer_canonical: 1, buyer_display_name: 1, anomaly_reason: 1, total_gmv: 1, buyer_state: 1 } }
  ).toArray();

  return NextResponse.json({
    total,
    missing: {
      seller_gst: { count: missingGst, pct: (missingGst / total * 100).toFixed(1), sample: missingGstSample },
      quantity: { count: missingQty, pct: (missingQty / total * 100).toFixed(1) },
      buyer_state: { count: missingState, pct: (missingState / total * 100).toFixed(1), sample: missingStateSample },
      buyer_canonical: { count: missingBuyerCanonical, pct: (missingBuyerCanonical / total * 100).toFixed(1), sample: missingBuyerSample },
      unit_price: { count: noUnitPrice, pct: (noUnitPrice / total * 100).toFixed(1), note: 'GeM lump-sum orders do not expose unit quantities' },
      ministry: { count: missingMinistry, pct: (missingMinistry / total * 100).toFixed(1) },
    },
    coverage: {
      with_unit_price: { count: withUnitPrice, pct: (withUnitPrice / total * 100).toFixed(1) },
    },
    anomalies: {
      buyers: { count: anomalousBuyers, docs: anomalousBuyerDocs },
    },
  });
}
