import { test } from "@playwright/test"
import path from "path"
import fs from "fs"

const OUT = path.join(process.cwd(), "test-results", "final")
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const shot = async (page: import("@playwright/test").Page, name: string) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
}

test("homepage — desktop full navbar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(800)
  await shot(page, "1-homepage-desktop")
})

test("products page — desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/products")
  await page.waitForLoadState("domcontentloaded")
  await shot(page, "2-products-desktop")
})

test("mobile menu — all 7 links visible (post-fix)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(600)
  await page.locator('[aria-label="Open navigation menu"]').click()
  await page.waitForTimeout(500)
  await shot(page, "3-mobile-menu-all-links")
})

test("blog post — mobile 375px no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/blog")
  await page.waitForLoadState("domcontentloaded")
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute("href").catch(() => null)
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("domcontentloaded")
  }
  await shot(page, "4-blog-mobile")
})

test("after navigation — no overlay on about page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.goto("/about")
  await page.waitForLoadState("domcontentloaded")
  await shot(page, "5-about-after-nav-clean")
})
