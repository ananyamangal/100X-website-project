// fogging-01-build-contracts.mjs
// Phase 1A — Build fogging_contracts from gem_contracts
// Idempotent: safe to re-run at any time
//
// Usage:
//   node scripts/fogging-01-build-contracts.mjs
//   node scripts/fogging-01-build-contracts.mjs --dry-run

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const DB  = '100xDB';
const CAT = 'home_fa68031381_agri_disp_fogg';

// ── OEM normalization ─────────────────────────────────────────────────────────
// oem_name format: "BRAND--LEGAL ENTITY" or just "BRAND"
// canonical = uppercase short brand; special-cased for 100X and Unbranded

const OEM_SPECIAL = {
  '100xcircle.com': { oem_canonical: '100X CIRCLE', oem_short_brand: '100X Circle', is_100x: true },
  '100x circle':    { oem_canonical: '100X CIRCLE', oem_short_brand: '100X Circle', is_100x: true },
};

function parseOem(raw) {
  if (!raw) return { oem_canonical: 'UNKNOWN', oem_short_brand: 'Unknown', is_100x: false };
  const sep = raw.indexOf('--');
  const brand  = (sep >= 0 ? raw.slice(0, sep) : raw).trim();
  const entity = (sep >= 0 ? raw.slice(sep + 2) : null)?.trim() || null;
  const lb = brand.toLowerCase();

  if (OEM_SPECIAL[lb]) return OEM_SPECIAL[lb];

  // "Unbranded" → use first 3 words of entity name
  if (lb === 'unbranded' && entity) {
    const eb = entity.split(/\s+/).slice(0, 3).join(' ');
    return { oem_canonical: eb.toUpperCase(), oem_short_brand: titleCase(eb), is_100x: false };
  }

  return { oem_canonical: brand.toUpperCase(), oem_short_brand: titleCase(brand), is_100x: false };
}

