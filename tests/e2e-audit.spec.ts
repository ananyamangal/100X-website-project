/**
 * End-to-End Production Audit
 * Runs against BASE_URL (default: https://www.100xcircle.com)
 *
 * Coverage:
 *  1. Desktop navigation journey × 10
 *  2. Mobile journey × 10
 *  3. Clickability audit — pointer-events, z-index, overlay detection
 *  4. Blog responsiveness — desktop / tablet / mobile
 *  5. Landing page stability × 50
 *  6. Overlay detection on every route change
 *  7. Final QA scoring
 */
import { test, expect, Page, Locator } from "@playwright/test"
import path from "path"
import fs from "fs"

// ─── Screenshot helper ─────────────────────────────────────────────────────────

const SHOT_DIR = path.join(process.cwd(), "test-results", "screenshots")
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true })

async function shot(page: Page, name: string) {
  const file = path.join(SHOT_DIR, `${name.replace(/[^a-z0-9-]/gi, "_")}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

// ─── Overlay detection ─────────────────────────────────────────────────────────

interface OverlayReport {
  found: boolean
  elements: Array<{ tag: string; classes: string; zIndex: string; display: string; opacity: string; rect: { x: number; y: number; w: number; h: number } }>
}

async function detectOverlays(page: Page): Promise<OverlayReport> {
  return page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>("*"))
    const results: OverlayReport["elements"] = []
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Legitimate UI elements: the navbar sits at z-50. Anything with z > 50 that
    // covers the NAVBAR AREA (top 80px) or the FULL SCREEN is a blocking overlay.
    // We exclude: HEADER, NAV, small fixed elements (video player, buttons, tooltips).
    const NAVBAR_HEIGHT = 80
    const NAVBAR_Z = 50

    for (const el of all) {
      const tag = el.tagName.toUpperCase()
      // Skip the navbar itself and its children
      if (tag === "HEADER" || tag === "NAV") continue
      if (el.closest("header") || el.closest("nav")) continue

      const style = window.getComputedStyle(el)
      if (style.position !== "fixed") continue
      if (style.display === "none" || style.visibility === "hidden") continue
      if (parseFloat(style.opacity) < 0.05) continue

      const z = parseInt(style.zIndex, 10)
      if (isNaN(z) || z <= NAVBAR_Z) continue  // must be above navbar z=50

      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) continue

      // Classify as blocking overlay if it covers:
      //   A) the full viewport (inset-0 style — classic modal backdrop)
      //   B) the navbar strip (top 80px, spanning full width)
      const coversFullScreen = rect.width >= vw * 0.7 && rect.height >= vh * 0.7
      const coversNavbar = rect.top <= NAVBAR_HEIGHT && rect.bottom >= 0 && rect.width >= vw * 0.5

      if (!coversFullScreen && !coversNavbar) continue

      results.push({
        tag,
        classes: el.className.toString().slice(0, 120),
        zIndex: style.zIndex,
        display: style.display,
        opacity: style.opacity,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      })
    }
    return { found: results.length > 0, elements: results } as OverlayReport
  }) as Promise<OverlayReport>
}

// ─── Navbar clickability check ─────────────────────────────────────────────────

interface NavbarReport {
  allClickable: boolean
  items: Array<{ label: string; href: string; visible: boolean; enabled: boolean; pointerEvents: string; coveringElement: string | null }>
}

async function auditNavbar(page: Page): Promise<NavbarReport> {
  return page.evaluate(() => {
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("header nav a"))
    const items = navLinks.map(link => {
      const rect = link.getBoundingClientRect()
      const style = window.getComputedStyle(link)
      const cx = rect.x + rect.width / 2
      const cy = rect.y + rect.height / 2
      const topEl = document.elementFromPoint(cx, cy)
      const isLinkOrChild = topEl === link || link.contains(topEl)
      const coveringEl = isLinkOrChild ? null : (topEl ? topEl.tagName + "." + topEl.className.toString().slice(0, 60) : "none")

      return {
        label: link.textContent?.trim() || link.getAttribute("aria-label") || "?",
        href: link.getAttribute("href") || "",
        visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
        enabled: style.pointerEvents !== "none",
        pointerEvents: style.pointerEvents,
        coveringElement: coveringEl,
      }
    })
    return {
      allClickable: items.every(i => i.visible && i.enabled && i.coveringElement === null),
      items,
    } as NavbarReport
  }) as Promise<NavbarReport>
}

// ─── Overflow check ────────────────────────────────────────────────────────────

interface OverflowReport {
  hasHorizontalScroll: boolean
  scrollWidth: number
  clientWidth: number
  overflow: number
  offendingElements: Array<{ tag: string; classes: string; rect: { w: number } }>
}

async function checkOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth
    const cw = document.documentElement.clientWidth
    const offenders: OverflowReport["offendingElements"] = []
    if (sw > cw + 5) {
      const all = Array.from(document.querySelectorAll<HTMLElement>("*"))
      for (const el of all) {
        const rect = el.getBoundingClientRect()
        if (rect.right > cw + 5 || rect.left < -5) {
          offenders.push({ tag: el.tagName, classes: el.className.toString().slice(0, 80), rect: { w: Math.round(rect.width) } })
          if (offenders.length >= 5) break
        }
      }
    }
    return { hasHorizontalScroll: sw > cw + 5, scrollWidth: sw, clientWidth: cw, overflow: sw - cw, offendingElements: offenders }
  }) as Promise<OverflowReport>
}

// ─── Dismiss popups ───────────────────────────────────────────────────────────

async function dismissAllPopups(page: Page) {
  const closeSelectors = [
    '[aria-label="Close"]',
    '[aria-label="Close video — will not reopen"]',
    '[aria-label="Close RFQ form"]',
    'button:has-text("×")',
    'button:has-text("✕")',
  ]
  for (const sel of closeSelectors) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click()
        await page.waitForTimeout(150)
      }
    } catch { /* ignore */ }
  }
}

async function waitNavReady(page: Page) {
  await page.waitForLoadState("domcontentloaded")
  await expect(page.locator("header")).toBeVisible({ timeout: 10_000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DESKTOP NAVIGATION JOURNEY × 10
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("1 · Desktop Navigation Journey × 10", () => {
  test("complete navigation loop × 10 — zero failures", async ({ page }) => {
    test.setTimeout(300_000) // 5 min for 10 × 6-step journey
    const journey = ["/", "/products", "/blog", "/about", "/contact-us", "/"]
    const failures: string[] = []
    const overlayFinds: string[] = []

    for (let i = 0; i < 10; i++) {
      for (const route of journey) {
        await page.goto(route, { waitUntil: "domcontentloaded" })
        await waitNavReady(page)
        await dismissAllPopups(page)

        // Overlay check after every navigation
        const overlay = await detectOverlays(page)
        if (overlay.found) {
          const desc = overlay.elements.map(e => `z=${e.zIndex} ${e.classes.slice(0, 40)}`).join("; ")
          overlayFinds.push(`[iter ${i + 1}] ${route}: ${desc}`)
          await shot(page, `overlay-desktop-iter${i + 1}-${route.replace(/\//g, "_")}`)
        }

        // Navbar clickability
        const nav = await auditNavbar(page)
        if (!nav.allClickable) {
          const bad = nav.items.filter(it => !it.visible || !it.enabled || it.coveringElement).map(it => `"${it.label}" cover=${it.coveringElement}`)
          failures.push(`[iter ${i + 1}] ${route}: ${bad.join(", ")}`)
          await shot(page, `nav-fail-desktop-iter${i + 1}-${route.replace(/\//g, "_")}`)
        }
      }

      // Product detail within iteration
      try {
        await page.goto("/products", { waitUntil: "domcontentloaded" })
        const firstProd = page.locator('a[href^="/products/"]').first()
        const href = await firstProd.getAttribute("href")
        if (href) {
          await page.click(`a[href="${href}"]`)
          await waitNavReady(page)
          await dismissAllPopups(page)
          const nav = await auditNavbar(page)
          if (!nav.allClickable) {
            const bad = nav.items.filter(it => !it.visible || !it.enabled || it.coveringElement).map(it => `"${it.label}" cover=${it.coveringElement}`)
            failures.push(`[iter ${i + 1}] product-detail: ${bad.join(", ")}`)
            await shot(page, `nav-fail-productdetail-iter${i + 1}`)
          }
        }
      } catch (e) { failures.push(`[iter ${i + 1}] product-detail-nav: ${e}`) }
    }

    if (overlayFinds.length > 0) {
      console.log("⚠ OVERLAYS DETECTED:\n" + overlayFinds.join("\n"))
    }
    if (failures.length > 0) {
      console.log("✘ NAVBAR FAILURES:\n" + failures.join("\n"))
    }

    expect(failures, `Navbar blocked in ${failures.length} cases:\n${failures.join("\n")}`).toHaveLength(0)
    expect(overlayFinds, `Overlays found in ${overlayFinds.length} cases:\n${overlayFinds.join("\n")}`).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MOBILE NAVIGATION JOURNEY × 10
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("2 · Mobile Navigation Journey × 10", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("mobile menu opens/navigates/closes × 10 — zero failures", async ({ page }) => {
    test.setTimeout(300_000)
    const routes = ["/products", "/blog", "/about", "/contact-us", "/spare-parts", "/knowledge"]
    const failures: string[] = []

    for (let i = 0; i < 10; i++) {
      await page.goto("/", { waitUntil: "domcontentloaded" })
      await waitNavReady(page)
      await dismissAllPopups(page)

      // Open hamburger
      const hamburger = page.locator('[aria-label="Open navigation menu"]')
      try {
        await expect(hamburger).toBeVisible({ timeout: 5_000 })
        await hamburger.click()
      } catch {
        failures.push(`[iter ${i + 1}] hamburger not visible on /`)
        await shot(page, `mobile-hamburger-fail-iter${i + 1}`)
        continue
      }

      const mobileMenu = page.locator("#navbar-mobile-menu")
      try {
        await expect(mobileMenu).toBeVisible({ timeout: 3_000 })
      } catch {
        failures.push(`[iter ${i + 1}] mobile menu not visible after clicking hamburger`)
        await shot(page, `mobile-menu-notopen-iter${i + 1}`)
        continue
      }

      // Pick a route to navigate to
      const target = routes[i % routes.length]
      const menuLink = mobileMenu.locator(`a[href="${target}"]`)
      try {
        await expect(menuLink).toBeVisible({ timeout: 3_000 })
        await menuLink.click()
        await page.waitForURL(`**${target}`, { timeout: 8_000 })
        await waitNavReady(page)
      } catch {
        failures.push(`[iter ${i + 1}] failed to navigate to ${target} via mobile menu`)
        await shot(page, `mobile-nav-fail-iter${i + 1}`)
        continue
      }

      // Menu must be closed after navigation
      try {
        await expect(mobileMenu).not.toBeVisible({ timeout: 3_000 })
      } catch {
        failures.push(`[iter ${i + 1}] mobile menu still open after navigating to ${target}`)
        await shot(page, `mobile-menu-stale-iter${i + 1}`)
      }

      // Overlay check
      const overlay = await detectOverlays(page)
      if (overlay.found) {
        const desc = overlay.elements.map(e => `z=${e.zIndex} ${e.classes.slice(0, 40)}`).join("; ")
        failures.push(`[iter ${i + 1}] overlay after mobile nav to ${target}: ${desc}`)
        await shot(page, `mobile-overlay-iter${i + 1}`)
      }

      // body overflow must not be hidden
      const overflow = await page.evaluate(() => document.body.style.overflow)
      if (overflow === "hidden") {
        failures.push(`[iter ${i + 1}] body overflow stuck as hidden after mobile nav to ${target}`)
      }
    }

    expect(failures, `Mobile failures (${failures.length}):\n${failures.join("\n")}`).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLICKABILITY AUDIT — ALL NAVBAR ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("3 · Clickability Audit", () => {
  const PAGES = ["/", "/products", "/blog", "/about", "/contact-us", "/spare-parts", "/knowledge"]

  for (const pagePath of PAGES) {
    test(`navbar clickable on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: "domcontentloaded" })
      await waitNavReady(page)
      await dismissAllPopups(page)

      const overlays = await detectOverlays(page)
      if (overlays.found) {
        await shot(page, `audit-overlay-${pagePath.replace(/\//g, "_")}`)
        const desc = overlays.elements.map(e => `z=${e.zIndex} rect(${e.rect.x},${e.rect.y},${e.rect.w}×${e.rect.y}) classes=${e.classes.slice(0, 60)}`).join("\n")
        expect.soft(overlays.found, `Overlay covering page on ${pagePath}:\n${desc}`).toBe(false)
      }

      const report = await auditNavbar(page)
      const blocked = report.items.filter(it => it.coveringElement !== null)
      const invisible = report.items.filter(it => !it.visible)
      const noPointer = report.items.filter(it => it.pointerEvents === "none")

      if (blocked.length > 0) {
        await shot(page, `audit-blocked-nav-${pagePath.replace(/\//g, "_")}`)
      }

      expect.soft(invisible.map(i => i.label), `Invisible nav items on ${pagePath}`).toHaveLength(0)
      expect.soft(noPointer.map(i => i.label), `pointer-events:none on ${pagePath}`).toHaveLength(0)
      expect.soft(blocked.map(i => `${i.label} → ${i.coveringElement}`), `Covered nav items on ${pagePath}`).toHaveLength(0)

      // Actually click each visible nav link and verify navigation
      const navLinks = [
        { label: "Products", href: "/products" },
        { label: "Blog", href: "/blog" },
        { label: "About", href: "/about" },
      ]
      for (const { label, href } of navLinks) {
        if (pagePath === href) continue
        const link = page.locator(`header nav a[href="${href}"]`).first()
        const isVisible = await link.isVisible().catch(() => false)
        if (!isVisible) continue

        await link.click()
        await page.waitForURL(`**${href}`, { timeout: 8_000 })
        expect(page.url()).toContain(href)
        await page.goBack()
        await waitNavReady(page)
        await dismissAllPopups(page)
      }
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. OVERLAY DETECTION AFTER EVERY ROUTE CHANGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("4 · Overlay Detection — Route Transitions", () => {
  test("no persistent overlays across 7-route navigation sequence", async ({ page }) => {
    test.setTimeout(300_000)
    const routes = ["/", "/products", "/spare-parts", "/blog", "/about", "/contact-us", "/knowledge"]
    const overlayLog: string[] = []

    for (let pass = 0; pass < 3; pass++) {
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" })
        // Wait a bit for any popup timer to potentially fire
        await page.waitForTimeout(300)

        const overlay = await detectOverlays(page)
        if (overlay.found) {
          const desc = overlay.elements.map(e =>
            `  z=${e.zIndex} display=${e.display} opacity=${e.opacity} ${e.classes.slice(0, 80)}`
          ).join("\n")
          overlayLog.push(`[pass ${pass + 1}] ${route}:\n${desc}`)
          await shot(page, `overlay-route-pass${pass + 1}-${route.replace(/\//g, "_")}`)
        }

        // Check z-index > 1000
        const highZ = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLElement>("*"))
            .filter(el => {
              const z = parseInt(window.getComputedStyle(el).zIndex, 10)
              const disp = window.getComputedStyle(el).display
              return !isNaN(z) && z > 1000 && disp !== "none"
            })
            .map(el => ({ z: window.getComputedStyle(el).zIndex, cls: el.className.toString().slice(0, 80) }))
        })
        if (highZ.length > 0) {
          const desc = highZ.map(e => `z=${e.z} ${e.cls}`).join("; ")
          overlayLog.push(`[pass ${pass + 1}] ${route} high-z: ${desc}`)
        }
      }
    }

    if (overlayLog.length > 0) console.log("OVERLAY LOG:\n" + overlayLog.join("\n"))
    expect(overlayLog, `Overlays or high-z elements detected:\n${overlayLog.join("\n")}`).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BLOG VERIFICATION — DESKTOP / TABLET / MOBILE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("5 · Blog Responsiveness", () => {
  const VIEWPORTS = [
    { label: "Desktop-1280", width: 1280, height: 800 },
    { label: "Tablet-768", width: 768, height: 1024 },
    { label: "Mobile-375", width: 375, height: 812 },
  ]

  let blogPostHref: string | null = null

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const pg = await ctx.newPage()
    await pg.goto("/blog", { waitUntil: "domcontentloaded" })
    blogPostHref = await pg.locator('a[href^="/blog/"]').first().getAttribute("href").catch(() => null)
    await ctx.close()
  })

  for (const vp of VIEWPORTS) {
    test(`blog index no horizontal overflow at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/blog", { waitUntil: "domcontentloaded" })
      const rep = await checkOverflow(page)
      if (rep.hasHorizontalScroll) {
        await shot(page, `blog-index-overflow-${vp.label}`)
        const details = rep.offendingElements.map(e => `${e.tag}.${e.classes} w=${e.rect.w}`).join(", ")
        expect.soft(rep.hasHorizontalScroll, `Blog index overflow at ${vp.label}: +${rep.overflow}px (${details})`).toBe(false)
      }
      expect(rep.hasHorizontalScroll, `Blog index scrollWidth=${rep.scrollWidth} clientWidth=${rep.clientWidth}`).toBe(false)
    })

    test(`blog post no horizontal overflow at ${vp.label}`, async ({ page }) => {
      if (!blogPostHref) { test.skip(true, "No blog post found"); return }
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(blogPostHref, { waitUntil: "domcontentloaded" })
      const rep = await checkOverflow(page)
      if (rep.hasHorizontalScroll) {
        await shot(page, `blog-post-overflow-${vp.label}`)
        const details = rep.offendingElements.map(e => `${e.tag}.${e.classes} w=${e.rect.w}`).join(", ")
        expect.soft(rep.hasHorizontalScroll, `Blog post overflow at ${vp.label}: +${rep.overflow}px (${details})`).toBe(false)
      }
      expect(rep.hasHorizontalScroll, `Blog post scrollWidth=${rep.scrollWidth} clientWidth=${rep.clientWidth}`).toBe(false)
    })

    test(`blog post article width constrained at ${vp.label}`, async ({ page }) => {
      if (!blogPostHref) { test.skip(true, "No blog post found"); return }
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(blogPostHref, { waitUntil: "domcontentloaded" })
      const article = page.locator("article").first()
      await expect(article).toBeVisible()
      const box = await article.boundingBox()
      if (box) {
        const maxAllowed = Math.min(vp.width, 800) + 10
        if (box.width > maxAllowed) {
          await shot(page, `blog-article-wide-${vp.label}`)
        }
        expect(box.width, `Article width ${box.width} > max ${maxAllowed} at ${vp.label}`).toBeLessThanOrEqual(maxAllowed)
      }
    })

    test(`blog images not overflowing at ${vp.label}`, async ({ page }) => {
      if (!blogPostHref) { test.skip(true, "No blog post found"); return }
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(blogPostHref, { waitUntil: "domcontentloaded" })
      await page.waitForLoadState("networkidle").catch(() => {})

      const overflows = await page.evaluate((vpWidth) => {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("article img"))
        return imgs
          .filter(img => img.getBoundingClientRect().right > vpWidth + 5)
          .map(img => ({ src: img.src.slice(-40), w: Math.round(img.getBoundingClientRect().width) }))
      }, vp.width)

      if (overflows.length > 0) await shot(page, `blog-img-overflow-${vp.label}`)
      expect(overflows, `Overflowing images at ${vp.label}: ${JSON.stringify(overflows)}`).toHaveLength(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LANDING PAGE STABILITY × 50
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("6 · Landing Page Stability × 50", () => {
  test("50 homepage visits — track hydration, JS errors, body-overflow, overlays", async ({ page }) => {
    test.setTimeout(600_000) // 10 min for 50 iterations
    const ITERATIONS = 50
    let successCount = 0
    const failures: string[] = []
    const hydrationErrors: string[] = []

    page.on("console", msg => {
      if (msg.type() === "error" && (msg.text().includes("Hydration") || msg.text().includes("did not match"))) {
        hydrationErrors.push(msg.text().slice(0, 120))
      }
    })

    for (let i = 1; i <= ITERATIONS; i++) {
      try {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 })
        await waitNavReady(page)

        // body overflow
        const overflow = await page.evaluate(() => document.body.style.overflow)
        if (overflow === "hidden") {
          failures.push(`[${i}] body overflow stuck as hidden`)
        }

        // overlay check
        const overlay = await detectOverlays(page)
        if (overlay.found) {
          const desc = overlay.elements.map(e => `z=${e.zIndex}`).join("; ")
          failures.push(`[${i}] overlay: ${desc}`)
        }

        // nav is clickable
        const nav = await auditNavbar(page)
        if (!nav.allClickable) {
          const bad = nav.items.filter(it => !it.visible || it.coveringElement).map(it => it.label)
          failures.push(`[${i}] nav blocked: ${bad.join(", ")}`)
        }

        successCount++
      } catch (e) {
        failures.push(`[${i}] page load error: ${String(e).slice(0, 80)}`)
      }
    }

    const successRate = Math.round((successCount / ITERATIONS) * 100)
    console.log(`\n=== Landing Page Stability ===`)
    console.log(`Success: ${successCount}/${ITERATIONS} (${successRate}%)`)
    if (failures.length > 0) console.log(`Failures:\n${failures.map(f => "  " + f).join("\n")}`)
    if (hydrationErrors.length > 0) console.log(`Hydration errors: ${hydrationErrors.length}`)

    expect(hydrationErrors, `Hydration errors: ${hydrationErrors.join("; ")}`).toHaveLength(0)
    expect(failures, `${failures.length} failures in ${ITERATIONS} visits:\n${failures.join("\n")}`).toHaveLength(0)
    expect(successCount, `Expected 50 successes, got ${successCount}`).toBe(ITERATIONS)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. HIGH-Z ELEMENT INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("7 · Z-Index Element Inventory", () => {
  test("catalogue all fixed/absolute elements above z-40 on all routes", async ({ page }) => {
    test.setTimeout(180_000)
    const routes = ["/", "/products", "/blog", "/about", "/contact-us"]
    const inventory: Record<string, string[]> = {}

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(500)

      const elements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLElement>("*"))
          .filter(el => {
            const s = window.getComputedStyle(el)
            const z = parseInt(s.zIndex, 10)
            return (s.position === "fixed" || s.position === "absolute") && !isNaN(z) && z >= 40 && s.display !== "none"
          })
          .map(el => {
            const s = window.getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            return `z=${s.zIndex} pos=${s.position} ${el.tagName}[${el.className.toString().slice(0, 60)}] rect=${Math.round(rect.width)}×${Math.round(rect.height)}`
          })
      })
      inventory[route] = elements
      console.log(`\n[${route}] z≥40 elements (${elements.length}):`)
      elements.forEach(e => console.log("  " + e))
    }

    // The ONLY full-screen fixed element should be navbar (z-50, h=auto) not any modal/backdrop
    for (const [route, elements] of Object.entries(inventory)) {
      const fullscreenOverlays = elements.filter(e => {
        // a full-screen overlay would be fixed, high z, and large
        const match = e.match(/rect=(\d+)×(\d+)/)
        if (!match) return false
        const w = parseInt(match[1], 10)
        const h = parseInt(match[2], 10)
        return w > 600 && h > 400 // likely fullscreen on 1280×800
      })
      // Allow navbar and other legit UI, flag anything unexpected covering full screen
      // Exclude navbar, skip-to-content (z=100 but tiny), video popup, gem button, whatsapp
      const KNOWN_LEGIT = ["HEADER", "header", "z=100", "right-6", "bottom-6", "left-0 top-1/2", "skip"]
      const suspicious = fullscreenOverlays.filter(e => !KNOWN_LEGIT.some(k => e.includes(k)))
      if (suspicious.length > 0) {
        await shot(page, `high-z-suspicious-${route.replace(/\//g, "_")}`)
        console.warn(`Suspicious fullscreen elements on ${route}:\n${suspicious.join("\n")}`)
      }
      expect.soft(suspicious, `Suspicious full-screen overlay on ${route}`).toHaveLength(0)
    }
  })
})
