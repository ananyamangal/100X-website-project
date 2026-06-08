import { test } from "@playwright/test"

test("VideoPopup vs mobile menu link accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(600)

  // Open hamburger
  await page.locator('[aria-label="Open navigation menu"]').click()
  await page.waitForTimeout(400)

  const menuLinks = ["Home", "Products", "Spare Parts", "Knowledge Hub", "Blog", "About", "Contact"]
  let blocked = 0

  for (const label of menuLinks) {
    const link = page.locator("#navbar-mobile-menu").getByText(label, { exact: false }).first()
    const box = await link.boundingBox().catch(() => null)
    if (!box) { console.log(`  ${label}: NOT IN DOM`); continue }

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    const topEl = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return "none"
      const tag = el.tagName
      const cls = (el.className || "").toString().slice(0, 80)
      return `${tag}[${cls}]`
    }, { x: cx, y: cy })

    const isNavLink = topEl.startsWith("A[") || topEl.startsWith("LI[") || topEl.startsWith("SPAN[") || topEl.startsWith("BUTTON[")
    const symbol = isNavLink ? "✓" : "✗"
    if (!isNavLink) blocked++

    console.log(`  ${symbol} ${label.padEnd(14)} top-element="${topEl.slice(0, 80)}"`)
  }

  // Take screenshot for evidence
  const { default: path } = await import("path")
  const { default: fs } = await import("fs")
  const OUT = path.join(process.cwd(), "test-results", "evidence")
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, "12-mobile-menu-overlap-check.png"), fullPage: false })

  const summary = blocked === 0 ? "✓ All menu links accessible" : "✗ " + blocked + " links blocked by VideoPopup"
  console.log("\n  " + summary)
})
