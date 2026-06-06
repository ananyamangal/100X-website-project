"use strict";
// VALIDATION 2: Contact enrichment yield test for top 25 dealers
// Tests: GST portal, IndiaMART, MCA21, Google/website
// Reports ACTUAL yield with evidence

const { chromium } = require("playwright");
const fs   = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n");
  for (const l of lines) { const m = l.match(/^([^=#\s][^=]*)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim(); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TOP_25 = [
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
  "A ONE CARE PEST CONTROL",
  "PRITAM SOLAR AND MULTISERVICES",
  "INDIAN PEST CONTROL COMPANY",
  "SHEORAN ENTERPRISES",
  "EVERGREEN ENTERPRISES",
]

;(async () => {
  loadEnv();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  const results = [];

  // ── TIER 1: GST Portal ────────────────────────────────────────────────────
  console.log("=== TIER 1: GST Portal Search ===\n");
  console.log("Testing URL: https://services.gst.gov.in/services/searchtp\n");

  // First probe the GST search endpoint directly
  await page.goto("https://services.gst.gov.in/services/searchtp", {
    waitUntil: "networkidle", timeout: 15000
  }).catch(() => {});
  await sleep(2000);
  const gstHomeText = await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => "");
  console.log("GST portal homepage text:", gstHomeText.slice(0, 200));

  // Check inputs
  const gstInputs = await page.$$eval("input, select", els =>
    els.map(e => ({ id: e.id, name: e.name, type: e.type, ph: e.placeholder }))
  ).catch(() => []);
  console.log("GST inputs:", JSON.stringify(gstInputs.slice(0, 10)));

  // Test GST API endpoint directly (JSON)
  console.log("\nTesting GST API directly...");
  const gstApiTests = [
    "https://services.gst.gov.in/services/searchtp?action=searchByName&taxpayerName=foggers+india",
    "https://services.gst.gov.in/services/api/searchbypan",
    "https://services.gst.gov.in/services/auth/api/search/taxpayer?gstin=",
    "https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=27AAGCV3958P1ZJ",
  ];
  for (const url of gstApiTests) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const status = resp?.status();
      const ct = resp?.headers()["content-type"] || "";
      const text = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => "");
      console.log(`${status} [${ct.slice(0,25)}] ${url.slice(0,80)}`);
      console.log(`  ${text.slice(0, 120)}`);
    } catch(e) {
      console.log(`ERR ${url.slice(0,80)}: ${e.message.slice(0, 60)}`);
    }
    await sleep(800);
  }

  // ── TIER 2: IndiaMART ─────────────────────────────────────────────────────
  console.log("\n=== TIER 2: IndiaMART Search — Testing 5 dealers ===\n");

  const testBatch = TOP_25.slice(0, 5); // test first 5 to validate
  for (const dealer of testBatch) {
    const record = { dealer, gst: null, phone: null, email: null, website: null, city: null, state: null, source: [] };

    const query = encodeURIComponent(dealer.toLowerCase().replace(/private limited|pvt ltd|limited/gi, "").trim());
    const imUrl = `https://www.indiamart.com/search.mp?ss=${query}`;

    try {
      await page.goto(imUrl, { waitUntil: "networkidle", timeout: 20000 });
      await sleep(3000);

      const text = await page.evaluate(() => document.body.innerText);

      // Extract phone numbers
      const phones = text.match(/(?:\+91[-\s]?)?(?:0)?[6-9]\d{9}/g) || [];
      // Extract emails
      const emails = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
      // Extract websites
      const websites = text.match(/(?:www\.|https?:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/g) || [];

      // Check if company name appears in results
      const dealerWords = dealer.replace(/private limited|pvt ltd|limited|enterprise|corporation/gi, "").trim().split(" ").filter(w => w.length > 3);
      const firstSignificantWord = dealerWords[0];
      const nameFound = firstSignificantWord && text.toLowerCase().includes(firstSignificantWord.toLowerCase());

      // Get company result snippets
      const snippets = text.slice(0, 2000).split("\n").filter(l => l.trim().length > 10).slice(0, 10);

      record.phone = phones.length ? phones[0] : null;
      record.email = emails.filter(e => !e.includes("indiamart")).length ? emails.filter(e => !e.includes("indiamart"))[0] : null;
      record.website = websites.filter(w => !w.includes("indiamart")).length ? websites.filter(w => !w.includes("indiamart"))[0] : null;
      if (nameFound) record.source.push("indiamart");

      console.log(`${dealer}`);
      console.log(`  URL: ${imUrl.slice(0, 80)}`);
      console.log(`  Name found in results: ${nameFound}`);
      console.log(`  Phones: ${phones.slice(0, 3).join(", ") || "none"}`);
      console.log(`  Emails: ${emails.filter(e => !e.includes("indiamart")).slice(0, 2).join(", ") || "none"}`);
      console.log(`  Websites: ${websites.filter(w => !w.includes("indiamart")).slice(0, 2).join(", ") || "none"}`);
      console.log(`  Page snippet: ${snippets.slice(0, 3).join(" | ")}`);
      console.log("");

    } catch(e) {
      console.log(`${dealer}: ERR ${e.message.slice(0, 80)}\n`);
    }
    results.push(record);
    await sleep(2000);
  }

  // ── TIER 2b: IndiaMART direct company search ──────────────────────────────
  console.log("=== TIER 2b: IndiaMART direct company name URL patterns ===\n");
  // IndiaMART also has direct company pages: indiamart.com/company-name/
  const imDirectTests = [
    "https://www.indiamart.com/foggers-india/",
    "https://www.indiamart.com/foggersindia/",
    "https://www.indiamart.com/global-pest-solutions/",
    "https://www.indiamart.com/globalpestsolutions/",
    "https://www.indiamart.com/parth-enterprise/",
    "https://www.indiamart.com/parthenterprise/",
  ];
  for (const url of imDirectTests) {
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      const status = resp?.status();
      const finalUrl = page.url();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 800)).catch(() => "");

      const phones = text.match(/(?:\+91[-\s]?)?(?:0)?[6-9]\d{9}/g) || [];
      const emails = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];

      console.log(`${status} ${url}`);
      console.log(`  Final URL: ${finalUrl.slice(0, 80)}`);
      console.log(`  Phones: ${phones.slice(0, 2).join(", ") || "none"}`);
      console.log(`  Emails: ${emails.filter(e => !e.includes("indiamart")).slice(0, 2).join(", ") || "none"}`);
      console.log(`  Text: ${text.slice(0, 150)}`);
      console.log("");
    } catch(e) {
      console.log(`ERR ${url}: ${e.message.slice(0, 80)}\n`);
    }
    await sleep(1500);
  }

  // ── TIER 3: MCA lookup for Pvt Ltd companies ──────────────────────────────
  console.log("=== TIER 3: MCA21 Company Search ===\n");
  const pvtLtdDealers = TOP_25.filter(d => d.includes("PRIVATE LIMITED") || d.includes("LIMITED")).slice(0, 5);
  console.log("Testing Pvt Ltd dealers:", pvtLtdDealers);

  const mcaUrls = [
    "https://efiling.mca.gov.in/efs/efiling/companyLLPSearch",
    "https://www.mca.gov.in/content/mca/global/en/data-and-reports/companies-registered-in-india.html",
    "https://data.gov.in/resource/company-registration-data",
    "https://api.data.gov.in/resource/44e3fb9a-8e24-4d96-83ea-7eb9a1a8af15?api-key=579b464db66ec23bdd0000016843ab27b4e4af4f7a1e6d3e7f4fe07",
  ];

  for (const url of mcaUrls) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = resp?.status();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => "");
      console.log(`${status} ${url.slice(0, 80)}`);
      console.log(`  ${text.slice(0, 150)}`);
    } catch(e) {
      console.log(`ERR ${url.slice(0, 80)}: ${e.message.slice(0, 60)}`);
    }
    await sleep(1000);
  }

  // Test MCA search for a specific company
  console.log("\nMCA efiling search attempt:");
  try {
    await page.goto("https://efiling.mca.gov.in/efs/efiling/companyLLPSearch", {
      waitUntil: "networkidle", timeout: 15000
    });
    await sleep(2000);
    const mcaText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    const mcaInputs = await page.$$eval("input, select", els =>
      els.map(e => ({ id: e.id, name: e.name, type: e.type, ph: e.placeholder }))
    );
    console.log("MCA page text:", mcaText.slice(0, 200));
    console.log("MCA inputs:", JSON.stringify(mcaInputs.slice(0, 5)));
  } catch(e) {
    console.log("MCA search ERR:", e.message.slice(0, 80));
  }

  // ── TIER 4: Google search for website/contact ─────────────────────────────
  console.log("\n=== TIER 4: Google Search for dealer websites ===\n");
  const googleTests = TOP_25.slice(0, 5);
  for (const dealer of googleTests) {
    const query = encodeURIComponent(`"${dealer}" site:indiamart.com OR site:justdial.com OR contact`);
    const googleUrl = `https://www.google.com/search?q=${query}`;
    try {
      await page.goto(googleUrl, { waitUntil: "networkidle", timeout: 15000 });
      await sleep(2000);
      const text = await page.evaluate(() => {
        // Get search result snippets
        const results = document.querySelectorAll("div.g, div[data-sokoban-container], .yuRUbf");
        const snippets = [];
        results.forEach(r => snippets.push(r.innerText?.trim().slice(0, 150)));
        return snippets.slice(0, 3).join("\n---\n");
      }).catch(() => "");
      const title = await page.title();
      console.log(`${dealer}`);
      console.log(`  Title: ${title.slice(0, 60)}`);
      console.log(`  Snippets:\n${text.slice(0, 400)}`);
      console.log("");
    } catch(e) {
      console.log(`${dealer}: ERR ${e.message.slice(0, 80)}\n`);
    }
    await sleep(3000); // Google rate limiting
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  console.log("\n=== ENRICHMENT YIELD SUMMARY (5-dealer pilot) ===");
  console.log("────────────────────────────────────────────────────────");
  const found = { phone: 0, email: 0, website: 0, name_match: 0 };
  results.forEach(r => {
    if (r.phone) found.phone++;
    if (r.email) found.email++;
    if (r.website) found.website++;
    if (r.source.length) found.name_match++;
  });
  console.log(`Total tested: ${results.length}`);
  console.log(`Phone found: ${found.phone}/${results.length} (${Math.round(found.phone/results.length*100)}%)`);
  console.log(`Email found: ${found.email}/${results.length} (${Math.round(found.email/results.length*100)}%)`);
  console.log(`Website found: ${found.website}/${results.length} (${Math.round(found.website/results.length*100)}%)`);
  console.log(`Name matched in results: ${found.name_match}/${results.length} (${Math.round(found.name_match/results.length*100)}%)`);

  const outFile = "audit/enrichment-validation.json";
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outFile}`);

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
