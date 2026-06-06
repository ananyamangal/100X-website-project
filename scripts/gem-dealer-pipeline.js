"use strict";
/**
 * gem-dealer-pipeline.js
 * Phases:
 *   1  Store 59 existing extracted bids
 *   2  Collect 500 awarded fogging bids via BidPlus search API (date-window pagination)
 *   3  Generate dealer intelligence report
 *   4  Generate OEM authorization targets
 *
 * Run locally — GeM blocks Vercel/datacenter IPs.
 * Collections used:
 *   gem_awarded_bids  — one doc per bid (upserted by bid_number)
 *   gem_dealers       — one doc per canonical dealer (upserted by canonical_name)
 */

const { chromium } = require("playwright");
const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const { MongoClient } = require("mongodb");

// ─── Config ────────────────────────────────────────────────────────────────

const TARGET_BIDS = 500;
const REQUEST_DELAY_MS = 500;

const KEYWORDS = ["fog", "fogging", "fogging machine", "thermal fogging", "mosquito control", "vector control"];

// Monthly date windows: Jan 2024 → Jun 2026
function* dateWindows() {
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
  ];
  const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();
  for (let y = 2024; y <= 2026; y++) {
    const maxM = y === 2026 ? 5 : 11;
    for (let m = 0; m <= maxM; m++) {
      const dd = d => String(d).padStart(2, "0");
      const mm = String(m + 1).padStart(2, "0");
      yield {
        from: `01-${mm}-${y}`,
        to:   `${daysInMonth(y, m)}-${mm}-${y}`,
        label: `${months[m]} ${y}`
      };
    }
  }
}

// ─── HTTP ──────────────────────────────────────────────────────────────────

