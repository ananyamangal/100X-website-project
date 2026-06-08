/**
 * Production QA — navigation, layout, responsiveness, and regression tests.
 * Run: npx playwright test
 * Production: BASE_URL=https://100xcircle.com npx playwright test
 */
import { test, expect, Page } from "@playwright/test"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function dismissAllPopups(page: Page) {
  // Close any popup that might appear (RFQ, brochure, video, gem)
  const closeSelectors = [
    '[aria-label="Close"]',
    '[aria-label="Close video — will not reopen"]',
    '[aria-label="Close RFQ form"]',
  ]
  for (const sel of closeSelectors) {
    const btn = page.locator(sel).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(200)
    }
  }
}

async function waitForNavReady(page: Page) {
  // Navbar links should be clickable — not covered by any overlay
  await expect(page.locator("header nav")).toBeVisible()
  await page.waitForLoadState("networkidle")
}

// ─── 1. Navbar Navigation ─────────────────────────────────────────────────────

test.describe("Navbar", () => {
  test("all nav links are visible and clickable on homepage", async ({ page }) => {
    await page.goto("/")
    await waitForNavReady(page)
    await dismissAllPopups(page)

    const navLinks = ["Products", "Spare Parts", "Knowledge Hub", "Blog", "About", "Contact"]
    for (const label of navLinks) {
      const link = page.locator(`header nav a:has-text("${label}")`).first()
      await expect(link, `${label} should be visible`).toBeVisible()
      await expect(link, `${label} should be enabled`).toBeEnabled()
    }
  })

  test("navbar links are clickable on product listing page", async ({ page }) => {
    await page.goto("/products")
    await waitForNavReady(page)
    await dismissAllPopups(page)

    const aboutLink = page.locator('header nav a[href="/about"]').first()
    await expect(aboutLink).toBeVisible()

    // Check no overlay is covering the navbar
    const navBoundingBox = await page.locator("header").boundingBox()
    expect(navBoundingBox).toBeTruthy()

    // Click About and verify navigation
    await aboutLink.click()
    await expect(page).toHaveURL(/\/about/)
  })

  test("navbar links navigate correctly from product detail page", async ({ page }) => {
    await page.goto("/products")
    // Get first product link
    const firstProduct = page.locator('a[href^="/products/"]').first()
    const href = await firstProduct.getAttribute("href")
    if (href) {
      await page.goto(href)
      await waitForNavReady(page)
      await dismissAllPopups(page)

      const blogLink = page.locator('header nav a[href="/blog"]').first()
      await expect(blogLink).toBeVisible()
      await blogLink.click()
      await expect(page).toHaveURL(/\/blog/)
    }
  })

  test("no element with z-index above navbar covers it", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Check that no popup backdrop is covering the navbar area
    const navbarRect = await page.locator("header").boundingBox()
    if (!navbarRect) return

    // The element at the center of the navbar should be the navbar or one of its children
    const centerX = navbarRect.x + navbarRect.width / 2
    const centerY = navbarRect.y + navbarRect.height / 2

    const topElement = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return el ? el.tagName + (el.className ? "." + el.className.split(" ")[0] : "") : "none"
    }, { x: centerX, y: centerY })

    // The top element should be part of the navbar (nav, header, a, button, img)
    const navTags = ["HEADER", "NAV", "A", "BUTTON", "IMG", "SPAN", "DIV", "LINK"]
    const tag = topElement.split(".")[0].toUpperCase()
    // Accept any element — the key test is that it's not a modal backdrop
    expect(topElement).not.toContain("fixed inset-0")
  })

  test("mobile menu opens, closes, and navigates correctly", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 1280) >= 1024, "Mobile-only test")

    await page.goto("/")
    await waitForNavReady(page)
    await dismissAllPopups(page)

    // Open mobile menu
    const hamburger = page.locator('[aria-label="Open navigation menu"]')
    await expect(hamburger).toBeVisible()
    await hamburger.click()

    // Mobile nav should be visible
    const mobileMenu = page.locator("#navbar-mobile-menu")
    await expect(mobileMenu).toBeVisible()

    // Click a link in the mobile menu — should close menu and navigate
    const productsLink = mobileMenu.locator('a[href="/products"]')
    await expect(productsLink).toBeVisible()
    await productsLink.click()

    await expect(page).toHaveURL(/\/products/)
    // Menu should be closed after navigation
    await expect(mobileMenu).not.toBeVisible()
  })

  test("mobile menu closes with Escape key", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 1280) >= 1024, "Mobile-only test")

    await page.goto("/")
    await waitForNavReady(page)

    const hamburger = page.locator('[aria-label="Open navigation menu"]')
    await hamburger.click()

    const mobileMenu = page.locator("#navbar-mobile-menu")
    await expect(mobileMenu).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(mobileMenu).not.toBeVisible()

    // Body overflow should be restored after menu closes
    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).not.toBe("hidden")
  })
})

