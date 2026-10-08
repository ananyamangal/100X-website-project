import { test, expect } from "@playwright/test"

// Header "Products" / "Performance" menus: crawlable links in the server HTML,
// no thumbnails before first open, keyboard + ARIA behaviour, mobile accordion.
// Run against a production build (CI=1 skips the config's dev webServer): CI=1 BASE_URL=http://localhost:3100 npx playwright test tests/nav-menus.spec.ts --project=desktop-chrome

const MENUS = [
  { label: "Products", href: "/products", toggle: "Show all products" },
  { label: "Performance", href: "/past-performance-government", toggle: "Show past performance" },
  { label: "Spare Parts", href: "/spare-parts", toggle: "Show spare parts" },
  { label: "Blog", href: "/blog", toggle: "Show latest articles" },
  { label: "Contact", href: "/contact-us", toggle: "Show contact options" },
]

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test("menu links are in the server HTML and no thumbnail loads before opening", async ({ page, request }) => {
    const html = await (await request.get("/about")).text()
    expect(html).toContain('href="/case-studies"')
    expect(html).toContain('aria-label="Show all products"')
    const thumbs: string[] = []
    page.on("request", (r) => { if (/w_160,h_160,c_fill/.test(r.url())) thumbs.push(r.url()) })
    await page.goto("/about", { waitUntil: "load" })
    // Not "networkidle": GTM/GA keep the network busy. Give lazy work time to run.
    await page.waitForTimeout(4000)
    expect(thumbs).toEqual([])
  })

  for (const m of MENUS) {
    test(`${m.label}: label is a link, chevron toggles with aria-expanded, Esc closes and restores focus`, async ({ page }) => {
      await page.goto("/about")
      const nav = page.locator("header nav")
      await expect(nav.getByRole("link", { name: m.label, exact: true })).toHaveAttribute("href", m.href)
      const btn = nav.getByRole("button", { name: m.toggle })
      const panel = page.locator(`[id="${await btn.getAttribute("aria-controls")}"]`)
      await expect(btn).toHaveAttribute("aria-expanded", "false")
      await expect(panel).toBeHidden()

      await btn.focus()
      await page.keyboard.press("Enter")
      await expect(btn).toHaveAttribute("aria-expanded", "true")
      await expect(panel).toBeVisible()

      await page.keyboard.press("Escape")
      await expect(btn).toHaveAttribute("aria-expanded", "false")
      await expect(panel).toBeHidden()
      await expect(btn).toBeFocused()

      await page.keyboard.press("ArrowDown")
      await expect(panel).toBeVisible()
      await expect(panel.locator("a").first()).toBeFocused()

      await page.mouse.click(5, 880) // outside click
      await expect(panel).toBeHidden()
    })
  }

  test("only one dropdown is open at a time", async ({ page }) => {
    await page.goto("/about")
    const nav = page.locator("header nav")
    const first = nav.getByRole("button", { name: MENUS[0].toggle })
    const second = nav.getByRole("button", { name: MENUS[1].toggle })
    await first.click()
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await second.focus()
    await page.keyboard.press("Enter")
    await expect(second).toHaveAttribute("aria-expanded", "true")
    await expect(first).toHaveAttribute("aria-expanded", "false")
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(1)
  })

  test("hover opens after the intent delay; thumbnails load only then", async ({ page }) => {
    await page.goto("/about")
    const thumbs: string[] = []
    page.on("request", (r) => { if (/w_160,h_160,c_fill/.test(r.url())) thumbs.push(r.url()) })
    await page.locator("header nav").getByRole("link", { name: "Products", exact: true }).hover()
    const btn = page.locator("header nav").getByRole("button", { name: "Show all products" })
    await expect(btn).toHaveAttribute("aria-expanded", "true")
    await expect.poll(() => thumbs.length).toBeGreaterThan(0)
  })
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  for (const m of MENUS) {
    test(`${m.label}: accordion in the hamburger menu with 44 px targets`, async ({ page }) => {
      await page.goto("/about")
      await page.getByRole("button", { name: "Open navigation menu" }).click()
      const menu = page.locator("#navbar-mobile-menu")
      const btn = menu.getByRole("button", { name: m.toggle })
      await expect(btn).toHaveAttribute("aria-expanded", "false")
      const box = await btn.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
      await btn.click()
      await expect(btn).toHaveAttribute("aria-expanded", "true")
      const region = page.locator(`[id="${await btn.getAttribute("aria-controls")}"]`)
      const first = region.locator("a").first()
      await expect(first).toBeVisible()
      expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    })
  }
})
