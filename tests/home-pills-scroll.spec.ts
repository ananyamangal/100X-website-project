import { test, expect, type Page } from "@playwright/test"

// Homepage: the RFQ + GeM floating pills appear only after ~300 px of scroll and
// stay on scroll-up. Every other page shows them immediately (unchanged).
// Every /api POST is intercepted, so nothing is written anywhere.
// Run against a production build: CI=1 BASE_URL=http://localhost:3100 npx playwright test tests/home-pills-scroll.spec.ts

async function blockApiWrites(page: Page) {
  await page.route("**/api/**", (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  )
}

const gemPill = (page: Page) => page.getByRole("button", { name: "Get GeM OEM authorization code" })
const rfqPill = (page: Page) => page.getByRole("button", { name: "Submit RFQ / Tender inquiry" })

async function scrollTo(page: Page, y: number) {
  await page.evaluate((y) => window.scrollTo(0, y), y)
  await page.waitForTimeout(300)
}

test("homepage: pills hidden at top, appear after 300 px, stay on scroll-up", async ({ page }) => {
  await blockApiWrites(page)
  await page.goto("/")
  // The RFQ popup / video popup may overlay the page; pills are what matter here.
  await page.waitForLoadState("load")
  // Prove the ribbon bundle had time to mount before asserting absence.
  await page.waitForTimeout(3000)
  await expect(rfqPill(page)).toHaveCount(0)
  await expect(gemPill(page)).toHaveCount(0)

  await scrollTo(page, 200)
  await expect(rfqPill(page)).toHaveCount(0)

  await scrollTo(page, 350)
  await expect(rfqPill(page)).toBeVisible()
  await expect(gemPill(page)).toBeVisible()

  await scrollTo(page, 0)
  await expect(rfqPill(page)).toBeVisible()
  await expect(gemPill(page)).toBeVisible()

  // Still opens the form after the reveal.
  await gemPill(page).click({ force: true })
  await expect(page.getByRole("heading", { name: "RFQ / Tender Inquiry" })).toBeVisible()
})

for (const path of ["/about", "/thermal-and-cold-fogging-machine-100xtfs50"]) {
  test(`${path}: pills visible immediately without scrolling`, async ({ page }) => {
    await blockApiWrites(page)
    await page.goto(path)
    await expect(rfqPill(page)).toBeVisible()
    await expect(gemPill(page)).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
}