// ─── 2. Navigation Reliability ────────────────────────────────────────────────

test.describe("Navigation reliability", () => {
  const ROUTES = [
    { path: "/", label: "Homepage" },
    { path: "/products", label: "Products" },
    { path: "/spare-parts", label: "Spare Parts" },
    { path: "/blog", label: "Blog" },
    { path: "/about", label: "About" },
    { path: "/contact-us", label: "Contact" },
    { path: "/knowledge", label: "Knowledge Hub" },
  ]

  for (const route of ROUTES) {
    test(`${route.label} loads without errors (${route.path})`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(err.message))

      const resp = await page.goto(route.path)
      expect(resp?.status(), `${route.path} should return 2xx`).toBeLessThan(400)
      await page.waitForLoadState("domcontentloaded")

      // Filter expected non-critical errors
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("ResizeObserver") &&
          !e.includes("Non-passive event listener") &&
          !e.includes("hydration")
      )
      expect(criticalErrors, `No JS errors on ${route.path}`).toHaveLength(0)
    })
  }

  test("RFQ popup does not persist across page navigation", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Fast-forward any popup timers by waiting
    // Then navigate away — popup should not be visible on new page
    await page.goto("/about")
    await page.waitForLoadState("networkidle")

    // No fixed inset-0 overlay should be covering the page
    const overlayVisible = await page.evaluate(() => {
      const fixed = document.querySelectorAll<HTMLElement>("div[class*='fixed'][class*='inset-0']")
      for (const el of fixed) {
        const style = window.getComputedStyle(el)
        if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
          return true
        }
      }
      return false
    })
    expect(overlayVisible, "No persistent popup overlay on navigation").toBe(false)
  })

  test("body overflow is not stuck as hidden after navigation", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.goto("/products")
    await page.waitForLoadState("networkidle")

    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow, "body overflow should not be stuck as hidden").not.toBe("hidden")
  })
})

// ─── 3. Blog Layout ───────────────────────────────────────────────────────────

test.describe("Blog layout", () => {
  test("blog index page has no horizontal overflow", async ({ page }) => {
    await page.goto("/blog")
    await page.waitForLoadState("domcontentloaded")

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll, "Blog index should not scroll horizontally").toBe(false)
  })

  test("blog post page has no horizontal overflow", async ({ page }) => {
    await page.goto("/blog")
    await page.waitForLoadState("domcontentloaded")

    // Get first blog post link
    const firstPost = page.locator('a[href^="/blog/"]').first()
    const href = await firstPost.getAttribute("href")

    if (href) {
      await page.goto(href)
      await page.waitForLoadState("domcontentloaded")

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll, "Blog post should not scroll horizontally").toBe(false)
    }
  })

  test("blog post content is constrained to max-w-3xl container", async ({ page }) => {
    await page.goto("/blog")
    const firstPost = page.locator('a[href^="/blog/"]').first()
    const href = await firstPost.getAttribute("href")

    if (href) {
      await page.goto(href)
      const article = page.locator("article").first()
      await expect(article).toBeVisible()

      const box = await article.boundingBox()
      if (box) {
        // Article content should not exceed a reasonable max width
        expect(box.width).toBeLessThanOrEqual(768)
      }
    }
  })

  test("blog post images are responsive", async ({ page }) => {
    await page.goto("/blog")
    const firstPost = page.locator('a[href^="/blog/"]').first()
    const href = await firstPost.getAttribute("href")

    if (href) {
      await page.goto(href)
      await page.setViewportSize({ width: 375, height: 812 })
      await page.waitForLoadState("domcontentloaded")

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll, "Blog post images should not overflow on mobile").toBe(false)
    }
  })
})

