// fogging-07-build-organizations.mjs
// Phase A — Organization Normalization + fogging_organizations builder
//
// Phases executed:
//   A1  Buyer normalization  — merge 10 duplicate pairs, fix state labels
//   A2  Central Govt mapping — classify Railways / PSUs / central depts
//   A3  EPROPOSAL OEM fix   — correct oem_short_brand
//   A4  Spec extraction     — mount_type + starting_type from product_name
//   B   Build fogging_organizations collection
//   C   Reconciliation report
//
// Idempotent: safe to re-run
// Usage:  node scripts/fogging-07-build-organizations.mjs

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  for (const l of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
loadEnv();

const DB = '100xDB';

// ── A1  Duplicate merge map ───────────────────────────────────────────────────
// buyer_canonical → unified organization_canonical
// NOTE: With org_name-based canonical (fogging-01 v1.4+), most historical merge
// variants are resolved at source. Add entries only when org_name still produces
// two canonical forms for the same real entity.
const MERGE_MAP = {
  // Add entries here only when org_name still produces two canonical forms
  // for the same real entity (rare since org_name is GeM master data).
};

// Metadata for merged targets
const MERGE_META = {};

// ── A2  Unresolved / broken entries ──────────────────────────────────────────
// With org_name-based canonical (fogging-01 v1.4+), most garbled buyer_names
// are now resolved. Only truly unidentifiable entities remain here.
const UNRESOLVED = new Set([
  '',                    // empty canonical (Hindi-encoded text)
  'unknown',             // catch-all
  'gram panchayat',      // generic (no specific entity)
  'community health center', // generic
]);

// ── A2  Central Govt entities (override organization_state → "Central Government") ──
const CENTRAL_GOVT = new Set([
  // Railway zones
  'eastern railway', 'northern railway', 'western railway', 'southern railway',
  'north eastern railway', 'north central railway', 'north western railway',
  'south central railway', 'south eastern railway', 'south western railway',
  'south east central railway', 'east coast railway',
  'banaras locomotive works',
  // Central PSUs
  'power grid corporation of india limited', 'western coalfields limited',
  'south eastern coalfields limited', 'central mine planning and design institute limited',
  'nhpc limited', 'oil india limited', 'north eastern electric power corporation limited',
  'airports authority of india', 'bharat heavy electricals limited bhel',
  'rashtriya chemicals and fertilizers limited rcf',
  'iocl srpl', 'ratnagiri gas and power private limited',
  'hll lifecare limited', 'state bank of india sbi',
  'central warehousing corporation cwc',
  'western regional power committee wrpc',
  'indian renewable energy development agency',
  'rourkela steel plant',
  // Central ministries / depts
  'department of heavy industry', 'department of health and family welfare',
  'department for promotion of industry and internal trade',
  'department of chemicals and petrochemicals', 'department of economic affairs',
  'department of agricultural research and education',
  'department of revenue', 'department of scientific and industrial research dsir',
  'department of posts', 'ministry of micro small and medium enterprises',
  'special economic zones',
  // Central autonomous / research bodies
  'survey of india', 'geological survey of india gsi',
  'indian space research organization', 'national institute of immunology nii',
  'national book trust nbt india', 'national statistical systems training academy',
  'indian council of agricultural research icar',
  'council of scientific and industrial research csir',
  'indian council of medical research icmr',
  'directorate general of mines safety dgms',
  'directorate general of employment and training',
  'bureau of civil aviation security bcas',
  // Central education bodies
  'kendriya vidyalaya sangathan', 'navodaya vidyalaya samiti',
  'central board of secondary education cbse', 'central board of direct taxes cbdt',
  'employees provident fund organisation epfo',
  'sports authority of india sai',
  'national rural health mission 2005 12',
  // Mumbai metro is Maharashtra, IIM is UP (Lucknow)
]);

// ── Dept category inference ───────────────────────────────────────────────────
function inferDeptCategory(canonical) {
  const c = canonical.replace(/_/g, ' ');
  if (/(railway|locomotive|banaras locomotive)/.test(c))          return 'Railways';
  if (/(metro rail|metro rail corporation|mumbai metro)/.test(c)) return 'Public Works';
  if (/(health|medical|welfare|hospital|aiims|icmr|nhm|nrhm|rims|esis|hll lifecare|port health|clinical)/.test(c)) return 'Health';
  if (/(police|defence|prison|correctional|home guard|civil defence|bcas|inspectorate)/.test(c)) return 'Defence & Police';
  if (/(university|college|vidyalaya|school|education|training|institute|iit|iim|nit|nid|spa vijayawada|nssta|navodaya|dget|technical education|higher education|secondary education|vocational)/.test(c)) return 'Education & Research';
  if (/(science|research|isro|space|dsir|csir|geological|survey of india|immunology|statistical)/.test(c)) return 'Science & Research';
  if (/(power|energy|electric|coal|mine|nhpc|bhel|neepco|petroleum|oil|gas|ireda|wrpc|coalfield|ratnagiri gas|rourkela steel)/.test(c)) return 'Power & Energy';
  if (/(nagar nigam|nagar palika|zilla parishad|district panchayat|municipal corporation|municipal council|nagarpalika|agartala municipal|panchayat samiti|adarsh nagar|nagar panchayat|nagarika)/.test(c)) return 'Municipal';
  if (/(urban|nagar|local bodies|local self govern|local government|dulb|urban affairs|urban development|development authority|housing and urban|urban admin|e nagar|e municipalities|municipality)/.test(c)) return 'Urban Development';
  if (/(panchayat|rural|gram|agriculture|horticulture|animal|krishi|ouat|icar|panchayati raj|development and panchayat|rural development|district panchayat|block panchayat|gramapanchayat|grama panchayat|panchayats and rural)/.test(c)) return 'Agriculture & Rural';
  if (/(bank|tax|finance|customs|epfo|cbdt|rcf|cwc|sez|chemical|fertilizer|economic affairs|industry and internal trade|micro small|accounts)/.test(c)) return 'Finance & Commerce';
  if (/(pollution|environment|forest|ecology|disaster|revenue|planning)/.test(c)) return 'Forest & Environment';
  if (/(airport|aviation|post|transport|locom|infrastructure|industrial development|banaras locomotive)/.test(c)) return 'Public Works';
  return 'Other';
}

// ── Organization type inference ───────────────────────────────────────────────
function inferOrgType(canonical, orgType) {
  const c = canonical.replace(/_/g, ' ');
  const ot = (orgType || '').toLowerCase();

  if (/(railway|locomotive)/.test(c))                              return 'Railway';
  if (/(police)/.test(c))                                          return 'Police';
  if (/(university|college|vidyalaya|institute|iit|iim|nit|aiims|rims|nid|spa vijayawada)/.test(c)) return 'University';
  if (/(municipal corporation|nagar nigam)/.test(c))              return 'Corporation';
  if (/(zilla parishad|district panchayat|panchayat samiti)/.test(c)) return 'Panchayat';
  if (/(nagar palika|nagar panchayat|gramapanchayat|grama panchayat|block panchayat|nagarpalika)/.test(c)) return 'Municipality';
  if (/(development authority|authority|metro rail)/.test(c))     return 'Development Authority';
  if (/(health society|health mission|medical services corporation)/.test(c)) return 'Health Authority';
  if (ot.includes('psu') || ot.includes('central psu') || ot.includes('state psu')) return 'PSU';
  if (ot.includes('central'))   return 'Central Department';
  if (ot.includes('state'))     return 'State Department';
  if (/(board|committee|commission|samiti|sangathan|organisation|organization)/.test(c)) return 'Statutory Body';
  return 'State Department';
}

// ── Display name cleanup ──────────────────────────────────────────────────────
function cleanDisplayName(raw) {
  if (!raw) return '';
  // Fix all-caps: "AHMEDNAGAR District Panchayats" → proper case
  // Keep mixed case as-is if it's reasonable
  const allCaps = /^[A-Z\s]+$/.test(raw.trim());
  const allLower = /^[a-z\s,&-]+$/.test(raw.trim());
  if (allCaps || allLower) {
    return raw.trim().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAnd\b/g, 'and').replace(/\bOf\b/g, 'of').replace(/\bThe\b/g, 'the');
  }
  return raw.trim();
}

