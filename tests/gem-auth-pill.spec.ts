import { test, expect, type Page } from "@playwright/test"

// Floating "Get GeM Auth Code" pill: opens the SAME slide-over + RFQForm as the
// "Request for Quotation" pill, with location "floating_gem_authorisation" and
// the GeM checkbox preselected. Every /api POST is intercepted, so nothing is
// written anywhere.
// Run against a production build: CI=1 BASE_URL=http://localhost:3100 npx playwright test tests/gem-auth-pill.spec.ts --project=desktop-chrome

async function blockApiWrites(page: Page) {
  const posts: { url: string; body: Record<string, unknown> }[] = []
  await page.route("**/api/**", async (route) => {
    const req = route.request()
    if (req.method() === "GET") return route.continue()
    let body: Record<string, unknown> = {}
    try { body = req.postDataJSON() } catch {}
    posts.push({ url: req.url(), body })
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  return posts
}

const gemPill = (page: Page) => page.getByRole("button", { name: "Get GeM OEM authorization code" })
const rfqPill = (page: Page) => page.getByRole("button", { name: "Submit RFQ / Tender inquiry" })

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("both pills render, stacked bottom-left, GeM above RFQ", async ({ page }) => {
    await blockApiWrites(page)
    await page.goto("/about")
    await expect(gemPill(page)).toBeVisible()
    await expect(gemPill(page)).toHaveAttribute("data-gtm", "gem_authorisation_open")
    await expect(gemPill(page)).toHaveText("Get GeM Auth Code")
    const g = (await gemPill(page).boundingBox())!, r = (await rfqPill(page).boundingBox())!
    expect(g.y + g.height).toBeLessThanOrEqual(r.y)
    expect(Math.abs(g.x - r.x)).toBeLessThan(2)
  })

  test("opens the same form with the GeM subtitle + checkbox; Esc closes and focus returns", async ({ page }) => {
    await blockApiWrites(page)
    await page.goto("/about")
    await gemPill(page).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "RFQ / Tender Inquiry" })).toBeVisible()
    await expect(dialog).toContainText("GeM OEM authorization code for resellers, plus tender and registration support")
    await expect(dialog.getByRole("checkbox").first()).toBeChecked()
    await expect(gemPill(page)).toBeHidden()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(gemPill(page)).toBeFocused()
  })

  test("RFQ pill still opens the form with its own subtitle and no GeM preselect", async ({ page }) => {
    await blockApiWrites(page)
    await page.goto("/about")
    await rfqPill(page).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Government, municipal, dealer, and bulk orders.")
    await expect(dialog.getByRole("checkbox").first()).not.toBeChecked()
    await page.keyboard.press("Escape")
    await expect(rfqPill(page)).toBeFocused()
  })

  test("submission carries location floating_gem_authorisation and gemAuthRequired (intercepted)", async ({ page, context }) => {
    const posts = await blockApiWrites(page)
    context.on("page", (p) => p.close()) // the form opens wa.me in a new tab
    await page.goto("/about")
    await gemPill(page).click()
    const dialog = page.getByRole("dialog")
    await dialog.locator("#rfq-product").click()
    await page.getByRole("option").first().click()
    await dialog.locator("#rfq-name").fill("Playwright Test")
    await dialog.locator("#rfq-phone").fill("9999999999")
    await page.waitForTimeout(2200) // the form's 2 s bot time-gate
    await dialog.getByRole("button", { name: /submit|send|get quote/i }).first().click()
    await expect.poll(() => posts.find((p) => p.url.includes("/api/rfq-submit"))).toBeTruthy()
    const sent = posts.find((p) => p.url.includes("/api/rfq-submit"))!.body
    expect(sent.location_label).toBe("floating_gem_authorisation")
    expect(sent.gemAuthRequired).toBe(true)
  })
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test("GeM pill is 44 px tall and sits above the RFQ pill and the CTA bar", async ({ page }) => {
    await blockApiWrites(page)
    await page.goto("/about")
    const g = (await gemPill(page).boundingBox())!, r = (await rfqPill(page).boundingBox())!
    expect(g.height).toBeGreaterThanOrEqual(44)
    expect(g.y + g.height).toBeLessThanOrEqual(r.y)
  })
})
