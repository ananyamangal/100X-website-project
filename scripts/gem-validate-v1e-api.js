"use strict";
// Probe GeM internal APIs for seller data + seller profile lookup
// Found from endpoints JS: bid_api = https://bid-mkp.gem.gov.in/api
const { chromium } = require("playwright");
const fs = require("fs");
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

;(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  // ── 1. bid-mkp API endpoints ──────────────────────────────────────────────
  console.log("=== 1. bid-mkp.gem.gov.in API ===");
  const bidApiUrls = [
    "https://bid-mkp.gem.gov.in/api",
    "https://bid-mkp.gem.gov.in/api/seller",
    "https://bid-mkp.gem.gov.in/api/seller/search?q=foggers+india",
    "https://bid-mkp.gem.gov.in/api/seller/search?name=foggers",
    "https://bid-mkp.gem.gov.in/api/sellers?q=foggers+india",
    "https://bid-mkp.gem.gov.in/api/vendor/search?q=foggers+india",
  ];
  for (const url of bidApiUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
      const ct = resp?.headers()["content-type"] || "";
      console.log(`${status} [${ct.slice(0,20)}] ${url}`);
      console.log(`  ${text.slice(0, 150)}`);
    } catch(e) {
      console.log(`ERR ${url}: ${e.message.slice(0,80)}`);
    }
    await sleep(800);
  }

  // ── 2. mkp.gem.gov.in internal seller search ──────────────────────────────
  console.log("\n=== 2. mkp.gem.gov.in API paths ===");
  const mkpApiUrls = [
    "https://mkp.gem.gov.in/api/seller/search?q=foggers+india",
    "https://mkp.gem.gov.in/seller/search?q=foggers+india",
    "https://mkp.gem.gov.in/api/sellers?keyword=foggers",
    "https://mkp.gem.gov.in/catalogue/search?q=foggers+india&format=json",
    "https://mkp.gem.gov.in/search.json?q=fogging+machine",
    "https://mkp.gem.gov.in/api/v1/seller/search?q=foggers",
    "https://mkp.gem.gov.in/api/catalogue/search?q=fogging+machine",
  ];
  for (const url of mkpApiUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 200));
      const ct = resp?.headers()["content-type"] || "";
      console.log(`${status} [${ct.slice(0,20)}] ${url}`);
      console.log(`  ${text.slice(0, 100)}`);
    } catch(e) {
      console.log(`ERR ${url}: ${e.message.slice(0,80)}`);
    }
    await sleep(800);
  }

  // ── 3. GeM seller ID form submission ──────────────────────────────────────
  console.log("\n=== 3. GeM Seller ID lookup form ===");
  // From the form: input id="gemSellerId", submit button
  // We need to know a real GeM Seller ID — let's try to find it in BidPlus HTML
  await page.goto("https://bidplus.gem.gov.in/bidlists/getSinglePacketResultView/4779784", {
    waitUntil: "networkidle", timeout: 20000
  });
  await sleep(2000);

  // Look for seller ID patterns in the page source
  const html = await page.content();
  const gemIdMatches = [
    ...(html.match(/GEM-[A-Z0-9\-]+/g) || []),
    ...(html.match(/sellerCode["\s:=]+["']([A-Z0-9\-]+)/g) || []),
    ...(html.match(/sellerId["\s:=]+["']([A-Z0-9\-]+)/g) || []),
    ...(html.match(/vendor_id["\s:=]+["']([A-Z0-9\-]+)/g) || []),
    ...(html.match(/org_id["\s:=]+["']([A-Z0-9\-]+)/g) || []),
    ...(html.match(/\bGS[A-Z0-9]{8,15}\b/g) || []),
  ];
  console.log("Seller ID patterns in BidPlus HTML:");
  [...new Set(gemIdMatches)].slice(0, 20).forEach(m => console.log(" ", m));

  // Check for any numeric IDs that might be seller IDs
  const orgIds = html.match(/org_user_id[^"]*["'](\d+)/g) || [];
  console.log("Org/user ID patterns:", orgIds.slice(0, 10));

  // ── 4. Test the seller landing page form submission ───────────────────────
  console.log("\n=== 4. Test seller ID lookup with guessed IDs ===");
  await page.goto("https://gem.gov.in/landing/gem_seller_id/", { waitUntil: "networkidle", timeout: 15000 });
  await sleep(1000);

  // Try some common GeM seller ID formats
  const testIds = ["SOGE", "GEM-1-0001", "1000001", "ARBA1234", "OFG00001"];
  for (const testId of testIds.slice(0, 3)) {
    const apiCalls = [];
    const listener = async resp => {
      const ct = resp.headers()["content-type"] || "";
      if (ct.includes("json")) {
        const body = await resp.json().catch(() => null);
        if (body) apiCalls.push({ url: resp.url(), body: JSON.stringify(body).slice(0, 300) });
      }
    };
    page.on("response", listener);

    try {
      await page.fill("#gemSellerId", testId);
      await page.click("button[type=submit], input[type=submit], .btn-submit, button:text('Submit')");
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await sleep(2000);
      const resultText = await page.evaluate(() => document.body.innerText.slice(0, 400));
      console.log(`  ID="${testId}" → ${resultText.slice(0, 200)}`);
      if (apiCalls.length) console.log("  API calls:", apiCalls);
    } catch(e) {
      console.log(`  ERR for ${testId}: ${e.message.slice(0, 80)}`);
    }

    page.off("response", listener);
    await sleep(1000);
    await page.goto("https://gem.gov.in/landing/gem_seller_id/", { waitUntil: "networkidle", timeout: 10000 });
    await sleep(500);
  }

  // ── 5. Check cms-mkp for any public seller content ────────────────────────
  console.log("\n=== 5. cms-mkp.gem.gov.in exploration ===");
  const cmsUrls = [
    "https://cms-mkp.gem.gov.in",
    "https://cms-mkp.gem.gov.in/api/sellers",
    "https://cms-mkp.gem.gov.in/sellers",
  ];
  for (const url of cmsUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 200));
      console.log(`${status} ${url}: ${text.slice(0, 100)}`);
    } catch(e) {
      console.log(`ERR ${url}: ${e.message.slice(0, 80)}`);
    }
    await sleep(800);
  }

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