// ── A4  Spec extraction from product_name ─────────────────────────────────────
function extractSpecs(productName) {
  if (!productName) return { spec_mount_type: null, spec_starting_type: null };
  const p = productName.toLowerCase();

  let spec_mount_type = null;
  if (/vehicle.?mounted|vehiclemounted|mounted.vehicle/.test(p)) spec_mount_type = 'Vehicle Mounted';
  else if (/hand.?carried|hand.?carry|portable/.test(p))         spec_mount_type = 'Hand Carried';

  let spec_starting_type = null;
  if (/electrical.?start|electric.?start|electrically/.test(p))  spec_starting_type = 'Electrical';
  else if (/manual.?start|pull.?start|manually/.test(p))         spec_starting_type = 'Manual';
  // Fallback: if "electric" or "manual" appears without "start"
  if (!spec_starting_type) {
    if (/\belectric(al)?\b/.test(p))   spec_starting_type = 'Electrical';
    else if (/\bmanual\b/.test(p))     spec_starting_type = 'Manual';
  }

  return { spec_mount_type, spec_starting_type };
}

// ── Canonical slug generator ──────────────────────────────────────────────────
function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Per-buyer → org mapping ───────────────────────────────────────────────────
function getBuyerOrgCanonical(buyer) {
  const c = buyer.buyer_canonical;
  if (MERGE_MAP[c]) return MERGE_MAP[c];
  if (UNRESOLVED.has(c)) return null;
  return toSlug(c) || null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB);
  const fc   = db.collection('fogging_contracts');
  const fb   = db.collection('fogging_buyers');
  const fo   = db.collection('fogging_oems');
  const forg = db.collection('fogging_organizations');

  console.log('╔' + '═'.repeat(62) + '╗');
  console.log('║  Phase A-G — Organization Normalization + Build            ║');
  console.log('╚' + '═'.repeat(62) + '╝\n');

  // ── A3  EPROPOSAL OEM fix ─────────────────────────────────────────────────
  console.log('── A3  EPROPOSAL OEM fix');
  const epResult = await fo.updateOne(
    { oem_canonical: 'EPROPOSAL TECHNOLOGY PRIVATE' },
    { $set: { oem_short_brand: 'EPro', brand_name: 'EPro' } }
  );
  console.log(`   ${epResult.matchedCount ? '✓ oem_short_brand → "EPro"' : '⚠  EPROPOSAL OEM not found'}`);

  // ── A4  Spec extraction — read product_name from gem_contracts, update fogging_contracts ──
  console.log('\n── A4  Spec extraction from product_name (gem_contracts)');
  const gemContracts = await db.collection('gem_contracts').find(
    { category_id: 'home_fa68031381_agri_disp_fogg', product_name: { $exists: true } },
    { projection: { gemc_no: 1, product_name: 1 } }
  ).toArray();
  let specOps = [];
  let specCount = { mount: 0, start: 0 };
  for (const c of gemContracts) {
    const { spec_mount_type, spec_starting_type } = extractSpecs(c.product_name);
    if (spec_mount_type || spec_starting_type) {
      const set = {};
      if (spec_mount_type)   { set.spec_mount_type    = spec_mount_type;   specCount.mount++; }
      if (spec_starting_type){ set.spec_starting_type = spec_starting_type; specCount.start++; }
      specOps.push({ updateOne: { filter: { gemc_no: c.gemc_no }, update: { $set: set } } });
    }
  }
  if (specOps.length) await fc.bulkWrite(specOps, { ordered: false });
  const specPct = (n) => ((n / gemContracts.length) * 100).toFixed(1);
  console.log(`   mount_type:    ${specCount.mount} / ${gemContracts.length} (${specPct(specCount.mount)}%)`);
  console.log(`   starting_type: ${specCount.start} / ${gemContracts.length} (${specPct(specCount.start)}%)`);

  // ── A1/A2  Load buyers and build org map ──────────────────────────────────
  console.log('\n── A1/A2  Building organization map from fogging_buyers');
  const buyers = await fb.find({}).toArray();
  console.log(`   ${buyers.length} buyers loaded`);

  // Map: organization_canonical → [buyer_canonical, ...]
  const orgBuyerMap = new Map();  // org_canonical → Set<buyer_canonical>
  let unresolvedBuyers = [];
  let mergedPairs = new Map();    // org_canonical → count of source buyers > 1

  for (const b of buyers) {
    const orgCanonical = getBuyerOrgCanonical(b);
    if (!orgCanonical) {
      unresolvedBuyers.push(b);
      continue;
    }
    if (!orgBuyerMap.has(orgCanonical)) orgBuyerMap.set(orgCanonical, new Set());
    orgBuyerMap.get(orgCanonical).add(b.buyer_canonical);
  }

  for (const [oc, buyers] of orgBuyerMap) {
    if (buyers.size > 1) mergedPairs.set(oc, buyers.size);
  }

  console.log(`   ${orgBuyerMap.size} distinct organizations`);
  console.log(`   ${mergedPairs.size} merged org pairs (${[...mergedPairs.values()].reduce((a,b)=>a+b,0)} buyers → ${mergedPairs.size} orgs)`);
  console.log(`   ${unresolvedBuyers.length} unresolved buyers`);

  // ── B  Aggregate from fogging_contracts per org ──────────────────────────
  console.log('\n── B  Aggregating metrics from fogging_contracts');

  // Build buyer_canonical → org_canonical lookup for contract aggregation
  const buyerToOrg = new Map();
  for (const b of buyers) {
    const oc = getBuyerOrgCanonical(b);
    if (oc) buyerToOrg.set(b.buyer_canonical, oc);
  }

  // Pull all contracts with relevant fields
  const contracts = await fc.find({}, {
    projection: {
      buyer_canonical: 1, buyer_state: 1, buyer_display_name: 1,
      oem_canonical: 1, oem_short_brand: 1, is_100x: 1,
      seller_gst: 1, seller_name: 1,
      model_normalized: 1, model_raw: 1,
      contract_value_num: 1, quantity: 1, unit_price: 1, has_unit_price: 1,
      contract_date: 1, contract_year: 1,
      spec_mount_type: 1, spec_starting_type: 1,
    }
  }).toArray();
  console.log(`   ${contracts.length} contracts loaded`);

  // Aggregate per org
  const orgAgg = new Map(); // org_canonical → agg object

  for (const c of contracts) {
    const oc = buyerToOrg.get(c.buyer_canonical);
    if (!oc) continue;

    if (!orgAgg.has(oc)) {
      orgAgg.set(oc, {
        buyer_canonicals: new Set(),
        buyer_display_names: new Set(),
        buyer_states: new Set(),
        oems: new Map(),     // oem_canonical → {gmv, contracts}
        sellers: new Map(),  // seller_gst → {name, gmv, contracts}
        models: new Set(),
        total_gmv: 0,
        total_contracts: 0,
        total_units: 0,
        unit_prices: [],
        years: new Set(),
        first_contract: null,
        last_contract: null,
        is_100x_buyer: false,
        mount_types: new Map(),
        starting_types: new Map(),
      });
    }
    const agg = orgAgg.get(oc);

    agg.buyer_canonicals.add(c.buyer_canonical);
    if (c.buyer_display_name) agg.buyer_display_names.add(c.buyer_display_name);
    if (c.buyer_state) agg.buyer_states.add(c.buyer_state);

    agg.total_gmv += c.contract_value_num || 0;
    agg.total_contracts++;
    agg.total_units += c.quantity || 0;
    if (c.has_unit_price && c.unit_price) agg.unit_prices.push(c.unit_price);
    if (c.contract_year) agg.years.add(c.contract_year);
    if (c.contract_date) {
      if (!agg.first_contract || c.contract_date < agg.first_contract) agg.first_contract = c.contract_date;
      if (!agg.last_contract  || c.contract_date > agg.last_contract)  agg.last_contract  = c.contract_date;
    }
    if (c.is_100x) agg.is_100x_buyer = true;
    if (c.model_normalized) agg.models.add(c.model_normalized);

    // OEM breakdown
    if (c.oem_canonical) {
      if (!agg.oems.has(c.oem_canonical)) agg.oems.set(c.oem_canonical, { brand: c.oem_short_brand, is_100x: c.is_100x, gmv: 0, contracts: 0 });
      const o = agg.oems.get(c.oem_canonical);
      o.gmv       += c.contract_value_num || 0;
      o.contracts++;
    }

    // Seller breakdown
    if (c.seller_gst) {
      if (!agg.sellers.has(c.seller_gst)) agg.sellers.set(c.seller_gst, { name: c.seller_name, gmv: 0, contracts: 0 });
      const s = agg.sellers.get(c.seller_gst);
      s.gmv       += c.contract_value_num || 0;
      s.contracts++;
    }

    // Spec counts
    if (c.spec_mount_type)   { agg.mount_types.set(c.spec_mount_type,   (agg.mount_types.get(c.spec_mount_type)   || 0) + 1); }
    if (c.spec_starting_type){ agg.starting_types.set(c.spec_starting_type,(agg.starting_types.get(c.spec_starting_type) || 0) + 1); }
  }

  console.log(`   Aggregated ${orgAgg.size} org buckets`);

  // ── Build fogging_organizations docs ──────────────────────────────────────
  console.log('\n── Building fogging_organizations documents');

  const ops = [];
  let totalOrgGMV = 0;

  for (const [orgCanonical, agg] of orgAgg) {
    // Find the primary buyer (highest GMV)
    const primaryBuyer = buyers
      .filter(b => agg.buyer_canonicals.has(b.buyer_canonical))
      .sort((a, b) => (b.total_gmv || 0) - (a.total_gmv || 0))[0];

    if (!primaryBuyer) continue;

    // Resolve metadata
    const isMerged       = mergedPairs.has(orgCanonical);
    const mergeMeta      = MERGE_META[orgCanonical];
    const isCentral      = CENTRAL_GOVT.has(primaryBuyer.buyer_canonical);
    const orgState       = mergeMeta?.organization_state
                        || (isCentral ? 'Central Government' : (primaryBuyer.buyer_state || null));
    const deptCat        = mergeMeta?.dept_category || inferDeptCategory(orgCanonical);
    const orgType        = mergeMeta?.organization_type || inferOrgType(orgCanonical, primaryBuyer.org_type);
    const orgName        = mergeMeta?.organization_name || cleanDisplayName(primaryBuyer.buyer_display_name);
    const orgStatus      = UNRESOLVED.has(primaryBuyer.buyer_canonical) ? 'unresolved'
                        : isMerged ? 'merged'
                        : 'verified';

    // OEM breakdown sorted by GMV
    const oemList = [...agg.oems.entries()]
      .map(([oc, o]) => ({ oem_canonical: oc, brand_name: o.brand, is_100x: o.is_100x, gmv: o.gmv, contracts: o.contracts }))
      .sort((a, b) => b.gmv - a.gmv);

    const totalOemGmv    = oemList.reduce((s, o) => s + o.gmv, 0);
    for (const o of oemList) o.share_pct = totalOemGmv > 0 ? +((o.gmv / totalOemGmv) * 100).toFixed(1) : 0;

    const incumbentOem   = oemList.find(o => !o.is_100x) || null;

    // Seller breakdown sorted by GMV
    const sellerList = [...agg.sellers.entries()]
      .map(([gst, s]) => ({ seller_gst: gst, seller_name: s.name, gmv: s.gmv, contracts: s.contracts }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 10);

    const incumbentSeller = sellerList[0] || null;

    // Unit price stats
    const prices = agg.unit_prices.sort((a, b) => a - b);
    const mid    = Math.floor(prices.length / 2);
    const medianPrice = prices.length
      ? (prices.length % 2 ? prices[mid] : Math.round((prices[mid-1] + prices[mid]) / 2))
      : null;

    // Dominant specs
    const dominantMount  = [...agg.mount_types.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || null;
    const dominantStart  = [...agg.starting_types.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || null;

    totalOrgGMV += agg.total_gmv;

    const doc = {
      organization_canonical: orgCanonical,
      organization_name:      orgName,
      organization_state:     orgState,
      dept_category:          deptCat,
      organization_type:      orgType,
      organization_status:    orgStatus,

      // Source buyers (how many buyer_canonicals merged into this org)
      buyer_count_merged:     agg.buyer_canonicals.size,
      buyer_canonicals:       [...agg.buyer_canonicals],
      buyer_display_names:    [...agg.buyer_display_names].slice(0, 5),

      // Metrics
      total_contracts:        agg.total_contracts,
      total_gmv:              agg.total_gmv,
      total_units:            agg.total_units || null,
      avg_contract_value:     agg.total_contracts > 0 ? Math.round(agg.total_gmv / agg.total_contracts) : null,
      median_unit_price:      medianPrice,
      year_count:             agg.years.size,
      active_years:           [...agg.years].sort(),
      first_contract:         agg.first_contract,
      last_contract:          agg.last_contract,
      model_count:            agg.models.size,
      seller_count:           agg.sellers.size,
      oem_count:              agg.oems.size,

      // OEM intelligence
      incumbent_oem:          incumbentOem?.oem_canonical || null,
      incumbent_oem_brand:    incumbentOem?.brand_name || null,
      incumbent_oem_gmv:      incumbentOem?.gmv || null,
      is_100x_buyer:          agg.is_100x_buyer,
      oem_breakdown:          oemList.slice(0, 10),

      // Seller intelligence
      incumbent_seller:       incumbentSeller?.seller_name || null,
      incumbent_seller_gst:   incumbentSeller?.seller_gst || null,
      incumbent_seller_gmv:   incumbentSeller?.gmv || null,
      seller_breakdown:       sellerList,

      // Spec intelligence
      dominant_mount_type:    dominantMount,
      dominant_starting_type: dominantStart,
      spec_mount_counts:      Object.fromEntries(agg.mount_types),
      spec_start_counts:      Object.fromEntries(agg.starting_types),

      updated_at: new Date(),
    };

    ops.push({
      replaceOne: {
        filter: { organization_canonical: orgCanonical },
        replacement: doc,
        upsert: true,
      }
    });
  }

  // Add unresolved entries
  for (const b of unresolvedBuyers) {
    const doc = {
      organization_canonical: `_unresolved_${toSlug(b.buyer_canonical || 'empty')}`,
      organization_name:      b.buyer_display_name || '(empty)',
      organization_state:     b.buyer_state || null,
      dept_category:          'Unknown',
      organization_type:      'Unknown',
      organization_status:    'unresolved',
      buyer_count_merged:     1,
      buyer_canonicals:       [b.buyer_canonical],
      buyer_display_names:    [b.buyer_display_name],
      total_contracts:        b.total_contracts || 0,
      total_gmv:              b.total_gmv || 0,
      total_units:            b.total_units || null,
      avg_contract_value:     b.avg_contract_value || null,
      median_unit_price:      b.median_unit_price || null,
      year_count:             b.year_count || 0,
      active_years:           b.active_years || [],
      first_contract:         b.first_purchase || null,
      last_contract:          b.last_purchase || null,
      model_count:            0,
      seller_count:           b.supplier_count || 0,
      oem_count:              b.oem_count || 0,
      incumbent_oem:          b.primary_incumbent || null,
      incumbent_oem_brand:    null,
      incumbent_oem_gmv:      null,
      is_100x_buyer:          b.purchased_100x || false,
      oem_breakdown:          [],
      incumbent_seller:       null,
      incumbent_seller_gst:   null,
      incumbent_seller_gmv:   null,
      seller_breakdown:       [],
      dominant_mount_type:    null,
      dominant_starting_type: null,
      spec_mount_counts:      {},
      spec_start_counts:      {},
      updated_at:             new Date(),
    };
    ops.push({ replaceOne: { filter: { organization_canonical: doc.organization_canonical }, replacement: doc, upsert: true } });
    totalOrgGMV += b.total_gmv || 0;
  }

  // Ensure indexes
  await forg.createIndex({ organization_canonical: 1 }, { unique: true, name: 'uniq_org' }).catch(() => {});
  await forg.createIndex({ organization_state: 1 },     { name: 'idx_state' }).catch(() => {});
  await forg.createIndex({ dept_category: 1 },          { name: 'idx_dept_cat' }).catch(() => {});
  await forg.createIndex({ organization_type: 1 },      { name: 'idx_org_type' }).catch(() => {});
  await forg.createIndex({ total_gmv: -1 },             { name: 'idx_gmv' }).catch(() => {});
  await forg.createIndex({ total_contracts: -1 },       { name: 'idx_contracts' }).catch(() => {});
  await forg.createIndex({ organization_status: 1 },    { name: 'idx_status' }).catch(() => {});
  await forg.createIndex({ buyer_canonicals: 1 },       { name: 'idx_buyer_canonical' }).catch(() => {});
  await forg.createIndex({ incumbent_oem: 1 },          { name: 'idx_incumbent_oem' }).catch(() => {});

  await forg.bulkWrite(ops, { ordered: false });
  console.log(`   ✓ Written ${ops.length} organization docs`);

  // ── C  Reconciliation report ──────────────────────────────────────────────
  console.log('\n══ PHASE C — RECONCILIATION REPORT ══════════════════════════════\n');

  const totalBuyers     = buyers.length;
  const totalBuyerGMV   = buyers.reduce((s, b) => s + (b.total_gmv || 0), 0);
  const orgCount        = await forg.countDocuments({ organization_status: { $ne: 'unresolved' } });
  const unresolvedCount = await forg.countDocuments({ organization_status: 'unresolved' });
  const mergedCount     = await forg.countDocuments({ organization_status: 'merged' });
  const totalOrgGMV2    = (await forg.aggregate([{ $group: { _id: null, s: { $sum: '$total_gmv' } } }]).toArray())[0]?.s || 0;
  const contractGMV     = (await fc.aggregate([{ $group: { _id: null, s: { $sum: '$contract_value_num' } } }]).toArray())[0]?.s || 0;
  const delta           = Math.round(contractGMV - totalOrgGMV2);

  console.log(`  BUYERS        : ${totalBuyers}`);
  console.log(`  ORGANIZATIONS : ${orgCount} verified/merged  +  ${unresolvedCount} unresolved`);
  console.log(`  MERGED PAIRS  : ${mergedCount} orgs (absorbed ${[...mergedPairs.values()].reduce((a,b)=>a+b,0)} buyer entries)`);
  console.log('');
  console.log(`  CONTRACT GMV  : ₹${(contractGMV/1e7).toFixed(4)} Cr`);
  console.log(`  ORG GMV       : ₹${(totalOrgGMV2/1e7).toFixed(4)} Cr`);
  console.log(`  DELTA         : ₹${delta.toLocaleString()} ${delta === 0 ? '✓ EXACT' : '⚠  MISMATCH'}`);
  console.log('');

  // Spec coverage summary
  const withMount  = await fc.countDocuments({ spec_mount_type:    { $ne: null } });
  const withStart  = await fc.countDocuments({ spec_starting_type: { $ne: null } });
  const total      = await fc.countDocuments({});
  console.log(`  SPEC COVERAGE:`);
  console.log(`    mount_type    : ${withMount} / ${total} (${((withMount/total)*100).toFixed(1)}%)`);
  console.log(`    starting_type : ${withStart} / ${total} (${((withStart/total)*100).toFixed(1)}%)`);
  console.log('');

  // Unresolved list
  if (unresolvedCount > 0) {
    console.log(`  UNRESOLVED ENTITIES (${unresolvedCount}):`);
    const unres = await forg.find({ organization_status: 'unresolved' }).sort({ total_gmv: -1 }).toArray();
    const unresolvedGMV = unres.reduce((s, o) => s + (o.total_gmv || 0), 0);
    for (const u of unres) {
      console.log(`    ₹${((u.total_gmv||0)/1e5).toFixed(1)}L  ${u.buyer_canonicals[0] || '(empty)'}  →  ${u.organization_name}`);
    }
    console.log(`    Total unresolved GMV: ₹${(unresolvedGMV/1e5).toFixed(1)}L`);
  }

  console.log('\n══ DONE ═══════════════════════════════════════════════════════════\n');
  await client.close();
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
