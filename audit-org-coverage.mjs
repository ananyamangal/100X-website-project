// Organization Coverage Audit
// Reports: total contracts, contracts mapped to orgs, dept-only (unmapped), unresolved, coverage %
// Run: node audit-org-coverage.mjs

import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1); }

const DB = '100xDB';
const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  const db = client.db(DB);

  // ── 1. Total contracts and GMV ──────────────────────────────────────────────
  const [totalContracts, totalGmvArr] = await Promise.all([
    db.collection('fogging_contracts').countDocuments(),
    db.collection('fogging_contracts').aggregate([
      { $group: { _id: null, gmv: { $sum: '$contract_value_num' } } }
    ]).toArray(),
  ]);
  const totalGmv = totalGmvArr[0]?.gmv ?? 0;

  // ── 2. All buyer_canonicals that belong to a verified/merged org ────────────
  const orgBcAgg = await db.collection('fogging_organizations').aggregate([
    { $unwind: '$buyer_canonicals' },
    { $group: { _id: null, all: { $addToSet: '$buyer_canonicals' } } },
  ]).toArray();
  const mappedCanonicals = new Set(orgBcAgg[0]?.all ?? []);

  // ── 3. Contracts: mapped vs unmapped ───────────────────────────────────────
  const mappedArr = [...mappedCanonicals];
  const [mappedCount, mappedGmvArr, unmappedCount, unmappedGmvArr] = await Promise.all([
    db.collection('fogging_contracts').countDocuments({ buyer_canonical: { $in: mappedArr } }),
    db.collection('fogging_contracts').aggregate([
      { $match: { buyer_canonical: { $in: mappedArr } } },
      { $group: { _id: null, gmv: { $sum: '$contract_value_num' } } },
    ]).toArray(),
    db.collection('fogging_contracts').countDocuments({ buyer_canonical: { $nin: mappedArr } }),
    db.collection('fogging_contracts').aggregate([
      { $match: { buyer_canonical: { $nin: mappedArr } } },
      { $group: { _id: null, gmv: { $sum: '$contract_value_num' } } },
    ]).toArray(),
  ]);
  const mappedGmv   = mappedGmvArr[0]?.gmv   ?? 0;
  const unmappedGmv = unmappedGmvArr[0]?.gmv ?? 0;

  // ── 4. Dept-only entities (unmapped buyer_canonicals) ──────────────────────
  const unmappedBuyers = await db.collection('fogging_contracts').aggregate([
    { $match: { buyer_canonical: { $nin: mappedArr } } },
    { $group: {
      _id:  '$buyer_canonical',
      name: { $first: '$buyer_display_name' },
      cnt:  { $sum: 1 },
      gmv:  { $sum: '$contract_value_num' },
    }},
    { $sort: { gmv: -1 } },
  ]).toArray();

  // ── 5. Unresolved organizations ────────────────────────────────────────────
  const unresolvedOrgs = await db.collection('fogging_organizations')
    .find({ organization_status: 'unresolved' })
    .project({ organization_canonical: 1, organization_name: 1, total_gmv: 1, total_contracts: 1 })
    .sort({ total_gmv: -1 })
    .toArray();

  // ── 6. Coverage statistics ─────────────────────────────────────────────────
  const contractCovPct = ((mappedCount / totalContracts) * 100).toFixed(2);
  const gmvCovPct      = ((mappedGmv   / totalGmv)      * 100).toFixed(2);

  const INR = v => {
    if (v >= 1e7) return `₹${(v/1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `₹${(v/1e5).toFixed(2)} L`;
    return `₹${Math.round(v).toLocaleString()}`;
  };

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('ORGANIZATION COVERAGE AUDIT — FOGGING INTELLIGENCE');
  console.log('══════════════════════════════════════════════════════════\n');

  console.log('TOTALS');
  console.log(`  Total contracts         : ${totalContracts.toLocaleString()}`);
  console.log(`  Total GMV               : ${INR(totalGmv)}`);
  console.log('');
  console.log('ORGANIZATION MAPPING');
  console.log(`  Mapped to org           : ${mappedCount.toLocaleString()} contracts  (${contractCovPct}% coverage)`);
  console.log(`  Mapped GMV              : ${INR(mappedGmv)}  (${gmvCovPct}% of total GMV)`);
  console.log(`  Dept-only (unmapped)    : ${unmappedCount.toLocaleString()} contracts  (${(100-parseFloat(contractCovPct)).toFixed(2)}%)`);
  console.log(`  Unmapped GMV            : ${INR(unmappedGmv)}`);
  console.log('');
  console.log('ENTITIES');
  console.log(`  Mapped buyer_canonicals : ${mappedCanonicals.size}`);
  console.log(`  Dept-only canonicals    : ${unmappedBuyers.length}`);
  console.log(`  Unresolved orgs         : ${unresolvedOrgs.length}`);
  console.log('');

  if (unmappedBuyers.length > 0) {
    console.log('DEPT-ONLY ENTITIES (unmapped buyer_canonicals, sorted by GMV)');
    unmappedBuyers.forEach((b, i) => {
      console.log(`  ${String(i+1).padStart(2)}. [${b.cnt} contracts, ${INR(b.gmv)}] ${b.name} (${b._id})`);
    });
    console.log('');
  }

  if (unresolvedOrgs.length > 0) {
    console.log('UNRESOLVED ORGANIZATIONS');
    unresolvedOrgs.forEach((o, i) => {
      console.log(`  ${String(i+1).padStart(2)}. [${o.total_contracts} contracts, ${INR(o.total_gmv)}] ${o.organization_name} (${o.organization_canonical})`);
    });
    console.log('');
  }

  console.log('COVERAGE SUMMARY');
  console.log(`  ├─ Contract coverage    : ${contractCovPct}%  (${mappedCount}/${totalContracts})`);
  console.log(`  ├─ GMV coverage         : ${gmvCovPct}%  (${INR(mappedGmv)} / ${INR(totalGmv)})`);
  console.log(`  ├─ Dept-only entities   : ${unmappedBuyers.length} unique buyer_canonicals`);
  console.log(`  └─ Unresolved orgs      : ${unresolvedOrgs.length} orgs with ${INR(unresolvedOrgs.reduce((s,o)=>s+(o.total_gmv||0),0))} GMV`);
  console.log('');

  const isComplete = unmappedBuyers.length === 0 && unresolvedOrgs.length === 0;
  console.log(isComplete
    ? '✅  ORGANIZATION COVERAGE: 100% — all contracts mapped to verified organizations'
    : `⚠️  ORGANIZATION COVERAGE: ${contractCovPct}% — ${unmappedBuyers.length} dept-only entities, ${unresolvedOrgs.length} unresolved orgs remaining`
  );
  console.log('══════════════════════════════════════════════════════════\n');

} finally {
  await client.close();
}