function fetchWithRetry(url, redirectsLeft = 2, retries = 3) {
  return new Promise(resolve => {
    const go = (u, rl, n) => {
      const req = https.get(u, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" }
      }, res => {
        if (res.statusCode === 307 && res.headers.location && rl > 0) {
          res.resume(); return go(res.headers.location, rl - 1, n);
        }
        if (res.statusCode !== 200) { res.resume(); return resolve({ status: res.statusCode, url: u }); }
        const ch = []; res.on("data", c => ch.push(c));
        res.on("end", () => resolve({ status: 200, url: u, html: Buffer.concat(ch).toString("utf8") }));
        res.on("error", () => n > 0 ? setTimeout(() => go(u, rl, n - 1), 1500) : resolve({ status: "ERR", url: u }));
      });
      req.on("error", () => n > 0 ? setTimeout(() => go(u, rl, n - 1), 2000) : resolve({ status: "ERR", url: u }));
      req.on("timeout", () => { req.destroy(); n > 0 ? setTimeout(() => go(u, rl, n - 1), 2500) : resolve({ status: "TIMEOUT", url: u }); });
    };
    go(url, redirectsLeft, retries);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Parser (from gem-variant-audit.js) ────────────────────────────────────

const STATUS_WORDS = new Set(["qualified","disqualified","not evaluated","under pma","mse","mii","startup"]);
function isStatusWord(s) { const l = (s || "").toLowerCase().trim(); return STATUS_WORDS.has(l) || l.length < 3; }

function classifyPage(html, finalUrl, bidNum) {
  if (!html) return "FAIL";
  const isSingle = finalUrl.includes("getSinglePacketResultView");
  const isBidRes = finalUrl.includes("getBidResultView");
  const isRA     = (bidNum || "").includes("/R/");
  const hasProductRows = html.includes("productDtl");
  const hasPMA   = html.includes("Under PMA");
  const hasL1Tag  = html.includes("<strong>L1</strong>");
  const hasL1Text = /L[-\s]?1\s*(Bidder|Firm|Winner)/i.test(html);

  if (isSingle && hasL1Text)                             return "A-SingleResult";
  if (isSingle && hasProductRows && hasL1Tag)            return "A-ProductTable";
  if (isSingle)                                          return "A-SingleNoData";
  if (isBidRes && hasL1Text)                             return "B-TextResult";
  if (isBidRes && hasProductRows && hasL1Tag && isRA)    return "C-RA-Awarded";
  if (isBidRes && hasProductRows && hasL1Tag && hasPMA)  return "D-PMA-Awarded";
  if (isBidRes && hasProductRows && hasL1Tag)            return "B-Awarded";
  if (isBidRes && hasProductRows)                        return "E-Pending";
  if (isBidRes)                                          return "F-Unknown";
  return "G-Other";
}

function extractRankedBidders(html) {
  const rankMap = {};
  const rowPat  = /<tr[^>]*>\s*<td[^>]*class="productDtl"[^>]*>(\d+)<\/td>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowPat.exec(html)) !== null) {
    const rank = parseInt(m[1]);
    if (rankMap[rank]) continue;
    const cell  = m[2];
    const clean = cell.replace(/<span[^>]+class="[^"]*label[^"]*"[^>]*>[^<]*<\/span>/gi, "");
    const rawName =
      clean.match(/<span[^>]*class="cid"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim() ||
      clean.match(/<span[^>]*style="[^"]*font-size:\s*12px[^"]*"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim();
    if (!rawName || isStatusWord(rawName)) continue;
    const name  = rawName.replace(/\s+/g, " ").slice(0, 80).trim();
    const price =
      clean.match(/<span[^>]*class="bid_price"[^>]*>\s*([\d,]+\.\d{2})/i)?.[1] ||
      clean.match(/([\d]{4,}[,\d]*\.\d{2})/)?.[1] || null;
    rankMap[rank] = { name, price };
  }
  return rankMap;
}

function parseBidData(html, variant) {
  const bidNum = html.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)?.[1];
  const dept   = html.match(/(?:Organisation|Organization)[^:]*:\s*<\/[^>]+>\s*<[^>]+>\s*([^\n<]{5,80})/i)?.[1]?.trim()
              || html.match(/(?:Ministry|Dept|Department)\s*:\s*([^\n<]{5,60})/i)?.[1]?.trim();
  const state  = html.match(/\bState\b[^<]*<\/[^>]+>\s*<[^>]+>\s*([A-Z][A-Za-z ]{2,28})/)?.[1]?.trim();
  const estVal = html.match(/Estimated[^<]*?Rs\.\s*([\d,]+)/i)?.[1];

  if (variant === "A-SingleResult") {
    return {
      bidNum, dept, state, estVal,
      l1: html.match(/L[-\s]?1\s*(Bidder|Firm)[:\- ]+([^\n<]{3,50})/i)?.[2]?.trim(),
      l2: html.match(/L[-\s]?2\s*(Bidder|Firm)[:\- ]+([^\n<]{3,50})/i)?.[2]?.trim(),
      l3: html.match(/L[-\s]?3\s*(Bidder|Firm)[:\- ]+([^\n<]{3,50})/i)?.[2]?.trim(),
    };
  }
  if (variant === "E-Pending" || variant === "F-Unknown" || variant === "G-Other") {
    return { bidNum, dept, state, estVal, l1: null, l2: null, l3: null };
  }
  const rm = extractRankedBidders(html);
  return {
    bidNum, dept, state, estVal,
    l1: rm[1]?.name || null,
    l2: rm[2]?.name || null,
    l3: rm[3]?.name || null,
    l1Price: rm[1]?.price || null,
  };
}

// ─── Canonicalization ──────────────────────────────────────────────────────

function canonicalize(name) {
  if (!name) return null;
  return name
    .toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|M\/S\s+|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── MongoDB helpers ────────────────────────────────────────────────────────

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...v] = line.split("=");
      if (k?.trim() === "MONGODB_URI") return v.join("=").trim();
    }
  }
  throw new Error("MONGODB_URI not found");
}

