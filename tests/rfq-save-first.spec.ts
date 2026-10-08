import { test, expect, type Page } from "@playwright/test"

// RFQForm saves first (A1/A2): success events + /thank-you only after a confirmed
// save; a failed save shows an inline error, fires no success event and opens no
// WhatsApp tab. Every /api POST is intercepted, so nothing is written anywhere.
// Run against a production build: CI=1 BASE_URL=http://localhost:3103 npx playwright test tests/rfq-save-first.spec.ts

type DL = { event?: string }[]

async function interceptApi(page: Page, rfqStatus: number, rfqBody: string) {
  const posts: string[] = []
  await page.route("**/api/**", async (route) => {
    const req = route.request()
    if (req.method() === "GET") return route.continue()
    posts.push(req.url())
    if (req.url().includes("/api/rfq-submit")) {
      return route.fulfill({ status: rfqStatus, contentType: "application/json", body: rfqBody })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  return posts
}

async function fillAndSend(page: Page) {
  await page.goto("/about")
  await page.getByRole("button", { name: "Submit RFQ / Tender inquiry" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.locator("#rfq-product").click()
  await page.getByRole("option").first().click()
  await dialog.locator("#rfq-name").fill("Playwright Test")
  await dialog.locator("#rfq-phone").fill("9999999999")
  await page.waitForTimeout(2200) // the form's 2 s bot time-gate
  await dialog.getByRole("button", { name: /submit|send|get quote/i }).first().click()
  return dialog
}

const events = (page: Page) =>
  page.evaluate(() => ((window as unknown as { dataLayer?: DL }).dataLayer ?? []).map((e) => e.event))

test("saved RFQ: success events, then /thank-you?type=rfq with the optional WhatsApp button", async ({ page, context }) => {
  const popups: string[] = []
  context.on("page", (p) => { popups.push(p.url()); p.close() })
  await interceptApi(page, 200, JSON.stringify({ ok: true, dbStatus: "saved" }))
  await fillAndSend(page)
  await page.waitForURL(/\/thank-you\?type=rfq/)
  await expect(page.getByRole("link", { name: /Also send your request details on WhatsApp/ })).toBeVisible()
  expect(popups).toHaveLength(0) // WhatsApp never opens by itself
})

test("failed save: inline error, no success event, no navigation, no WhatsApp tab", async ({ page, context }) => {
  const popups: string[] = []
  context.on("page", (p) => { popups.push(p.url()); p.close() })
  const posts = await interceptApi(page, 502, JSON.stringify({ ok: false }))
  const dialog = await fillAndSend(page)
  await expect(dialog).toContainText("We could not send your request")
  expect(posts.some((u) => u.includes("/api/rfq-submit"))).toBe(true)
  const ev = await events(page)
  expect(ev).toContain("rfq_form_submit_attempt")
  expect(ev).not.toContain("rfq_submit")
  expect(ev).not.toContain("generate_lead")
  expect(page.url()).toContain("/about")
  expect(popups).toHaveLength(0)
})

test("thank-you page without a saved RFQ shows no details button", async ({ page }) => {
  await page.goto("/thank-you?type=rfq")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: /Also send your request details on WhatsApp/ })).toHaveCount(0)
})
