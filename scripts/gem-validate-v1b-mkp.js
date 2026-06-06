"use strict";
// Probe mkp.gem.gov.in (marketplace) for seller profile accessibility
// Intercept network calls to find actual API endpoints used to load seller data

const { chromium } = require("playwright");
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
    if (ct.includes("json") || url.includes("/api/") || url.includes(".json")) {
      const body = await resp.json().catch(() => null);
      apiCalls.push({ url, status: resp.status(), body: body ? JSON.stringify(body).slice(0, 300) : null });
    }
  });

  const page = await context.newPage();

  // ── 1. Marketplace home ───────────────────────────────────────────────────
  console.log("=== 1. mkp.gem.gov.in ===");
  try {
    await page.goto("https://mkp.gem.gov.in", { waitUntil: "networkidle", timeout: 20000 });
    console.log("  URL:", page.url());
    const title = await page.title();
    console.log("  Title:", title);

    // Look for search
    const inputs = await page.$$eval("input", els => els.map(e => ({ id: e.id, name: e.name, ph: e.placeholder, type: e.type })));
    console.log("  Inputs:", JSON.stringify(inputs.slice(0, 5)));
  } catch(e) {
    console.log("  ERR:", e.message.slice(0, 100));
  }
  await sleep(2000);

  // ── 2. Search for fogging machine on marketplace ──────────────────────────
  console.log("\n=== 2. Marketplace product search ===");
  const searchUrls = [
    "https://mkp.gem.gov.in/search?q=fogging+machine",
    "https://mkp.gem.gov.in/search?q=foggers+india",
    "https://mkp.gem.gov.in/product/search?keyword=fogging+machine",
  ];
  for (const url of searchUrls) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
      console.log(`  ${url}`);
      console.log(`  Content: ${text.slice(0, 200)}`);
    } catch(e) {
      console.log(`  ERR ${url}: ${e.message.slice(0, 80)}`);
    }
    await sleep(2000);
  }

  // ── 3. Try direct product/seller URL patterns ─────────────────────────────
  console.log("\n=== 3. Direct seller URL patterns ===");
  const sellerUrls = [
    "https://mkp.gem.gov.in/seller/foggers-india",
    "https://mkp.gem.gov.in/vendor/list",
    "https://mkp.gem.gov.in/seller/search?q=foggers",
    "https://gem.gov.in/seller/search",
    "https://mkp.gem.gov.in/org/seller/search?q=foggers+india",
  ];
  for (const url of sellerUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const finalUrl = page.url();
      console.log(`  ${status} ${url} → ${finalUrl.slice(0, 80)}`);
    } catch(e) {
      console.log(`  ERR ${url}: ${e.message.slice(0, 80)}`);
    }
    await sleep(800);
  }

  // ── 4. Probe GeM seller dashboard / public facing URLs ───────────────────
  console.log("\n=== 4. GeM seller-facing pages ===");
  const sellerFacing = [
    "https://seller.gem.gov.in",
    "https://gem.gov.in/seller-central",
    "https://gem.gov.in/seller/dashboard",
    "https://gem.gov.in/s/search?q=foggers+india",
  ];
  for (const url of sellerFacing) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const finalUrl = page.url();
      console.log(`  ${status} ${url} → ${finalUrl.slice(0, 80)}`);
    } catch(e) {
      console.log(`  ERR ${url}: ${e.message.slice(0, 80)}`);
    }
    await sleep(800);
  }

  // ── 5. Intercept BidPlus with JS-render wait to find API calls ───────────
  console.log("\n=== 5. BidPlus page API interception ===");
  apiCalls.length = 0;
  try {
    await page.goto("https://bidplus.gem.gov.in/bidlists/getSinglePacketResultView/4779784", {
      waitUntil: "networkidle", timeout: 20000
    });
    await sleep(3000);
    console.log("  API calls intercepted during BidPlus load:");
    if (apiCalls.length === 0) console.log("  (none)");
    for (const call of apiCalls) {
      console.log(`  ${call.status} ${call.url}`);
      if (call.body) console.log(`    Body: ${call.body.slice(0, 150)}`);
    }

    // Look for seller data in the rendered page
    const sellerData = await page.$$eval("[class*='seller'], [class*='vendor'], [id*='seller'], [id*='vendor']", els =>
      els.map(e => ({ tag: e.tagName, cls: e.className?.slice(0,60), id: e.id, text: e.innerText?.trim().slice(0,100) }))
    );
    console.log("\n  Seller-related elements in BidPlus page:");
    if (sellerData.length === 0) console.log("  (none found)");
    sellerData.slice(0, 10).forEach(e => console.log(`  [${e.tag}#${e.id}.${e.cls}] ${e.text}`));

    // Check all links on the page
    const links = await page.$$eval("a", els =>
      els.filter(e => e.href && (e.href.includes("seller") || e.href.includes("vendor") || e.href.includes("profile")))
      .map(e => ({ href: e.href, text: e.innerText?.trim().slice(0,60) }))
    );
    console.log("\n  Profile-related links:");
    if (links.length === 0) console.log("  (none)");
    links.forEach(l => console.log(`  ${l.href} | ${l.text}`));

  } catch(e) {
    console.log("  ERR:", e.message.slice(0, 100));
  }

  await browser.close();
  console.log("\n=== mkp/seller probe complete ===");
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
