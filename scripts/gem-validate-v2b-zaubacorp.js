"use strict";
// Test Zaubacorp for company registry data on top 25 dealers
// Zaubacorp = public MCA company database, accessible without login
const { chromium } = require("playwright");
const fs = require("fs");
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Top 20 dealers to test
const DEALERS = [
  { name: "CENTRAL WAREHOUSING CORPORATION",            slug: "central-warehousing-corporation" },
  { name: "VVDN TECHNOLOGIES PRIVATE LIMITED",          slug: "vvdn-technologies-private-limited" },
  { name: "FOGGERS INDIA PRIVATE LIMITED",              slug: "foggers-india-private-limited" },
  { name: "PARTH ENTERPRISE",                           slug: "parth-enterprise" },
  { name: "AKAM ENTERPRISES",                           slug: "akam-enterprises" },
  { name: "ROYAL TRADELINKS PRIVATE LIMITED",           slug: "royal-tradelinks-private-limited" },
  { name: "APPLIED REALTECH SYSTEMS PRIVATE LIMITED",   slug: "applied-realtech-systems-private-limited" },
  { name: "GLOBAL PEST SOLUTIONS",                      slug: "global-pest-solutions" },
  { name: "VIGHNHARTA CORPORATION",                     slug: "vighnharta-corporation" },
  { name: "MATRISH SHIP MANAGEMENT PRIVATE LIMITED",    slug: "matrish-ship-management-private-limited" },
  { name: "TEMPSENS INSTRUMENTS (INDIA) PRIVATE LIMITED", slug: "tempsens-instruments-india-private-limited" },
  { name: "AGMATEL INDIA PRIVATE LIMITED",              slug: "agmatel-india-private-limited" },
  { name: "ENTUPLE TECHNOLOGIES PRIVATE LIMITED",       slug: "entuple-technologies-private-limited" },
  { name: "CONVERGENT TECHNOLOGIES INDIA PRIVATE LIMITED", slug: "convergent-technologies-india-private-limited" },
  { name: "BIO SOLUTION PEST CONTROL SERVICE PRIVATE LIMITED", slug: "bio-solution-pest-control-service-private-limited" },
]

