"use strict";
// VALIDATION 1: GeM Seller Profile reachability for top 20 dealers
// Tests multiple URL patterns and search mechanisms. Reports actual results.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const TOP_20 = [
  "CENTRAL WAREHOUSING CORPORATION",
  "VVDN TECHNOLOGIES PRIVATE LIMITED",
  "FOGGERS INDIA PRIVATE LIMITED",
  "PARTH ENTERPRISE",
  "AKAM ENTERPRISES",
  "ROYAL TRADELINKS PRIVATE LIMITED",
  "APPLIED REALTECH SYSTEMS PRIVATE LIMITED",
  "GLOBAL PEST SOLUTIONS",
  "VIGHNHARTA CORPORATION",
  "MATRISH SHIP MANAGEMENT PRIVATE LIMITED",
  "MAHMUTHA TRADING COMPANY",
  "MACHINERY SALES CORPORATION",
  "TEMPSENS INSTRUMENTS (INDIA) PRIVATE LIMITED",
  "AGMATEL INDIA PRIVATE LIMITED",
  "ESS KAY HOME CARE",
  "KRISHNA ENTERPRISES",
  "ENTUPLE TECHNOLOGIES PRIVATE LIMITED",
  "CONVERGENT TECHNOLOGIES INDIA PRIVATE LIMITED",
  "CLOUD TECH PRIVATE LIMITED",
  "BIO SOLUTION PEST CONTROL SERVICE PRIVATE LIMITED",
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

