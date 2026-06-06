"use strict";
// Extract seller names and profile links from mkp.gem.gov.in marketplace search results
// This is the public buyer-facing marketplace — products show seller names + links

const { chromium } = require("playwright");
const fs = require("fs");
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

;(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });

  const apiCalls = [];
  context.on("response", async resp => {
    const url = resp.url();
    const ct = resp.headers()["content-type"] || "";
    if (ct.includes("json")) {
      const body = await resp.json().catch(() => null);
      if (body) apiCalls.push({ url, body });
    }
  });

  const page = await context.newPage();

  // ── 1. Marketplace search for fogging machine ─────────────────────────────
  console.log("=== Marketplace search: fogging machine ===");
  await page.goto("https://mkp.gem.gov.in/search?q=fogging+machine", {
    waitUntil: "networkidle", timeout: 30000
  });
  await sleep(4000);  // let JS render

  // Dump API calls
  console.log(`\nAPI calls intercepted: ${apiCalls.length}`);
  for (const c of apiCalls.slice(0, 10)) {
    const bodyStr = JSON.stringify(c.body);
    console.log(`  ${c.url}`);
    console.log(`    ${bodyStr.slice(0, 250)}`);
  }
  apiCalls.length = 0;

  // Extract full page text
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log("\nPage text (first 1500 chars):");
  console.log(pageText.slice(0, 1500));

  // Find seller names and links
  const sellerLinks = await page.$$eval("a", els =>
    els.filter(e => e.href && (
      e.href.includes("seller") || e.href.includes("vendor") ||
      e.href.includes("storef") || e.href.includes("shop") ||
      e.href.includes("org/") || e.href.includes("profile")
    )).map(e => ({ href: e.href, text: e.innerText?.trim().slice(0, 80) }))
  );
  console.log("\nSeller/storefront links in results:");
  sellerLinks.forEach(l => console.log(`  ${l.href} | ${l.text}`));

  // Find all links that look like product links
  const productLinks = await page.$$eval("a[href*='/product/'], a[href*='/item/'], a[href*='/catalogue/']", els =>
    els.slice(0, 5).map(e => ({ href: e.href, text: e.innerText?.trim().slice(0, 80) }))
  );
  console.log("\nProduct links (first 5):");
  productLinks.forEach(l => console.log(`  ${l.href} | ${l.text}`));

  // ── 2. Try clicking on first product to see seller profile ────────────────
  if (productLinks.length > 0) {
    console.log("\n=== Clicking first product ===");
    apiCalls.length = 0;
    await page.goto(productLinks[0].href, { waitUntil: "networkidle", timeout: 20000 });
    await sleep(3000);

    console.log("Product page URL:", page.url());
    const prodText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log("Product page text:", prodText.slice(0, 500));

    // API calls on product page
    console.log(`\nAPI calls on product page: ${apiCalls.length}`);
    for (const c of apiCalls.slice(0, 5)) {
      console.log(`  ${c.url}`);
      console.log(`    ${JSON.stringify(c.body).slice(0, 200)}`);
    }

    // Look for seller info on product page
    const sellerInfo = await page.$$eval("[class*='seller'], [class*='vendor'], [class*='organization'], [class*='company']", els =>
      els.map(e => ({ cls: e.className?.slice(0,60), text: e.innerText?.trim().slice(0, 100) }))
    );
    console.log("\nSeller elements on product page:", sellerInfo.slice(0, 10));
  }

  // ── 3. Try category-based search ─────────────────────────────────────────
  console.log("\n=== Category search: fogging machine category ===");
  apiCalls.length = 0;
  await page.goto("https://mkp.gem.gov.in/search?q=fogging+machine&category=home_fa68031381_agri_disp_fogg", {
    waitUntil: "networkidle", timeout: 20000
  });
  await sleep(4000);

  const catText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("Category search text:", catText.slice(0, 600));

  // ── 4. Check search results count ────────────────────────────────────────
  console.log("\n=== Checking search result counts ===");
  const queries = [
    "fogging machine",
    "thermal fogger",
    "foggers india",
    "global pest solutions",
    "parth enterprise",
  ];
  for (const q of queries) {
    apiCalls.length = 0;
    await page.goto(`https://mkp.gem.gov.in/search?q=${encodeURIComponent(q)}`, {
      waitUntil: "networkidle", timeout: 15000
    });
    await sleep(3000);
    const txt = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for result count
      const m = text.match(/(\d+)\s*(results?|items?|products?|found)/i);
      return { count: m ? m[0] : "(no count found)", first500: text.slice(0, 300) };
    });
    console.log(`\n  Query: "${q}"`);
    console.log(`  Result count: ${txt.count}`);
    console.log(`  Page text: ${txt.first500.slice(0, 200)}`);

    // API calls
    if (apiCalls.length > 0) {
      console.log(`  API calls: ${apiCalls.length}`);
      for (const c of apiCalls.slice(0, 3)) {
        console.log(`    ${c.url}`);
        console.log(`    ${JSON.stringify(c.body).slice(0, 150)}`);
      }
    }
  }

  // ── 5. Full page HTML dump for "fogging machine" search ──────────────────
  await page.goto("https://mkp.gem.gov.in/search?q=fogging+machine", {
    waitUntil: "networkidle", timeout: 20000
  });
  await sleep(5000);
  const html = await page.content();
  fs.writeFileSync("audit/mkp-fogging-search.html", html);
  console.log("\nDumped mkp.gem.gov.in search HTML to audit/mkp-fogging-search.html");
  console.log("HTML size:", html.length, "bytes");

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
