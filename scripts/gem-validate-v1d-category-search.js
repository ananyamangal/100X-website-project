"use strict";
// Probe mkp.gem.gov.in category-slug search and gem_seller_id landing page
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
    const ct = resp.headers()["content-type"] || "";
    if (ct.includes("json")) {
      const body = await resp.json().catch(() => null);
      if (body) apiCalls.push({ url: resp.url(), body });
    }
  });
  const page = await context.newPage();

  // ── 1. gem.gov.in/landing/gem_seller_id/ ─────────────────────────────────
  console.log("=== 1. gem_seller_id landing page ===");
  apiCalls.length = 0;
  await page.goto("https://gem.gov.in/landing/gem_seller_id/", { waitUntil: "networkidle", timeout: 20000 });
  await sleep(3000);
  const sellerLandText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  console.log("URL:", page.url());
  console.log("Text:", sellerLandText);
  // Check for form/search input
  const sellerInputs = await page.$$eval("input, select", els =>
    els.map(e => ({ id: e.id, name: e.name, type: e.type, ph: e.placeholder }))
  );
  console.log("Inputs:", JSON.stringify(sellerInputs));
  // API calls
  for (const c of apiCalls) {
    console.log("  API:", c.url, "→", JSON.stringify(c.body).slice(0,200));
  }

  // ── 2. Category-slug-based search URLs ───────────────────────────────────
  console.log("\n=== 2. Category slug search ===");
  const categoryUrls = [
    "https://mkp.gem.gov.in/fogging-machine-v2-as-per-is-14855-part-1-/search",
    "https://mkp.gem.gov.in/fogging-machine/search",
    "https://mkp.gem.gov.in/fog-or-mist-generators/search",
    "https://mkp.gem.gov.in/thermal-fogger/search",
    "https://mkp.gem.gov.in/ulv-fogger/search",
  ];
  for (const url of categoryUrls) {
    apiCalls.length = 0;
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await sleep(4000);
      const status = resp?.status();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
      console.log(`\n${status} ${url}`);
      console.log("Content:", text.slice(0, 400));

      // API calls
      if (apiCalls.length > 0) {
        console.log(`API calls (${apiCalls.length}):`);
        for (const c of apiCalls.slice(0,5)) {
          console.log("  ", c.url);
          console.log("    Body:", JSON.stringify(c.body).slice(0,200));
        }
      }

      // Product/seller names visible?
      const sellerEls = await page.$$eval("[class*='seller'], [class*='vendor'], [class*='brand'], [class*='company']", els =>
        els.map(e => e.innerText?.trim().slice(0,80)).filter(Boolean)
      );
      if (sellerEls.length) console.log("Seller elements:", sellerEls);

    } catch(e) {
      console.log(`ERR ${url}: ${e.message.slice(0,80)}`);
    }
    await sleep(1500);
  }

  // ── 3. Try the internal mkp API endpoints by intercepting page load ───────
  console.log("\n=== 3. Internal mkp API calls during category search ===");
  apiCalls.length = 0;

  // Monitor ALL responses, not just JSON
  const allResponses = [];
  const respListener = resp => {
    const url = resp.url();
    const ct = resp.headers()["content-type"] || "";
    if (!url.includes("google") && !url.includes("font") && !url.includes(".png") && !url.includes(".jpg") && !url.includes(".css")) {
      allResponses.push({ url, status: resp.status(), ct: ct.slice(0,30) });
    }
  };
  context.on("response", respListener);

  await page.goto("https://mkp.gem.gov.in/fogging-machine-v2-as-per-is-14855-part-1-/search", {
    waitUntil: "networkidle", timeout: 20000
  });
  await sleep(6000);

  console.log(`All non-asset responses (${allResponses.length}):`);
  for (const r of allResponses) {
    console.log(`  ${r.status} [${r.ct}] ${r.url.slice(0,120)}`);
  }

  // Dump HTML
  const html = await page.content();
  fs.writeFileSync("audit/mkp-category-fogging.html", html);
  console.log("\nDumped to audit/mkp-category-fogging.html, size:", html.length);

  // ── 4. GeM seller details API ─────────────────────────────────────────────
  console.log("\n=== 4. GeM seller details landing page with input ===");
  await page.goto("https://gem.gov.in/landing/gem_seller_id/", { waitUntil: "networkidle", timeout: 15000 });
  await sleep(2000);
  const landingHtml = await page.content();
  fs.writeFileSync("audit/gem-seller-landing.html", landingHtml);
  console.log("Dumped to audit/gem-seller-landing.html, size:", landingHtml.length);

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
