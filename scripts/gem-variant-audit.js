"use strict";
const { chromium } = require("playwright");
const https = require("https");
const fs = require("fs");
const path = require("path");

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchWithRetry(url, redirectsLeft = 2, retries = 3) {
  return new Promise(resolve => {
    const go = (u, rl, n) => {
      const req = https.get(u, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" }
      }, res => {
        if (res.statusCode === 307 && res.headers.location && rl > 0) {
          res.resume();
          return go(res.headers.location, rl - 1, n);
        }
        if (res.statusCode !== 200) { res.resume(); return resolve({ status: res.statusCode, url: u }); }
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve({ status: 200, url: u, html: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => n > 0 ? setTimeout(() => go(u, rl, n - 1), 1500) : resolve({ status: "ERR", url: u }));
      });
      req.on("error", () => n > 0 ? setTimeout(() => go(u, rl, n - 1), 2000) : resolve({ status: "ERR", url: u }));
      req.on("timeout", () => { req.destroy(); n > 0 ? setTimeout(() => go(u, rl, n - 1), 2000) : resolve({ status: "TIMEOUT", url: u }); });
    };
    go(url, redirectsLeft, retries);
  });
}

function classifyPage(html, finalUrl, bidNum) {
  if (!html) return "FAIL";
  const isSingle = finalUrl.includes("getSinglePacketResultView");
  const isBidRes = finalUrl.includes("getBidResultView");
  const isRA     = (bidNum || "").includes("/R/");
  const hasProductRows = html.includes("productDtl");
  const hasPMA   = html.includes("Under PMA");
  // <strong>L1</strong> appears in pages where L1 ranking has been declared
  const hasL1Tag  = html.includes("<strong>L1</strong>");
  const hasL1Text = /L[-\s]?1\s*(Bidder|Firm|Winner)/i.test(html);

  if (isSingle && hasL1Text)                    return "A-SingleResult";
  if (isSingle && hasProductRows && hasL1Tag)   return "A-ProductTable"; // single view with productDtl
  if (isSingle)                                 return "A-SingleNoData";
  if (isBidRes && hasL1Text)                    return "B-TextResult";
  if (isBidRes && hasProductRows && hasL1Tag && isRA)  return "C-RA-Awarded";
  if (isBidRes && hasProductRows && hasL1Tag && hasPMA) return "D-PMA-Awarded";
  if (isBidRes && hasProductRows && hasL1Tag)   return "B-Awarded";
  if (isBidRes && hasProductRows)               return "E-Pending";
  if (isBidRes)                                 return "F-Unknown";
  return "G-Other";
}

// Status words that appear in spans but are NOT company names
const STATUS_WORDS = new Set(["qualified", "disqualified", "not evaluated", "under pma", "mse", "mii", "startup"]);
function isStatusWord(s) {
  const lower = (s || "").toLowerCase().trim();
  return STATUS_WORDS.has(lower) || lower.length < 3;
}