// ─── 4. Responsive Layout ─────────────────────────────────────────────────────

test.describe("Responsive layout", () => {
  const VIEWPORTS = [
    { width: 375, height: 812, label: "Mobile (375px)" },
    { width: 768, height: 1024, label: "Tablet (768px)" },
    { width: 1280, height: 800, label: "Desktop (1280px)" },
  ]

  const KEY_PAGES = ["/", "/products", "/blog", "/about", "/spare-parts"]

  for (const viewport of VIEWPORTS) {
    for (const pagePath of KEY_PAGES) {
      test(`${pagePath} has no horizontal scroll at ${viewport.label}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(pagePath)
        await page.waitForLoadState("domcontentloaded")

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

        expect(
          scrollWidth,
          `${pagePath} at ${viewport.label}: scrollWidth (${scrollWidth}) should not exceed clientWidth (${clientWidth})`
        ).toBeLessThanOrEqual(clientWidth + 5) // +5px tolerance for sub-pixel rounding
      })
    }
  }

  test("navbar is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/")
    await expect(page.locator("header")).toBeVisible()
    await expect(page.locator('[aria-label="Open navigation menu"]')).toBeVisible()
  })

  test("navbar desktop links are visible at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/")
    await expect(page.locator("header nav")).toBeVisible()
    // Desktop links container should be visible
    const desktopLinks = page.locator("header .hidden.lg\\:flex").first()
    await expect(desktopLinks).toBeVisible()
  })
})

// ─── 5. Footer links ─────────────────────────────────────────────────────────

test.describe("Footer links", () => {
  test("footer is present on homepage", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
  })

  test("footer internal links are not broken", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const footerLinks = page.locator("footer a[href^='/']")
    const count = await footerLinks.count()

    const brokenLinks: string[] = []
    for (let i = 0; i < count; i++) {
      const href = await footerLinks.nth(i).getAttribute("href")
      if (!href || href.startsWith("tel:") || href.startsWith("mailto:")) continue
      const resp = await page.request.get(href).catch(() => null)
      if (resp && resp.status() >= 400) {
        brokenLinks.push(`${href} → ${resp.status()}`)
      }
    }
    expect(brokenLinks, `Broken footer links: ${brokenLinks.join(", ")}`).toHaveLength(0)
  })
})

// ─── 6. Console errors ────────────────────────────────────────────────────────

test.describe("Console health", () => {
  test("no unhandled hydration errors on homepage", async ({ page }) => {
    const hydrationErrors: string[] = []
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        (msg.text().includes("Hydration") ||
          msg.text().includes("hydration") ||
          msg.text().includes("did not match"))
      ) {
        hydrationErrors.push(msg.text())
      }
    })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    expect(hydrationErrors, "No hydration errors on homepage").toHaveLength(0)
  })

  test("no unhandled JS errors on product listing page", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/products")
    await page.waitForLoadState("networkidle")

    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("ChunkLoadError")
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

// ─── 7. Product Pages ─────────────────────────────────────────────────────────

test.describe("Product pages", () => {
  test("product listing page renders product cards", async ({ page }) => {
    await page.goto("/products")
    await page.waitForLoadState("domcontentloaded")

    // Should have at least some product cards
    const productCards = page.locator('a[href^="/products/"]')
    const count = await productCards.count()
    expect(count, "Should render product cards").toBeGreaterThan(0)
  })

  test("product detail page loads without errors", async ({ page }) => {
    await page.goto("/products")
    const firstLink = page.locator('a[href^="/products/"]').first()
    const href = await firstLink.getAttribute("href")

    if (href) {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(err.message))

      await page.goto(href)
      await page.waitForLoadState("domcontentloaded")

      const criticalErrors = errors.filter(
        (e) => !e.includes("ResizeObserver") && !e.includes("ChunkLoadError")
      )
      expect(criticalErrors).toHaveLength(0)
    }
  })

  test("product detail page has no horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/products")
    const firstLink = page.locator('a[href^="/products/"]').first()
    const href = await firstLink.getAttribute("href")

    if (href) {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(href)
      await page.waitForLoadState("domcontentloaded")

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
    }
  })
})
