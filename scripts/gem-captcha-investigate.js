#!/usr/bin/env node
/**
 * gem-captcha-investigate.js
 *
 * Dedicated investigation of the GeM view_contracts search captcha.
 * Objectives:
 *   1. Capture ALL network requests during captcha load / refresh
 *   2. Check captcha.php endpoint and response payload
 *   3. Scan DOM, JS globals, localStorage, sessionStorage for plaintext answer
 *   4. Probe server-side validation (submit with wrong/empty captcha)
 *   5. Attempt full automation and confirm / deny feasibility
 *
 * Run:
 *   node scripts/gem-captcha-investigate.js
 *
 * Output:
 *   - Console report with all findings
 *   - audit/captcha-investigation-YYYY-MM-DD.json  (raw evidence)
 *   - audit/captcha-investigation-YYYY-MM-DD.txt   (human report)
 */

;(function loadEnv() {
  const fs = require("fs"), path = require("path")
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const fs   = require("fs")
const path = require("path")
const { chromium } = require("playwright")

fs.mkdirSync("audit", { recursive: true })

const GEM_URL  = "https://gem.gov.in/view_contracts"
const CAP_URL  = "https://gem.gov.in/assets/phpcaptcha/captcha.php"
const SBT_URL  = "https://gem.gov.in/view_contracts/sbtCaptcha"

const evidence = {
  timestamp:           new Date().toISOString(),
  captcha_endpoint:    null,
  captcha_response:    null,
  plaintext_in_response: false,
  dom_fields:          {},
  js_globals:          {},
  local_storage:       {},
  session_storage:     {},
  network_requests:    [],
  validation_test:     null,
  auto_solve_attempt:  null,
  conclusion:          null,
}

function log(msg) { process.stdout.write(msg + "\n") }
function sep(s)   { log("\n" + "─".repeat(70) + "\n  " + s + "\n" + "─".repeat(70)) }

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  })
  const page = await context.newPage()

  // ── Phase 1: intercept ALL network traffic ────────────────────────────────
  sep("PHASE 1 — Network Traffic Capture")

  const intercepted = []
  page.on("request", req => {
    intercepted.push({
      url:    req.url(),
      method: req.method(),
      type:   req.resourceType(),
      headers: req.headers(),
      postData: req.postData() || null,
      timestamp: Date.now(),
    })
  })

  const responses = {}
  page.on("response", async res => {
    const url = res.url()
    if (/captcha|sbt|search|contract/i.test(url)) {
      try {
        const body = await res.text().catch(() => "(binary)")
        responses[url] = {
          status:  res.status(),
          headers: res.headers(),
          body:    body.slice(0, 2000),
        }
        log(`  RESPONSE [${res.status()}] ${url.slice(0, 90)}`)
        if (body.length < 500) log(`    body: ${body.trim()}`)
      } catch {}
    }
  })

  log("  Navigating to " + GEM_URL)
  await page.goto(GEM_URL, { waitUntil: "networkidle", timeout: 45000 })
  await page.waitForTimeout(3000)

  // Filter captured requests for captcha-related
  const capRequests = intercepted.filter(r =>
    /captcha|sbt|image|img\.php/i.test(r.url)
  )
  evidence.network_requests = capRequests

  log("\n  Captcha-related requests captured: " + capRequests.length)
  capRequests.forEach((r, i) => {
    log(`  [${i+1}] ${r.method} ${r.url.slice(0, 100)}`)
    if (r.postData) log(`       POST: ${r.postData.slice(0, 200)}`)
  })

  // ── Phase 2: Check captcha.php endpoint directly ──────────────────────────
  sep("PHASE 2 — Captcha Endpoint Analysis")

  // Try fetching captcha.php from Node.js (no browser context)
  log("  Trying captcha.php from APIRequest context (browser session)…")
  try {
    const r1 = await context.request.get(CAP_URL, {
      timeout: 15000,
      headers: { referer: GEM_URL },
    })
    const body1 = await r1.text().catch(() => "(binary)")
    log(`  captcha.php status : ${r1.status()}`)
    log(`  captcha.php body   : ${JSON.stringify(body1.trim().slice(0, 300))}`)
    evidence.captcha_endpoint = CAP_URL
    evidence.captcha_response = { status: r1.status(), body: body1.trim().slice(0, 500) }
    evidence.plaintext_in_response = /^[a-zA-Z0-9]{3,8}$/.test(body1.trim())
    log(`  Plaintext answer?  : ${evidence.plaintext_in_response}`)
  } catch (e) {
    log("  captcha.php request failed: " + e.message)
  }

  // Also try alternate captcha paths seen in GeM codebase
  const altEndpoints = [
    "https://gem.gov.in/assets/phpcaptcha/captcha.php?width=220&height=60&characters=5&code=",
    "https://gem.gov.in/view_contracts/generateCaptcha",
    "https://gem.gov.in/generateCaptcha",
    "https://gem.gov.in/captcha",
  ]
  for (const ep of altEndpoints) {
    try {
      const r = await context.request.get(ep, { timeout: 8000, headers: { referer: GEM_URL } })
      const body = await r.text().catch(() => "(binary or image)")
      log(`  [alt] ${ep.slice(0, 70)} → ${r.status()} : ${body.trim().slice(0, 100)}`)
    } catch { /* skip */ }
  }

  // ── Phase 3: DOM investigation ────────────────────────────────────────────
  sep("PHASE 3 — DOM / JS / Storage Investigation")

  const domState = await page.evaluate(() => {
    // 1. All input fields with captcha-related names/IDs
    const inputs = {}
    document.querySelectorAll("input, select, textarea").forEach(el => {
      const key = el.name || el.id || el.className
      if (key) inputs[key] = { type: el.type, value: el.value, id: el.id, name: el.name }
    })

    // 2. Hidden fields that might carry the captcha answer
    const hidden = {}
    document.querySelectorAll("input[type=hidden]").forEach(el => {
      hidden[el.id || el.name || "?"] = el.value
    })

    // 3. JS globals that might hold the captcha
    const globals = {}
    const captchaKeys = Object.keys(window).filter(k =>
      /captcha|cap_|cap_val|answer|imgcode|capcode|verif/i.test(k)
    )
    captchaKeys.forEach(k => {
      try { globals[k] = String(window[k]).slice(0, 200) } catch {}
    })

    // 4. window.capValue or similar patterns used by GeM
    const capVars = {
      capValue:       typeof window.capValue       !== "undefined" ? window.capValue       : null,
      captchaVal:     typeof window.captchaVal     !== "undefined" ? window.captchaVal     : null,
      captchaValue:   typeof window.captchaValue   !== "undefined" ? window.captchaValue   : null,
      cap:            typeof window.cap            !== "undefined" ? window.cap            : null,
      imgCode:        typeof window.imgCode        !== "undefined" ? window.imgCode        : null,
      captcha_answer: typeof window.captcha_answer !== "undefined" ? window.captcha_answer : null,
      sitekey:        typeof window.sitekey        !== "undefined" ? window.sitekey        : null,
      _captcha:       typeof window._captcha       !== "undefined" ? window._captcha       : null,
    }

    // 5. localStorage and sessionStorage
    const ls = {}, ss = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      ls[k] = localStorage.getItem(k)
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      ss[k] = sessionStorage.getItem(k)
    }

    // 6. Inline scripts that set captcha values
    const scripts = []
    document.querySelectorAll("script:not([src])").forEach(s => {
      const txt = s.innerText || ""
      if (/captcha|cap_val|imgcode|capcode/i.test(txt)) {
        scripts.push(txt.slice(0, 500))
      }
    })

    // 7. Captcha image src (often has token)
    const capImgSrc = document.querySelector("img#captcha_img, img[src*='captcha'], img[id*='captcha']")?.src || null

    // 8. The captcha input field name/id
    const capInput = document.querySelector("input#captchaimg1, input[name*='captcha'], input[placeholder*='captcha' i]")
    const capInputInfo = capInput ? { id: capInput.id, name: capInput.name, placeholder: capInput.placeholder } : null

    return { inputs, hidden, globals, capVars, localStorage: ls, sessionStorage: ss, scripts, capImgSrc, capInputInfo }
  })

  evidence.dom_fields    = domState.hidden
  evidence.js_globals    = { ...domState.capVars, ...domState.globals }
  evidence.local_storage = domState.localStorage
  evidence.session_storage = domState.sessionStorage

  log("\n  Hidden fields:")
  Object.entries(domState.hidden).forEach(([k, v]) => log(`    [${k}] = ${String(v).slice(0, 100)}`))

  log("\n  Captcha-related JS globals:")
  const nonNull = Object.entries(domState.capVars).filter(([, v]) => v !== null)
  if (nonNull.length === 0) log("    (none found)")
  else nonNull.forEach(([k, v]) => log(`    window.${k} = ${v}`))

  log("\n  Extra globals matching /captcha/i:")
  if (Object.keys(domState.globals).length === 0) log("    (none)")
  else Object.entries(domState.globals).forEach(([k, v]) => log(`    window.${k} = ${v}`))

  log("\n  Captcha image src: " + (domState.capImgSrc || "(not found)"))
  log("  Captcha input   : " + JSON.stringify(domState.capInputInfo))

  log("\n  Inline scripts referencing captcha:")
  if (domState.scripts.length === 0) log("    (none)")
  else domState.scripts.forEach((s, i) => log(`  [script ${i+1}]\n${s}`))

  log("\n  localStorage keys: " + (Object.keys(domState.localStorage).join(", ") || "(empty)"))
  log("  sessionStorage keys: " + (Object.keys(domState.sessionStorage).join(", ") || "(empty)"))

  // ── Phase 4: Examine captcha image URL for embedded token ─────────────────
  sep("PHASE 4 — Captcha Image URL Token Analysis")

  const capImgSrc = domState.capImgSrc
  log("  Captcha image src: " + (capImgSrc || "(not found)"))

  if (capImgSrc) {
    // Does the image URL contain a session key or token?
    const urlObj = new URL(capImgSrc)
    log("  Params: " + urlObj.search)
    // Fetch the image response and check content-type, headers
    try {
      const imgResp = await context.request.get(capImgSrc, { timeout: 10000 })
      log("  Image status : " + imgResp.status())
      log("  Content-type : " + imgResp.headers()["content-type"])
      const imgBody = await imgResp.text().catch(() => "(binary)")
      // If it's not a binary image, it might be a text captcha answer
      if (imgBody.trim().length < 20 && /^[a-zA-Z0-9]+$/.test(imgBody.trim())) {
        log("  IMAGE IS TEXT RESPONSE: " + imgBody.trim() + " ← PLAINTEXT ANSWER!")
        evidence.plaintext_in_response = true
        evidence.captcha_response = { from: "image_url", answer: imgBody.trim() }
      }
    } catch (e) {
      log("  Image fetch failed: " + e.message)
    }
  }

  // ── Phase 5: Fetch captcha.php directly (same as detail page) ────────────
  sep("PHASE 5 — Direct captcha.php Fetch (same endpoint as detail enrichment)")

  log("  Known working pattern from detail-page investigation:")
  log("  → GET " + CAP_URL + " returns plaintext answer")
  log()

  try {
    const r = await context.request.get(CAP_URL, {
      timeout: 12000,
      headers: { referer: GEM_URL, "X-Requested-With": "XMLHttpRequest" },
    })
    const body = await r.text().catch(() => "(binary)")
    const ct   = r.headers()["content-type"] || ""
    log("  Status       : " + r.status())
    log("  Content-Type : " + ct)
    log("  Body (raw)   : " + JSON.stringify(body.trim().slice(0, 200)))
    log("  Is plaintext : " + /^[a-zA-Z0-9]{3,8}$/.test(body.trim()))

    if (/^[a-zA-Z0-9]{3,8}$/.test(body.trim())) {
      evidence.captcha_endpoint   = CAP_URL
      evidence.captcha_response   = { body: body.trim(), content_type: ct }
      evidence.plaintext_in_response = true
      log("\n  ★ PLAINTEXT CAPTCHA ANSWER CONFIRMED: " + body.trim())
    }
  } catch (e) {
    log("  captcha.php (with referer) failed: " + e.message)
  }

  // ── Phase 6: Server-side validation test ─────────────────────────────────
  sep("PHASE 6 — Server-Side Validation Test")

  log("  Test 1: Submit search with an intentionally WRONG captcha value")
  log("  (If the server rejects it with 'invalid captcha', validation is server-side.")
  log("   If it succeeds or the error is JS-only, it may be bypassable.)")
  log()

  // Fill dates for a valid 30-day window
  const today  = new Date()
  const past30 = new Date(today); past30.setDate(past30.getDate() - 30)
  function fmtD(d) {
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  }
  const fromDate = fmtD(past30)
  const toDate   = fmtD(today)

  // Reset to fresh page
  await page.goto(GEM_URL, { waitUntil: "networkidle", timeout: 40000 })
  await page.waitForTimeout(2000)

  // Fill date fields
  for (const [sel, val] of [
    ["#from_date_contract_search1", fromDate],
    ["#to_date_contract_search1",   toDate],
  ]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val)
  }
  await page.waitForTimeout(500)

  // Fill in deliberately wrong captcha
  const wrongCaptcha = "XXXXX"
  const capInputSel  = "#captchaimg1, input[name*='captcha'], input[id*='captcha']"
  const capInputFound = await page.locator(capInputSel).first().isVisible().catch(() => false)
  log("  Captcha input visible: " + capInputFound)

  if (capInputFound) {
    await page.locator(capInputSel).first().click()
    await page.locator(capInputSel).first().fill(wrongCaptcha)
    log("  Filled captcha with: " + wrongCaptcha)
  }

  // Intercept the search POST
  const wrongSubmitRequests = []
  const wrongSubmitResponses = {}
  page.on("request", req => {
    if (/searchlocation|view_contracts/i.test(req.url())) {
      wrongSubmitRequests.push({ url: req.url(), method: req.method(), post: req.postData() })
    }
  })
  page.on("response", async res => {
    if (/view_contracts|searchlocation/i.test(res.url())) {
      const body = await res.text().catch(() => "")
      wrongSubmitResponses[res.url()] = { status: res.status(), body: body.slice(0, 1000) }
    }
  })

  // Click search
  const searchClicked = await page.click(
    "#searchlocation1, button#searchlocation1"
  ).then(() => true).catch(() => false)
  log("  Clicked search: " + searchClicked)

  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)

  // Check result
  const afterWrongText = await page.evaluate(() => document.body.innerText).catch(() => "")
  const hasInvalidMsg  = /invalid captcha|wrong captcha|incorrect captcha|please enter/i.test(afterWrongText)
  const hasResults     = /GEMC-\d{15}|pagi_content|border block/i.test(afterWrongText)
  const hasNoRecord    = /no record|no result/i.test(afterWrongText)

  log("\n  After submitting wrong captcha:")
  log("  'Invalid captcha' message : " + hasInvalidMsg)
  log("  Results appeared          : " + hasResults)
  log("  'No records' message      : " + hasNoRecord)
  log("  Validation is server-side : " + hasInvalidMsg)

  evidence.validation_test = {
    wrong_captcha_sent: wrongCaptcha,
    server_rejected: hasInvalidMsg,
    results_appeared: hasResults,
    server_side_validation: hasInvalidMsg,
    page_text_excerpt: afterWrongText.slice(0, 500),
  }

  // ── Phase 7: Full auto-solve attempt ──────────────────────────────────────
  sep("PHASE 7 — Auto-Solve Attempt")

  log("  Strategy: fetch captcha.php answer, type it, submit, check for results")
  log()

  await page.goto(GEM_URL, { waitUntil: "networkidle", timeout: 40000 })
  await page.waitForTimeout(2000)

  // Refill dates
  for (const [sel, val] of [
    ["#from_date_contract_search1", fromDate],
    ["#to_date_contract_search1",   toDate],
  ]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val)
  }
  await page.waitForTimeout(300)

  // Fetch captcha answer
  let autoAnswer = null
  try {
    const r = await context.request.get(CAP_URL, {
      timeout: 10000,
      headers: { referer: GEM_URL },
    })
    const body = await r.text().catch(() => "")
    const trimmed = body.trim()
    log("  captcha.php response: " + JSON.stringify(trimmed))
    if (/^[a-zA-Z0-9]{3,8}$/.test(trimmed)) {
      autoAnswer = trimmed
      log("  ★ Auto-answer: " + autoAnswer)
    } else {
      log("  Response is not a plaintext answer (image or JSON or error)")
      log("  Content-type: " + r.headers()["content-type"])
    }
  } catch (e) {
    log("  captcha.php failed: " + e.message)
  }

  // If we got an auto-answer, type it and submit
  let autoSolveResult = null
  if (autoAnswer) {
    const capInput2 = await page.locator(capInputSel).first().isVisible().catch(() => false)
    if (capInput2) {
      await page.locator(capInputSel).first().click()
      await page.locator(capInputSel).first().fill(autoAnswer)
      log("  Typed auto-answer into captcha field")
      await page.waitForTimeout(300)
    } else {
      log("  Captcha input not visible — attempting blind type")
      await page.keyboard.type(autoAnswer)
    }

    await page.click("#searchlocation1").catch(() => {})
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(3000)

    const afterAutoText = await page.evaluate(() => document.body.innerText).catch(() => "")
    const autoHasResults = /GEMC-\d{15}/i.test(afterAutoText)
    const autoInvalid    = /invalid captcha/i.test(afterAutoText)
    const autoNoRecord   = /no record|no result/i.test(afterAutoText)

    log("\n  Auto-solve result:")
    log("  Results appeared  : " + autoHasResults)
    log("  Invalid captcha   : " + autoInvalid)
    log("  No records msg    : " + autoNoRecord)
    log("  AUTOMATION WORKS  : " + (autoHasResults || autoNoRecord))

    autoSolveResult = {
      answer_used:     autoAnswer,
      results_appeared: autoHasResults,
      invalid_captcha: autoInvalid,
      automation_confirmed: autoHasResults || autoNoRecord,
    }
    evidence.auto_solve_attempt = autoSolveResult

    if (autoHasResults || autoNoRecord) {
      evidence.conclusion = "AUTOMATION CONFIRMED — captcha.php returns plaintext answer; server accepts it"
    } else if (autoInvalid) {
      evidence.conclusion = "AUTOMATION FAILED — server rejected auto-solved captcha (answer not matching search captcha)"
    } else {
      evidence.conclusion = "INCONCLUSIVE — unknown page state after auto-solve"
    }
  } else {
    // captcha.php didn't give plaintext — try alternate strategies
    log("  captcha.php not plaintext. Trying to find answer in page source…")

    // Check if there is a data-* attribute or hidden field with the captcha answer
    const hiddenAnswer = await page.evaluate(() => {
      // Check all data-* attributes on captcha image
      const img = document.querySelector("img#captcha_img, img[src*='captcha']")
      if (img) {
        const dataAttrs = {}
        for (const attr of img.attributes) dataAttrs[attr.name] = attr.value
        return { type: "img_attrs", data: dataAttrs }
      }
      // Check if captcha.php src has token that maps to answer in some cache
      return null
    })
    log("  Hidden answer scan: " + JSON.stringify(hiddenAnswer))

    evidence.auto_solve_attempt = { answer_found: false, reason: "captcha.php not plaintext" }
    evidence.conclusion = "INCONCLUSIVE — captcha.php not returning plaintext for search captcha; needs further investigation"
  }

  // ── Phase 8: Check if search can bypass captcha entirely ──────────────────
  sep("PHASE 8 — Captcha Bypass Test (direct POST)")

  log("  Attempting direct API POST to gem.gov.in/view_contracts/load_result")
  log("  to see if a server-side endpoint accepts requests without captcha…")

  const bypassEndpoints = [
    "https://gem.gov.in/view_contracts/load_result",
    "https://gem.gov.in/view_contracts/fetch_contracts",
    "https://gem.gov.in/view_contracts/search",
  ]

  for (const ep of bypassEndpoints) {
    try {
      const resp = await context.request.post(ep, {
        timeout: 8000,
        headers: { referer: GEM_URL, "Content-Type": "application/x-www-form-urlencoded" },
        data: `from_date_contract_search1=${fromDate}&to_date_contract_search1=${toDate}`,
      })
      const body = await resp.text().catch(() => "")
      log(`  POST ${ep} → ${resp.status()} (${body.length} chars)`)
      if (/GEMC-\d{15}/i.test(body)) {
        log("  ★ RESULTS WITHOUT CAPTCHA! Bypass confirmed at: " + ep)
        evidence.conclusion = "BYPASS CONFIRMED — direct POST to " + ep + " returns results without captcha"
      } else {
        log("    body excerpt: " + body.slice(0, 200))
      }
    } catch {}
  }

  // ── Final report ──────────────────────────────────────────────────────────
  sep("INVESTIGATION REPORT")

  const report = [
    "GEM SEARCH CAPTCHA INVESTIGATION REPORT",
    "Generated: " + new Date().toISOString(),
    "═".repeat(70),
    "",
    "1. CAPTCHA ENDPOINT",
    "   Primary: " + CAP_URL,
    "   Response: " + JSON.stringify(evidence.captcha_response),
    "   Plaintext answer in response: " + evidence.plaintext_in_response,
    "",
    "2. RESPONSE PAYLOAD",
    "   " + JSON.stringify(evidence.captcha_response, null, 2).replace(/\n/g, "\n   "),
    "",
    "3. DOM / JS / STORAGE",
    "   Captcha-related JS globals: " + JSON.stringify(evidence.js_globals),
    "   Hidden fields: " + JSON.stringify(evidence.dom_fields),
    "   localStorage keys: " + Object.keys(evidence.local_storage).join(", "),
    "   sessionStorage keys: " + Object.keys(evidence.session_storage).join(", "),
    "",
    "4. VALIDATION MECHANISM",
    "   Server-side validation: " + evidence.validation_test?.server_side_validation,
    "   Wrong captcha rejected: " + evidence.validation_test?.server_rejected,
    "   Test detail: " + JSON.stringify(evidence.validation_test, null, 2).replace(/\n/g, "\n   "),
    "",
    "5. AUTO-SOLVE ATTEMPT",
    "   " + JSON.stringify(evidence.auto_solve_attempt, null, 2).replace(/\n/g, "\n   "),
    "",
    "6. CONCLUSION",
    "   " + evidence.conclusion,
    "",
    "7. AUTOMATION FEASIBILITY",
    (() => {
      if (evidence.auto_solve_attempt?.automation_confirmed) {
        return [
          "   ★ FULLY AUTOMATABLE",
          "   Method: GET " + CAP_URL + " → plaintext answer → type → submit",
          "   Estimated reduction: 3–5 min/chunk × 35 chunks = 1.75–2.9 hr saved",
          "   Action: Update collector to auto-fill captcha — NO human interaction required",
        ].join("\n")
      }
      if (evidence.conclusion?.includes("BYPASS")) {
        return [
          "   ★ FULLY AUTOMATABLE (bypass)",
          "   Method: Direct POST to load_result endpoint without captcha",
          "   No captcha field to fill at all",
        ].join("\n")
      }
      return [
        "   ✗ NOT AUTOMATABLE with this method",
        "   Evidence: " + (evidence.conclusion || "unknown"),
        "   Fallback: Keep manual captcha entry in collector",
      ].join("\n")
    })(),
    "",
    "═".repeat(70),
  ].join("\n")

  log(report)
  evidence.full_report = report

  // Save evidence
  const dateStr  = new Date().toISOString().slice(0, 10)
  const jsonPath = path.join("audit", `captcha-investigation-${dateStr}.json`)
  const txtPath  = path.join("audit", `captcha-investigation-${dateStr}.txt`)
  fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2))
  fs.writeFileSync(txtPath, report)
  log("\n  Evidence saved → " + jsonPath)
  log("  Report saved  → " + txtPath)

  await browser.close()
})().catch(e => {
  console.error("\nFATAL:", e.message)
  process.exit(1)
})