function extractRankedBidders(html) {
  const rankMap = {};
  const rowPat  = /<tr[^>]*>\s*<td[^>]*class="productDtl"[^>]*>(\d+)<\/td>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowPat.exec(html)) !== null) {
    const rank = parseInt(m[1]);
    if (rankMap[rank]) continue; // first occurrence per rank wins
    const cell  = m[2];
    // Strip PMA/MSE/badge spans (class contains "label")
    const clean = cell.replace(/<span[^>]+class="[^"]*label[^"]*"[^>]*>[^<]*<\/span>/gi, "");
    // Extract company name: cid class first, then font-size:12px
    // Do NOT require </span> at end — embedded <b>/<br/> inside span breaks that
    const rawName =
      clean.match(/<span[^>]*class="cid"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim() ||
      clean.match(/<span[^>]*style="[^"]*font-size:\s*12px[^"]*"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim();
    if (!rawName || isStatusWord(rawName)) continue;
    const name = rawName.replace(/\s+/g, " ").slice(0, 70).trim();
    // Price: explicit bid_price span preferred, fall back to XXXXX.XX pattern
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

  // E-Pending: result not yet declared, don't extract (would be wrong rank order)
  if (variant === "E-Pending") {
    return { bidNum, dept, state, estVal, l1: null, l2: null, l3: null };
  }

  // A-ProductTable, B-Awarded, C-RA-Awarded, D-PMA-Awarded, B-TextResult: all use productDtl table
  const rm = extractRankedBidders(html);
  return {
    bidNum, dept, state, estVal,
    l1: rm[1]?.name || null,
    l2: rm[2]?.name || null,
    l3: rm[3]?.name || null,
    l1Price: rm[1]?.price,
    l2Price: rm[2]?.price,
  };
}

(async () => {
  console.log("=".repeat(70));
  console.log("GeM BidPlus — Variant Audit & Search Discovery");
  console.log("=".repeat(70));

  // Phase 1: Search-driven discovery
  console.log("\n[Phase 1] Search API — collecting awarded fogging bids\n");
  const browser = await chromium.launch({ headless: true });
  const pg = await browser.newPage();
  await pg.goto("https://bidplus.gem.gov.in/all-bids", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pg.waitForTimeout(3000);

  const csrf = await pg.evaluate(() => {
    const m = document.documentElement.innerHTML.match(/csrf_bd_gem_nk['":\s]+([a-f0-9]{32})/i);
    return m ? m[1] : "";
  });
  console.log("CSRF:", csrf ? "found" : "MISSING");

  const keywords = [
    "fog",
    "fogging machine",
    "thermal fogging",
    "mosquito control",
    "fogger",
    "vector control",
    "disinfectant fogging",
  ];

  const allBids = new Map();

  for (const kw of keywords) {
    const payload = {
      param: { searchBid: kw, searchType: "fullText" },
      filter: {
        bidStatusType: "bidrastatus",
        byType: "all",
        highBidValue: "",
        byEndDate: { from: "", to: "" },
        sort: "Bid-End-Date-Latest",
        byStatus: "bid_awarded",
      },
    };
    const result = await pg.evaluate(async ({ payload, csrf }) => {
      const body = "payload=" + encodeURIComponent(JSON.stringify(payload)) + "&csrf_bd_gem_nk=" + csrf;
      const res = await fetch("/all-bids-data", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const j = await res.json();
      return j?.response?.response;
    }, { payload, csrf });

    const docs = result?.docs || [];
    console.log(`  "${kw}": ${result?.numFound || 0} total, ${docs.length} fetched`);
    for (const d of docs) {
      const id = parseInt(d.id);
      if (!allBids.has(id)) {
        allBids.set(id, {
          id,
          bidNum: (d.b_bid_number || [])[0] || "",
          bidType: d.b_bid_type?.[0],
          catId: (d.b_cat_id || [])[0] || "",
          keyword: kw,
        });
      }
    }
    await delay(600);
  }

  await browser.close();

  const candidates = [...allBids.values()].slice(0, 60);
  console.log(`\nUnique awarded bids found: ${allBids.size} — testing first ${candidates.length}`);

  // Phase 2: Fetch, classify, extract
  console.log("\n[Phase 2] Fetch + Classify + Extract\n");
  const varStats = {}; // variant => { total, l1ok, l2ok, l3ok, failures }
  const extracted = [];
  let fetched = 0;

  for (const c of candidates) {
    const r = await fetchWithRetry(
      "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/" + c.id
    );
    if (r.status !== 200) {
      console.log(`FAIL-${r.status}  | page ${c.id} | ${c.bidNum}`);
      await delay(600);
      continue;
    }
    fetched++;
    const variant = classifyPage(r.html, r.url, c.bidNum);
    const data    = parseBidData(r.html, variant);

    if (!varStats[variant]) varStats[variant] = { total: 0, l1ok: 0, l2ok: 0, l3ok: 0, sample: [] };
    varStats[variant].total++;
    if (data.l1) {
      varStats[variant].l1ok++;
      if (data.l2) varStats[variant].l2ok++;
      if (data.l3) varStats[variant].l3ok++;
      extracted.push({ ...data, id: c.id, variant, keyword: c.keyword });
      if (varStats[variant].sample.length < 2) {
        varStats[variant].sample.push({ id: c.id, bidNum: data.bidNum, l1: data.l1, dept: data.dept });
      }
    }

    const tag = data.l1 ? "OK  " : "NOLK";
    console.log(
      `${tag} | ${variant.padEnd(16)} | ${c.id} | ${(data.bidNum || c.bidNum || "?").padEnd(26)} | L1: ${(data.l1 || "-").slice(0, 25)}`
    );
    await delay(500);
  }

  // Phase 3: Report
  console.log("\n" + "=".repeat(70));
  console.log("RESULT PAGE VARIANT AUDIT");
  console.log("=".repeat(70));

  const rows = Object.entries(varStats).sort((a, b) => b[1].total - a[1].total);
  let grandL1 = 0, grandL2 = 0, grandL3 = 0;

  for (const [variant, s] of rows) {
    grandL1 += s.l1ok;
    grandL2 += s.l2ok;
    grandL3 += s.l3ok;
    const l1pct = Math.round(100 * s.l1ok / s.total);
    const l2pct = s.l2ok > 0 ? Math.round(100 * s.l2ok / s.l1ok) : 0;
    const l3pct = s.l3ok > 0 ? Math.round(100 * s.l3ok / s.l1ok) : 0;
    console.log(`\n  Variant: ${variant}`);
    console.log(`    Count : ${s.total} bids`);
    console.log(`    L1    : ${s.l1ok}/${s.total} = ${l1pct}% ${l1pct >= 95 ? "✓" : "✗"}`);
    console.log(`    L2    : ${s.l2ok}/${s.l1ok} = ${l2pct}% (of L1-ok)`);
    console.log(`    L3    : ${s.l3ok}/${s.l1ok} = ${l3pct}% (of L1-ok)`);
    if (s.sample.length) {
      s.sample.forEach(x => console.log(`    Sample: page ${x.id} | ${x.bidNum} | L1: ${(x.l1||"?").slice(0,30)} | ${(x.dept||"?").slice(0,35)}`));
    }
  }

  console.log("\n" + "-".repeat(70));
  console.log(`OVERALL (n=${fetched}):`);
  console.log(`  L1: ${grandL1}/${fetched} = ${Math.round(100 * grandL1 / fetched)}% ${grandL1 / fetched >= 0.95 ? "✓ TARGET MET" : "✗ below 95%"}`);
  console.log(`  L2: ${grandL2}/${fetched} = ${Math.round(100 * grandL2 / fetched)}% ${grandL2 / fetched >= 0.90 ? "✓ TARGET MET" : "✗ below 90%"}`);
  console.log(`  L3: ${grandL3}/${fetched} = ${Math.round(100 * grandL3 / fetched)}% ${grandL3 / fetched >= 0.90 ? "✓ TARGET MET" : "✗ below 90%"}`);

  // Save extracted records
  const outPath = path.join(__dirname, "gem-audit-results.json");
  fs.writeFileSync(outPath, JSON.stringify(extracted, null, 2));
  console.log(`\nExtracted records saved to: scripts/gem-audit-results.json (${extracted.length} records)`);

  // Parser rules summary
  console.log("\n" + "=".repeat(70));
  console.log("PARSER RULES BY VARIANT");
  console.log("=".repeat(70));
  const rules = {
    "A-SingleResult" : "Regex L1/L2/L3 Bidder labels in plain text",
    "A-ProductTable" : "getSinglePacketResultView with productDtl table; use ranked bidder extractor",
    "A-SingleNoData" : "getSinglePacketResultView 200 but no result structure recognised — SKIP",
    "B-Awarded"      : "getBidResultView; productDtl+L1 tag; cid/font-size:12px span; skip </span> req",
    "B-TextResult"   : "getBidResultView with L1/L2/L3 Bidder text labels — rare",
    "C-RA-Awarded"   : "getBidResultView; R-type bid; same extractor as B-Awarded",
    "D-PMA-Awarded"  : "getBidResultView; has <strong>L1</strong>+PMA; extract name even when price='-'",
    "E-Pending"      : "getBidResultView; productDtl rows present but no L1 tag; SKIP — result not declared",
    "F-Unknown"      : "getBidResultView with no recognisable data — inspect manually",
    "G-Other"        : "Unexpected URL pattern — inspect manually",
  };
  for (const [v, rule] of Object.entries(rules)) {
    if (varStats[v]) console.log(`  ${v.padEnd(16)}: ${rule}`);
  }
})().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
