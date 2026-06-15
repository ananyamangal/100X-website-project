// Pre-drill-down validation: duplicate GEMCs, PDFs, GMV, buyers, OEMs
import { MongoClient } from 'mongodb';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  for (const l of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const fmtCr = v => `₹${(v / 10_000_000).toFixed(4)} Cr`;
const pass = (ok, msg) => { console.log(`  ${ok ? '✓' : '✗'} ${msg}`); return ok; };

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('100xDB');
  const fc = db.collection('fogging_contracts');
  const fb = db.collection('fogging_buyers');
  const fo = db.collection('fogging_oems');

  console.log('\n══ PRE-DRILL-DOWN VALIDATION ══════════════════════════════════════\n');
  let allPass = true;

  // Duplicate GEMCs (= duplicate PDFs — 1 GEMC = 1 PDF)
  console.log('── Duplicate GEMCs / PDFs ──────────────────────────────────────');
  const [dupGemcFC, dupGemcGem] = await Promise.all([
    fc.aggregate([{ $group: { _id: '$gemc_no', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]).toArray(),
    db.collection('gem_contracts').aggregate([
      { $match: { category_id: 'home_fa68031381_agri_disp_fogg', detail_scraped: true } },
      { $group: { _id: '$gemc_no', c: { $sum: 1 } } },
      { $match: { c: { $gt: 1 } } },
      { $count: 'n' },
    ]).toArray(),
  ]);
  allPass &= pass(!(dupGemcFC[0]?.n), `fogging_contracts: ${dupGemcFC[0]?.n ?? 0} duplicate GEMCs`);
  allPass &= pass(!(dupGemcGem[0]?.n), `gem_contracts:      ${dupGemcGem[0]?.n ?? 0} duplicate GEMCs`);
  allPass &= pass(!(dupGemcFC[0]?.n), `PDF duplicates:     ${dupGemcFC[0]?.n ?? 0}  (1 GEMC = 1 PDF)`);

  // GMV reconciliation
  console.log('\n── Duplicate / inconsistent GMV ────────────────────────────────');
  const [gmvFC, gmvFB, gmvFO, gmvSrc] = await Promise.all([
    fc.aggregate([{ $group: { _id: null, g: { $sum: '$contract_value_num' } } }]).toArray(),
    fb.aggregate([{ $group: { _id: null, g: { $sum: '$total_gmv' } } }]).toArray(),
    fo.aggregate([{ $group: { _id: null, g: { $sum: '$total_gmv' } } }]).toArray(),
    db.collection('gem_contracts').aggregate([
      { $match: { category_id: 'home_fa68031381_agri_disp_fogg', detail_scraped: true } },
      { $group: { _id: null, g: { $sum: '$contract_value_num' } } },
    ]).toArray(),
  ]);
  const base = gmvFC[0]?.g ?? 0;
  allPass &= pass(Math.abs(base - (gmvSrc[0]?.g ?? 0)) < 100, `source GMV:          ${fmtCr(gmvSrc[0]?.g ?? 0)}`);
  allPass &= pass(Math.abs(base - (gmvFB[0]?.g ?? 0)) < 100, `buyers GMV:          ${fmtCr(gmvFB[0]?.g ?? 0)}  Δ=${Math.abs(base - (gmvFB[0]?.g ?? 0))}`);
  allPass &= pass(Math.abs(base - (gmvFO[0]?.g ?? 0)) < 100, `oems GMV:            ${fmtCr(gmvFO[0]?.g ?? 0)}  Δ=${Math.abs(base - (gmvFO[0]?.g ?? 0))}`);
  allPass &= pass(true, `contracts GMV:       ${fmtCr(base)}  (baseline)`);

  // Duplicate buyers
  console.log('\n── Duplicate buyers ─────────────────────────────────────────────');
  const [dupBuyer, dupBuyerGem] = await Promise.all([
    fb.aggregate([{ $group: { _id: '$buyer_canonical', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]).toArray(),
    fc.aggregate([{ $group: { _id: '$buyer_canonical', c: { $sum: 1 } } }, { $count: 'distinct' }]).toArray(),
  ]);
  const buyerTotal = await fb.countDocuments();
  const buyerDistinctInContracts = dupBuyerGem[0]?.distinct ?? 0;
  allPass &= pass(!(dupBuyer[0]?.n), `fogging_buyers dup_canonical:  ${dupBuyer[0]?.n ?? 0}`);
  allPass &= pass(buyerTotal === buyerDistinctInContracts, `buyer_canonical parity: fogging_buyers=${buyerTotal} vs distinct in contracts=${buyerDistinctInContracts}`);

  // Duplicate OEMs
  console.log('\n── Duplicate OEMs ──────────────────────────────────────────────');
  const [dupOem, dupOemGem] = await Promise.all([
    fo.aggregate([{ $group: { _id: '$oem_canonical', c: { $sum: 1 } } }, { $match: { c: { $gt: 1 } } }, { $count: 'n' }]).toArray(),
    fc.aggregate([{ $group: { _id: '$oem_canonical', c: { $sum: 1 } } }, { $count: 'distinct' }]).toArray(),
  ]);
  const oemTotal = await fo.countDocuments();
  const oemDistinctInContracts = dupOemGem[0]?.distinct ?? 0;
  allPass &= pass(!(dupOem[0]?.n), `fogging_oems dup_canonical:  ${dupOem[0]?.n ?? 0}`);
  allPass &= pass(oemTotal === oemDistinctInContracts, `oem_canonical parity: fogging_oems=${oemTotal} vs distinct in contracts=${oemDistinctInContracts}`);

  // Core counts
  console.log('\n── Core counts ─────────────────────────────────────────────────');
  const [totalC, totalB, totalO] = await Promise.all([
    fc.countDocuments(), fb.countDocuments(), fo.countDocuments(),
  ]);
  allPass &= pass(totalC === 1418, `fogging_contracts: ${totalC}`);
  allPass &= pass(totalB === 274,  `fogging_buyers:    ${totalB}`);
  allPass &= pass(totalO === 34,   `fogging_oems:      ${totalO}`);

  // Seller coverage (for drill-down)
  const sellerNotNull = await fc.countDocuments({ seller_name: { $ne: null } });
  const sellerGstNotNull = await fc.countDocuments({ seller_gst: { $ne: null } });
  console.log('\n── Seller field coverage ───────────────────────────────────────');
  console.log(`  seller_name not-null: ${sellerNotNull} / 1,418  (${Math.round(sellerNotNull/14.18)}%)`);
  console.log(`  seller_gst not-null:  ${sellerGstNotNull} / 1,418  (${Math.round(sellerGstNotNull/14.18)}%)`);

  // Null-state contracts (affects drill-down state filter)
  const nullState = await fc.countDocuments({ buyer_state: null });
  const nullDate  = await fc.countDocuments({ contract_date: null });
  console.log(`  null buyer_state:     ${nullState} / 1,418`);
  console.log(`  null contract_date:   ${nullDate} / 1,418`);

  // model_normalized null
  const nullModel = await fc.countDocuments({ model_normalized: null });
  console.log(`  null model_normalized: ${nullModel} / 1,418`);

  console.log(`\n══ ${allPass ? 'ALL CHECKS PASSED — cleared for drill-down implementation' : 'FAILURES DETECTED — fix before proceeding'} ══\n`);
  await client.close();
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
