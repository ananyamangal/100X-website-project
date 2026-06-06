"use strict";
// One-shot page inspector for gem.gov.in/view_contracts
const { chromium } = require("playwright")

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()

  // Intercept all JSON responses
  const apiHits = []
  page.on("response", async res => {
    const ct = res.headers()["content-type"] || ""
    if (ct.includes("json")) {
      const body = await res.json().catch(() => null)
      if (body) apiHits.push({ url: res.url(), status: res.status(), body })
    }
  })

  console.log("Fetching gem.gov.in/view_contracts …")
  await page.goto("https://gem.gov.in/view_contracts", {
    waitUntil: "networkidle",
    timeout:   40000,
  })

  const title = await page.title()
  console.log("Title:", title)
  console.log("URL:  ", page.url())

  // All <select> elements
  const selects = await page.$$eval("select", els =>
    els.map(e => ({
      id:   e.id,
      name: e.name,
      opts: Array.from(e.options)
        .map(o => ({ val: o.value, txt: o.text.trim() }))
        .slice(0, 50),
    }))
  )
  console.log("\n=== SELECT ELEMENTS ===")
  console.log(JSON.stringify(selects, null, 2))

  // All <input> elements
  const inputs = await page.$$eval("input", els =>
    els.map(e => ({
      id:          e.id,
      name:        e.name,
      type:        e.type,
      placeholder: e.placeholder,
      value:       e.value,
    }))
  )
  console.log("\n=== INPUT ELEMENTS ===")
  console.log(JSON.stringify(inputs, null, 2))

  // All <button> / <a> that look like search/submit
  const btns = await page.$$eval("button,input[type=submit],[role=button]", els =>
    els.map(e => ({ tag: e.tagName, text: e.innerText?.trim(), id: e.id, cls: e.className?.slice(0, 60) }))
  )
  console.log("\n=== BUTTONS ===")
  console.log(JSON.stringify(btns, null, 2))

  // Any img elements (captcha image)
  const imgs = await page.$$eval("img", els =>
    els.map(e => ({ src: e.src?.slice(0, 100), alt: e.alt, id: e.id, cls: e.className?.slice(0, 60) }))
  )
  console.log("\n=== IMAGES ===")
  console.log(JSON.stringify(imgs, null, 2))

  // API calls made on load
  console.log("\n=== API CALLS ON LOAD ===")
  for (const hit of apiHits) {
    const bodyStr = JSON.stringify(hit.body).slice(0, 200)
    console.log(`${hit.status} ${hit.url}\n  ${bodyStr}`)
  }

  await browser.close()
})().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
