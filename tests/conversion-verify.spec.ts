/**
 * End-to-end conversion verification
 * Tests: dealer-program, contact-us, gem-oem-authorization
 *
 * Layers verified: Website → dataLayer (GTM input)
 * NOT verified here (require human login): GA4 DebugView, Google Ads Diagnostics
 */

import { test, expect, type Page } from "@playwright/test"

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DLEvent = Record<string, unknown>

/** Read window.dataLayer directly — no spy needed (App Router keeps JS context across soft navs) */
async function readDL(page: Page): Promise<DLEvent[]> {
  return page.evaluate(() => {
    const dl = (window as unknown as Record<string, unknown>).dataLayer
    return Array.isArray(dl) ? (dl as DLEvent[]) : []
  })
}

const findEv = (dl: DLEvent[], name: string) => dl.find((e) => e.event === name)
const findAll = (dl: DLEvent[], name: string) => dl.filter((e) => e.event === name)

/** Wait until window.dataLayer contains an event matching predicate, or throw on timeout */
async function waitForDLEvent(
  page: Page,
  predicate: (e: DLEvent) => boolean,
  timeoutMs = 8000
): Promise<DLEvent> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const dl = await readDL(page)
    const match = dl.find(predicate)
    if (match) return match
    await page.waitForTimeout(300)
  }
  const dl = await readDL(page)
  throw new Error(
    `Event not found in dataLayer after ${timeoutMs}ms. dataLayer snapshot:\n${JSON.stringify(dl, null, 2)}`
  )
}