async function upsertBid(col, bid) {
  if (!bid.bidNum) return false;
  await col.updateOne(
    { bid_number: bid.bidNum },
    { $set: {
        bid_number: bid.bidNum,
        page_id: bid.pageId,
        variant: bid.variant,
        keyword: bid.keyword,
        l1_name: bid.l1 || null,
        l2_name: bid.l2 || null,
        l3_name: bid.l3 || null,
        l1_price: bid.l1Price || null,
        dept: bid.dept || null,
        state: bid.state || null,
        est_value: bid.estVal || null,
        updated_at: new Date(),
      },
      $setOnInsert: { created_at: new Date() }
    },
    { upsert: true }
  );
  return true;
}

async function upsertDealer(col, { name, role, bidNum, dept, state }) {
  if (!name) return;
  const canonical = canonicalize(name);
  if (!canonical) return;
  const inc = {};
  if (role === "l1") inc.l1_wins = 1;
  if (role === "l2") inc.l2_count = 1;
  if (role === "l3") inc.l3_count = 1;
  await col.updateOne(
    { canonical_name: canonical },
    {
      $inc: inc,
      $addToSet: {
        aliases: name.trim(),
        ...(dept  ? { departments: dept }  : {}),
        ...(state ? { states: state }       : {}),
        bids: bidNum,
      },
      $setOnInsert: { canonical_name: canonical, is_100x_dealer: false, created_at: new Date() },
      $set: { updated_at: new Date() },
    },
    { upsert: true }
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

(async () => {
  const startTime = Date.now();
  const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);

  log("=".repeat(70));
  log("GeM Dealer Intelligence Pipeline");
  log("=".repeat(70));

  // MongoDB
  const mongoUri = loadMongoUri();
  const client   = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db       = client.db();
  const bidCol   = db.collection("gem_awarded_bids");
  const dealerCol = db.collection("gem_dealers");

  // Indexes
  await bidCol.createIndex({ bid_number: 1 }, { unique: true });
  await dealerCol.createIndex({ canonical_name: 1 }, { unique: true });
  log("MongoDB connected, indexes ready");

  // ── Phase 1: Store 59 existing records ─────────────────────────────────

  log("\n[Phase 1] Storing 59 existing extracted records");
  const existingPath = path.join(__dirname, "gem-audit-results.json");
  const existing = JSON.parse(fs.readFileSync(existingPath, "utf8"));

  let p1stored = 0, p1dealers = 0;
  for (const rec of existing) {
    if (!rec.bidNum) continue;
    const bidDoc = { bidNum: rec.bidNum, pageId: rec.id, variant: rec.variant, keyword: rec.keyword,
                     l1: rec.l1, l2: rec.l2, l3: rec.l3, l1Price: rec.l1Price,
                     dept: rec.dept, state: rec.state, estVal: rec.estVal };
    await upsertBid(bidCol, bidDoc);
    p1stored++;
    for (const [role, name] of [["l1",rec.l1],["l2",rec.l2],["l3",rec.l3]]) {
      if (name) { await upsertDealer(dealerCol, { name, role, bidNum: rec.bidNum, dept: rec.dept, state: rec.state }); p1dealers++; }
    }
  }
  log(`Phase 1 done: ${p1stored} bids stored, ${p1dealers} dealer appearances processed`);

  // ── Phase 2: Collect 500 awarded fogging bids ───────────────────────────

  log("\n[Phase 2] Collecting bids via BidPlus search API (date-window pagination)");

  const browser = await chromium.launch({ headless: true });
  const pg      = await browser.newPage();
  await pg.goto("https://bidplus.gem.gov.in/all-bids", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pg.waitForTimeout(3000);

  const csrf = await pg.evaluate(() => {
    const m = document.documentElement.innerHTML.match(/csrf_bd_gem_nk['":\s]+([a-f0-9]{32})/i);
    return m ? m[1] : "";
  });
  log("CSRF token:", csrf ? "found" : "MISSING");

  // Track discovered bid IDs to avoid re-fetching
  const seenIds = new Set();
  // Pre-load already-stored bid numbers to skip
  const stored = await bidCol.find({}, { projection: { bid_number: 1 } }).toArray();
  stored.forEach(d => seenIds.add(d.bid_number));
  log(`Pre-loaded ${seenIds.size} already-stored bids`);

  const windows = [...dateWindows()];
  let p2fetched = 0, p2stored = 0, p2skipped = 0, p2fail = 0;
  const checkpoint = path.join(__dirname, "gem-pipeline-checkpoint.json");
  let windowIdx = 0;

  // Load checkpoint if exists
  if (fs.existsSync(checkpoint)) {
    const cp = JSON.parse(fs.readFileSync(checkpoint, "utf8"));
    windowIdx = cp.windowIdx || 0;
    log(`Resuming from checkpoint: window index ${windowIdx}`);
  }

  outer:
  for (let wi = windowIdx; wi < windows.length; wi++) {
    const win = windows[wi];
    for (const kw of KEYWORDS) {
      if (p2stored >= TARGET_BIDS) { log(`Target ${TARGET_BIDS} bids reached, stopping collection`); break outer; }

      const payload = {
        param: { searchBid: kw, searchType: "fullText" },
        filter: {
          bidStatusType: "bidrastatus", byType: "all", highBidValue: "",
          byEndDate: { from: win.from, to: win.to },
          sort: "Bid-End-Date-Latest", byStatus: "bid_awarded"
        }
      };

      const apiResult = await pg.evaluate(async ({ payload, csrf }) => {
        try {
          const body = "payload=" + encodeURIComponent(JSON.stringify(payload)) + "&csrf_bd_gem_nk=" + csrf;
          const res  = await fetch("/all-bids-data", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
          const j    = await res.json();
          return j?.response?.response;
        } catch (e) { return null; }
      }, { payload, csrf });

      if (!apiResult) { await delay(1000); continue; }
      const docs = apiResult.docs || [];
      if (docs.length === 0) { await delay(200); continue; }

      for (const doc of docs) {
        const pageId = parseInt(doc.id);
        const apiBidNum = (doc.b_bid_number || [])[0] || "";
        if (seenIds.has(apiBidNum) || seenIds.has(String(pageId))) { p2skipped++; continue; }

        p2fetched++;
        const r = await fetchWithRetry("https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/" + pageId);
        if (r.status !== 200) { p2fail++; await delay(300); continue; }

        const variant = classifyPage(r.html, r.url, apiBidNum);
        const data    = parseBidData(r.html, variant);
        const bidNum  = data.bidNum || apiBidNum;

        if (!bidNum || seenIds.has(bidNum)) { p2skipped++; continue; }
        seenIds.add(bidNum);

        if (!data.l1) { await delay(REQUEST_DELAY_MS); continue; } // skip unawarded

        const bidDoc = { bidNum, pageId, variant, keyword: kw,
                         l1: data.l1, l2: data.l2, l3: data.l3, l1Price: data.l1Price,
                         dept: data.dept, state: data.state, estVal: data.estVal };
        await upsertBid(bidCol, bidDoc);
        p2stored++;

        for (const [role, name] of [["l1",data.l1],["l2",data.l2],["l3",data.l3]]) {
          if (name) await upsertDealer(dealerCol, { name, role, bidNum, dept: data.dept, state: data.state });
        }

        if (p2stored % 25 === 0) {
          log(`  [${win.label}] "${kw}" — bids stored: ${p2stored}, fetched: ${p2fetched}, skip: ${p2skipped}`);
          fs.writeFileSync(checkpoint, JSON.stringify({ windowIdx: wi }));
        }
        await delay(REQUEST_DELAY_MS);
      }
      await delay(200);
    }
    // Save checkpoint after each window
    fs.writeFileSync(checkpoint, JSON.stringify({ windowIdx: wi + 1 }));
  }

  await browser.close();
  log(`\nPhase 2 done: ${p2stored} new bids stored | ${p2fetched} pages fetched | ${p2skipped} skipped | ${p2fail} failed`);

  // ── Phase 3: Dealer Intelligence ────────────────────────────────────────

  log("\n[Phase 3] Generating Dealer Intelligence Report");

  const totalBids = await bidCol.countDocuments();
  const totalDealers = await dealerCol.countDocuments();
  log(`Database: ${totalBids} bids | ${totalDealers} canonical dealers`);

  // Top L1 winners
  const topL1 = await dealerCol
    .find({ l1_wins: { $gt: 0 } })
    .sort({ l1_wins: -1 })
    .limit(20)
    .toArray();

  // Top by department breadth — must use aggregation for array-size sort
  const topByDeptsAgg = await dealerCol.aggregate([
    { $match: { l1_wins: { $gt: 0 } } },
    { $project: { canonical_name: 1, l1_wins: 1, departments: 1, states: 1, bids: 1, is_100x_dealer: 1, deptCount: { $size: { $ifNull: ["$departments", []] } } } },
    { $sort: { deptCount: -1 } },
    { $limit: 10 }
  ]).toArray();

  // Top defence suppliers
  const defenceKeywords = ["Indian Army","Indian Air Force","Indian Navy","Indian Coast Guard","DGQA","Defence","Ministry of Defence","DRDO"];
  const defenceRegex = new RegExp(defenceKeywords.join("|"), "i");
  const defenceBids  = await bidCol.find({ dept: { $regex: defenceRegex } }).toArray();
  const defenceDealerCounts = {};
  defenceBids.forEach(b => { if (b.l1_name) defenceDealerCounts[canonicalize(b.l1_name)] = (defenceDealerCounts[canonicalize(b.l1_name)]||0)+1; });
  const topDefence = Object.entries(defenceDealerCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Top municipal suppliers
  const municipalKeywords = ["Nagar","Municipal","Palika","Nigam","Corporation","ULB","E-nagar","E-municipalities"];
  const municipalRegex = new RegExp(municipalKeywords.join("|"), "i");
  const municipalBids  = await bidCol.find({ dept: { $regex: municipalRegex } }).toArray();
  const municipalDealerCounts = {};
  municipalBids.forEach(b => { if (b.l1_name) municipalDealerCounts[canonicalize(b.l1_name)] = (municipalDealerCounts[canonicalize(b.l1_name)]||0)+1; });
  const topMunicipal = Object.entries(municipalDealerCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Department distribution
  const deptDist = await bidCol.aggregate([
    { $match: { dept: { $ne: null } } },
    { $group: { _id: "$dept", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  // ── Phase 4: OEM Authorization Targets ──────────────────────────────────

  log("[Phase 4] Generating OEM Authorization Targets");

  const authTargets = await dealerCol.aggregate([
    { $match: { l1_wins: { $gte: 2 }, is_100x_dealer: false } },
    {
      $project: {
        canonical_name: 1,
        aliases: 1,
        l1_wins: 1,
        l2_count: 1,
        l3_count: 1,
        departments: 1,
        states: 1,
        bids: 1,
        deptCount:  { $size: { $ifNull: ["$departments", []] } },
        stateCount: { $size: { $ifNull: ["$states", []] } },
      }
    },
    {
      $addFields: {
        // Score: L1 wins × 3 + dept breadth × 2 + state breadth
        score: { $add: [
          { $multiply: ["$l1_wins", 3] },
          { $multiply: ["$deptCount", 2] },
          "$stateCount"
        ]}
      }
    },
    { $sort: { score: -1 } },
    { $limit: 25 }
  ]).toArray();

  // ── Print Report ─────────────────────────────────────────────────────────

  const sep = "─".repeat(70);
  console.log("\n" + "=".repeat(70));
  console.log("DEALER INTELLIGENCE REPORT");
  console.log("=".repeat(70));
  console.log(`\nDatabase: ${totalBids} awarded fogging bids | ${totalDealers} canonical dealers`);

  console.log(`\n${sep}`);
  console.log("TOP 20 L1 WINNERS (most wins in government fogging procurement)");
  console.log(sep);
  topL1.forEach((d, i) => {
    const depts = (d.departments || []).length;
    const states = (d.states || []).length;
    console.log(`  ${String(i+1).padStart(2)}. ${d.canonical_name.slice(0,40).padEnd(40)} L1=${d.l1_wins}  depts=${depts}  states=${states}`);
  });

  console.log(`\n${sep}`);
  console.log("TOP DEALERS BY DEPARTMENT BREADTH (multi-department coverage)");
  console.log(sep);
  topByDeptsAgg.forEach((d, i) => {
    const depts = (d.departments || []).slice(0, 3).map(x => x.slice(0,25)).join(", ");
    console.log(`  ${String(i+1).padStart(2)}. ${d.canonical_name.slice(0,40).padEnd(40)} L1=${d.l1_wins}  depts=${d.deptCount}: ${depts}`);
  });

  console.log(`\n${sep}`);
  console.log("TOP DEFENCE SUPPLIERS (Army / Air Force / Navy / Coast Guard)");
  console.log(sep);
  topDefence.forEach(([name, n], i) => console.log(`  ${String(i+1).padStart(2)}. ${name.slice(0,50).padEnd(50)} wins=${n}`));

  console.log(`\n${sep}`);
  console.log("TOP MUNICIPAL SUPPLIERS (Nagar Palika / Nigam / ULB)");
  console.log(sep);
  topMunicipal.forEach(([name, n], i) => console.log(`  ${String(i+1).padStart(2)}. ${name.slice(0,50).padEnd(50)} wins=${n}`));

  console.log(`\n${sep}`);
  console.log("DEPARTMENT DISTRIBUTION (top 15 buying departments)");
  console.log(sep);
  deptDist.forEach((d, i) => console.log(`  ${String(i+1).padStart(2)}. ${d._id.slice(0,55).padEnd(55)} ${d.count} bids`));

  console.log(`\n${sep}`);
  console.log("OEM AUTHORIZATION TARGETS (ranked by score: L1×3 + depts×2 + states)");
  console.log("These dealers win fogging bids across multiple depts/states — prime 100X prospects");
  console.log(sep);
  authTargets.forEach((d, i) => {
    const alias = (d.aliases || []).find(a => a !== d.canonical_name) || "";
    const depts = (d.departments || []).slice(0, 2).map(x => x.slice(0,20)).join(", ");
    console.log(`  ${String(i+1).padStart(2)}. ${d.canonical_name.slice(0,38).padEnd(38)} score=${d.score}  L1=${d.l1_wins}  depts=${d.deptCount}  states=${d.stateCount}`);
    if (alias) console.log(`      Also known as: ${alias.slice(0,50)}`);
    if (depts)  console.log(`      Departments: ${depts}`);
  });

  // Save report to JSON for later use
  const reportPath = path.join(__dirname, "gem-dealer-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalBids, totalDealers,
    topL1: topL1.map(d => ({ name: d.canonical_name, l1_wins: d.l1_wins, depts: d.departments, states: d.states })),
    authTargets: authTargets.map(d => ({ name: d.canonical_name, score: d.score, l1_wins: d.l1_wins, deptCount: d.deptCount, stateCount: d.stateCount, depts: d.departments, states: d.states, aliases: d.aliases })),
    deptDistribution: deptDist.map(d => ({ dept: d._id, count: d.count })),
  }, null, 2));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log(`\nDone in ${elapsed}s. Report saved to scripts/gem-dealer-report.json`);
  await client.close();
  // Clean up checkpoint
  if (fs.existsSync(checkpoint)) fs.unlinkSync(checkpoint);
})().catch(async e => {
  console.error("Fatal:", e.message, e.stack?.split("\n")[1] || "");
  process.exit(1);
});
