"use strict";
// Find fogging/mosquito-related categories in the View Contracts dropdown
const { chromium } = require("playwright")

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()
  await page.goto("https://gem.gov.in/view_contracts", { waitUntil: "networkidle", timeout: 40000 })

  const allOpts = await page.$$eval("select#buyer_category option", opts =>
    opts.map(o => ({ val: o.value, txt: o.text.trim() }))
  )
  console.log(`Total categories: ${allOpts.length}`)

  const TERMS = ["fog", "mosquito", "vector", "pest", "sanit", "hygiene", "spray", "disinfect", "ULV", "thermal", "mist", "haze", "smoke", "insect", "larvi"]
  for (const term of TERMS) {
    const matches = allOpts.filter(o => o.txt.toLowerCase().includes(term.toLowerCase()))
    if (matches.length) {
      console.log(`\n=== "${term}" (${matches.length} matches) ===`)
      matches.forEach(m => console.log(`  val="${m.val}"  txt="${m.txt}"`))
    }
  }
  await browser.close()
})().catch(e => { console.error(e.message); process.exit(1) })