/** Capture JS console errors and page errors */
function attachErrorCapture(page: Page): { errors: string[] } {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text()}`)
  })
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))
  return { errors }
}

// ─── CONV-1: Dealer Program Form ──────────────────────────────────────────────

test("CONV-1 /dealer-program: submit → generate_lead → /thank-you?type=dealer_inquiry (no double-fire)", async ({
  page,
}) => {
  const { errors } = attachErrorCapture(page)

  // Track API response
  let apiStatus = 0
  page.on("response", (res) => {
    if (res.url().includes("/api/submissions") && res.request().method() === "POST") {
      apiStatus = res.status()
    }
  })

  await page.goto("/dealer-program", { waitUntil: "networkidle" })
  await expect(page.locator("h1")).toContainText("Earn 20–30% Margins")

  // Confirm React hydration: button must be enabled (hydration attaches event listeners)
  const submitBtn = page.getByRole("button", { name: "Apply for Dealership" })
  await expect(submitBtn).toBeVisible()
  await expect(submitBtn).toBeEnabled()

  // Scroll form into view
  await page.locator("#dealer-form").scrollIntoViewIfNeeded()

  // Fill form
  await page.fill("#d-name", "Conversion Verify Test")
  await page.fill("#d-mobile", "9876543210")
  await page.selectOption("#d-state", "Delhi")
  await page.fill("#d-city", "New Delhi")
  await page.fill("#d-company", "Test Verification Co")

  await page.screenshot({ path: "precommit-screenshots/conv1-before-submit.png" })

  // Submit
  await submitBtn.click()

  // Wait for redirect — App Router soft navigation
  await page.waitForURL(/\/thank-you/, { timeout: 45000 }).catch(async () => {
    const dl = await readDL(page)
    throw new Error(
      `Redirect to /thank-you did not happen.\n` +
      `Current URL: ${page.url()}\n` +
      `API status: ${apiStatus}\n` +
      `JS errors: ${errors.join("; ") || "none"}\n` +
      `dataLayer (${dl.length} events): ${JSON.stringify(dl.slice(-5), null, 2)}`
    )
  })

  // Wait for ContactThankYouTracker useEffect
  await page.waitForTimeout(1500)
  await page.screenshot({ path: "precommit-screenshots/conv1-thank-you.png" })

  const dl = await readDL(page)
  const redirectUrl = page.url()

  // ── L1: API response ────────────────────────────────────────────────────────
  expect(apiStatus, `[L1] API /api/submissions must return 201 (got ${apiStatus})`).toBe(201)
  console.log(`  [L1] API → ${apiStatus}`)

  // ── L2: attempt event fired ─────────────────────────────────────────────────
  const attempt = findEv(dl, "dealer_application_attempt")
  expect(attempt, "[L2] dealer_application_attempt must be in dataLayer").toBeTruthy()
  console.log(`  [L2] dealer_application_attempt → lead_type=${attempt?.lead_type}`)

  // ── L2: generate_lead inline ────────────────────────────────────────────────
  const leads = findAll(dl, "generate_lead")
  const dealerLead = leads.find((e) => e.lead_type === "dealer_inquiry")
  expect(dealerLead, "[L2] generate_lead with lead_type=dealer_inquiry must fire").toBeTruthy()
  expect(dealerLead?.value).toBe(5000)
  expect(dealerLead?.currency).toBe("INR")
  console.log(`  [L2] generate_lead → lead_type=${dealerLead?.lead_type} value=${dealerLead?.value}`)

  // ── L2: redirect URL ────────────────────────────────────────────────────────
  expect(redirectUrl).toContain("/thank-you")
  expect(redirectUrl).toContain("type=dealer_inquiry")
  console.log(`  [L2] redirect → ${redirectUrl}`)

  // ── L2: no double-fire on /thank-you ───────────────────────────────────────
  const allLeads = findAll(dl, "generate_lead")
  const dealerCount = allLeads.filter((e) => e.lead_type === "dealer_inquiry").length
  const contactCount = allLeads.filter((e) => e.lead_type === "contact_form").length
  expect(dealerCount, "[L2] dealer_inquiry fires exactly once").toBe(1)
  expect(contactCount, "[L2] contact_form must NOT fire (dealer_inquiry is INLINE_FIRED_TYPE)").toBe(0)
  console.log(`  [L2] double-fire → dealer_inquiry×${dealerCount} contact_form×${contactCount}`)
})

// ─── CONV-2: Contact Form ──────────────────────────────────────────────────────

test("CONV-2 /contact-us: submit → /thank-you (no type) → tracker fires generate_lead(contact_form)", async ({
  page,
}) => {
  const { errors } = attachErrorCapture(page)

  let apiStatus = 0
  page.on("response", (res) => {
    if (res.url().includes("/api/submissions") && res.request().method() === "POST") {
      apiStatus = res.status()
    }
  })

  await page.goto("/contact-us", { waitUntil: "networkidle" })
  await expect(page.locator("h1")).toBeVisible()

  const submitBtn = page.locator("#contact-inquiry-form button[type='submit']")
  await expect(submitBtn).toBeVisible()
  await expect(submitBtn).toBeEnabled()

  await page.locator("#contact-form").scrollIntoViewIfNeeded()
  await page.fill("#contact-name", "Conversion Verify Contact")
  await page.fill("#contact-phone", "9876543211")

  await page.screenshot({ path: "precommit-screenshots/conv2-before-submit.png" })

  await submitBtn.click()

  await page.waitForURL(/\/thank-you/, { timeout: 45000 }).catch(async () => {
    const dl = await readDL(page)
    throw new Error(
      `Redirect to /thank-you did not happen.\n` +
      `Current URL: ${page.url()}\n` +
      `API status: ${apiStatus}\n` +
      `JS errors: ${errors.join("; ") || "none"}\n` +
      `dataLayer (${dl.length} events): ${JSON.stringify(dl.slice(-5), null, 2)}`
    )
  })

  await page.waitForTimeout(1500)
  await page.screenshot({ path: "precommit-screenshots/conv2-thank-you.png" })

  const dl = await readDL(page)
  const redirectUrl = page.url()

  // ── L1 ──────────────────────────────────────────────────────────────────────
  expect(apiStatus, `[L1] API must return 201 (got ${apiStatus})`).toBe(201)
  console.log(`  [L1] API → ${apiStatus}`)

  // ── L2 ──────────────────────────────────────────────────────────────────────
  const attempt = findEv(dl, "contact_form_submit_attempt")
  expect(attempt, "[L2] contact_form_submit_attempt must fire").toBeTruthy()
  console.log(`  [L2] contact_form_submit_attempt → ${JSON.stringify(attempt)}`)

  expect(redirectUrl).toContain("/thank-you")
  expect(redirectUrl).not.toContain("type=")
  console.log(`  [L2] redirect → ${redirectUrl}`)

  // ContactThankYouTracker fires for contact (not in INLINE_FIRED_TYPES)
  const leads = findAll(dl, "generate_lead")
  const contactLead = leads.find((e) => e.lead_type === "contact_form")
  expect(contactLead, "[L2] generate_lead(contact_form) must fire from /thank-you tracker").toBeTruthy()
  expect(contactLead?.value).toBeGreaterThan(0)
  expect(contactLead?.currency).toBe("INR")
  console.log(`  [L2] generate_lead(tracker) → value=${contactLead?.value}`)

  const cfSub = findEv(dl, "contact_form_submission")
  expect(cfSub, "[L2] contact_form_submission must fire").toBeTruthy()
  console.log(`  [L2] contact_form_submission → fired`)
})

// ─── CONV-3: GeM OEM Authorization ────────────────────────────────────────────

test("CONV-3 /gem-oem-authorization: no inline form — WhatsApp CTA is conversion path", async ({
  page,
}) => {
  await page.goto("/gem-oem-authorization", { waitUntil: "networkidle" })
  await expect(page.locator("h1")).toBeVisible()

  const formCount = await page.locator("form").count()
  const waLinks = await page.locator('a[href*="wa.me"]').count()
  const dealerLinks = await page.locator('a[href*="dealer"]').count()

  console.log(`  Inline forms: ${formCount}`)
  console.log(`  WhatsApp CTAs: ${waLinks}`)
  console.log(`  Dealer links: ${dealerLinks}`)

  expect(formCount).toBe(0)
  expect(waLinks).toBeGreaterThan(0)
  expect(dealerLinks).toBeGreaterThan(0)

  const firstWa = await page.locator('a[href*="wa.me"]').first().getAttribute("href")
  expect(firstWa).toContain("917827229116")

  console.log(`  WhatsApp href: ${decodeURIComponent(firstWa ?? "").slice(0, 100)}`)
  console.log("  FINDING: No generate_lead on this page. Conversion occurs via WhatsApp click or /dealer-program link.")
  console.log("  GTM global listener fires whatsapp_click when any wa.me <a> is clicked.")
})

// ─── GTM Infrastructure ───────────────────────────────────────────────────────

test("GTM: GTM-5JMGCKRW script and window.dataLayer present on all pages", async ({ page }) => {
  for (const path of ["/dealer-program", "/contact-us", "/gem-oem-authorization"]) {
    await page.goto(path, { waitUntil: "networkidle" })

    const gtmPresent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"))
      return scripts.some(
        (s) => s.src?.includes("googletagmanager.com") || s.textContent?.includes("GTM-5JMGCKRW")
      )
    })
    // window.dataLayer is initialized by the afterInteractive Script in layout.tsx
    const dlArray = await page.evaluate(() => Array.isArray(window.dataLayer))
    const dlLen = await page.evaluate(() => (window.dataLayer as unknown[])?.length ?? -1)

    expect(gtmPresent, `GTM must load on ${path}`).toBeTruthy()
    expect(dlArray, `window.dataLayer must be an array on ${path}`).toBeTruthy()
    console.log(`  ${path} → GTM: ${gtmPresent} | dataLayer: array(${dlLen})`)
  }
})

test("GTM: Google Ads labels NOT placeholder, not yet in HTML (GTM is delivery vehicle)", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })
  const html = await page.content()
  const hasPlaceholder = html.includes("AW-REPLACE_WITH_YOUR_ID")
  expect(hasPlaceholder).toBe(false)
  console.log(`  Placeholder AW ID in HTML: ${hasPlaceholder}`)
  console.log("  Conversion labels delivered via GTM container (not yet imported — MANUAL STEP REQUIRED)")
})