;(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });

  const results = [];

  // ── First: discover seller search URL on GeM ──────────────────────────────
  console.log("=== PHASE 1: Discover GeM seller search mechanism ===\n");
  const discoveryPage = await context.newPage();

  // Try multiple potential seller search URLs
  const searchUrls = [
    "https://gem.gov.in/seller-search",
    "https://gem.gov.in/vendorSearch",
    "https://gem.gov.in/vendor-profile/search",
    "https://gem.gov.in/marketplace/seller/search",
    "https://gem.gov.in/search?searchType=seller&q=foggers+india",
    "https://gem.gov.in/buyer/search/seller?q=foggers+india",
  ];

  let workingSearchUrl = null;
  for (const url of searchUrls) {
    try {
      const resp = await discoveryPage.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const status = resp?.status();
      const finalUrl = discoveryPage.url();
      console.log(`  ${status} ${url} → ${finalUrl}`);
      if (status === 200 && !finalUrl.includes("404") && !finalUrl.includes("error")) {
        workingSearchUrl = url;
      }
    } catch(e) {
      console.log(`  ERR ${url} → ${e.message.slice(0,60)}`);
    }
    await sleep(1000);
  }

  // Try the main GeM marketplace search
  console.log("\n  Trying main GeM search with seller name...");
  try {
    await discoveryPage.goto("https://gem.gov.in", { waitUntil: "domcontentloaded", timeout: 15000 });
    await sleep(1000);
    // Look for search input
    const searchInput = await discoveryPage.$("input[type='search'], input[placeholder*='search'], input[placeholder*='Search'], #search, .search-input");
    if (searchInput) {
      console.log("  Found search input on gem.gov.in homepage");
      await searchInput.fill("Foggers India");
      await discoveryPage.keyboard.press("Enter");
      await discoveryPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      console.log("  After search URL:", discoveryPage.url());
      // Check if sellers appear
      const pageText = await discoveryPage.evaluate(() => document.body.innerText.slice(0, 500));
      console.log("  Page snippet:", pageText.slice(0, 200));
    } else {
      console.log("  No search input found on homepage");
    }
  } catch(e) {
    console.log("  Homepage search error:", e.message.slice(0,80));
  }

  await discoveryPage.close();

  // ── Try GeM catalog product search (products list sellers) ───────────────
  console.log("\n=== PHASE 2: GeM catalog product search ===\n");
  const catalogPage = await context.newPage();

  // GeM catalog search URLs that might show seller info
  const catalogUrls = [
    "https://gem.gov.in/search?query=foggers+india&searchType=product",
    "https://gem.gov.in/buyer/calatogue/list?q=foggers+india",
    "https://gem.gov.in/product_list?sellerName=foggers+india",
  ];

  for (const url of catalogUrls) {
    try {
      const resp = await catalogPage.goto(url, { waitUntil: "networkidle", timeout: 12000 });
      console.log(`  ${resp?.status()} ${url}`);
      const text = await catalogPage.evaluate(() => document.body.innerText.slice(0, 300));
      console.log("  Content:", text.slice(0, 150));
    } catch(e) {
      console.log(`  ERR: ${e.message.slice(0, 80)}`);
    }
    await sleep(1500);
  }
  await catalogPage.close();

  // ── Try BidPlus — extract seller profile links from bid result pages ──────
  console.log("\n=== PHASE 3: Extract seller links from BidPlus bid pages ===\n");

  // Use a known bid number from our database to find seller profile link patterns
  const knownBids = [
    "GEM/2024/B/4779784",  // the P0 bug bid
    "GEM/2024/B/4000000",  // try a lower ID
  ];

  const bidPage = await context.newPage();
  for (const bidNo of knownBids.slice(0, 1)) {
    // Try BidPlus getSinglePacketResultView
    const pageIds = ["4779784", "5000000", "4500000"];
    for (const pid of pageIds.slice(0, 1)) {
      const url = `https://bidplus.gem.gov.in/bidlists/getSinglePacketResultView/${pid}`;
      try {
        const resp = await bidPage.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        console.log(`  ${resp?.status()} BidPlus page ${pid}`);
        // Look for any links to seller profiles
        const links = await bidPage.$$eval("a[href*='seller'], a[href*='vendor'], a[href*='profile']", els =>
          els.map(e => ({ href: e.href, text: e.innerText?.trim().slice(0, 50) }))
        );
        if (links.length) {
          console.log("  Seller/vendor links found:");
          links.forEach(l => console.log(`    ${l.href} | ${l.text}`));
        } else {
          console.log("  No seller profile links found in bid page");
        }
      } catch(e) {
        console.log(`  ERR: ${e.message.slice(0, 80)}`);
      }
      await sleep(1500);
    }
  }
  await bidPage.close();

  // ── Try GeM seller search via marketplace ─────────────────────────────────
  console.log("\n=== PHASE 4: GeM marketplace seller lookup ===\n");

  const mkPage = await context.newPage();
  // GeM marketplace sometimes has seller profiles accessible via GSTIN or name
  const testUrls = [
    "https://gem.gov.in/seller/vendorProfile/27AAGCV3958P1ZJ",  // random GSTIN format test
    "https://gem.gov.in/vendor-profile",
    "https://gem.gov.in/seller-list",
    "https://gem.gov.in/sellerList",
    "https://gem.gov.in/marketplace/seller-list",
  ];

  for (const url of testUrls) {
    try {
      const resp = await mkPage.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const status = resp?.status();
      const final = mkPage.url();
      console.log(`  ${status} ${url} → ${final.slice(0, 80)}`);
    } catch(e) {
      console.log(`  ERR ${url} → ${e.message.slice(0, 60)}`);
    }
    await sleep(800);
  }
  await mkPage.close();

  // ── Try GeM API endpoints ──────────────────────────────────────────────────
  console.log("\n=== PHASE 5: GeM API seller search ===\n");
  const apiPage = await context.newPage();

  const apiEndpoints = [
    "https://gem.gov.in/api/seller/search?q=foggers+india",
    "https://gem.gov.in/seller/api/search?q=foggers+india",
    "https://bidplus.gem.gov.in/api/seller?name=foggers",
    "https://gem.gov.in/cgi-bin/seller/search?name=foggers+india",
  ];

  for (const url of apiEndpoints) {
    try {
      const resp = await apiPage.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const status = resp?.status();
      const ct = resp?.headers()["content-type"] || "";
      const body = await apiPage.evaluate(() => document.body.innerText.slice(0, 200));
      console.log(`  ${status} [${ct.slice(0,20)}] ${url}`);
      console.log(`    ${body.slice(0, 100)}`);
    } catch(e) {
      console.log(`  ERR ${url} → ${e.message.slice(0, 60)}`);
    }
    await sleep(800);
  }
  await apiPage.close();

  await browser.close();
  console.log("\n=== Discovery complete ===");
  console.log("Review above to determine which URLs/APIs are accessible for seller profiles.");
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
