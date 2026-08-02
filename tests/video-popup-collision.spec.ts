/**
 * VideoPopup / clickable-grid collision reproduction.
 *
 * Matches the original manual repro: on a product page with both a spare
 * parts grid and a related-products grid, scroll those grids into view
 * while the auto-playing VideoPopup is visible (fixed bottom-right), then
 * use document.elementFromPoint() at each visible card's own center to
 * confirm the card itself — not the video iframe — is what actually
 * receives the click there.
 *
 * 2 viewports x 4 reps x 3 wait intervals = 24 checks. Each check inspects
 * every [data-clickable-grid] card link currently in the viewport; a check
 * fails if ANY of those cards resolves to something other than itself.
 */
import { test, Page } from "@playwright/test"
import fs from "fs"
import path from "path"

const RESULTS_FILE = path.join(process.cwd(), "test-results", "video-popup-collision.log")
fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true })
fs.writeFileSync(RESULTS_FILE, `VideoPopup collision run — ${new Date().toISOString()}\nBASE_URL=${process.env.BASE_URL || "(default localhost)"}\n\n`)

function log(line: string) {
  fs.appendFileSync(RESULTS_FILE, line + "\n")
  console.log(line)
}

const TARGET_PATH = "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde"

const VIEWPORTS = [
  { label: "desktop-1440x900", width: 1440, height: 900 },
  { label: "desktop-1280x720", width: 1280, height: 720 },
]
const TIMINGS_MS = [1000, 3000, 6000]
const REPEATS = 4

async function checkVisibleGridCards(page: Page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-clickable-grid] a"))
    const vw = window.innerWidth
    const vh = window.innerHeight
    const results: { href: string; ok: boolean; got: string }[] = []
    for (const card of cards) {
      const r = card.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // Only check cards actually within the viewport right now.
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1)
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1)
      const hit = document.elementFromPoint(cx, cy) as HTMLElement | null
      const ok = !!hit && (hit === card || card.contains(hit) || hit.contains(card))
      results.push({
        href: (card as HTMLAnchorElement).href,
        ok,
        got: hit ? `${hit.tagName}.${(hit.className || "").toString().slice(0, 80)}` : "null",
      })
    }
    return results
  })
}

let totalChecks = 0
let failedChecks = 0

test.describe.configure({ mode: "serial" })

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.label}`, () => {
    for (let rep = 1; rep <= REPEATS; rep++) {
      test(`rep ${rep} @ ${vp.label}`, async ({ browser }) => {
        test.setTimeout(120_000)
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
        const page = await ctx.newPage()
        const navStart = Date.now()
        try {
          await page.goto(TARGET_PATH, { waitUntil: "domcontentloaded", timeout: 25000 })
        } catch (e) {
          log(`[${vp.label}][rep ${rep}] NAVIGATION FAILED: ${e}`)
          await ctx.close()
          return
        }

        for (const t of TIMINGS_MS) {
          const elapsed = Date.now() - navStart
          const waitFor = t - elapsed
          if (waitFor > 0) await page.waitForTimeout(waitFor)

          // Scroll the spare-parts / related-products grids into view —
          // these render well down the page, in the same screen region the
          // fixed-position VideoPopup occupies once scrolled there.
          const gridCount = await page.locator("[data-clickable-grid]").count()
          if (gridCount === 0) {
            log(`[${vp.label}][rep ${rep}][t=${t}ms] WARN: no [data-clickable-grid] found yet`)
            continue
          }
          for (let g = 0; g < gridCount; g++) {
            await page.locator("[data-clickable-grid]").nth(g).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
            await page.waitForTimeout(150) // let the fixed popup's own scroll-driven collision check settle

            totalChecks++
            const results = await checkVisibleGridCards(page)
            const blocked = results.filter((r) => !r.ok)
            if (blocked.length > 0) {
              failedChecks++
              log(`[${vp.label}][rep ${rep}][t=${t}ms][grid ${g}] BLOCKED ${blocked.length}/${results.length}: ${blocked.map((b) => `${b.href} -> ${b.got}`).join(" | ")}`)
            } else {
              log(`[${vp.label}][rep ${rep}][t=${t}ms][grid ${g}] OK (${results.length} cards checked)`)
            }
          }
        }

        await ctx.close()
      })
    }
  })
}

test.afterAll(async () => {
  log(`\n=== RUN COMPLETE — ${new Date().toISOString()} ===`)
  log(`TOTAL CHECKS: ${totalChecks}, FAILED: ${failedChecks}`)
})
