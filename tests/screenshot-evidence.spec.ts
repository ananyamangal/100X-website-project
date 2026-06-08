/**
 * Screenshot evidence collection for the QA audit report.
 * Captures: navbar on each page, mobile menu, blog at all viewports.
 */
import { test } from "@playwright/test"
import path from "path"
import fs from "fs"

const OUT = path.join(process.cwd(), "test-results", "evidence")
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function capture(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  console.log(`  📸 ${name}.png`)
}

test("navbar — desktop homepage", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(500)
  await capture(page, "01-homepage-navbar-desktop")
})

test("navbar — desktop products page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/products")
  await page.waitForLoadState("domcontentloaded")
  await capture(page, "02-products-navbar-desktop")
})

test("navbar — product detail page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/products")
  const href = await page.locator('a[href^="/products/"]').first().getAttribute("href")
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("domcontentloaded")
  }
  await capture(page, "03-product-detail-navbar-desktop")
})

test("mobile menu — open state", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(300)
  await page.locator('[aria-label="Open navigation menu"]').click()
  await page.waitForTimeout(400)
  await capture(page, "04-mobile-menu-open")
})

test("mobile — homepage at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await capture(page, "05-homepage-mobile-375")
})

test("blog — desktop 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/blog")
  await page.waitForLoadState("domcontentloaded")
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute("href").catch(() => null)
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("domcontentloaded")
  }
  await capture(page, "06-blog-post-desktop-1280")
})

test("blog — tablet 768px", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("/blog")
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute("href").catch(() => null)
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("domcontentloaded")
  }
  await capture(page, "07-blog-post-tablet-768")
})

test("blog — mobile 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/blog")
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute("href").catch(() => null)
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("domcontentloaded")
  }
  await capture(page, "08-blog-post-mobile-375")
})

test("overlay check — homepage after 2s (popup window)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(2000) // let any popup fire
  await capture(page, "09-homepage-after-2s-popup-window")
})

test("after navigation — about page, no overlay", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.goto("/about")
  await page.waitForLoadState("domcontentloaded")
  await capture(page, "10-after-nav-about-no-overlay")
})

test("after navigation — blog page, no overlay", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/products")
  await page.waitForLoadState("domcontentloaded")
  await page.goto("/blog")
  await page.waitForLoadState("domcontentloaded")
  await capture(page, "11-after-nav-blog-no-overlay")
})