function titleCase(s) {
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// ── Buyer canonicalization ────────────────────────────────────────────────────
// Manual overrides for known duplicates (add more after collision report)
const BUYER_OVERRIDES = {
  // 'canonical_form_a': 'canonical_form_b'  — maps variant → preferred
};

function canonicalizeBuyer(name) {
  if (!name) return 'unknown';
  let c = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return BUYER_OVERRIDES[c] || c;
}

// Sorted-word key for collision detection (different word orders = same entity)
function wordSortKey(name) {
  return canonicalizeBuyer(name).split(' ').sort().join(' ');
}

// ── Model normalization (Phase 1: deterministic slug) ─────────────────────────
function normalizeModel(rawModel, oemCanonical) {
  if (!rawModel) return null;
  const modelSlug = rawModel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const oemSlug   = oemCanonical.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
  return oemSlug ? `${oemSlug}__${modelSlug}` : modelSlug;
}

// ── Contract date ─────────────────────────────────────────────────────────────
// Priority: delivery_start → contract_date_dt → harvested_at
function contractDate(doc) {
  const raw = doc.delivery_start || doc.contract_date_dt || doc.harvested_at;
  return raw ? new Date(raw) : null;
}

const Q_MAP = ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'];

function dateFields(d) {
  if (!d) return { contract_year: null, contract_quarter: null, contract_month: null };
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return { contract_year: y, contract_quarter: `${y}-${Q_MAP[m]}`, contract_month: m + 1 };
}

// ── State normalization ───────────────────────────────────────────────────────
function buyerState(doc) {
  if (doc.buyer_state) return doc.buyer_state;
  if (doc.state)       return titleCase(doc.state);
  return null;
}

// ── Percentile helper (used in verification) ──────────────────────────────────
function p50(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// ── Index definitions ─────────────────────────────────────────────────────────
async function ensureIndexes(fc) {
  const defs = [
    [{ gemc_no: 1 },                                          { unique: true,  name: 'uniq_gemc'        }],
    [{ oem_canonical: 1 },                                    { name: 'idx_oem'            }],
    [{ oem_short_brand: 1 },                                  { name: 'idx_oem_brand'      }],
    [{ buyer_canonical: 1 },                                  { name: 'idx_buyer'          }],
    [{ buyer_state: 1 },                                      { name: 'idx_state'          }],
    [{ contract_date: -1 },                                   { name: 'idx_date'           }],
    [{ contract_year: 1 },                                    { name: 'idx_year'           }],
    [{ contract_quarter: 1 },                                 { name: 'idx_quarter'        }],
    [{ contract_month: 1 },                                   { name: 'idx_month'          }],
    [{ unit_price: 1 },                                       { name: 'idx_unit_price'     }],
    [{ contract_value_num: -1 },                              { name: 'idx_value'          }],
    [{ has_unit_price: 1 },                                   { name: 'idx_has_price'      }],
    [{ is_100x: 1 },                                          { name: 'idx_is_100x'        }],
    [{ org_type: 1 },                                         { name: 'idx_org_type'       }],
    [{ model_normalized: 1 },                                 { name: 'idx_model'          }],
    [{ oem_canonical: 1, contract_date: -1 },                 { name: 'cidx_oem_date'      }],
    [{ oem_canonical: 1, model_normalized: 1, contract_date: -1 }, { name: 'cidx_oem_model_date' }],
    [{ buyer_state: 1, oem_canonical: 1 },                   { name: 'cidx_state_oem'     }],
    [{ buyer_canonical: 1, oem_canonical: 1 },                { name: 'cidx_buyer_oem'     }],
    [{ buyer_canonical: 1, contract_date: -1 },               { name: 'cidx_buyer_date'    }],
    [{ has_unit_price: 1, oem_canonical: 1, unit_price: 1 }, { name: 'cidx_price_lookup'  }],
  ];
  for (const [key, opts] of defs) {
    await fc.createIndex(key, opts).catch(() => {/* exists */});
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db  = client.db(DB);
  const src = db.collection('gem_contracts');
  const fc  = db.collection('fogging_contracts');

  console.log('═'.repeat(64));
  console.log('  Phase 1A — fogging_contracts builder');
  if (DRY_RUN) console.log('  DRY RUN — no writes');
  console.log('═'.repeat(64));

  // Step 1: Indexes
  if (!DRY_RUN) {
    await ensureIndexes(fc);
    console.log('✓ Indexes ready');
  }

  // Step 2: Load source
  const docs = await src.find({ category_id: CAT, detail_scraped: true }).toArray();
  console.log(`✓ Source: ${docs.length} enriched contracts`);

  // Step 3: Collision detection
  const wordKeyMap = new Map(); // wordSortKey → Set of canonical forms
  for (const doc of docs) {
    const canon = canonicalizeBuyer(doc.buyer_name);
    const wk    = wordSortKey(doc.buyer_name);
    if (!wordKeyMap.has(wk)) wordKeyMap.set(wk, new Set());
    wordKeyMap.get(wk).add(canon);
  }
  const collisions = [];
  for (const [wk, variants] of wordKeyMap) {
    if (variants.size > 1) collisions.push({ wk, variants: [...variants] });
  }

  if (collisions.length) {
    console.log(`\n⚠  COLLISION CANDIDATES (${collisions.length})`);
    console.log('  These buyer names may represent the same entity with different word order.');
    console.log('  They are NOT auto-merged. Add to BUYER_OVERRIDES to merge.\n');
    collisions.slice(0, 30).forEach(c => {
      console.log(`  [${c.wk.split(' ').slice(0, 4).join(' ')}…]`);
      c.variants.forEach(v => console.log(`    → "${v}"`));
    });
    if (collisions.length > 30) console.log(`  … and ${collisions.length - 30} more`);
    console.log('');
  } else {
    console.log('✓ No buyer name collisions detected');
  }

  // Step 4: Transform
  const ops    = [];
  const prices = [];
  let n100x    = 0;

  for (const doc of docs) {
    const oem   = parseOem(doc.oem_name || doc.oem_brand);
    const cdate = contractDate(doc);
    const df    = dateFields(cdate);
    const qty   = typeof doc.quantity === 'number' && doc.quantity > 0 ? doc.quantity : null;
    const val   = doc.contract_value_num ?? null;
    const uPrice = qty && val ? Math.round(val / qty) : null;

    if (oem.is_100x) n100x++;
    if (uPrice) prices.push(uPrice);

    const tdoc = {
      gemc_no:            doc.gemc_no,
      contract_date:      cdate,
      contract_year:      df.contract_year,
      contract_quarter:   df.contract_quarter,
      contract_month:     df.contract_month,
      buying_mode:        doc.buying_mode    ?? null,
      contract_status:    doc.contract_status ?? doc.status ?? null,

      buyer_canonical:    canonicalizeBuyer(doc.buyer_name),
      buyer_display_name: (doc.buyer_name || '').trim().slice(0, 200),
      buyer_state:        buyerState(doc),
      org_type:           doc.org_type ?? null,
      ministry:           doc.dept_name ?? doc.ministry ?? null,

      oem_canonical:      oem.oem_canonical,
      oem_short_brand:    oem.oem_short_brand,
      is_100x:            oem.is_100x,

      model_raw:          doc.model ?? null,
      model_normalized:   normalizeModel(doc.model, oem.oem_canonical),

      contract_value_num: val,
      quantity:           qty,
      unit_price:         uPrice,
      has_unit_price:     uPrice !== null,

      seller_gst:         doc.seller_gst ?? null,
      seller_name:        doc.seller_name_canonical ?? doc.seller_name_raw ?? null,
    };

    ops.push({
      updateOne: {
        filter: { gemc_no: doc.gemc_no },
        update: { $set: tdoc },
        upsert: true,
      }
    });

    if (!DRY_RUN && ops.length === 250) {
      await fc.bulkWrite(ops, { ordered: false });
      ops.length = 0;
      process.stdout.write(`\r  Writing… ${docs.indexOf(doc) + 1}/${docs.length}`);
    }
  }

  if (!DRY_RUN && ops.length > 0) {
    await fc.bulkWrite(ops, { ordered: false });
  }

  const pricedCount = prices.length;
  console.log(`\r✓ Transformed: ${docs.length} | priced: ${pricedCount} (${Math.round(pricedCount/docs.length*100)}%) | 100X: ${n100x}`);
  if (prices.length) {
    prices.sort((a, b) => a - b);
    console.log(`  Unit price range: ₹${prices[0].toLocaleString()} – ₹${prices[prices.length-1].toLocaleString()} | P50: ₹${p50(prices).toLocaleString()}`);
  }

  // Step 5: Verification
  if (!DRY_RUN) {
    const total   = await fc.countDocuments();
    const priced  = await fc.countDocuments({ has_unit_price: true });
    const i100x   = await fc.countDocuments({ is_100x: true });
    const noDate  = await fc.countDocuments({ contract_date: null });
    const noState = await fc.countDocuments({ buyer_state: null });
    console.log('\n  Verification:');
    console.log(`    total docs:      ${total}`);
    console.log(`    has_unit_price:  ${priced}`);
    console.log(`    is_100x:         ${i100x}`);
    console.log(`    null date:       ${noDate}`);
    console.log(`    null state:      ${noState}`);
  }

  await client.close();
  console.log('\n✓ fogging_contracts ready\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
