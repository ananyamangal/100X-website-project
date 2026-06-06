"use strict";
// GeM Contract Detail — Investigation Script
// Reverse-engineers the openCap → sbtCaptcha → contract detail workflow.
//
// Run: node scripts/gem-detail-investigate.js

const path = require("path")
const fs   = require("fs")
const { chromium } = require("playwright")

fs.mkdirSync("audit", { recursive: true })

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

;(async () => {
  const findings = {
    captchaPhpEndpoint: {},
    sbtCaptchaEndpoint: {},
    detailPageContent:  {},
    pdfEndpoints:       [],
    networkRequests:    [],
    conclusions:        {},
  }

  // ── Browser launch ────────────────────────────────────────────────────────
  console.log("\n[LAUNCH] Starting Chromium (headless: false, slowMo: 0) ...")

  const launchOptions = {
    headless: false,
    slowMo:   0,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-zygote",
    ],
  }
  console.log("[LAUNCH] Options:", JSON.stringify(launchOptions, null, 2))

  const browser = await chromium.launch(launchOptions)
  console.log("[LAUNCH] Browser launched OK — version:", browser.version())

  browser.on("disconnected", () => {
    console.error("[BROWSER] Browser disconnected unexpectedly")
  })

  // ── Context + page ────────────────────────────────────────────────────────
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  })
  console.log("[LAUNCH] Context created OK")

  const page = await context.newPage()
  console.log("[LAUNCH] Page created OK")

  page.on("crash", () => {
    console.error("[PAGE] Page crashed!")
  })
  page.on("pageerror", err => {
    console.error("[PAGE] Page JS error:", err.message)
  })

  // ── Intercept network requests ────────────────────────────────────────────
  const networkLog = []
  page.on("request", req => {
    const url = req.url()
    if (!url.includes("analytics") && !url.includes("fonts") && !url.includes(".css")) {
      networkLog.push({
        time:     new Date().toISOString(),
        method:   req.method(),
        url,
        postData: req.postData() || null,
      })
    }
  })
  page.on("response", async res => {
    const url = res.url()
    if (url.includes("gem.gov.in") && !url.includes(".css") && !url.includes(".js")) {
      const entry = networkLog.find(r => r.url === url && !r.status)
      if (entry) {
        entry.status      = res.status()
        entry.contentType = res.headers()["content-type"] || null
        if (url.includes("captcha.php") || url.includes("sbtCaptcha") ||
            url.includes("view_contract") || url.includes("download")) {
          try { entry.responseBody = await res.text().then(t => t.slice(0, 2000)) }
          catch {}
        }
        if (url.toLowerCase().includes(".pdf")) {
          findings.pdfEndpoints.push({ url, status: res.status() })
        }
      }
    }
  })

  // ── Step 1: Navigate ──────────────────────────────────────────────────────
  console.log("[NAV] Starting navigation to https://gem.gov.in/view_contracts ...")
  try {
    await page.goto("https://gem.gov.in/view_contracts", {
      waitUntil: "domcontentloaded",
      timeout:   60000,
    })
    console.log("[NAV] Navigation complete — URL:", page.url())
    console.log("[NAV] Page title:", await page.title())
  } catch (navErr) {
    console.error("[NAV] Navigation failed:", navErr.message)
    console.log("[NAV] Page URL at failure:", page.url())
    console.log("[NAV] Page is closed?", page.isClosed())
    await browser.close()
    process.exit(1)
  }

  // ── Step 2: Fill dates programmatically (mirrors collector) ──────────────
  // Use a fixed 7-day window covering today
  const today   = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const fmt = d => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  const fromDate = fmt(weekAgo)
  const toDate   = fmt(today)

  console.log(`\n  Filling date range: ${fromDate} → ${toDate}`)
  const fromSel = "#from_date_contract_search1, [name='from_date_contract_search1']"
  const toSel   = "#to_date_contract_search1, [name='to_date_contract_search1']"
  for (const [sel, val] of [[fromSel, fromDate], [toSel, toDate]]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val).catch(() => {})
  }
  await sleep(400)

  // Blank category = all categories (same as collector)
  await page.selectOption("select#buyer_category", "").catch(() => {})

  // ── Step 3: User solves captcha only — script clicks Search ───────────────
  console.log("\n══════════════════════════════════════════════════════════════════")
  console.log("  GeM Contract Detail — INVESTIGATION")
  console.log("══════════════════════════════════════════════════════════════════")
  console.log(`\n  Date range filled: ${fromDate} → ${toDate}`)
  console.log("\n  STEP 1: In the browser, type the captcha text only.")
  console.log("  Do NOT click Search. The script will click it for you.")
  console.log("\n  Press Enter here after typing the captcha.\n")

  await new Promise(resolve => {
    const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout })
    rl.question("  Press Enter after typing captcha: ", () => { rl.close(); resolve() })
  })

  // Click Search button (mirrors collector exactly)
  const clicked = await page.click(
    "#searchlocation1, button#searchlocation1, [id='searchlocation1']"
  ).then(() => true).catch(() => false)
  console.log(`\n  Search button clicked: ${clicked}`)

  if (!clicked) {
    const html = await page.content()
    fs.writeFileSync("audit/investigation-no-button.html", html)
    console.log("  [ERROR] Search button not found — HTML saved to audit/investigation-no-button.html")
    await browser.close()
    process.exit(1)
  }

  // Wait for AJAX results (mirrors collector)
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
  await sleep(2000)

  // Check for captcha rejection or empty results
  const pageText = await page.evaluate(() => document.body.innerText).catch(() => "")
  if (/invalid captcha/i.test(pageText)) {
    console.log("  [ERROR] Invalid captcha — re-run the script and try again.")
    await browser.close()
    process.exit(1)
  }
  if (/no record|no result|no data found/i.test(pageText)) {
    console.log("  No contracts found for this date range. Try a wider range.")
    await browser.close()
    process.exit(0)
  }
  console.log("  Network idle. Checking for contract cards ...")

  // ── Step 4: Pre-flight poll — wait until cards appear (max 30 s) ─────────
  console.log("\n" + "─".repeat(70))
  console.log("  PRE-FLIGHT: polling for contract cards (max 30 s) ...")
  console.log("─".repeat(70))

  // Poll every second until cards appear or timeout
  let pollSecs = 0
  const POLL_MAX = 30
  while (pollSecs < POLL_MAX) {
    const counts = await page.evaluate(() => ({
      url:   location.href,
      cards: document.querySelectorAll("div.border.block").length,
      gemc:  document.querySelectorAll(".ajxtag_order_number").length,
    }))
    process.stdout.write(
      `\r  t+${String(pollSecs).padStart(2,"0")}s  URL: ${counts.url.slice(0,60).padEnd(60)}  div.border.block: ${counts.cards}  .ajxtag_order_number: ${counts.gemc}  `
    )
    if (counts.cards > 0 || counts.gemc > 0) {
      console.log("\n  Cards detected — proceeding to diagnostics.")
      break
    }
    await sleep(1000)
    pollSecs++
  }
  if (pollSecs >= POLL_MAX) {
    console.log(`\n  [TIMEOUT] No cards appeared after ${POLL_MAX}s.`)
  }
  console.log()

  // ── Step 5: Full diagnostic snapshot ────────────────────────────────────
  const diagUrl   = page.url()
  const diagTitle = await page.title()
  console.log(`  URL   : ${diagUrl}`)
  console.log(`  Title : ${diagTitle}`)

  const diag = await page.evaluate(() => {
    const bodyText      = document.body?.innerText?.slice(0, 1000) || ""
    const borderBlocks  = document.querySelectorAll("div.border.block")
    const ajxTags       = document.querySelectorAll(".ajxtag_order_number")
    const pagiContent   = document.querySelectorAll("#pagi_content")
    const iframes       = document.querySelectorAll("iframe")

    // First 20 div.border.block — outerHTML slice for selector comparison
    const borderBlockSamples = Array.from(borderBlocks).slice(0, 20).map((el, i) => ({
      index:     i,
      classes:   el.className,
      outerHtml: el.outerHTML.slice(0, 200),
    }))

    // First 20 .ajxtag_order_number values
    const ajxTagSamples = Array.from(ajxTags).slice(0, 20).map((el, i) => ({
      index:     i,
      innerText: el.innerText?.trim(),
      tagName:   el.tagName,
      classes:   el.className,
    }))

    // #pagi_content child summary
    const pagiChildren = pagiContent[0]
      ? Array.from(pagiContent[0].children).slice(0, 5).map(c => ({
          tag: c.tagName, classes: c.className, childCount: c.children.length
        }))
      : []

    return {
      bodyTextSnippet:      bodyText,
      countBorderBlock:     borderBlocks.length,
      countAjxTag:          ajxTags.length,
      countPagiContent:     pagiContent.length,
      countIframes:         iframes.length,
      borderBlockSamples,
      ajxTagSamples,
      pagiChildren,
    }
  })

  console.log(`\n  div.border.block count      : ${diag.countBorderBlock}`)
  console.log(`  .ajxtag_order_number count  : ${diag.countAjxTag}`)
  console.log(`  #pagi_content count         : ${diag.countPagiContent}`)
  console.log(`  iframe count                : ${diag.countIframes}`)

  console.log("\n  #pagi_content direct children (first 5):")
  diag.pagiChildren.forEach(c =>
    console.log(`    <${c.tag} class="${c.classes}"> — ${c.childCount} children`)
  )

  if (diag.borderBlockSamples.length > 0) {
    console.log(`\n  First ${diag.borderBlockSamples.length} div.border.block elements:`)
    diag.borderBlockSamples.forEach(b =>
      console.log(`    [${b.index}] classes: "${b.classes}"\n         html: ${b.outerHtml}`)
    )
  } else {
    console.log("\n  div.border.block: NO MATCHES")
  }

  if (diag.ajxTagSamples.length > 0) {
    console.log(`\n  First ${diag.ajxTagSamples.length} .ajxtag_order_number elements:`)
    diag.ajxTagSamples.forEach(a =>
      console.log(`    [${a.index}] <${a.tagName}> classes="${a.classes}" → "${a.innerText}"`)
    )
  } else {
    console.log("\n  .ajxtag_order_number: NO MATCHES")
  }

  console.log("\n  Body text (first 1000 chars):")
  console.log("  " + diag.bodyTextSnippet.replace(/\n/g, "\n  "))

  // Save full page HTML
  const pageHtml = await page.content()
  fs.writeFileSync("audit/investigation-page.html", pageHtml)
  console.log("\n  Page HTML saved → audit/investigation-page.html")

  // Save screenshot
  await page.screenshot({ path: "audit/investigation-page.png", fullPage: false })
  console.log("  Screenshot saved → audit/investigation-page.png")

  console.log("─".repeat(70))

  // ── Step 6: Collect GEMC IDs — exact same strategy as gem-contracts-collector.js ─
  const gemcIds = await page.$$eval(
    "div#pagi_content div.border.block",
    blocks => blocks
      .map(block => block.querySelector(".ajxtag_order_number")?.innerText?.replace(/\s+/g, " ").trim() || null)
      .filter(t => t && t.startsWith("GEMC"))
      .slice(0, 5)
  ).catch(() => [])

  if (gemcIds.length === 0) {
    console.log("\n  [STOP] No GEMC IDs found. Dumping #pagi_content ...")
    const pagiHtml = await page.evaluate(() => {
      const el = document.querySelector("#pagi_content")
      if (!el) return "(#pagi_content not found)"
      return el.innerHTML.slice(0, 2000)
    })
    console.log("\n  #pagi_content innerHTML (first 2000 chars):")
    console.log(pagiHtml)
    console.log("\n  Saved: audit/investigation-page.html  audit/investigation-page.png")
    console.log("  Review those files to identify the actual selectors present.")
    await browser.close()
    return
  }

  console.log(`\n  Found ${gemcIds.length} GEMC IDs to investigate:`)
  gemcIds.forEach((id, i) => console.log(`    ${i+1}. ${id}`))

  // ── Step 4: Test detail flow for each GEMC ───────────────────────────────
  for (const gemcId of gemcIds) {
    console.log(`\n${"─".repeat(70)}`)
    console.log(`  Testing GEMC: ${gemcId}`)
    console.log("─".repeat(70))

    findings.detailPageContent[gemcId] = {}

    // 4a. Call captcha.php directly via page.evaluate
    console.log("\n  [4a] Calling captcha.php ...")
    const capResult = await page.evaluate(async () => {
      const res  = await fetch(
        "https://gem.gov.in/assets/phpcaptcha/captcha.php?ajax=1&rand=" + Math.random(),
        { method: "POST", body: new URLSearchParams({}) }
      )
      const text = await res.text()
      try {
        const parsed = JSON.parse(text)
        return {
          success:      true,
          rawResponse:  text.slice(0, 200),
          hasImage:     !!parsed.im,
          imageLen:     (parsed.im || "").length,
          hasText:      "text" in parsed,
          textValue:    parsed.text || null,
          hasEncodeTxt: "encodeTxt" in parsed,
          encodeTxt:    parsed.encodeTxt || null,
          allKeys:      Object.keys(parsed),
        }
      } catch (e) {
        return { success: false, rawResponse: text.slice(0, 200), error: e.message }
      }
    }).catch(e => ({ success: false, error: e.message }))

    findings.captchaPhpEndpoint = capResult
    console.log(`    success       : ${capResult.success}`)
    console.log(`    keys in resp  : ${JSON.stringify(capResult.allKeys)}`)
    console.log(`    has image     : ${capResult.hasImage} (${capResult.imageLen} chars base64)`)
    console.log(`    has text      : ${capResult.hasText}  → "${capResult.textValue}"`)
    console.log(`    has encodeTxt : ${capResult.hasEncodeTxt} → "${capResult.encodeTxt}"`)

    const captchaAnswer = capResult.textValue || capResult.encodeTxt || null
    console.log(`\n  Captcha answer in API response: ${captchaAnswer !== null ? 'YES — "' + captchaAnswer + '"' : "NO"}`)

    // 4b. POST to sbtCaptcha WITHOUT captcha text (bare GEMC ID only)
    console.log("\n  [4b] Calling sbtCaptcha without captcha text ...")
    const sbtResult = await page.evaluate(async (oid) => {
      const params = new URLSearchParams({ oid })
      const res    = await fetch("https://gem.gov.in/view_contracts/sbtCaptcha", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    params.toString(),
      })
      const text = await res.text()
      try {
        const parsed = JSON.parse(text)
        return {
          httpStatus:  res.status,
          success:     true,
          rawResponse: text.slice(0, 1000),
          status:      parsed.status,
          hasCode:     "code" in parsed,
          codeHtml:    parsed.code || null,
          allKeys:     Object.keys(parsed),
        }
      } catch (e) {
        return { httpStatus: res.status, success: false, rawResponse: text.slice(0, 500), error: e.message }
      }
    }, gemcId).catch(e => ({ success: false, error: e.message }))

    findings.sbtCaptchaEndpoint[gemcId] = sbtResult
    console.log(`    HTTP status   : ${sbtResult.httpStatus}`)
    console.log(`    parse success : ${sbtResult.success}`)
    console.log(`    status field  : ${sbtResult.status}`)
    console.log(`    has code      : ${sbtResult.hasCode}`)
    if (sbtResult.codeHtml) {
      console.log(`    code HTML     : ${sbtResult.codeHtml.slice(0, 300)}`)
      findings.detailPageContent[gemcId].downloadButtonHtml = sbtResult.codeHtml
      const urlMatches    = sbtResult.codeHtml.match(/https?:\/\/[^\s"'<>]+/g) || []
      const hrefMatches   = sbtResult.codeHtml.match(/href="([^"]+)"/g) || []
      const onclickMatches = sbtResult.codeHtml.match(/onclick="([^"]+)"/g) || []
      console.log(`    URLs in code  : ${urlMatches.join(" | ") || "(none)"}`)
      console.log(`    hrefs in code : ${hrefMatches.join(" | ") || "(none)"}`)
      console.log(`    onclicks      : ${onclickMatches.join(" | ") || "(none)"}`)
      findings.detailPageContent[gemcId].urlsInCode      = urlMatches
      findings.detailPageContent[gemcId].hrefsInCode     = hrefMatches
      findings.detailPageContent[gemcId].onclicksInCode  = onclickMatches
    }

    // 4c. If bare call failed, try again WITH captcha answer
    if (sbtResult.status !== "1" && captchaAnswer) {
      console.log("\n  [4c] Bare call failed — retrying with captcha answer ...")
      const sbtResult2 = await page.evaluate(async ({ oid, captcha }) => {
        try { document.getElementById("h_captcha").value    = captcha } catch {}
        try { document.getElementById("captcha_code").value = captcha } catch {}
        try { document.getElementById("oid").value          = oid     } catch {}
        const params = new URLSearchParams({ oid })
        const res    = await fetch("https://gem.gov.in/view_contracts/sbtCaptcha", {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:    params.toString(),
        })
        const text = await res.text()
        try {
          const parsed = JSON.parse(text)
          return { httpStatus: res.status, status: parsed.status, codeHtml: parsed.code || null, rawResponse: text.slice(0, 1000) }
        } catch (e) {
          return { httpStatus: res.status, rawResponse: text.slice(0, 500) }
        }
      }, { oid: gemcId, captcha: captchaAnswer }).catch(e => ({ error: e.message }))

      console.log(`    result with captcha: status=${sbtResult2.status} http=${sbtResult2.httpStatus}`)
      if (sbtResult2.codeHtml) {
        console.log(`    code HTML: ${sbtResult2.codeHtml.slice(0, 300)}`)
        findings.detailPageContent[gemcId].downloadButtonHtml = sbtResult2.codeHtml
        findings.sbtCaptchaEndpoint[gemcId + "_withCaptcha"]  = sbtResult2
      }
    }

    // 4d. Click the GEMC link the normal way and observe modal state
    console.log("\n  [4d] Triggering openCap() in browser ...")
    await page.evaluate((id) => {
      if (typeof openCap === "function") openCap(id)
    }, gemcId).catch(() => {})
    await sleep(2000)

    const modalState = await page.evaluate(() => {
      const model      = document.getElementById("viewContractModel")
      const isVisible  = model && getComputedStyle(model).display !== "none"
      const captchaImg = document.getElementById("captchaimg")
      const hCaptcha   = document.getElementById("h_captcha")
      const oid        = document.getElementById("oid")
      return {
        modalVisible:  isVisible,
        captchaImgSrc: captchaImg?.src ? captchaImg.src.slice(0, 60) + "..." : null,
        hCaptchaValue: hCaptcha?.value || null,
        oidValue:      oid?.value || null,
      }
    }).catch(() => ({}))

    console.log(`    modal visible  : ${modalState.modalVisible}`)
    console.log(`    captchaimg src : ${modalState.captchaImgSrc}`)
    console.log(`    h_captcha value: "${modalState.hCaptchaValue}"`)
    console.log(`    oid value      : ${modalState.oidValue}`)
    findings.detailPageContent[gemcId].modalState = modalState

    // 4e. Auto-submit using the answer from h_captcha
    if (modalState.hCaptchaValue && modalState.modalVisible) {
      console.log("\n  [4e] Auto-submitting captcha using h_captcha value ...")
      await page.evaluate((answer) => {
        document.getElementById("captcha_code").value = answer
      }, modalState.hCaptchaValue)
      await sleep(500)
      await page.click("#modelsbt").catch(() => {})
      await sleep(3000)

      const dwnbtnHtml = await page.$eval("#dwnbtn", el => el.innerHTML).catch(() => "")
      console.log(`    dwnbtn HTML: ${dwnbtnHtml.slice(0, 400)}`)
      findings.detailPageContent[gemcId].dwnbtnAfterSubmit = dwnbtnHtml

      const urlsInDwnbtn  = dwnbtnHtml.match(/https?:\/\/[^\s"'<>]+/g) || []
      const hrefsInDwnbtn = dwnbtnHtml.match(/href="([^"]+)"/g) || []
      console.log(`    URLs found : ${urlsInDwnbtn.join(" | ") || "(none)"}`)
      console.log(`    hrefs found: ${hrefsInDwnbtn.join(" | ") || "(none)"}`)
      findings.detailPageContent[gemcId].dwnbtnUrls  = urlsInDwnbtn
      findings.detailPageContent[gemcId].dwnbtnHrefs = hrefsInDwnbtn

      if (hrefsInDwnbtn.length > 0) {
        const downloadUrl = hrefsInDwnbtn[0].replace(/href="|"/g, "")
        console.log(`\n  [4f] Following download URL: ${downloadUrl}`)
        const downloadPage = await context.newPage()
        try {
          const resp        = await downloadPage.goto(downloadUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
          const contentType = resp?.headers()["content-type"] || ""
          console.log(`    Content-Type: ${contentType}`)
          console.log(`    Status      : ${resp?.status()}`)
          if (contentType.includes("pdf")) {
            console.log("    PDF CONFIRMED — direct PDF download URL")
            findings.pdfEndpoints.push({ url: downloadUrl, gemcId, status: resp.status(), contentType })
          } else if (contentType.includes("html")) {
            const html     = await downloadPage.content()
            const htmlFile = `audit/detail-${gemcId.replace(/[^A-Z0-9]/g, "_")}.html`
            fs.writeFileSync(htmlFile, html)
            console.log(`    HTML detail page saved → ${htmlFile}`)
            findings.detailPageContent[gemcId].htmlDumpFile = htmlFile
          }
        } catch (e) {
          console.log(`    Error: ${e.message}`)
        }
        await downloadPage.close()
      }
    }

    await page.keyboard.press("Escape").catch(() => {})
    await sleep(1500)
  }

  // ── Step 5: Save network log ──────────────────────────────────────────────
  findings.networkRequests = networkLog
    .filter(r => r.url.includes("gem.gov.in"))
    .map(r => ({ method: r.method, url: r.url, postData: r.postData,
                 status: r.status, contentType: r.contentType, responseBody: r.responseBody }))

  // ── Step 6: Conclusions ───────────────────────────────────────────────────
  const firstGemc    = gemcIds[0]
  const firstSbt     = findings.sbtCaptchaEndpoint[firstGemc] || {}
  const capHasAnswer = findings.captchaPhpEndpoint.hasText || findings.captchaPhpEndpoint.hasEncodeTxt
  const sbtBareWorks = firstSbt.status === "1"
  const hasPdf       = findings.pdfEndpoints.length > 0

  findings.conclusions = {
    captchaAnswerInApiResponse: capHasAnswer,
    captchaTextInPlaintext:     !!findings.captchaPhpEndpoint.textValue,
    sbtCaptchaServerValidates:  !sbtBareWorks,
    sbtCaptchaBypassable:       sbtBareWorks,
    pdfDownloadFound:           hasPdf,
    pdfUrls:                    findings.pdfEndpoints.map(p => p.url),
    estimatedCaptchasPerDetail: sbtBareWorks ? 0 : (capHasAnswer ? "auto-solvable" : 1),
  }

  const outFile = "audit/detail-investigation.json"
  fs.writeFileSync(outFile, JSON.stringify(findings, null, 2))

  console.log("\n" + "═".repeat(70))
  console.log("  INVESTIGATION CONCLUSIONS")
  console.log("═".repeat(70))
  console.log(`  captcha.php returns answer in API response : ${capHasAnswer ? "YES" : "NO"}`)
  console.log(`  Captcha answer is plaintext               : ${!!findings.captchaPhpEndpoint.textValue ? "YES" : "NO"}`)
  console.log(`  sbtCaptcha bypassed without captcha       : ${sbtBareWorks ? "YES — no server validation" : "NO — server validates"}`)
  console.log(`  PDF download URL found                    : ${hasPdf ? "YES" : "NO"}`)
  if (findings.pdfEndpoints.length) {
    findings.pdfEndpoints.forEach(p => console.log(`    PDF URL: ${p.url}`))
  }
  console.log(`\n  Full findings → ${outFile}`)
  console.log("═".repeat(70))

  await browser.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
