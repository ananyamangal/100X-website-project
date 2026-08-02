/**
 * Click-target diagnostic — runtime reproduction against LIVE PRODUCTION.
 *
 * At each (page, viewport, repeat, timing) combination, uses
 * document.elementFromPoint(x, y) at the real click coordinates of a navbar
 * link and a spare-parts/related-product card, and logs what element is
 * ACTUALLY returned. Every result (pass or fail) is appended to a results
 * file so nothing is lost even if the test runner's own report is discarded.
 */
import { test, Page } from "@playwright/test"
import fs from "fs"
import path from "path"

const RESULTS_FILE = path.join(process.cwd(), "test-results", "click-target-diagnostic.log")
fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true })
fs.writeFileSync(RESULTS_FILE, `Click-target diagnostic run — ${new Date().toISOString()}\nBASE_URL=${process.env.BASE_URL || "(default localhost)"}\n\n`)

function log(line: string) {
  fs.appendFileSync(RESULTS_FILE, line + "\n")
}

const VIEWPORTS = [
  { label: "desktop-1440x900", width: 1440, height: 900 },
  { label: "desktop-1280x720", width: 1280, height: 720 },
]

const TIMINGS_MS = [0, 2000, 5000]
const REPEATS = 4

interface PageSpec {
  label: string
  path: string
  cardSelector: string | null // selector for a spare-parts / related-product card, if any
  cardSectionScroll: boolean
}

const PAGES: PageSpec[] = [
  { label: "homepage", path: "/", cardSelector: null, cardSectionScroll: false },
  {
    label: "spare-parts-page (double-barrel)",
    path: "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    cardSelector: null, // resolved at runtime — try several known patterns
    cardSectionScroll: true,
  },
  {
    label: "related-products-page (first /products/[id] listing)",
    path: "__DISCOVER__", // resolved at runtime from /products
    cardSelector: null,
    cardSectionScroll: true,
  },
]

async function elementAt(page: Page, x: number, y: number) {
  return page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    if (!el) return { tag: null, classes: null, id: null, text: null }
    return {
      tag: el.tagName,
      classes: el.className?.toString?.().slice(0, 140) ?? "",
      id: el.id || null,
      text: (el.textContent || "").trim().slice(0, 40),
      href: (el.closest("a") as HTMLAnchorElement | null)?.href ?? null,
      pointerEvents: window.getComputedStyle(el).pointerEvents,
      zIndex: window.getComputedStyle(el).zIndex,
      position: window.getComputedStyle(el).position,
    }
  }, [x, y] as const)
}

async function getNavbarLinkCenter(page: Page): Promise<{ x: number; y: number; label: string } | null> {
  const link = page.locator('header nav a[href="/products"]').first()
  const count = await link.count()
  if (count === 0) return null
  const box = await link.boundingBox()
  if (!box) return null
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, label: "nav:Products" }
}

async function getCardCenter(page: Page): Promise<{ x: number; y: number; label: string } | null> {
  const candidates = [
    'text=/spare part/i',
    'text=/related product/i',
    '[class*="spare" i] a',
    '[class*="related" i] a',
    'a[href^="/spare-parts/"]',
    'a[href^="/products/"]',
  ]
  for (const sel of candidates) {
    try {
      const loc = page.locator(sel).first()
      if (await loc.count() === 0) continue
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      const box = await loc.boundingBox()
      if (box && box.width > 0 && box.height > 0) {
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, label: `card:${sel}` }
      }
    } catch { /* try next selector */ }
  }
  return null
}

let relatedProductsUrl: string | null = null

test.describe.configure({ mode: "serial" })

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext()
  const pg = await ctx.newPage()
  try {
    await pg.goto("/products", { waitUntil: "domcontentloaded", timeout: 20000 })
    const href = await pg.locator('a[href^="/products/"]').first().getAttribute("href").catch(() => null)
    relatedProductsUrl = href
  } catch (e) {
    log(`WARN: could not discover a /products/[id] page for related-products test: ${e}`)
  }
  await ctx.close()
})

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.label}`, () => {
    for (const pageSpec of PAGES) {
      test(`${pageSpec.label} @ ${vp.label}`, async ({ browser }) => {
        test.setTimeout(180_000)
        const targetPath = pageSpec.path === "__DISCOVER__" ? relatedProductsUrl : pageSpec.path
        if (!targetPath) {
          log(`SKIP: ${pageSpec.label} @ ${vp.label} — no URL resolved`)
          return
        }

        for (let rep = 1; rep <= REPEATS; rep++) {
          const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
          const page = await ctx.newPage()
          const consoleErrors: string[] = []
          page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 160))
          })
          page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 160)}`))

          const navStart = Date.now()
          try {
            await page.goto(targetPath, { waitUntil: "domcontentloaded", timeout: 25000 })
          } catch (e) {
            log(`[${pageSpec.label}][${vp.label}][rep ${rep}] NAVIGATION FAILED: ${e}`)
            await ctx.close()
            continue
          }

          for (const t of TIMINGS_MS) {
            const elapsed = Date.now() - navStart
            const waitFor = t - elapsed
            if (waitFor > 0) await page.waitForTimeout(waitFor)

            const navTarget = await getNavbarLinkCenter(page)
            let navResult = "N/A (navbar link not found)"
            if (navTarget) {
              const hit = await elementAt(page, navTarget.x, navTarget.y)
              const isNavLink = hit.tag === "A" && hit.href?.includes("/products")
              navResult = `${isNavLink ? "OK" : "BLOCKED"} target=(${Math.round(navTarget.x)},${Math.round(navTarget.y)}) got=${hit.tag}${hit.id ? "#" + hit.id : ""}.${hit.classes} pointerEvents=${hit.pointerEvents} z=${hit.zIndex} pos=${hit.position} href=${hit.href}`
            }
            log(`[${pageSpec.label}][${vp.label}][rep ${rep}][t=${t}ms] NAVBAR: ${navResult}`)

            if (pageSpec.cardSectionScroll) {
              const cardTarget = await getCardCenter(page)
              let cardResult = "N/A (no card found on page)"
              if (cardTarget) {
                const hit = await elementAt(page, cardTarget.x, cardTarget.y)
                const isClickable = hit.tag === "A" || (hit.href !== null)
                cardResult = `${isClickable ? "OK" : "BLOCKED"} sel=${cardTarget.label} target=(${Math.round(cardTarget.x)},${Math.round(cardTarget.y)}) got=${hit.tag}${hit.id ? "#" + hit.id : ""}.${hit.classes} pointerEvents=${hit.pointerEvents} z=${hit.zIndex} pos=${hit.position} href=${hit.href}`
              }
              log(`[${pageSpec.label}][${vp.label}][rep ${rep}][t=${t}ms] CARD: ${cardResult}`)
            }
          }

          if (consoleErrors.length > 0) {
            log(`[${pageSpec.label}][${vp.label}][rep ${rep}] CONSOLE ERRORS: ${consoleErrors.join(" | ")}`)
          }

          await ctx.close()
        }
      })
    }
  })
}

test.afterAll(async () => {
  log(`\n=== RUN COMPLETE — ${new Date().toISOString()} ===`)
})