;(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  const results = [];

  console.log("=== ZAUBACORP: Search by company name ===\n");

  for (const d of DEALERS) {
    const searchUrl = `https://www.zaubacorp.com/company-list/p-1/q-${encodeURIComponent(d.name.replace(/\s+/g, "+"))}`;
    const record = { dealer: d.name, found: false, cin: null, city: null, state: null, address: null, directors: null, status: null, incorporatedYear: null };

    try {
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 20000 });
      await sleep(2000);

      const text = await page.evaluate(() => document.body.innerText);

      // Check if any result matches
      const isBlocked = text.includes("Access denied") || text.includes("Cloudflare") || text.includes("challenge");
      if (isBlocked) {
        console.log(`${d.name}: BLOCKED`);
        record.found = false;
        results.push(record);
        continue;
      }

      // Look for company result links
      const companyLinks = await page.$$eval("a[href*='/company/']", els =>
        els.map(e => ({ href: e.href, text: e.innerText?.trim().slice(0, 100) }))
           .filter(e => e.text.length > 3)
      ).catch(() => []);

      if (companyLinks.length > 0) {
        console.log(`${d.name}: ${companyLinks.length} results`);
        companyLinks.slice(0, 3).forEach(l => console.log(`  → ${l.text} | ${l.href.slice(0, 80)}`));

        // Try to click the first result that best matches
        const bestMatch = companyLinks.find(l => {
          const words = d.name.split(" ").filter(w => w.length > 3 && !["PRIVATE", "LIMITED", "PVT"].includes(w));
          return words.some(w => l.text.toUpperCase().includes(w));
        }) || companyLinks[0];

        if (bestMatch) {
          await page.goto(bestMatch.href, { waitUntil: "networkidle", timeout: 15000 });
          await sleep(2000);
          const detailText = await page.evaluate(() => document.body.innerText.slice(0, 2000));

          // Extract CIN
          const cinMatch = detailText.match(/[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/);
          // Extract incorporation year
          const yearMatch = detailText.match(/(?:incorporated|registration date)[^0-9]*(\d{4})/i);
          // Extract address
          const addrMatch = detailText.match(/(?:registered address|address)[:\s]+([^\\n]{20,100})/i);
          // Extract status
          const statusMatch = detailText.match(/(?:company status)[:\s]+(\w[\w\s]+)/i);
          // Directors
          const dirMatch = detailText.match(/director[s]?\s*:\s*([^\\n]{10,200})/i);

          record.found = true;
          record.cin = cinMatch ? cinMatch[0] : null;
          record.incorporatedYear = yearMatch ? yearMatch[1] : null;
          record.address = addrMatch ? addrMatch[1].trim().slice(0, 100) : null;
          record.status = statusMatch ? statusMatch[1].trim() : null;
          record.directors = dirMatch ? dirMatch[1].trim().slice(0, 100) : null;
          record.profileUrl = bestMatch.href;

          // Try to get city/state from address
          const cityStateMatch = detailText.match(/(\w[\w\s]+),\s*([A-Z][a-z]+)\s*-\s*\d{6}/);
          if (cityStateMatch) {
            record.city = cityStateMatch[1].trim();
            record.state = cityStateMatch[2].trim();
          }

          console.log(`  ✓ FOUND: CIN=${record.cin} | Year=${record.incorporatedYear} | Status=${record.status}`);
          console.log(`    Address: ${record.address}`);
          console.log(`    Detail page: ${bestMatch.href.slice(0, 80)}`);
          console.log(`    Full text snippet: ${detailText.slice(0, 300)}`);
        }
      } else {
        console.log(`${d.name}: 0 results on Zaubacorp`);
        console.log(`  Page text: ${text.slice(0, 150)}`);
      }

    } catch(e) {
      console.log(`${d.name}: ERR ${e.message.slice(0, 80)}`);
    }

    results.push(record);
    await sleep(2000);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== ZAUBACORP YIELD SUMMARY ===");
  const found = results.filter(r => r.found);
  const withCin = results.filter(r => r.cin);
  const withCity = results.filter(r => r.city);
  const withStatus = results.filter(r => r.status);
  console.log(`Total tested: ${results.length}`);
  console.log(`Found on Zaubacorp: ${found.length}/${results.length} (${Math.round(found.length/results.length*100)}%)`);
  console.log(`CIN obtained: ${withCin.length}/${results.length} (${Math.round(withCin.length/results.length*100)}%)`);
  console.log(`City/state obtained: ${withCity.length}/${results.length} (${Math.round(withCity.length/results.length*100)}%)`);
  console.log(`Status obtained: ${withStatus.length}/${results.length} (${Math.round(withStatus.length/results.length*100)}%)`);

  // Note: Proprietorships/partnerships won't be on MCA/Zaubacorp
  const pvtLtd = results.filter(r => r.dealer.includes("PRIVATE LIMITED") || r.dealer.includes("LIMITED"));
  const nonPvt = results.filter(r => !r.dealer.includes("PRIVATE LIMITED") && !r.dealer.includes("LIMITED"));
  console.log(`\n  Pvt Ltd in sample: ${pvtLtd.length} (expected to be on MCA)`);
  console.log(`  Non-Pvt Ltd in sample: ${nonPvt.length} (NOT on MCA — proprietorships/firms)`);
  console.log(`  Pvt Ltd found: ${pvtLtd.filter(r => r.found).length}/${pvtLtd.length}`);

  fs.writeFileSync("audit/zaubacorp-validation.json", JSON.stringify(results, null, 2));
  console.log("\nSaved to audit/zaubacorp-validation.json");

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
