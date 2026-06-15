/**
 * P8 — PDF Intelligence Audit
 * Checks extraction coverage across all 1,418 fogging contracts in gem_contracts.
 *
 * Audits 7 fields:
 *   1. model           (model field populated)
 *   2. tank_capacity   (tank_capacity or similar spec field)
 *   3. engine          (engine_type or engine field)
 *   4. flow_rate       (flow_rate or output_rate field)
 *   5. droplet_size    (droplet_size or VMD field)
 *   6. certification   (certifications array or cert field)
 *   7. test_certificate (test_certificate or test_cert field)
 *
 * Run: node audit-pdf-intelligence.mjs
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URI    = process.env.MONGODB_URI;
const DB     = '100xDB';
const COLL   = 'gem_contracts';
const FOG_CAT = 526; // fogging category_id

if (!URI) {
  console.error('MONGODB_URI not set in .env.local');
  process.exit(1);
}

function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return !isNaN(v);
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return Boolean(v);
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();

  const db   = client.db(DB);
  const coll = db.collection(COLL);

  console.log('Loading fogging contracts from gem_contracts...');
  const total = await coll.countDocuments({ category_id: FOG_CAT });
  const scraped = await coll.countDocuments({ category_id: FOG_CAT, detail_scraped: true });
  console.log(`Total: ${total}  |  detail_scraped=true: ${scraped}\n`);

  // Fetch all scraped fogging contracts
  const docs = await coll.find(
    { category_id: FOG_CAT, detail_scraped: true },
    { projection: { gemc_no: 1, oem_name: 1, oem_brand: 1, model: 1,
        tank_capacity: 1, engine: 1, engine_type: 1, flow_rate: 1, output_rate: 1,
        droplet_size: 1, vmd: 1, certifications: 1, certification: 1,
        test_certificate: 1, test_cert: 1, specs: 1,
        unit_price: 1, contract_value_num: 1, buyer_state: 1 }},
  ).toArray();

  console.log(`Analyzing ${docs.length} contracts...\n`);

  // Field extraction logic — checks multiple possible field names
  const fields = {
    model:            d => hasValue(d.model) || (d.specs && hasValue(d.specs.model)),
    tank_capacity:    d => hasValue(d.tank_capacity) || (d.specs && hasValue(d.specs.tank_capacity)),
    engine:           d => hasValue(d.engine) || hasValue(d.engine_type) || (d.specs && (hasValue(d.specs.engine) || hasValue(d.specs.engine_type))),
    flow_rate:        d => hasValue(d.flow_rate) || hasValue(d.output_rate) || (d.specs && (hasValue(d.specs.flow_rate) || hasValue(d.specs.output_rate))),
    droplet_size:     d => hasValue(d.droplet_size) || hasValue(d.vmd) || (d.specs && (hasValue(d.specs.droplet_size) || hasValue(d.specs.vmd))),
    certification:    d => hasValue(d.certifications) || hasValue(d.certification) || (d.specs && (hasValue(d.specs.certifications) || hasValue(d.specs.certification))),
    test_certificate: d => hasValue(d.test_certificate) || hasValue(d.test_cert) || (d.specs && (hasValue(d.specs.test_certificate) || hasValue(d.specs.test_cert))),
  };

  // Counts
  const counts = {};
  const gaps   = { model: [], tank_capacity: [], engine: [], flow_rate: [],
                   droplet_size: [], certification: [], test_certificate: [] };

  for (const fname of Object.keys(fields)) counts[fname] = 0;

  for (const doc of docs) {
    for (const [fname, fn] of Object.entries(fields)) {
      if (fn(doc)) {
        counts[fname]++;
      } else {
        if (gaps[fname].length < 5) {
          gaps[fname].push({ gemc_no: doc.gemc_no, oem: doc.oem_brand || doc.oem_name, state: doc.buyer_state });
        }
      }
    }
  }

  // Summary
  const n = docs.length;
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       FOGGING PDF INTELLIGENCE AUDIT — COVERAGE REPORT  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║ Contracts analyzed: ${String(n).padEnd(36)}║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║ Field              | Filled  | Missing | Coverage %      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  for (const [fname, cnt] of Object.entries(counts)) {
    const missing  = n - cnt;
    const pct      = (cnt / n * 100).toFixed(1);
    const label    = fname.padEnd(18);
    const filled   = String(cnt).padStart(7);
    const miss     = String(missing).padStart(7);
    const pctStr   = `${pct}%`.padStart(9);
    const bar      = '█'.repeat(Math.round(cnt / n * 20)).padEnd(20, '░');
    console.log(`║ ${label} | ${filled} | ${miss}  | ${pctStr} ${bar} ║`);
  }

  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Overall score
  const totalFilled = Object.values(counts).reduce((a, b) => a + b, 0);
  const possible    = n * Object.keys(fields).length;
  const overallPct  = (totalFilled / possible * 100).toFixed(1);
  console.log(`Overall extraction coverage: ${overallPct}% (${totalFilled}/${possible} field-values)\n`);

  // Gap examples
  console.log('── Gap Examples (first 5 per missing field) ──────────────\n');
  for (const [fname, examples] of Object.entries(gaps)) {
    if (counts[fname] === n) continue;  // fully covered
    const missing = n - counts[fname];
    console.log(`${fname} — ${missing} contracts missing this field:`);
    for (const ex of examples) {
      console.log(`  GEMC: ${ex.gemc_no}  OEM: ${ex.oem || '(unknown)'}  State: ${ex.state || '(unknown)'}`);
    }
    console.log('');
  }

  // State × OEM coverage heatmap (model field, as primary)
  console.log('── Model Field Coverage by OEM ───────────────────────────\n');
  const oemMap = {};
  for (const doc of docs) {
    const oem = doc.oem_brand || doc.oem_name || '(unknown)';
    if (!oemMap[oem]) oemMap[oem] = { total: 0, model: 0 };
    oemMap[oem].total++;
    if (fields.model(doc)) oemMap[oem].model++;
  }

  const oemEntries = Object.entries(oemMap).sort((a, b) => b[1].total - a[1].total);
  for (const [oem, v] of oemEntries.slice(0, 15)) {
    const pct  = (v.model / v.total * 100).toFixed(0);
    const bar  = '█'.repeat(Math.round(v.model / v.total * 20)).padEnd(20, '░');
    const oemLabel = oem.slice(0, 30).padEnd(30);
    console.log(`${oemLabel} | total:${String(v.total).padStart(4)} | model:${String(v.model).padStart(4)} | ${pct}% ${bar}`);
  }

  console.log('\n── Recommendation ─────────────────────────────────────────\n');
  for (const [fname, cnt] of Object.entries(counts)) {
    const pct = cnt / n * 100;
    if (pct >= 80) {
      console.log(`✅ ${fname}: ${pct.toFixed(0)}% — High coverage, ready for analytics`);
    } else if (pct >= 30) {
      console.log(`⚠️  ${fname}: ${pct.toFixed(0)}% — Partial coverage, use with caution`);
    } else {
      console.log(`❌ ${fname}: ${pct.toFixed(0)}% — Low coverage, do NOT build collection-level analytics`);
    }
  }

  await client.close();
  console.log('\nAudit complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
